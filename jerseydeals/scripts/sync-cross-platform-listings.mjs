#!/usr/bin/env node
/**
 * Bidirectional listing sync across eBay ↔ Square (Jersey Deals site pulls Square).
 *
 * - New / updated eBay actives → create or update Square (SKU ebay:{itemId})
 * - Linked Square items → revise eBay price / qty / title when they drift
 * - New Square-only sellable items → create eBay FixedPrice listing, write back SKU
 *
 * Join key: Square variation SKU = ebay:{eBayItemId}
 *
 * Requires: SQUARE_ACCESS_TOKEN, EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN
 * Optional: SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT, DRY_RUN=1, SKIP_EBAY_CREATE=1
 *
 *   node jerseydeals/scripts/sync-cross-platform-listings.mjs
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { polishTitle, polishDescription } from './lib/listing-copy.mjs'
import { inferClubAbbrev } from './lib/club-abbrev.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOLD_OUT_PATH = join(__dirname, '../public/sold-out.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const SQUARE_HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const SQUARE_VERSION = '2025-10-16'
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const DRY = process.env.DRY_RUN === '1'
const SKIP_EBAY_CREATE = process.env.SKIP_EBAY_CREATE === '1'

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
  ['SQUARE_ACCESS_TOKEN', SQUARE_TOKEN],
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

const DEFAULT_CATEGORY = '2887' // Soccer
const DEFAULT_POSTAL = process.env.EBAY_POSTAL_CODE || '14580'
const DEFAULT_LOCATION = process.env.EBAY_LOCATION || 'Webster, New York'
const DEFAULT_CONDITION = process.env.EBAY_DEFAULT_CONDITION_ID || '3000'

async function square(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${SQUARE_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SQUARE_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
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

async function ebayCall(callName, innerXml) {
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
  if (!res.ok) throw new Error(`${callName} HTTP ${res.status}: ${text.slice(0, 300)}`)
  return text
}

function xmlText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function decodeXml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function ebayIdFromSku(sku) {
  const m = String(sku || '').match(/^ebay:(\d+)/i)
  return m ? m[1] : ''
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function moneyCents(price) {
  if (price == null || Number.isNaN(Number(price))) return null
  return Math.round(Number(price) * 100)
}

function nearlySamePrice(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.005
}

function normalizeTitle(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function conditionIdFromText(text) {
  const raw = String(text || '')
  if (/\bcondition:\s*new\b/i.test(raw) || /\bnew with tags\b/i.test(raw)) return '1000'
  if (/\bcondition:\s*used\b/i.test(raw) || /\bpre-?owned\b/i.test(raw)) return '3000'
  return DEFAULT_CONDITION
}

async function primaryLocationId() {
  if (LOCATION_OVERRIDE) return LOCATION_OVERRIDE
  const data = await square('/v2/locations')
  const active = (data.locations || []).filter((l) => l.status === 'ACTIVE')
  const loc = active[0] || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location found')
  return loc.id
}

async function fetchEbaySoldIds(lookbackDays = 60) {
  const ids = new Set()
  const days = Math.min(Math.max(lookbackDays, 1), 60)
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= 10) {
    const xml = await ebayCall(
      'GetMyeBaySelling',
      `<SoldList>
    <DurationInDays>${days}</DurationInDays>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </SoldList>`,
    )
    if (!/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) break
    const pages = Number.parseInt((xml.match(/<TotalNumberOfPages>(\d+)/i) || [])[1] || '1', 10)
    if (Number.isFinite(pages) && pages > 0) totalPages = pages
    // Only ItemIDs inside OrderTransaction / Item blocks (avoid unrelated IDs).
    for (const block of xml.split(/<\/?OrderTransaction>/i)) {
      const id = (block.match(/<ItemID>(\d+)<\/ItemID>/) || [])[1]
      if (id) ids.add(id)
    }
    if (ids.size === 0) {
      for (const match of xml.matchAll(/<ItemID>(\d+)<\/ItemID>/g)) ids.add(match[1])
    }
    page += 1
  }
  return ids
}

async function fetchEbayActives() {
  const listings = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= 20) {
    const xml = await ebayCall(
      'GetMyeBaySelling',
      `<ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>`,
    )
    const ack = xmlText(xml, 'Ack')
    if (ack !== 'Success' && ack !== 'Warning') {
      throw new Error(`GetMyeBaySelling Ack=${ack}`)
    }
    totalPages = Number(xmlText(xml, 'TotalNumberOfPages') || xml.match(/<TotalNumberOfPages>(\d+)/)?.[1] || '1')
    const items = [...xml.matchAll(/<Item>([\s\S]*?)<\/Item>/gi)].map((m) => m[1])
    for (const item of items) {
      const id = xmlText(item, 'ItemID')
      const title = decodeXml(xmlText(item, 'Title'))
      if (!id || !title) continue
      const priceRaw =
        xmlText(item, 'CurrentPrice') ||
        (item.match(/<CurrentPrice[^>]*>([^<]+)/i) || [])[1] ||
        xmlText(item, 'BuyItNowPrice')
      const qtyRaw = xmlText(item, 'QuantityAvailable') || xmlText(item, 'Quantity') || '1'
      const pics = [...item.matchAll(/<PictureURL>([^<]+)<\/PictureURL>/gi)].map((m) =>
        decodeXml(m[1].trim()),
      )
      const gallery = decodeXml(xmlText(item, 'GalleryURL'))
      if (gallery && !pics.includes(gallery)) pics.unshift(gallery)
      listings.push({
        ebayId: id,
        title,
        price: priceRaw ? Number(priceRaw) : null,
        quantity: Number.parseInt(qtyRaw, 10) || 1,
        images: pics,
        url: decodeXml(xmlText(item, 'ViewItemURL')),
      })
    }
    page += 1
  }
  return listings
}

async function fetchEbayItemDetails(ebayId) {
  const xml = await ebayCall(
    'GetItem',
    `<ItemID>${ebayId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
  <IncludeItemSpecifics>true</IncludeItemSpecifics>`,
  )
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) {
    throw new Error(`GetItem failed for ${ebayId}`)
  }
  const descHtml = decodeXml(xmlText(xml, 'Description'))
  const title = decodeXml(xmlText(xml, 'Title'))
  const priceRaw =
    (xml.match(/<CurrentPrice[^>]*>([^<]+)/i) || [])[1] || xmlText(xml, 'StartPrice')
  const qty = Number.parseInt(xmlText(xml, 'Quantity') || '1', 10) || 1
  const qtySold = Number.parseInt(xmlText(xml, 'QuantitySold') || '0', 10) || 0
  const available = Math.max(0, qty - qtySold)
  const conditionId = xmlText(xml, 'ConditionID') || DEFAULT_CONDITION
  const pics = [...xml.matchAll(/<PictureURL>([^<]+)<\/PictureURL>/gi)].map((m) =>
    decodeXml(m[1].trim()),
  )
  return {
    ebayId,
    title,
    description: descHtml,
    price: priceRaw ? Number(priceRaw) : null,
    quantity: available || 1,
    conditionId,
    images: pics,
  }
}

async function listSquareCatalog() {
  const objects = []
  let cursor = ''
  do {
    const qs = new URLSearchParams({
      types: 'ITEM,ITEM_VARIATION,IMAGE',
      limit: '100',
    })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/catalog/list?${qs}`)
    objects.push(...(data.objects || []))
    cursor = data.cursor || ''
  } while (cursor)

  const items = new Map()
  const images = new Map()
  const variations = []
  for (const obj of objects) {
    if (obj.type === 'ITEM') items.set(obj.id, obj)
    if (obj.type === 'IMAGE') images.set(obj.id, obj)
    if (obj.type === 'ITEM_VARIATION') variations.push(obj)
  }

  const rows = []
  for (const variation of variations) {
    const vd = variation.item_variation_data || {}
    if (vd.sellable === false) continue
    const item = items.get(vd.item_id)
    if (!item?.item_data) continue
    const imageIds = item.item_data.image_ids || []
    const imageUrls = imageIds
      .map((id) => images.get(id)?.image_data?.url)
      .filter(Boolean)
    const amount = vd.price_money?.amount
    rows.push({
      variationId: variation.id,
      itemId: item.id,
      version: variation.version,
      itemVersion: item.version,
      sku: vd.sku || '',
      ebayId: ebayIdFromSku(vd.sku),
      title: item.item_data.name || '',
      description: item.item_data.description || '',
      variationName: vd.name || 'Standard',
      price: amount != null ? Number(amount) / 100 : null,
      currency: vd.price_money?.currency || 'USD',
      imageUrls,
      trackInventory: vd.track_inventory !== false,
    })
  }
  return rows
}

async function inventoryQty(variationId, locationId) {
  const data = await square('/v2/inventory/counts/batch-retrieve', {
    method: 'POST',
    body: { catalog_object_ids: [variationId], location_ids: [locationId] },
  })
  const row = (data.counts || []).find((c) => c.state === 'IN_STOCK')
  if (!row) return null
  return Number.parseFloat(row.quantity || '0') || 0
}

async function setSquareQty(variationId, locationId, qty) {
  if (DRY) return
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
            quantity: String(Math.max(0, qty)),
            state: 'IN_STOCK',
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })
}

async function findVariationBySku(sku) {
  const data = await square('/v2/catalog/search', {
    method: 'POST',
    body: {
      object_types: ['ITEM_VARIATION'],
      query: { exact_query: { attribute_name: 'sku', attribute_value: sku } },
      limit: 1,
    },
  })
  return (data.objects || [])[0] || null
}

async function upsertSquareFromEbay(ebay, locationId, { soldOutEbayIds } = {}) {
  const details = await fetchEbayItemDetails(ebay.ebayId)
  const sku = `ebay:${ebay.ebayId}`
  const amount = moneyCents(details.price ?? ebay.price)
  if (amount == null) return { status: 'skipped', reason: 'no-price', sku }
  if (soldOutEbayIds?.has(ebay.ebayId)) {
    return { status: 'skipped', reason: 'sold-out', sku }
  }
  // Completed eBay listings must not resurrect Square stock.
  if ((details.quantity ?? 0) <= 0) {
    return { status: 'skipped', reason: 'ebay-qty-0', sku }
  }

  const existing = await findVariationBySku(sku)
  const displayTitle = polishTitle(details.title || ebay.title, {})
  const description =
    details.description ||
    polishDescription(details.title || ebay.title, {})
  const abbreviation = inferClubAbbrev(displayTitle)
  const variationName = 'Standard'
  const qty = Math.max(1, details.quantity || ebay.quantity || 1)

  if (existing) {
    // Do not revive kits we already marked unsellable / sold-out.
    if (existing.item_variation_data?.sellable === false) {
      return { status: 'skipped', reason: 'square-unsellable', sku }
    }
    const variationId = existing.id
    const itemId = existing.item_variation_data?.item_id
    const prevPrice = existing.item_variation_data?.price_money?.amount
    let changed = prevPrice !== amount
    if (!DRY) {
      await square('/v2/catalog/object', {
        method: 'POST',
        body: {
          idempotency_key: randomUUID(),
          object: {
            type: 'ITEM_VARIATION',
            id: variationId,
            version: existing.version,
            present_at_all_locations: true,
            item_variation_data: {
              ...existing.item_variation_data,
              name: variationName,
              sku,
              pricing_type: 'FIXED_PRICING',
              price_money: { amount, currency: 'USD' },
              track_inventory: true,
              sellable: existing.item_variation_data?.sellable !== false,
              stockable: true,
            },
          },
        },
      })
      if (itemId) {
        const parent = await square(`/v2/catalog/object/${itemId}`)
        const obj = parent.object
        if (obj?.item_data) {
          const nextName = displayTitle
          const nextDesc = description.slice(0, 4096)
          if (obj.item_data.name !== nextName || obj.item_data.description !== nextDesc) {
            changed = true
            await square('/v2/catalog/object', {
              method: 'POST',
              body: {
                idempotency_key: randomUUID(),
                object: {
                  ...obj,
                  present_at_all_locations: true,
                  item_data: {
                    ...obj.item_data,
                    name: nextName,
                    description: nextDesc,
                    abbreviation,
                    product_type: 'REGULAR',
                  },
                },
              },
            })
          }
        }
      }
      await setSquareQty(variationId, locationId, qty)
    }
    return { status: changed ? 'updated' : 'unchanged', sku, variationId, itemId }
  }

  if (DRY) return { status: 'created', sku, dry: true }

  const itemTempId = `#item_${ebay.ebayId}`
  const varTempId = `#var_${ebay.ebayId}`
  const created = await square('/v2/catalog/batch-upsert', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      batches: [
        {
          objects: [
            {
              type: 'ITEM',
              id: itemTempId,
              present_at_all_locations: true,
              item_data: {
                name: displayTitle,
                description: description.slice(0, 4096),
                abbreviation,
                product_type: 'REGULAR',
                variations: [
                  {
                    type: 'ITEM_VARIATION',
                    id: varTempId,
                    present_at_all_locations: true,
                    item_variation_data: {
                      item_id: itemTempId,
                      name: variationName,
                      sku,
                      pricing_type: 'FIXED_PRICING',
                      price_money: { amount, currency: 'USD' },
                      track_inventory: true,
                      sellable: true,
                      stockable: true,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  })
  const idMap = created.id_mappings || []
  const itemId = idMap.find((m) => m.client_object_id === itemTempId)?.object_id
  const variationId = idMap.find((m) => m.client_object_id === varTempId)?.object_id
  if (!variationId) throw new Error(`Square create failed for ${sku}`)
  await setSquareQty(variationId, locationId, qty)

  // Primary image from eBay
  const imageUrl = (details.images || ebay.images || [])[0]
  if (imageUrl && itemId) {
    try {
      const imgRes = await fetch(imageUrl, { headers: { 'User-Agent': 'JerseyDealsSync/1.0' } })
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        const form = new FormData()
        form.append(
          'request',
          new Blob(
            [
              JSON.stringify({
                idempotency_key: randomUUID(),
                object_id: itemId,
                is_primary: true,
                image: {
                  type: 'IMAGE',
                  id: `#img_${ebay.ebayId}`,
                  image_data: { name: displayTitle.slice(0, 50) },
                },
              }),
            ],
            { type: 'application/json' },
          ),
        )
        form.append('file', new Blob([buf], { type: contentType }), `${ebay.ebayId}.jpg`)
        await square('/v2/catalog/images', { method: 'POST', body: form })
      }
    } catch (err) {
      console.warn(`  image skip ${sku}: ${err.message}`)
    }
  }

  return { status: 'created', sku, variationId, itemId }
}

async function reviseEbayInventory(ebayId, { price, quantity }) {
  if (DRY) return { ok: true, dry: true }
  const parts = []
  if (price != null) {
    parts.push(`<StartPrice>${Number(price).toFixed(2)}</StartPrice>`)
  }
  if (quantity != null) {
    parts.push(`<Quantity>${Math.max(0, Number(quantity) || 0)}</Quantity>`)
  }
  if (!parts.length) return { ok: true, skipped: true }
  const xml = await ebayCall(
    'ReviseInventoryStatus',
    `<InventoryStatus>
    <ItemID>${ebayId}</ItemID>
    ${parts.join('\n    ')}
  </InventoryStatus>`,
  )
  if (/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) return { ok: true }
  const short = (xml.match(/<ShortMessage>([^<]+)/i) || [])[1] || xml.slice(0, 160)
  return { ok: false, message: short }
}

async function reviseEbayItem(ebayId, { title, description }) {
  if (DRY) return { ok: true, dry: true }
  const chunks = []
  if (title) chunks.push(`<Title>${escapeXml(title.slice(0, 80))}</Title>`)
  if (description) {
    chunks.push(`<Description><![CDATA[${description}]]></Description>`)
  }
  if (!chunks.length) return { ok: true, skipped: true }
  const xml = await ebayCall(
    'ReviseFixedPriceItem',
    `<Item>
    <ItemID>${ebayId}</ItemID>
    ${chunks.join('\n    ')}
  </Item>`,
  )
  if (/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) return { ok: true }
  const short = (xml.match(/<ShortMessage>([^<]+)/i) || [])[1] || xml.slice(0, 160)
  return { ok: false, message: short }
}

function shippingXml() {
  return `<ShippingDetails>
    <ShippingType>Flat</ShippingType>
    <ShippingServiceOptions>
      <ShippingServicePriority>1</ShippingServicePriority>
      <ShippingService>USPSPriority</ShippingService>
      <ShippingServiceCost currencyID="USD">0.00</ShippingServiceCost>
      <ShippingServiceAdditionalCost currencyID="USD">0.00</ShippingServiceAdditionalCost>
      <FreeShipping>true</FreeShipping>
    </ShippingServiceOptions>
  </ShippingDetails>
  <ReturnPolicy>
    <ReturnsAcceptedOption>ReturnsNotAccepted</ReturnsAcceptedOption>
  </ReturnPolicy>`
}

async function createEbayFromSquare(row) {
  const pics = (row.imageUrls || []).slice(0, 12)
  if (!pics.length) return { ok: false, message: 'no images' }
  if (row.price == null) return { ok: false, message: 'no price' }
  const title = normalizeTitle(row.title).slice(0, 80)
  const description =
    row.description ||
    polishDescription(row.title, {}) ||
    `${row.title}`
  const conditionId = conditionIdFromText(row.description)
  const qty = Math.max(1, Number(row.quantity ?? 1) || 1)
  const pictureXml = pics.map((url) => `<PictureURL>${escapeXml(url)}</PictureURL>`).join('\n      ')

  if (DRY) return { ok: true, dry: true, ebayId: 'DRY_RUN' }

  const xml = await ebayCall(
    'AddFixedPriceItem',
    `<Item>
    <Title>${escapeXml(title)}</Title>
    <Description><![CDATA[${description}]]></Description>
    <PrimaryCategory><CategoryID>${DEFAULT_CATEGORY}</CategoryID></PrimaryCategory>
    <StartPrice>${Number(row.price).toFixed(2)}</StartPrice>
    <CategoryMappingAllowed>true</CategoryMappingAllowed>
    <ConditionID>${conditionId}</ConditionID>
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>2</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <Location>${escapeXml(DEFAULT_LOCATION)}</Location>
    <PostalCode>${escapeXml(DEFAULT_POSTAL)}</PostalCode>
    <Quantity>${qty}</Quantity>
    <PictureDetails>
      ${pictureXml}
    </PictureDetails>
    ${shippingXml()}
  </Item>`,
  )
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) {
    const short = (xml.match(/<ShortMessage>([^<]+)/i) || [])[1] || ''
    const long = (xml.match(/<LongMessage>([^<]+)/i) || [])[1] || xml.slice(0, 240)
    return { ok: false, message: short || long }
  }
  const ebayId = xmlText(xml, 'ItemID')
  if (!ebayId) return { ok: false, message: 'no ItemID returned' }
  return { ok: true, ebayId }
}

async function setSquareSku(variationId, sku) {
  if (DRY) return
  const data = await square(`/v2/catalog/object/${variationId}`)
  const obj = data.object
  if (!obj || obj.type !== 'ITEM_VARIATION') throw new Error('variation missing')
  await square('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      object: {
        type: 'ITEM_VARIATION',
        id: variationId,
        version: obj.version,
        present_at_all_locations: true,
        item_variation_data: {
          ...obj.item_variation_data,
          sku,
          sellable: obj.item_variation_data?.sellable !== false,
          track_inventory: true,
        },
      },
    },
  })
}

async function main() {
  console.log(
    `Cross-platform listing sync${DRY ? ' (dry-run)' : ''}${
      SKIP_EBAY_CREATE ? ' [skip eBay create]' : ''
    }`,
  )
  const locationId = await primaryLocationId()
  const [ebayActivesRaw, squareRows, ebaySoldIds] = await Promise.all([
    fetchEbayActives(),
    listSquareCatalog(),
    fetchEbaySoldIds(60),
  ])
  const soldOutEbayIds = new Set(ebaySoldIds)
  if (existsSync(SOLD_OUT_PATH)) {
    try {
      const soldOut = JSON.parse(readFileSync(SOLD_OUT_PATH, 'utf8'))
      for (const item of soldOut.items || []) {
        if (item.ebayId) soldOutEbayIds.add(String(item.ebayId))
        const fromSku = ebayIdFromSku(item.sku)
        if (fromSku) soldOutEbayIds.add(fromSku)
      }
    } catch {
      /* ignore */
    }
  }
  const ebayActives = ebayActivesRaw.filter((row) => !soldOutEbayIds.has(row.ebayId))
  console.log(
    `eBay actives=${ebayActives.length}/${ebayActivesRaw.length} Square sellable variations=${squareRows.length} soldSkip=${soldOutEbayIds.size}`,
  )

  // Attach Square qty
  for (const row of squareRows) {
    row.quantity = (await inventoryQty(row.variationId, locationId)) ?? 1
  }

  const squareByEbay = new Map()
  for (const row of squareRows) {
    if (row.ebayId) squareByEbay.set(row.ebayId, row)
  }

  let ebayToSquareCreated = 0
  let ebayToSquareUpdated = 0
  let ebayToSquareUnchanged = 0
  let ebayToSquareFailed = 0

  console.log('→ eBay → Square')
  for (const ebay of ebayActives) {
    try {
      const result = await upsertSquareFromEbay(ebay, locationId, { soldOutEbayIds })
      if (result.status === 'created') {
        ebayToSquareCreated += 1
        console.log(`  + Square ${ebay.title.slice(0, 60)}`)
      } else if (result.status === 'updated') {
        ebayToSquareUpdated += 1
        console.log(`  ~ Square ${ebay.title.slice(0, 60)}`)
      } else if (result.status === 'unchanged') {
        ebayToSquareUnchanged += 1
      } else {
        console.log(`  · skip ${ebay.ebayId}: ${result.reason}`)
      }
    } catch (err) {
      ebayToSquareFailed += 1
      console.warn(`  ✗ eBay→Square ${ebay.ebayId}: ${err.message}`)
    }
  }

  // Refresh Square map after imports
  const squareRowsAfter = await listSquareCatalog()
  for (const row of squareRowsAfter) {
    row.quantity = (await inventoryQty(row.variationId, locationId)) ?? 1
  }
  const ebayActiveIds = new Set(ebayActives.map((e) => e.ebayId))
  const squareByEbayAfter = new Map()
  for (const row of squareRowsAfter) {
    if (row.ebayId) squareByEbayAfter.set(row.ebayId, row)
  }

  let squareToEbayRevised = 0
  let squareToEbayCreated = 0
  let squareToEbayFailed = 0

  console.log('→ Square → eBay')
  for (const row of squareRowsAfter) {
    // Skip zero-qty — sold reconcile owns those
    if ((row.quantity ?? 0) <= 0) continue

    if (row.ebayId) {
      if (!ebayActiveIds.has(row.ebayId)) {
        // Linked but not active on eBay (ended/sold) — leave to reconcile:sold
        continue
      }
      const ebay = ebayActives.find((e) => e.ebayId === row.ebayId)
      if (!ebay) continue
      try {
        // Title/description SoT is eBay → Square. Push price always when Square drifts;
        // only raise eBay qty (never clobber a multi-qty eBay listing down to Square's 1).
        const priceChanged = !nearlySamePrice(row.price, ebay.price)
        const shouldRaiseQty = Number(row.quantity) > Number(ebay.quantity)
        if (priceChanged || shouldRaiseQty) {
          const inv = await reviseEbayInventory(row.ebayId, {
            price: priceChanged ? row.price : undefined,
            quantity: shouldRaiseQty ? row.quantity : undefined,
          })
          if (!inv.ok) throw new Error(inv.message || 'revise inventory failed')
          squareToEbayRevised += 1
          console.log(
            `  ~ eBay ${row.title.slice(0, 50)} ($${ebay.price}→$${row.price}${
              shouldRaiseQty ? `, qty ${ebay.quantity}→${row.quantity}` : ''
            })`,
          )
        }
      } catch (err) {
        squareToEbayFailed += 1
        console.warn(`  ✗ Square→eBay revise ${row.ebayId}: ${err.message}`)
      }
      continue
    }

    if (SKIP_EBAY_CREATE) continue
    try {
      const created = await createEbayFromSquare(row)
      if (!created.ok) {
        console.log(`  · skip create ${row.title.slice(0, 50)}: ${created.message}`)
        continue
      }
      await setSquareSku(row.variationId, `ebay:${created.ebayId}`)
      squareToEbayCreated += 1
      console.log(`  + eBay ${row.title.slice(0, 60)} → ${created.ebayId}`)
    } catch (err) {
      squareToEbayFailed += 1
      console.warn(`  ✗ Square→eBay create ${row.variationId}: ${err.message}`)
    }
  }

  console.log('')
  console.log(
    `Done. eBay→Square created=${ebayToSquareCreated} updated=${ebayToSquareUpdated} unchanged=${ebayToSquareUnchanged} failed=${ebayToSquareFailed}`,
  )
  console.log(
    `      Square→eBay created=${squareToEbayCreated} revised=${squareToEbayRevised} failed=${squareToEbayFailed}`,
  )
  console.log(`Next: sync:square → sync:ebay-details → square:buyable-checkout (for new Payment Links).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
