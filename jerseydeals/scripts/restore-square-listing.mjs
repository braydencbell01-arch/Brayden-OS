#!/usr/bin/env node
/**
 * Restore a Square variation that was delisted by reconcile-sold-inventory
 * (e.g. a test purchase). Optionally update ebay SKU after RelistItem.
 *
 * Usage:
 *   VARIATION_ID=... [EBAY_ID=...] [QTY=1] node scripts/restore-square-listing.mjs
 *   IGNORE_ORDER_ID=... node scripts/restore-square-listing.mjs
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOLD_OUT_PATH = join(__dirname, '../public/sold-out.json')
const EXCEPTIONS_PATH = join(__dirname, '../public/reconcile-exceptions.json')
const STATE_PATH = join(__dirname, '../.sold-reconcile-state.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const VARIATION_ID = process.env.VARIATION_ID || 'NWSMDPZORSCBZ5KWSG3L46SO'
const EBAY_ID = process.env.EBAY_ID || ''
const QTY = String(process.env.QTY || '1')
const IGNORE_ORDER_ID = process.env.IGNORE_ORDER_ID || ''
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''

if (!TOKEN) {
  console.error('Missing SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': '2026-04-26',
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(
      json?.errors?.map((e) => `${e.code}: ${e.detail}`).join('; ') || JSON.stringify(json).slice(0, 400),
    )
  }
  return json
}

async function primaryLocationId() {
  if (LOCATION_OVERRIDE) return LOCATION_OVERRIDE
  const data = await square('/v2/locations')
  const loc = (data.locations || []).find((l) => l.status === 'ACTIVE') || data.locations?.[0]
  if (!loc?.id) throw new Error('No location')
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

async function main() {
  const locationId = await primaryLocationId()
  const fresh = await square(`/v2/catalog/object/${VARIATION_ID}`)
  const obj = fresh.object
  if (!obj || obj.type !== 'ITEM_VARIATION') throw new Error('Not a variation')
  const vd = { ...(obj.item_variation_data || {}) }
  vd.sellable = true
  vd.track_inventory = true
  if (EBAY_ID) vd.sku = `ebay:${EBAY_ID}`

  await square('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      object: {
        ...obj,
        item_variation_data: vd,
      },
    },
  })
  console.log(`✓ sellable=true sku=${vd.sku || '(unchanged)'}`)

  await square('/v2/inventory/changes/batch-create', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      changes: [
        {
          type: 'PHYSICAL_COUNT',
          physical_count: {
            catalog_object_id: VARIATION_ID,
            location_id: locationId,
            quantity: QTY,
            state: 'IN_STOCK',
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })
  console.log(`✓ inventory ${QTY} @ ${locationId}`)

  const sold = loadJson(SOLD_OUT_PATH, { items: [], count: 0 })
  sold.items = (sold.items || []).filter((i) => i.variationId !== VARIATION_ID)
  sold.count = sold.items.length
  sold.syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  writeFileSync(SOLD_OUT_PATH, `${JSON.stringify(sold, null, 2)}\n`)
  console.log(`✓ removed from sold-out.json (remaining ${sold.count})`)

  const state = loadJson(STATE_PATH, {
    processedOrderIds: [],
    soldVariationIds: [],
    ignoredOrderIds: [],
    keepInStockVariationIds: [],
  })
  state.soldVariationIds = (state.soldVariationIds || []).filter((id) => id !== VARIATION_ID)
  state.keepInStockVariationIds = [
    ...new Set([...(state.keepInStockVariationIds || []), VARIATION_ID]),
  ]
  if (IGNORE_ORDER_ID) {
    state.ignoredOrderIds = [...new Set([...(state.ignoredOrderIds || []), IGNORE_ORDER_ID])]
  }
  state.syncedAt = sold.syncedAt
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)

  const exceptions = loadJson(EXCEPTIONS_PATH, {
    keepInStockVariationIds: [],
    ignoredOrderIds: [],
    notes: [],
  })
  exceptions.keepInStockVariationIds = [
    ...new Set([...(exceptions.keepInStockVariationIds || []), VARIATION_ID]),
  ]
  if (IGNORE_ORDER_ID) {
    exceptions.ignoredOrderIds = [
      ...new Set([...(exceptions.ignoredOrderIds || []), IGNORE_ORDER_ID]),
    ]
  }
  writeFileSync(EXCEPTIONS_PATH, `${JSON.stringify(exceptions, null, 2)}\n`)
  console.log('✓ reconcile exceptions recorded (committed file + local state)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
