#!/usr/bin/env node
/**
 * Fix Square catalog stock + images for Jersey Deals.
 *
 * - Sets IN_STOCK quantity to 1 for every tracked variation
 * - Pulls photos from linked eBay listings (sku `ebay:{itemId}`) and uploads to Square
 * - Cleans item descriptions (drops "Imported from eBay" clutter)
 *
 * Requires: SQUARE_ACCESS_TOKEN, EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN
 * Optional: SQUARE_ENVIRONMENT, SQUARE_LOCATION_ID, SQUARE_SKIP_IMAGES=1
 *
 *   node jerseydeals/scripts/fix-square-stock-and-images.mjs
 */

import { randomUUID } from 'node:crypto'

const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const SKIP_IMAGES = process.env.SQUARE_SKIP_IMAGES === '1'
const TARGET_QTY = '1'

const EBAY = {
  app: process.env.EBAY_APP_ID,
  cert: process.env.EBAY_CERT_ID,
  dev: process.env.EBAY_DEV_ID,
  token: process.env.EBAY_USER_TOKEN,
  endpoint: 'https://api.ebay.com/ws/api.dll',
  compat: '1271',
  ns: 'urn:ebay:apis:eBLBaseComponents',
}

for (const [name, value] of [
  ['SQUARE_ACCESS_TOKEN', TOKEN],
  ['EBAY_APP_ID', EBAY.app],
  ['EBAY_CERT_ID', EBAY.cert],
  ['EBAY_DEV_ID', EBAY.dev],
  ['EBAY_USER_TOKEN', EBAY.token],
]) {
  if (!value) {
    console.error(`Missing required secret: ${name}`)
    process.exit(1)
  }
}

async function square(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': API_VERSION,
      Accept: 'application/json',
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Square ${method} ${path} non-JSON (${res.status}): ${text.slice(0, 400)}`)
  }
  if (!res.ok) {
    const msg =
      json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') || text.slice(0, 400)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
}

async function primaryLocationId() {
  if (LOCATION_OVERRIDE) return LOCATION_OVERRIDE
  const data = await square('/v2/locations')
  const active = (data.locations || []).filter((l) => l.status === 'ACTIVE')
  const loc = active[0] || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location found. Set SQUARE_LOCATION_ID.')
  console.log(`Using location: ${loc.name || loc.id}`)
  return loc.id
}

async function listItems() {
  const objects = []
  let cursor = ''
  do {
    const qs = new URLSearchParams({ types: 'ITEM' })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/catalog/list?${qs}`)
    objects.push(...(data.objects || []).filter((o) => !o.is_deleted))
    cursor = data.cursor || ''
  } while (cursor)
  return objects
}

async function ebayTrading(callName, innerXml) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="${EBAY.ns}">
  <RequesterCredentials>
    <eBayAuthToken>${EBAY.token}</eBayAuthToken>
  </RequesterCredentials>
  ${innerXml}
</${callName}Request>`

  const res = await fetch(EBAY.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': EBAY.compat,
      'X-EBAY-API-DEV-NAME': EBAY.dev,
      'X-EBAY-API-APP-NAME': EBAY.app,
      'X-EBAY-API-CERT-NAME': EBAY.cert,
      'X-EBAY-API-CALL-NAME': callName,
      'X-EBAY-API-SITEID': '0',
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${callName} HTTP ${res.status}: ${text.slice(0, 400)}`)
  return text
}

function ebayPictures(xml) {
  const pics = []
  const re = /<PictureURL>([^<]+)<\/PictureURL>/gi
  let m
  while ((m = re.exec(xml))) {
    const url = m[1].trim()
    if (url && !pics.includes(url)) pics.push(url)
  }
  return pics
}

function upscaleEbayImage(url) {
  if (!url) return url
  return url
    .replace(/s-l(64|96|140|225|300)\.jpg/i, 's-l1600.jpg')
    .replace(/\/\$_\d+\.JPG/i, '/$_57.JPG')
}

async function fetchEbayItemId(itemId) {
  const xml = await ebayTrading(
    'GetItem',
    `<ItemID>${itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
  <IncludeItemSpecifics>false</IncludeItemSpecifics>`,
  )
  const ack = xml.match(/<Ack>([^<]*)<\/Ack>/i)?.[1] || ''
  if (/Failure/i.test(ack)) {
    const msg = xml.match(/<LongMessage>([^<]*)<\/LongMessage>/i)?.[1] || ack
    throw new Error(`GetItem ${itemId}: ${msg}`)
  }
  return ebayPictures(xml).map(upscaleEbayImage)
}

function cleanDescription(itemData) {
  const raw =
    itemData.description_plaintext ||
    itemData.description ||
    ''
  const lines = String(raw)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^Imported from eBay:/i.test(l))
    .filter((l) => !/^POS:\s*/i.test(l))
  return lines.join('\n')
}

