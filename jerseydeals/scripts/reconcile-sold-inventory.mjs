#!/usr/bin/env node
/**
 * When something sells OR is removed on Square OR eBay, clear it everywhere:
 *  - Square inventory → 0, variation unsellable
 *  - Delete Square Payment Links (regular + first10)
 *  - End matching eBay listing (sku ebay:{itemId})
 *  - Drop from listings.json + checkout-links.json
 *  - Write public/sold-out.json for instant client filtering
 *
 * Sale / removal signals:
 *  - Square COMPLETED orders (lookback SOLD_LOOKBACK_DAYS)
 *  - Square inventory qty 0
 *  - Square variation marked unsellable (still linked to an active eBay item)
 *  - eBay SoldList (GetMyeBaySelling) mapped via sku ebay:{itemId}
 *  - eBay UnsoldList / ended listings (ActiveList miss) mapped the same way
 *
 * Requires: SQUARE_ACCESS_TOKEN
 * Optional: EBAY_* (needed for eBay sold/ended detection + EndItem), SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT
 *
 *   node jerseydeals/scripts/reconcile-sold-inventory.mjs
 *   DRY_RUN=1 node jerseydeals/scripts/reconcile-sold-inventory.mjs
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const LINKS_PATH = join(__dirname, '../public/checkout-links.json')
const SOLD_OUT_PATH = join(__dirname, '../public/sold-out.json')
const EXCEPTIONS_PATH = join(__dirname, '../public/reconcile-exceptions.json')
const STATE_PATH = join(__dirname, '../.sold-reconcile-state.json')

const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2026-04-26'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const DRY = process.env.DRY_RUN === '1'
const LOOKBACK_DAYS = Number.parseInt(process.env.SOLD_LOOKBACK_DAYS || '30', 10)

const EBAY = {
  app: process.env.EBAY_APP_ID,
  cert: process.env.EBAY_CERT_ID,
  dev: process.env.EBAY_DEV_ID,
  token: process.env.EBAY_USER_TOKEN,
  endpoint: 'https://api.ebay.com/ws/api.dll',
  compat: '1271',
  ns: 'urn:ebay:apis:eBLBaseComponents',
}
const HAS_EBAY = Boolean(EBAY.app && EBAY.cert && EBAY.dev && EBAY.token)

if (!TOKEN) {
  console.error('Missing required secret: SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': API_VERSION,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
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
  if (!loc?.id) throw new Error('No Square location found')
  return loc.id
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function ebayIdFromSku(sku) {
  const m = String(sku || '').match(/^ebay:(\d+)/i)
  return m ? m[1] : ''
}

async function ebayCall(callName, innerXml) {
  if (!HAS_EBAY) throw new Error('eBay credentials missing')
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
  return res.text()
}

async function endEbayListing(itemId) {
  if (!HAS_EBAY || !itemId) return { ok: false, skipped: true }
  const text = await ebayCall(
    'EndItem',
    `<ItemID>${itemId}</ItemID>
  <EndingReason>NotAvailable</EndingReason>`,
  )
  if (/<Ack>(Success|Warning)<\/Ack>/i.test(text)) return { ok: true }
  const short = (text.match(/<ShortMessage>([^<]+)/i) || [])[1] || ''
  const long = (text.match(/<LongMessage>([^<]+)/i) || [])[1] || ''
  // Already ended / not found — treat as success for reconcile
  if (/already|ended|not found|invalid item/i.test(`${short} ${long}`)) {
    return { ok: true, already: true, message: short || long }
  }
  return { ok: false, message: short || long || text.slice(0, 200) }
}

/** Map ebay item id → Square variation meta from local catalog files. */
function buildEbayToVariationMap(listings, links, soldOutItems = []) {
  const map = new Map()
  const put = (ebayId, row) => {
    if (!ebayId || !row?.variationId || map.has(ebayId)) return
    map.set(ebayId, {
      variationId: row.variationId,
      title: row.title || ebayId,
      sku: row.sku || `ebay:${ebayId}`,
      itemId: row.itemId || '',
    })
  }
  for (const row of listings || []) {
    put(ebayIdFromSku(row.sku), {
      variationId: row.id,
      title: row.title,
      sku: row.sku,
      itemId: row.itemId,
    })
  }
  for (const row of links || []) {
    put(ebayIdFromSku(row.sku), {
      variationId: row.variationId,
      title: row.title,
      sku: row.sku,
      itemId: row.itemId,
    })
  }
  // Keep mapping after a kit is removed from listings so re-runs stay idempotent.
  for (const row of soldOutItems || []) {
    put(row.ebayId || ebayIdFromSku(row.sku), {
      variationId: row.variationId,
      title: row.title,
      sku: row.sku || (row.ebayId ? `ebay:${row.ebayId}` : ''),
      itemId: row.itemId,
    })
  }
  return map
}

