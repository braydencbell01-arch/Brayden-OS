#!/usr/bin/env node
/**
 * Prefetch Square Payment Links for every 2-item cart combo so "Checkout all"
 * works on the static landing page without a live cart-checkout API.
 *
 * Requires: SQUARE_ACCESS_TOKEN
 * Optional: SQUARE_LOCATION_ID, SQUARE_SHIPPING_PERCENT (default 10), FORCE_RECREATE=1
 *
 *   node jerseydeals/scripts/ensure-cart-combo-links.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const COMBOS_PATH = join(__dirname, '../public/cart-combo-links.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2026-04-26'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const SHIPPING_PERCENT = Number.parseFloat(process.env.SQUARE_SHIPPING_PERCENT || '10')
const FORCE_RECREATE = process.env.FORCE_RECREATE === '1'
const DISCOUNT_ID = process.env.FIRST10_DISCOUNT_ID || 'OLPMVGCGLRBDCULSOPQOY2FI'
const REDIRECT_BASE =
  process.env.SQUARE_PURCHASE_REDIRECT_URL || 'https://jerseydeals.online/?purchase=1'
const MAX_ITEMS = Number.parseInt(process.env.CART_COMBO_MAX_ITEMS || '40', 10)

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
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Square non-JSON ${res.status}: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    const msg =
      json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') || text.slice(0, 200)
    throw new Error(`Square ${method} ${path}: ${msg}`)
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

function comboKey(ids) {
  return [...ids].map(String).sort().join('|')
}

function redirectFor(ids) {
  const url = new URL(REDIRECT_BASE.includes('?') ? REDIRECT_BASE : `${REDIRECT_BASE}?purchase=1`)
  url.searchParams.set('purchase', '1')
  url.searchParams.set('sold', ids.join(','))
  return url.toString()
}

function loadExisting() {
  if (!existsSync(COMBOS_PATH)) return { pairs: {}, pairsFirst10: {} }
  try {
    const raw = JSON.parse(readFileSync(COMBOS_PATH, 'utf8'))
    return {
      pairs: raw.pairs && typeof raw.pairs === 'object' ? raw.pairs : {},
      pairsFirst10: raw.pairsFirst10 && typeof raw.pairsFirst10 === 'object' ? raw.pairsFirst10 : {},
    }
  } catch {
    return { pairs: {}, pairsFirst10: {} }
  }
}

async function createPairLink({ locationId, ids, first10 }) {
  const order = {
    location_id: locationId,
    line_items: ids.map((id) => ({ catalog_object_id: id, quantity: '1' })),
  }
  if (first10 && DISCOUNT_ID) {
    order.discounts = [{ catalog_object_id: DISCOUNT_ID, scope: 'ORDER' }]
  }
  if (SHIPPING_PERCENT > 0) {
    order.service_charges = [
      {
        name: 'Shipping',
        percentage: String(SHIPPING_PERCENT),
        calculation_phase: 'SUBTOTAL_PHASE',
      },
    ]
  }
  const data = await square('/v2/online-checkout/payment-links', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      description: `JD cart · ${ids.length} kits${first10 ? ' · first10' : ''}`.slice(0, 100),
      checkout_options: {
        ask_for_shipping_address: true,
        allow_tipping: false,
        redirect_url: redirectFor(ids),
      },
      order,
    },
  })
  return {
    url: data.payment_link?.url,
    paymentLinkId: data.payment_link?.id,
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const listings = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
const variationIds = [...new Set(
  (listings.listings || [])
    .filter((row) => row?.id && row?.checkoutUrl)
    .map((row) => String(row.id).trim())
    .filter(Boolean),
)].slice(0, MAX_ITEMS)

if (variationIds.length < 2) {
  console.log('Need at least 2 checkout-ready listings; skipping combo links.')
  process.exit(0)
}

const locationId = await primaryLocationId()
const existing = loadExisting()
const pairs = { ...existing.pairs }
const pairsFirst10 = { ...existing.pairsFirst10 }

let created = 0
let reused = 0
let failed = 0

console.log(`Building pair checkout links for ${variationIds.length} items…`)

for (let i = 0; i < variationIds.length; i += 1) {
  for (let j = i + 1; j < variationIds.length; j += 1) {
    const ids = [variationIds[i], variationIds[j]]
    const key = comboKey(ids)

    for (const first10 of [false, true]) {
      const bucket = first10 ? pairsFirst10 : pairs
      if (!FORCE_RECREATE && bucket[key]?.url) {
        reused += 1
        continue
      }
      try {
        const link = await createPairLink({ locationId, ids, first10 })
        if (!link.url) throw new Error('No URL returned')
        bucket[key] = {
          url: link.url,
          paymentLinkId: link.paymentLinkId,
          ids,
          first10,
          updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        }
        created += 1
        if (created % 25 === 0) {
          console.log(`…created ${created} (reused ${reused}, failed ${failed})`)
          mkdirSync(dirname(COMBOS_PATH), { recursive: true })
          writeFileSync(
            COMBOS_PATH,
            `${JSON.stringify(
              {
                syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
                source: 'square-cart-combo-links',
                locationId,
                shippingPercent: SHIPPING_PERCENT,
                itemCount: variationIds.length,
                pairCount: Object.keys(pairs).length,
                pairFirst10Count: Object.keys(pairsFirst10).length,
                pairs,
                pairsFirst10,
              },
              null,
              2,
            )}\n`,
          )
        }
        await sleep(120)
      } catch (err) {
        failed += 1
        console.error(`✗ ${key}${first10 ? ' first10' : ''}: ${err.message}`)
        await sleep(400)
      }
    }
  }
}

mkdirSync(dirname(COMBOS_PATH), { recursive: true })
writeFileSync(
  COMBOS_PATH,
  `${JSON.stringify(
    {
      syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      source: 'square-cart-combo-links',
      locationId,
      shippingPercent: SHIPPING_PERCENT,
      itemCount: variationIds.length,
      pairCount: Object.keys(pairs).length,
      pairFirst10Count: Object.keys(pairsFirst10).length,
      pairs,
      pairsFirst10,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `Done. created=${created} reused=${reused} failed=${failed} → ${COMBOS_PATH} (pairs=${Object.keys(pairs).length})`,
)