async function setQuantity(variationId, locationId) {
  await square('/v2/inventory/changes/batch-create', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      changes: [
        {
          type: 'PHYSICAL_COUNT',
          physical_count: {
            catalog_object_id: variationId,
            location_id: locationId,
            quantity: TARGET_QTY,
            state: 'IN_STOCK',
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })
}

async function uploadImage(itemId, imageUrl, title, caption, isPrimary) {
  const imgRes = await fetch(imageUrl, {
    headers: { 'User-Agent': 'JerseyDealsSquareSync/1.0' },
  })
  if (!imgRes.ok) throw new Error(`download image HTTP ${imgRes.status}`)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  if (buf.length < 500) throw new Error(`image too small (${buf.length} bytes)`)
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
  const form = new FormData()
  form.append(
    'request',
    new Blob(
      [
        JSON.stringify({
          idempotency_key: randomUUID(),
          object_id: itemId,
          is_primary: Boolean(isPrimary),
          image: {
            type: 'IMAGE',
            id: `#img_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
            image_data: {
              name: (title || 'Jersey').slice(0, 50),
              caption: (caption || '').slice(0, 100),
            },
          },
        }),
      ],
      { type: 'application/json' },
    ),
  )
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  form.append('file', new Blob([buf], { type: contentType }), `${itemId}.${ext}`)
  await square('/v2/catalog/images', { method: 'POST', body: form })
}

async function refreshItem(itemId) {
  const data = await square(`/v2/catalog/object/${itemId}`)
  return data.object
}

async function ensureCleanDescription(item) {
  const nextDescription = cleanDescription(item.item_data || {})
  const current =
    item.item_data?.description_plaintext || item.item_data?.description || ''
  if (nextDescription === String(current).trim()) return item

  // Upsert ITEM with variations preserved
  const updated = await square('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      object: {
        type: 'ITEM',
        id: item.id,
        version: item.version,
        present_at_all_locations: true,
        item_data: {
          ...item.item_data,
          description: nextDescription,
          ecom_visibility: item.item_data?.ecom_visibility || 'VISIBLE',
        },
      },
    },
  })
  return updated.catalog_object || (await refreshItem(item.id))
}

function ebayIdFromSku(sku) {
  const m = String(sku || '').match(/^ebay:(\d+)$/i)
  return m ? m[1] : ''
}

const locationId = await primaryLocationId()
const items = await listItems()
console.log(`Fixing ${items.length} Square items (qty=${TARGET_QTY}, images=${SKIP_IMAGES ? 'skip' : 'ebay'})…`)

let stockOk = 0
let stockFail = 0
let imagesOk = 0
let imagesSkip = 0
let imagesFail = 0
let descOk = 0

for (const [index, rawItem] of items.entries()) {
  let item = rawItem
  const name = item.item_data?.name || item.id
  const label = `${index + 1}/${items.length} ${name.slice(0, 70)}`
  const variations = item.item_data?.variations || []
  const primaryVar = variations[0]
  const ebayId = ebayIdFromSku(primaryVar?.item_variation_data?.sku)

  try {
    item = await ensureCleanDescription(item)
    descOk += 1
  } catch (err) {
    console.warn(`· desc skip ${label}: ${err.message}`)
  }

  for (const variation of variations) {
    try {
      // Ensure variation is sellable + tracked
      const vd = variation.item_variation_data || {}
      if (vd.track_inventory !== true || vd.sellable !== true || vd.stockable !== true) {
        await square('/v2/catalog/object', {
          method: 'POST',
          body: {
            idempotency_key: randomUUID(),
            object: {
              type: 'ITEM_VARIATION',
              id: variation.id,
              version: variation.version,
              present_at_all_locations: true,
              item_variation_data: {
                ...vd,
                track_inventory: true,
                sellable: true,
                stockable: true,
              },
            },
          },
        })
      }
      await setQuantity(variation.id, locationId)
      stockOk += 1
    } catch (err) {
      stockFail += 1
      console.error(`✗ stock ${label}: ${err.message}`)
    }
  }

  const existingImages = item.item_data?.image_ids || []
  const MAX_IMAGES = Number(process.env.SQUARE_MAX_IMAGES || 12)
  if (SKIP_IMAGES) {
    imagesSkip += 1
    console.log(`✓ stock ${label}`)
  } else if (!ebayId) {
    if (existingImages.length === 0) {
      imagesFail += 1
      console.warn(`· no ebay sku for images ${label}`)
    } else {
      imagesSkip += 1
      console.log(`✓ stock ${label} (${existingImages.length} images)`)
    }
  } else {
    try {
      const pics = await fetchEbayItemId(ebayId)
      if (pics.length === 0) throw new Error('no PictureURL on eBay item')
      const need = Math.max(0, Math.min(MAX_IMAGES, pics.length) - existingImages.length)
      if (need === 0) {
        imagesSkip += 1
        console.log(`✓ stock ${label} (${existingImages.length} images)`)
      } else {
        // Append remaining eBay photos so Square / quick view have the full set.
        const toUpload = pics.slice(existingImages.length, existingImages.length + need)
        for (const [i, url] of toUpload.entries()) {
          await uploadImage(
            item.id,
            url,
            name,
            primaryVar?.item_variation_data?.name || '',
            existingImages.length === 0 && i === 0,
          )
        }
        imagesOk += 1
        console.log(`✓ +${toUpload.length} images + stock ${label}`)
      }
    } catch (err) {
      imagesFail += 1
      console.error(`✗ images ${label}: ${err.message}`)
    }
  }
}

console.log('')
console.log(
  `Done. stock_ok=${stockOk} stock_fail=${stockFail} images_ok=${imagesOk} images_skip=${imagesSkip} images_fail=${imagesFail} desc_cleaned=${descOk}`,
)
console.log(
  'Note: Square Online “Out of stock” also requires Shipping fulfillment enabled in the Square Dashboard (not available via API).',
)
if (stockFail > 0 || imagesFail > 0) process.exit(1)