/**
 * eBay SoldList → Square variation ids (via sku ebay:{itemId}).
 * This closes the gap where a kit sells on eBay but Square qty stays 1.
 */
async function collectEbaySoldVariationIds({ keepInStock, listings, links, soldOutItems }) {
  const sold = new Map()
  if (!HAS_EBAY) return sold

  const keep = new Set(keepInStock || [])
  const byEbay = buildEbayToVariationMap(listings, links, soldOutItems)
  if (byEbay.size === 0) return sold

  const days = Math.min(Math.max(LOOKBACK_DAYS, 1), 60)
  let page = 1
  let totalPages = 1
  const soldEbayIds = new Set()

  while (page <= totalPages && page <= 10) {
    const text = await ebayCall(
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
    if (!/<Ack>(Success|Warning)<\/Ack>/i.test(text)) {
      const short = (text.match(/<ShortMessage>([^<]+)/i) || [])[1] || text.slice(0, 160)
      throw new Error(`eBay SoldList failed: ${short}`)
    }
    const pages = Number.parseInt((text.match(/<TotalNumberOfPages>(\d+)/i) || [])[1] || '1', 10)
    if (Number.isFinite(pages) && pages > 0) totalPages = pages

    for (const match of text.matchAll(/<ItemID>(\d+)<\/ItemID>/g)) {
      soldEbayIds.add(match[1])
    }
    page += 1
  }

  // Optional deep check: GetItem for catalog eBay ids missing from SoldList.
  // Off by default (SoldList is enough); set EBAY_DEEP_CHECK=1 to enable.
  if (process.env.EBAY_DEEP_CHECK === '1') {
    for (const [ebayId, meta] of byEbay) {
      if (soldEbayIds.has(ebayId)) continue
      if (keep.has(meta.variationId)) continue
      try {
        const text = await ebayCall(
          'GetItem',
          `<ItemID>${ebayId}</ItemID><DetailLevel>ReturnSummary</DetailLevel>`,
        )
        if (!/<Ack>(Success|Warning)<\/Ack>/i.test(text)) continue
        const status = (text.match(/<ListingStatus>([^<]+)<\/ListingStatus>/i) || [])[1] || ''
        const qtySold = Number.parseInt((text.match(/<QuantitySold>(\d+)/i) || [])[1] || '0', 10)
        if (/^completed$/i.test(status) || qtySold > 0) {
          soldEbayIds.add(ebayId)
        }
      } catch {
        /* ignore per-item failures */
      }
    }
  }

  for (const ebayId of soldEbayIds) {
    const meta = byEbay.get(ebayId)
    if (!meta?.variationId || keep.has(meta.variationId)) continue
    sold.set(meta.variationId, {
      orderIds: [],
      title: meta.title,
      qty: 1,
      sku: meta.sku,
      itemId: meta.itemId,
      ebayId,
      fromEbaySold: true,
    })
  }

  return sold
}

/** Active eBay ItemIDs (paginated GetMyeBaySelling ActiveList). */
async function fetchEbayActiveIds() {
  const ids = new Set()
  if (!HAS_EBAY) return ids
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= 20) {
    const text = await ebayCall(
      'GetMyeBaySelling',
      `<ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </ActiveList>`,
    )
    if (!/<Ack>(Success|Warning)<\/Ack>/i.test(text)) {
      const short = (text.match(/<ShortMessage>([^<]+)/i) || [])[1] || text.slice(0, 160)
      throw new Error(`eBay ActiveList failed: ${short}`)
    }
    const pages = Number.parseInt((text.match(/<TotalNumberOfPages>(\d+)/i) || [])[1] || '1', 10)
    if (Number.isFinite(pages) && pages > 0) totalPages = pages
    for (const match of text.matchAll(/<ItemID>(\d+)<\/ItemID>/g)) {
      ids.add(match[1])
    }
    page += 1
  }
  return ids
}

