#!/usr/bin/env node
/**
 * Create/reuse Square Payment Links for Phil Royale real-money shop SKUs.
 *
 * Writes philroyale/public/shop-checkout.json (bundled into Pages).
 *
 * Requires: SQUARE_ACCESS_TOKEN
 * Optional: SQUARE_ENVIRONMENT, SQUARE_LOCATION_ID,
 *   PHILROYALE_SHOP_REDIRECT_URL (default live Phil Royale Pages URL)
 *   FORCE_RECREATE=1
 *
 *   node philroyale/scripts/ensure-shop-payment-links.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '../public/shop-checkout.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2026-04-26'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const FORCE_RECREATE = process.env.FORCE_RECREATE === '1'
const REDIRECT_BASE =
  process.env.PHILROYALE_SHOP_REDIRECT_URL ||
  'https://braydencbell01-arch.github.io/Brayden-OS/philroyale/'

/** Mirror of shopCatalog.ts — keep prices/names in sync. */
const SKUS = [
  { id: 'royale-starter', name: 'Phil Royale — Royale Starter', cents: 499 },
  { id: 'royale-mega', name: 'Phil Royale — Mega Phil Bundle', cents: 1199 },
  { id: 'gems-80', name: 'Phil Royale — 80 Gems', cents: 99 },
  { id: 'gems-500', name: 'Phil Royale — 500 Gems', cents: 499 },
  { id: 'gems-1200', name: 'Phil Royale — 1,200 Gems', cents: 999 },
  { id: 'gems-2500', name: 'Phil Royale — 2,500 Gems', cents: 1999 },
  { id: 'gems-6500', name: 'Phil Royale — 6,500 Gems', cents: 4999 },
  { id: 'gems-14000', name: 'Phil Royale — 14,000 Gems', cents: 9999 },
]

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
    throw new Error(`Square ${method} ${path} non-JSON (${res.status}): ${text.slice(0, 400)}`)
  }
  if (!res.ok) {
    const msg =
      json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') ||
      text.slice(0, 400)
    throw new Error(`Square ${method} ${path} → ${res.status}: ${msg}`)
  }
  return json
}

async function resolveLocationId() {
  if (LOCATION_OVERRIDE) return LOCATION_OVERRIDE
  const data = await square('/v2/locations')
  const loc = (data.locations || []).find((l) => l.status === 'ACTIVE') || data.locations?.[0]
  if (!loc?.id) throw new Error('No Square location found. Set SQUARE_LOCATION_ID.')
  return loc.id
}

function redirectForSku(skuId) {
  const base = REDIRECT_BASE.includes('?') ? REDIRECT_BASE : `${REDIRECT_BASE}?x=1`
  const url = new URL(base)
  url.searchParams.delete('x')
  url.searchParams.set('philShopPaid', skuId)
  return url.toString()
}

function loadExisting() {
  if (!existsSync(OUT_PATH)) return { skus: {} }
  try {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'))
  } catch {
    return { skus: {} }
  }
}

async function createQuickPayLink({ skuId, name, cents, locationId }) {
  const data = await square('/v2/online-checkout/payment-links', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      description: name.slice(0, 100),
      quick_pay: {
        name: name.slice(0, 100),
        price_money: { amount: cents, currency: 'USD' },
        location_id: locationId,
      },
      checkout_options: {
        ask_for_shipping_address: false,
        allow_tipping: false,
        redirect_url: redirectForSku(skuId),
      },
    },
  })
  const link = data.payment_link
  if (!link?.url) throw new Error(`No payment link URL for ${skuId}`)
  return {
    url: link.url,
    paymentLinkId: link.id || '',
    cents,
    name,
  }
}

const locationId = await resolveLocationId()
const prev = loadExisting()
const next = {
  updatedAt: new Date().toISOString(),
  locationId,
  skus: { ...(prev.skus || {}) },
}

for (const sku of SKUS) {
  const existing = next.skus[sku.id]
  if (
    !FORCE_RECREATE &&
    existing?.url &&
    existing.cents === sku.cents &&
    existing.name === sku.name
  ) {
    console.log(`reuse ${sku.id} → ${existing.url}`)
    continue
  }
  const row = await createQuickPayLink({
    skuId: sku.id,
    name: sku.name,
    cents: sku.cents,
    locationId,
  })
  next.skus[sku.id] = row
  console.log(`created ${sku.id} → ${row.url}`)
}

mkdirSync(dirname(OUT_PATH), { recursive: true })
writeFileSync(OUT_PATH, `${JSON.stringify(next, null, 2)}\n`)
console.log(`Wrote ${OUT_PATH} (${Object.keys(next.skus).length} skus)`)
