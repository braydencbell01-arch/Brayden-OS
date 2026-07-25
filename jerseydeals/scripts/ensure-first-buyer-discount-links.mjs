#!/usr/bin/env node
/**
 * Ensure Square Catalog 10% first-time discount + Payment Links that apply it.
 * Also sync purchaser emails from Square orders into public/purchasers.json
 * and merge discounted URLs into listings.json / checkout-links.json.
 *
 * Requires: SQUARE_ACCESS_TOKEN
 *
 *   node jerseydeals/scripts/ensure-first-buyer-discount-links.mjs
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const DISCOUNT_NAME = 'First-time buyer 10% off'
const REDIRECT_URL =
  process.env.SQUARE_PURCHASE_REDIRECT_URL ||
  'https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/?purchase=1'
const LINKS_PATH = join(__dirname, '../public/checkout-links.json')
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const PURCHASERS_PATH = join(__dirname, '../public/purchasers.json')
const SHIPPING_PERCENT = Number.parseFloat(process.env.SQUARE_SHIPPING_PERCENT || '5')
const SHIPPING_CENTS = Number.parseInt(process.env.SQUARE_SHIPPING_CENTS || '0', 10)
const FORCE_RECREATE = process.env.FORCE_RECREATE === '1'

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
  if (process.env.SQUARE_LOCATION_ID) return process.env.SQUARE_LOCATION_ID
  const data = await square('/v2/locations')
  const active = (data.locations || []).filter((l) => l.status === 'ACTIVE')
  const loc = active[0] || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location found')
  return loc.id
}

async function ensureDiscount() {
  const search = await square('/v2/catalog/search', {
    method: 'POST',
    body: {
      object_types: ['DISCOUNT'],
      query: {
        exact_query: { attribute_name: 'name', attribute_value: DISCOUNT_NAME },
      },
      limit: 5,
    },
  })
  const existing = (search.objects || [])[0]
  if (existing?.id) {
    console.log(`Discount ready: ${existing.id}`)
    return existing.id
  }
  const created = await square('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      object: {
        type: 'DISCOUNT',
        id: '#JD_FIRST10',
        discount_data: {
          name: DISCOUNT_NAME,
          discount_type: 'FIXED_PERCENTAGE',
          percentage: '10.0',
          pin_required: false,
          label_color: 'e0182d',
        },
      },
    },
  })
  const id = created.catalog_object.id
  console.log(`Created discount: ${id}`)
  return id
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

function shippingServiceCharges() {
  if (SHIPPING_PERCENT > 0) {
    return [
      {
        name: 'Shipping',
        percentage: String(SHIPPING_PERCENT),
        calculation_phase: 'SUBTOTAL_PHASE',
      },
    ]
  }
  if (SHIPPING_CENTS > 0) {
    return [
      {
        name: 'Shipping',
        amount_money: { amount: SHIPPING_CENTS, currency: 'USD' },
        calculation_phase: 'TOTAL_PHASE',
      },
    ]
  }
  return undefined
}

async function deletePaymentLink(paymentLinkId) {
  if (!paymentLinkId) return
  try {
    await square(`/v2/online-checkout/payment-links/${paymentLinkId}`, { method: 'DELETE' })
  } catch {
    /* ignore */
  }
}

async function createDiscountedLink({ variationId, name, locationId, discountId }) {
  const order = {
    location_id: locationId,
    line_items: [{ catalog_object_id: variationId, quantity: '1' }],
    discounts: [{ catalog_object_id: discountId, scope: 'ORDER' }],
  }
  const charges = shippingServiceCharges()
  if (charges) order.service_charges = charges

  const data = await square('/v2/online-checkout/payment-links', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      description: `${name.slice(0, 80)} · first10`.slice(0, 100),
      checkout_options: {
        ask_for_shipping_address: true,
        allow_tipping: false,
        redirect_url: REDIRECT_URL,
      },
      order,
    },
  })
  const link = data.payment_link
  return {
    discountPaymentLinkId: link.id,
    discountUrl: link.url,
    discountLongUrl: link.long_url,
  }
}

