#!/usr/bin/env node
/**
 * Rebuild each Square item's image_ids from eBay PictureURLs in eBay order.
 * Uploads fresh copies and points the ITEM at only those ordered image ids.
 *
 * Requires: SQUARE_ACCESS_TOKEN + eBay secrets
 * Optional: SQUARE_MAX_IMAGES=12
 *
 * Usage: node jerseydeals/scripts/reorder-square-images-from-ebay.mjs
 *        node jerseydeals/scripts/reorder-square-images-from-ebay.mjs --dry-run
 */

import { randomUUID } from 'node:crypto'

const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const APP = process.env.EBAY_APP_ID
const CERT = process.env.EBAY_CERT_ID
const DEV = process.env.EBAY_DEV_ID
const EBAY_TOKEN = process.env.EBAY_USER_TOKEN
const MAX_IMAGES = Number(process.env.SQUARE_MAX_IMAGES || 12)
const DRY = process.argv.includes('--dry-run')

if (!TOKEN) {
  console.error('Missing SQUARE_ACCESS_TOKEN')
  process.exit(1)
}
if (!APP || !CERT || !DEV || !EBAY_TOKEN) {
  console.error('Missing eBay secrets')
  process.exit(1)
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
    throw new Error(`Square ${method} ${path} non-JSON (${res.status}): ${text.slice(0, 300)}`)
  }
  if (!res.ok) {
    const msg =
      json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') || text.slice(0, 300)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
}

function upscaleImage(url) {
  return String(url || '')
    .trim()
    .replace(/s-l(64|96|140|225|300)\.jpg/i, 's-l1600.jpg')
    .replace(/\/\$_\d+\.JPG/i, '/$_57.JPG')
}

async function fetchEbayPictures(itemId) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${EBAY_TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
</GetItemRequest>`
  const res = await fetch('https://api.ebay.com/ws/api.dll', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1271',
      'X-EBAY-API-DEV-NAME': DEV,
      'X-EBAY-API-APP-NAME': APP,
      'X-EBAY-API-CERT-NAME': CERT,
      'X-EBAY-API-CALL-NAME': 'GetItem',
      'X-EBAY-API-SITEID': '0',
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`GetItem HTTP ${res.status}`)
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(text)) {
    throw new Error(`GetItem Ack failed`)
  }
  const urls = []
  const re = /<PictureURL>([^<]+)<\/PictureURL>/gi
  let m
  while ((m = re.exec(text))) {
    const url = upscaleImage(m[1])
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

async function listItems() {
  const items = []
  let cursor
  do {
    const body = { object_types: ['ITEM'], limit: 100 }
    if (cursor) body.cursor = cursor
    const data = await square('/v2/catalog/search', { method: 'POST', body })
    items.push(...(data.objects || []))
    cursor = data.cursor
  } while (cursor)
  return items
}

function ebayIdFromItem(item) {
  for (const v of item.item_data?.variations || []) {
    const sku = v.item_variation_data?.sku || ''
    const m = String(sku).match(/^ebay:(\d+)/i)
    if (m) return m[1]
  }
  return ''
}

async function uploadImage(itemId, imageUrl, title, isPrimary) {
  const imgRes = await fetch(imageUrl, {
    headers: { 'User-Agent': 'JerseyDealsSquareSync/1.0' },
  })
  if (!imgRes.ok) throw new Error(`download HTTP ${imgRes.status}`)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  if (buf.length < 500) throw new Error(`image too small (${buf.length})`)
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
  const form = new FormData()
  const tempId = `#img_${randomUUID().replace(/-/g, '').slice(0, 16)}`
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
            id: tempId,
            image_data: {
              name: (title || 'Jersey').slice(0, 50),
            },
          },
        }),
      ],
      { type: 'application/json' },
    ),
  )
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  form.append('file', new Blob([buf], { type: contentType }), `${itemId}.${ext}`)
  const created = await square('/v2/catalog/images', { method: 'POST', body: form })
  const id = created.image?.id || created.catalog_object?.id
  if (!id) throw new Error('upload returned no image id')
  return id
}

async function main() {
  console.log(`Rebuild Square images from eBay order${DRY ? ' [dry-run]' : ''} (max ${MAX_IMAGES})…`)
  const items = await listItems()
  let ok = 0
  let skip = 0
  let fail = 0

  for (const [index, item] of items.entries()) {
    const name = item.item_data?.name || item.id
    const ebayId = ebayIdFromItem(item)
    const label = `${index + 1}/${items.length} ${name.slice(0, 48)}`
    if (!ebayId) {
      skip += 1
      console.log(`· skip (no ebay sku) ${label}`)
      continue
    }
    try {
      const pics = (await fetchEbayPictures(ebayId)).slice(0, MAX_IMAGES)
      if (!pics.length) throw new Error('no eBay pictures')
      console.log(`→ ${label} — ${pics.length} eBay photos`)
      if (DRY) {
        ok += 1
        continue
      }

      const newIds = []
      for (const [i, url] of pics.entries()) {
        const id = await uploadImage(item.id, url, name, i === 0)
        newIds.push(id)
        await new Promise((r) => setTimeout(r, 120))
      }

      // Fresh version after uploads
      const fresh = await square(`/v2/catalog/object/${item.id}`)
      const latest = fresh.object
      const data = latest.item_data || {}
      await square('/v2/catalog/object', {
        method: 'POST',
        body: {
          idempotency_key: randomUUID(),
          object: {
            type: 'ITEM',
            id: latest.id,
            version: latest.version,
            present_at_all_locations: true,
            item_data: {
              name: data.name,
              description: data.description_plaintext || data.description || '',
              abbreviation: data.abbreviation,
              product_type: data.product_type || 'REGULAR',
              is_taxable: data.is_taxable !== false,
              ecom_visibility: data.ecom_visibility || 'VISIBLE',
              ...(data.categories ? { categories: data.categories } : {}),
              image_ids: newIds,
              variations: data.variations,
            },
          },
        },
      })
      ok += 1
      console.log(`✓ ${label}`)
    } catch (err) {
      fail += 1
      console.error(`✗ ${label}: ${err.message}`)
    }
  }

  console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail}`)
  if (fail) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