/** Ended-without-sale eBay ItemIDs (UnsoldList). */
async function fetchEbayUnsoldIds() {
  const ids = new Set()
  if (!HAS_EBAY) return ids
  const days = Math.min(Math.max(LOOKBACK_DAYS, 1), 60)
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= 10) {
    const text = await ebayCall(
      'GetMyeBaySelling',
      `<UnsoldList>
    <DurationInDays>${days}</DurationInDays>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </UnsoldList>`,
    )
    if (!/<Ack>(Success|Warning)<\/Ack>/i.test(text)) {
      const short = (text.match(/<ShortMessage>([^<]+)/i) || [])[1] || text.slice(0, 160)
      throw new Error(`eBay UnsoldList failed: ${short}`)
    }
    const pages = Number.parseInt((text.match(/<TotalNumberOfPages>(\d+)/i) || [])[1] || '1', 10)
    if (Number.isFinite(pages) && pages > 0) totalPages = pages
    for (const match of text.matchAll(/<ItemID>(\d+)<\/ItemID>/g)) {
      ids.add(match[1])
    }
    page += 1
  }
  return ids
}

/**
 * Square catalog rows with ebay:{id} SKUs (includes unsellable — needed for EndItem).
 */
async function listSquareEbayLinkedVariations() {
  const objects = []
  let cursor = ''
  do {
    const qs = new URLSearchParams({ types: 'ITEM,ITEM_VARIATION', limit: '100' })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/catalog/list?${qs}`)
    objects.push(...(data.objects || []))
    cursor = data.cursor || ''
  } while (cursor)

  const items = new Map()
  for (const obj of objects) {
    if (obj.type === 'ITEM') items.set(obj.id, obj)
  }
  const rows = []
  for (const obj of objects) {
    if (obj.type !== 'ITEM_VARIATION') continue
    const vd = obj.item_variation_data || {}
    const ebayId = ebayIdFromSku(vd.sku)
    if (!ebayId) continue
    const parent = items.get(vd.item_id)
    rows.push({
      variationId: obj.id,
      itemId: vd.item_id || '',
      sku: vd.sku || '',
      ebayId,
      title: parent?.item_data?.name || vd.name || ebayId,
      sellable: vd.sellable !== false,
    })
  }
  return rows
}

/**
 * Removals that are not (yet) sales:
 *  - Linked eBay id missing from ActiveList (ended / unsold / taken down)
 *  - Square marked unsellable while eBay listing is still active → EndItem
 */
async function collectRemovedVariationIds({ keepInStock, listings, links, soldOutItems }) {
  const removed = new Map()
  const keep = new Set(keepInStock || [])
  const byEbay = buildEbayToVariationMap(listings, links, soldOutItems)

  let squareLinked = []
  try {
    squareLinked = await listSquareEbayLinkedVariations()
  } catch (err) {
    console.warn(`Square ebay-link scan skipped: ${err.message}`)
  }
  for (const row of squareLinked) {
    if (!byEbay.has(row.ebayId)) {
      byEbay.set(row.ebayId, {
        variationId: row.variationId,
        title: row.title,
        sku: row.sku,
        itemId: row.itemId,
      })
    }
  }
  const squareByEbay = new Map(squareLinked.map((r) => [r.ebayId, r]))

  if (!HAS_EBAY) {
    // Without eBay we can still clear site/Square for unsellable linked rows already known.
    for (const row of squareLinked) {
      if (row.sellable || keep.has(row.variationId)) continue
      removed.set(row.variationId, {
        orderIds: [],
        title: row.title,
        qty: 0,
        sku: row.sku,
        itemId: row.itemId,
        ebayId: row.ebayId,
        fromSquareUnsellable: true,
      })
    }
    return removed
  }

  let activeIds = new Set()
  let unsoldIds = new Set()
  try {
    activeIds = await fetchEbayActiveIds()
  } catch (err) {
    console.warn(`eBay ActiveList skipped: ${err.message}`)
    return removed
  }
  try {
    unsoldIds = await fetchEbayUnsoldIds()
  } catch (err) {
    console.warn(`eBay UnsoldList skipped: ${err.message}`)
  }

  for (const [ebayId, meta] of byEbay) {
    if (!meta?.variationId || keep.has(meta.variationId)) continue
    const square = squareByEbay.get(ebayId)
    const isActive = activeIds.has(ebayId)

    if (isActive) {
      // Merchant removed / hid on Square — end the live eBay twin.
      if (square && square.sellable === false) {
        removed.set(meta.variationId, {
          orderIds: [],
          title: meta.title || square.title,
          qty: 0,
          sku: meta.sku || square.sku,
          itemId: meta.itemId || square.itemId,
          ebayId,
          fromSquareUnsellable: true,
        })
      }
      continue
    }

    // Not active on eBay → clear Square + site (sold path also covers SoldList).
    removed.set(meta.variationId, {
      orderIds: [],
      title: meta.title,
      qty: 0,
      sku: meta.sku,
      itemId: meta.itemId,
      ebayId,
      fromEbayUnsold: unsoldIds.has(ebayId),
      fromEbayEnded: !unsoldIds.has(ebayId),
    })
  }

  return removed
}

async function setInventoryZero(variationId, locationId) {
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
            quantity: '0',
            state: 'IN_STOCK',
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })
}

async function markVariationUnsellable(variationId) {
  const data = await square(`/v2/catalog/object/${variationId}?include_related_objects=false`)
  const obj = data.object
  if (!obj || obj.type !== 'ITEM_VARIATION') return { sku: '', itemId: '', title: '' }
  const vd = obj.item_variation_data || {}
  const meta = {
    sku: vd.sku || '',
    itemId: vd.item_id || '',
    title: vd.name || '',
  }
  if (vd.sellable === false) return meta
  obj.item_variation_data = {
    ...vd,
    sellable: false,
    track_inventory: true,
  }
  await square('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      object: obj,
    },
  })
  return meta
}

async function deletePaymentLink(paymentLinkId) {
  if (!paymentLinkId) return
  try {
    await square(`/v2/online-checkout/payment-links/${paymentLinkId}`, { method: 'DELETE' })
  } catch {
    /* already gone */
  }
}

async function collectSoldVariationIds(locationId, { ignoredOrderIds, keepInStock }) {
  const ignoredOrders = new Set(ignoredOrderIds || [])
  const keep = new Set(keepInStock || [])
  const sold = new Map() // variationId -> { orderIds, title, qty, sources... }
  const start = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  let cursor = ''
  do {
    const body = {
      location_ids: [locationId],
      query: {
        filter: {
          state_filter: { states: ['COMPLETED'] },
          date_time_filter: {
            updated_at: { start_at: start },
          },
        },
        sort: { sort_field: 'UPDATED_AT', sort_order: 'DESC' },
      },
      limit: 100,
    }
    if (cursor) body.cursor = cursor
    const data = await square('/v2/orders/search', { method: 'POST', body })
    for (const order of data.orders || []) {
      if (ignoredOrders.has(order.id)) continue
      for (const line of order.line_items || []) {
        const variationId = line.catalog_object_id
        if (!variationId || keep.has(variationId)) continue
        const prev = sold.get(variationId) || {
          orderIds: [],
          title: line.name || variationId,
          qty: 0,
          fromSquareOrder: true,
        }
        prev.orderIds.push(order.id)
        prev.qty += Number.parseFloat(line.quantity || '1') || 1
        prev.title = line.name || prev.title
        prev.fromSquareOrder = true
        sold.set(variationId, prev)
      }
    }
    cursor = data.cursor || ''
  } while (cursor)

  // Also catch tracked variations already at qty 0 (Payment Link may have decremented)
  const links = loadJson(LINKS_PATH, { links: [] })
  const listings = loadJson(LISTINGS_PATH, { listings: [] })
  const candidates = new Set([
    ...(links.links || []).map((r) => r.variationId).filter(Boolean),
    ...(listings.listings || []).map((r) => r.id).filter(Boolean),
  ])
  const ids = [...candidates]
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    if (!chunk.length) continue
    const data = await square('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: { catalog_object_ids: chunk, location_ids: [locationId] },
    })
    for (const row of data.counts || []) {
      if (row.state && row.state !== 'IN_STOCK') continue
      const qty = Number.parseFloat(row.quantity || '0') || 0
      if (qty > 0) continue
      const variationId = row.catalog_object_id
      if (keep.has(variationId)) continue
      const listing = (listings.listings || []).find((l) => l.id === variationId)
      const link = (links.links || []).find((l) => l.variationId === variationId)
      const prev = sold.get(variationId) || {
        orderIds: [],
        title: listing?.title || link?.title || variationId,
        qty: 0,
      }
      prev.fromInventoryZero = true
      prev.title = prev.title || listing?.title || link?.title || variationId
      sold.set(variationId, prev)
    }
  }

  const soldOutFile = loadJson(SOLD_OUT_PATH, { items: [] })

  // eBay sales must also delist Square + Jersey Deals (was the Spurs gap).
  try {
    const ebaySold = await collectEbaySoldVariationIds({
      keepInStock: keep,
      listings: listings.listings || [],
      links: links.links || [],
      soldOutItems: soldOutFile.items || [],
    })
    for (const [variationId, info] of ebaySold) {
      const prev = sold.get(variationId) || {
        orderIds: [],
        title: info.title,
        qty: 0,
      }
      prev.fromEbaySold = true
      prev.ebayId = info.ebayId || prev.ebayId
      prev.sku = info.sku || prev.sku
      prev.itemId = info.itemId || prev.itemId
      prev.title = info.title || prev.title
      prev.qty = Math.max(prev.qty || 0, info.qty || 1)
      sold.set(variationId, prev)
    }
    console.log(`eBay sold mapped to catalog: ${ebaySold.size}`)
  } catch (err) {
    console.warn(`eBay sold scan skipped: ${err.message}`)
  }

  // Ended / removed (not necessarily sold) — keep Square + site + eBay twins aligned.
  try {
    const removed = await collectRemovedVariationIds({
      keepInStock: keep,
      listings: listings.listings || [],
      links: links.links || [],
      soldOutItems: soldOutFile.items || [],
    })
    let added = 0
    for (const [variationId, info] of removed) {
      const prev = sold.get(variationId)
      if (prev) {
        // Already flagged as sold/qty0 — just enrich sources.
        if (info.fromEbayUnsold) prev.fromEbayUnsold = true
        if (info.fromEbayEnded) prev.fromEbayEnded = true
        if (info.fromSquareUnsellable) prev.fromSquareUnsellable = true
        prev.ebayId = info.ebayId || prev.ebayId
        prev.sku = info.sku || prev.sku
        sold.set(variationId, prev)
        continue
      }
      sold.set(variationId, { ...info })
      added += 1
    }
    console.log(`eBay/Square removals mapped to catalog: ${added} (scanned ${removed.size})`)
  } catch (err) {
    console.warn(`removal scan skipped: ${err.message}`)
  }

  return sold
}

async function delistVariation(variationId, meta, locationId, linksFile) {
  const result = {
    variationId,
    title: meta.title,
    squareQtyZero: false,
    unsellable: false,
    ebayId: '',
    ebayEnded: false,
    linksDeleted: 0,
    error: '',
  }

  try {
    if (!DRY) await setInventoryZero(variationId, locationId)
    result.squareQtyZero = true
  } catch (err) {
    result.error = `inventory: ${err.message}`
  }

  try {
    const cat = DRY
      ? { sku: meta.sku || '', itemId: meta.itemId || '', title: meta.title }
      : await markVariationUnsellable(variationId)
    result.unsellable = true
    result.ebayId = ebayIdFromSku(cat.sku || meta.sku || '')
    if (!result.title || result.title === variationId) result.title = cat.title || meta.title
    result.itemId = cat.itemId || meta.itemId || ''
    if (!meta.itemId && cat.itemId) meta.itemId = cat.itemId
    if (!meta.sku && cat.sku) meta.sku = cat.sku
  } catch (err) {
    result.error = [result.error, `catalog: ${err.message}`].filter(Boolean).join('; ')
    result.ebayId = ebayIdFromSku(meta.sku || '')
  }

  const linkRow = (linksFile.links || []).find((r) => r.variationId === variationId)
  if (linkRow) {
    result.ebayId = result.ebayId || ebayIdFromSku(linkRow.sku)
    if (!DRY) {
      await deletePaymentLink(linkRow.paymentLinkId)
      await deletePaymentLink(linkRow.discountPaymentLinkId)
    }
    result.linksDeleted =
      Number(Boolean(linkRow.paymentLinkId)) + Number(Boolean(linkRow.discountPaymentLinkId))
  }

  if (result.ebayId) {
    if (DRY) {
      result.ebayEnded = true
    } else {
      const ended = await endEbayListing(result.ebayId)
      result.ebayEnded = Boolean(ended.ok)
      if (!ended.ok && !ended.skipped) {
        result.error = [result.error, `ebay: ${ended.message}`].filter(Boolean).join('; ')
      }
    }
  } else if (!HAS_EBAY) {
    /* no ebay creds */
  }

  return result
}

async function main() {
  const locationId = await primaryLocationId()
  console.log(
    `Reconcile sold inventory @ ${locationId} (lookback ${LOOKBACK_DAYS}d${DRY ? ', dry-run' : ''}${
      HAS_EBAY ? ', ebay on' : ', ebay skip'
    })`,
  )

  const state = loadJson(STATE_PATH, {
    processedOrderIds: [],
    soldVariationIds: [],
    ignoredOrderIds: [],
    keepInStockVariationIds: [],
  })
  const exceptions = loadJson(EXCEPTIONS_PATH, {
    ignoredOrderIds: [],
    keepInStockVariationIds: [],
  })
  const ignoredOrderIds = [
    ...new Set([...(state.ignoredOrderIds || []), ...(exceptions.ignoredOrderIds || [])]),
  ]
  const keepInStock = [
    ...new Set([
      ...(state.keepInStockVariationIds || []),
      ...(exceptions.keepInStockVariationIds || []),
    ]),
  ]
  const soldMap = await collectSoldVariationIds(locationId, {
    ignoredOrderIds,
    keepInStock,
  })
  console.log(`Candidates to delist: ${soldMap.size} (keepInStock=${keepInStock.length})`)

  const already = new Set(state.soldVariationIds || [])
  const linksFile = loadJson(LINKS_PATH, { links: [] })
  const listingsFile = loadJson(LISTINGS_PATH, { listings: [] })
  const soldOutFile = loadJson(SOLD_OUT_PATH, { syncedAt: '', count: 0, items: [] })
  for (const item of soldOutFile.items || []) {
    if (item.variationId) already.add(item.variationId)
  }

  const originalListings = [...(listingsFile.listings || [])]
  const originalLinks = [...(linksFile.links || [])]
  const results = []

  for (const [variationId, info] of soldMap) {
    const listing = originalListings.find((l) => l.id === variationId)
    const link = originalLinks.find((l) => l.variationId === variationId)
    // Already reconciled and gone from site catalog — don't re-hit APIs every run.
    if (already.has(variationId) && !listing && !link) {
      continue
    }
    const meta = {
      title: info.title,
      sku: info.sku || listing?.sku || link?.sku || '',
      itemId: info.itemId || listing?.itemId || link?.itemId || '',
    }
    const why = [
      info.fromEbaySold ? 'ebay-sold' : '',
      info.fromEbayUnsold ? 'ebay-unsold' : '',
      info.fromEbayEnded ? 'ebay-ended' : '',
      info.fromSquareOrder ? 'square-order' : '',
      info.fromInventoryZero ? 'square-qty-0' : '',
      info.fromSquareUnsellable ? 'square-unsellable' : '',
    ]
      .filter(Boolean)
      .join('+')
    console.log(`→ delist ${meta.title.slice(0, 70)} (${variationId}) [${why || 'unknown'}]`)
    const row = await delistVariation(variationId, { ...meta }, locationId, {
      links: originalLinks,
    })
    row.itemId = meta.itemId
    row.sources = why ? why.split('+') : ['unknown']
    results.push(row)
    already.add(variationId)
    for (const oid of info.orderIds || []) {
      if (!state.processedOrderIds.includes(oid)) state.processedOrderIds.push(oid)
    }
  }

  const soldIds = new Set(already)
  const beforeListings = originalListings.length
  listingsFile.listings = originalListings.filter((l) => !soldIds.has(l.id))
  listingsFile.count = listingsFile.listings.length
  listingsFile.syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  const beforeLinks = originalLinks.length
  linksFile.links = originalLinks.filter((l) => !soldIds.has(l.variationId))
  linksFile.count = linksFile.links.length
  linksFile.syncedAt = listingsFile.syncedAt

  const byId = new Map((soldOutFile.items || []).map((i) => [i.variationId, i]))
  for (const r of results) {
    const listing = originalListings.find((l) => l.id === r.variationId)
    const link = originalLinks.find((l) => l.variationId === r.variationId)
    byId.set(r.variationId, {
      variationId: r.variationId,
      itemId: r.itemId || listing?.itemId || link?.itemId || '',
      title: r.title || listing?.title || link?.title || r.variationId,
      ebayId: r.ebayId || ebayIdFromSku(listing?.sku || link?.sku),
      soldAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      sources: Array.isArray(r.sources) && r.sources.length ? r.sources : ['square-order-or-zero-qty'],
    })
  }

  const soldItems = [...byId.values()].sort((a, b) =>
    String(b.soldAt || '').localeCompare(String(a.soldAt || '')),
  )

  const soldOutPayload = {
    syncedAt: listingsFile.syncedAt,
    count: soldItems.length,
    items: soldItems,
  }

  state.soldVariationIds = [...soldIds]
  state.processedOrderIds = (state.processedOrderIds || []).slice(-500)
  state.syncedAt = listingsFile.syncedAt

  if (!DRY) {
    saveJson(LISTINGS_PATH, listingsFile)
    saveJson(LINKS_PATH, linksFile)
    saveJson(SOLD_OUT_PATH, soldOutPayload)
    saveJson(STATE_PATH, state)
  }

  const endedEbay = results.filter((r) => r.ebayEnded).length
  const errors = results.filter((r) => r.error)
  console.log(
    `Done. delisted=${results.length} listings ${beforeListings}→${listingsFile.listings.length} links ${beforeLinks}→${linksFile.links.length} ebayEnded=${endedEbay}`,
  )
  if (errors.length) {
    console.warn('Errors:')
    for (const e of errors) console.warn(`  ${e.variationId}: ${e.error}`)
  }

  // Refresh Square Online buy-bridge so Buy Now disappears for sold kits
  if (!DRY && results.length > 0) {
    try {
      const { spawnSync } = await import('node:child_process')
      const polish = spawnSync(process.execPath, [join(__dirname, 'polish-square-storefront.mjs')], {
        stdio: 'inherit',
        env: process.env,
      })
      if (polish.status !== 0) {
        console.warn('storefront polish follow-up failed; run: npm run square:polish-storefront')
      }
    } catch (err) {
      console.warn(`storefront polish skipped: ${err.message}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