async function syncPurchasers() {
  const emails = new Set()
  let cursor = ''
  do {
    const body = {
      location_ids: [await primaryLocationId()],
      query: {
        filter: {
          state_filter: { states: ['COMPLETED', 'OPEN'] },
        },
        sort: { sort_field: 'UPDATED_AT', sort_order: 'DESC' },
      },
      limit: 100,
    }
    if (cursor) body.cursor = cursor
    const data = await square('/v2/orders/search', { method: 'POST', body })
    for (const order of data.orders || []) {
      const email =
        order.fulfillments?.[0]?.shipment_details?.recipient?.email_address ||
        order.fulfillments?.[0]?.pickup_details?.recipient?.email_address ||
        order.tenders?.[0]?.customer_id ||
        ''
      // Prefer explicit email fields on order
      const direct =
        order.fulfillments?.flatMap((f) => [
          f.shipment_details?.recipient?.email_address,
          f.pickup_details?.recipient?.email_address,
          f.delivery_details?.recipient?.email_address,
        ]) || []
      for (const e of direct) {
        if (e && String(e).includes('@')) emails.add(String(e).trim().toLowerCase())
      }
      if (email && String(email).includes('@')) emails.add(String(email).trim().toLowerCase())
    }
    cursor = data.cursor || ''
  } while (cursor)

  // Also pull customer directory emails (may include buyers)
  let cCursor = ''
  do {
    const qs = new URLSearchParams({ limit: '100' })
    if (cCursor) qs.set('cursor', cCursor)
    const data = await square(`/v2/customers?${qs}`)
    for (const c of data.customers || []) {
      if (c.email_address) emails.add(String(c.email_address).trim().toLowerCase())
    }
    cCursor = data.cursor || ''
  } while (cCursor)

  const payload = {
    syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    source: 'square-orders+customers',
    count: emails.size,
    emails: [...emails].sort(),
  }
  writeFileSync(PURCHASERS_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Wrote ${payload.count} purchaser/customer emails → ${PURCHASERS_PATH}`)
  return payload
}

function loadLinks() {
  if (!existsSync(LINKS_PATH)) return { links: [] }
  return JSON.parse(readFileSync(LINKS_PATH, 'utf8'))
}

async function main() {
  const locationId = await primaryLocationId()
  const discountId = await ensureDiscount()
  const items = await listItems()
  const linksFile = loadLinks()
  const shippingChanged =
    Number(linksFile.shippingPercent) !== SHIPPING_PERCENT ||
    Number(linksFile.shippingCents || 0) !== SHIPPING_CENTS
  const mustRecreate = FORCE_RECREATE || shippingChanged
  const byVar = new Map((linksFile.links || []).map((row) => [row.variationId, row]))
  console.log(
    `Discount links… shipping=${SHIPPING_PERCENT}%${mustRecreate ? ' (recreating)' : ''}`,
  )

  let created = 0
  let reused = 0
  let failed = 0

  for (const item of items) {
    const name = item.item_data?.name || item.id
    for (const variation of item.item_data?.variations || []) {
      if (variation.is_deleted) continue
      const vd = variation.item_variation_data || {}
      if (vd.sellable === false) continue
      const variationId = variation.id
      let row = byVar.get(variationId) || {
        itemId: item.id,
        variationId,
        title: name,
        sku: vd.sku || '',
      }
      if (!mustRecreate && row.discountUrl && row.discountPaymentLinkId) {
        reused += 1
        byVar.set(variationId, row)
        continue
      }
      try {
        if (row.discountPaymentLinkId) await deletePaymentLink(row.discountPaymentLinkId)
        const disc = await createDiscountedLink({
          variationId,
          name,
          locationId,
          discountId,
        })
        row = { ...row, ...disc, discountId }
        byVar.set(variationId, row)
        created += 1
        console.log(`✓ discount link ${name.slice(0, 60)}`)
      } catch (err) {
        failed += 1
        console.error(`✗ ${name.slice(0, 60)}: ${err.message}`)
      }
    }
  }

  const links = [...byVar.values()]
  const out = {
    syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    source: 'square-payment-links',
    locationId,
    discountId,
    discountName: DISCOUNT_NAME,
    shippingPercent: SHIPPING_PERCENT,
    shippingCents: SHIPPING_CENTS || linksFile.shippingCents || 0,
    count: links.length,
    links,
  }
  writeFileSync(LINKS_PATH, `${JSON.stringify(out, null, 2)}\n`)
  console.log(
    `checkout-links.json updated (created=${created} reused=${reused} failed=${failed} total=${links.length})`,
  )

  if (existsSync(LISTINGS_PATH)) {
    const listings = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
    let patched = 0
    for (const listing of listings.listings || []) {
      const row = byVar.get(listing.id) || [...byVar.values()].find((r) => r.itemId === listing.itemId)
      if (row?.url) {
        listing.checkoutUrl = row.url
        patched += 1
      }
      if (row?.discountUrl) listing.checkoutUrlDiscounted = row.discountUrl
    }
    listings.syncedAt = out.syncedAt
    writeFileSync(LISTINGS_PATH, `${JSON.stringify(listings, null, 2)}\n`)
    console.log(`Patched ${patched} listings with checkout / discount URLs`)
  }

  await syncPurchasers()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
