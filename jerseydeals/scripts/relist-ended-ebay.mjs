#!/usr/bin/env node
/**
 * Relist Square-linked kits that ended / completed on eBay but still have stock.
 *
 * RelistFixedPriceItem returns a new ItemID → Square SKU is updated to ebay:{newId}.
 *
 * Requires: SQUARE_ACCESS_TOKEN, EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN
 * Optional: DRY_RUN=1, LIMIT=N, DELAY_MS=400
 *
 *   node jerseydeals/scripts/relist-ended-ebay.mjs
 */

import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const SQUARE_HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const SQUARE_VERSION = '2025-10-16'
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const DRY = process.env.DRY_RUN === '1'
const LIMIT = Number.parseInt(process.env.LIMIT || '0', 10) || 0
const DELAY_MS = Number.parseInt(process.env.DELAY_MS || '400', 10) || 400

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${SQUARE_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SQUARE_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      json?.errors?.map((e) => `${e.code}: ${e.detail}`).join('; ') ||
        `Square ${method} ${path} HTTP ${res.status}`,
    )
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

function ebayIdFromSku(sku) {
  const m = String(sku || '').match(/^ebay:(\d+)/i)
  return m ? m[1] : ''
}

async function primaryLocationId() {
  if (LOCATION_OVERRIDE) return LOCATION_OVERRIDE
  const data = await square('/v2/locations')
  const loc =
    (data.locations || []).find((l) => l.status === 'ACTIVE') || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location')
  return loc.id
}

async function fetchActiveEbayIds() {
  const ids = new Set()
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= 20) {
    const xml = await ebayCall(
      'GetMyeBaySelling',
      `<ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </ActiveList>`,
    )
    if (!/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) {
      throw new Error(`ActiveList failed: ${(xml.match(/<ShortMessage>([^<]+)/) || [])[1] || 'unknown'}`)
    }
    const pages = Number.parseInt((xml.match(/<TotalNumberOfPages>(\d+)/) || [])[1] || '1', 10)
    if (Number.isFinite(pages) && pages > 0) totalPages = pages
    const block = (xml.match(/<ActiveList>[\s\S]*?<\/ActiveList>/i) || [])[0] || xml
    for (const m of block.matchAll(/<ItemID>(\d+)<\/ItemID>/g)) ids.add(m[1])
    page += 1
  }
  return ids
}

async function listSquareEbayLinked(locationId) {
  const rows = []
  let cursor
  do {
    const qs = new URLSearchParams({ types: 'ITEM,ITEM_VARIATION', limit: '100' })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/catalog/list?${qs}`)
    const objects = data.objects || []
    const parents = new Map(
      objects.filter((o) => o.type === 'ITEM').map((o) => [o.id, o]),
    )
    for (const obj of objects) {
      if (obj.type !== 'ITEM_VARIATION') continue
      const vd = obj.item_variation_data || {}
      if (vd.sellable === false) continue
      const ebayId = ebayIdFromSku(vd.sku)
      if (!ebayId) continue
      const parent = parents.get(vd.item_id)
      rows.push({
        variationId: obj.id,
        version: obj.version,
        ebayId,
        title: parent?.item_data?.name || vd.name || ebayId,
        sku: vd.sku,
        itemVariationData: vd,
      })
    }
    cursor = data.cursor
  } while (cursor)

  // qty
  const out = []
  for (const row of rows) {
    const inv = await square('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: {
        catalog_object_ids: [row.variationId],
        location_ids: [locationId],
      },
    })
    const count = (inv.counts || []).find((c) => c.state === 'IN_STOCK')
    const qty = count ? Number(count.quantity) : 0
    if (!Number.isFinite(qty) || qty <= 0) continue
    out.push({ ...row, quantity: qty })
  }
  return out
}

async function relistFixedPrice(ebayId, quantity) {
  if (DRY) return { ok: true, dry: true, newEbayId: ebayId }
  const qty = Math.max(1, Number(quantity) || 1)
  const xml = await ebayCall(
    'RelistFixedPriceItem',
    `<Item>
    <ItemID>${ebayId}</ItemID>
    <Quantity>${qty}</Quantity>
  </Item>`,
  )
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) {
    const short = (xml.match(/<ShortMessage>([^<]+)/i) || [])[1] || ''
    const long = (xml.match(/<LongMessage>([^<]+)/i) || [])[1] || xml.slice(0, 240)
    return { ok: false, message: short || long }
  }
  const newEbayId = (xml.match(/<ItemID>(\d+)<\/ItemID>/i) || [])[1]
  if (!newEbayId) return { ok: false, message: 'no ItemID returned' }
  return { ok: true, newEbayId }
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
  console.log(`Relist ended eBay kits${DRY ? ' (dry-run)' : ''}`)
  const locationId = await primaryLocationId()
  const [activeIds, linked] = await Promise.all([
    fetchActiveEbayIds(),
    listSquareEbayLinked(locationId),
  ])
  console.log(`Square sellable ebay-linked with stock=${linked.length} eBay actives=${activeIds.size}`)

  const candidates = linked.filter((r) => !activeIds.has(r.ebayId))
  const work = LIMIT > 0 ? candidates.slice(0, LIMIT) : candidates
  console.log(`Need relist=${candidates.length} processing=${work.length}`)

  const map = []
  let ok = 0
  let failed = 0
  let skipped = 0

  for (const row of work) {
    try {
      const result = await relistFixedPrice(row.ebayId, row.quantity)
      if (!result.ok) {
        failed += 1
        console.warn(`  ✗ ${row.ebayId} ${row.title.slice(0, 45)}: ${result.message}`)
        map.push({
          variationId: row.variationId,
          oldEbayId: row.ebayId,
          ok: false,
          message: result.message,
        })
        await sleep(DELAY_MS)
        continue
      }
      if (result.newEbayId !== row.ebayId) {
        await setSquareSku(row.variationId, `ebay:${result.newEbayId}`)
      }
      ok += 1
      console.log(
        `  ✓ ${row.ebayId} → ${result.newEbayId}  ${row.title.slice(0, 50)}${result.dry ? ' (dry)' : ''}`,
      )
      map.push({
        variationId: row.variationId,
        oldEbayId: row.ebayId,
        newEbayId: result.newEbayId,
        ok: true,
      })
    } catch (err) {
      failed += 1
      console.warn(`  ✗ ${row.ebayId}: ${err.message}`)
      map.push({
        variationId: row.variationId,
        oldEbayId: row.ebayId,
        ok: false,
        message: err.message,
      })
    }
    await sleep(DELAY_MS)
  }

  if (!work.length) skipped = linked.length

  const outPath = join(__dirname, '../.ebay-relist-map.json')
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dry: DRY,
        activeBefore: activeIds.size,
        candidates: candidates.length,
        ok,
        failed,
        skipped,
        items: map,
      },
      null,
      2,
    ),
  )
  console.log('')
  console.log(`Done. ok=${ok} failed=${failed} map=${outPath}`)
  console.log('Next: npm run sync:square && npm run sync:ebay-details && npm run square:buyable-checkout')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
