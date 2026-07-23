#!/usr/bin/env node
/**
 * Push jerseydeals/public/listings.json items into Square Catalog.
 *
 * Requires:
 *   SQUARE_ACCESS_TOKEN
 * Optional:
 *   SQUARE_ENVIRONMENT=production|sandbox
 *   SQUARE_LOCATION_ID
 *   SQUARE_SKIP_IMAGES=1
 *
 * Usage:
 *   node jerseydeals/scripts/push-listings-to-square.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { inferClubAbbrev } from './lib/club-abbrev.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const SKIP_IMAGES = process.env.SQUARE_SKIP_IMAGES === '1'

if (!TOKEN) {
  console.error('Missing required secret: SQUARE_ACCESS_TOKEN')
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
    throw new Error(`Square ${method} ${path} non-JSON (${res.status}): ${text.slice(0, 400)}`)
  }
  if (!res.ok) {
    const msg = json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') || text.slice(0, 400)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
}

function skuFor(listing) {
  return `ebay:${listing.id}`
}

function moneyAmount(price) {
  if (price == null || Number.isNaN(Number(price))) return null
  return Math.round(Number(price) * 100)
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

async function findVariationBySku(sku) {
  const data = await square('/v2/catalog/search', {
    method: 'POST',
    body: {
      object_types: ['ITEM_VARIATION'],
      query: {
        exact_query: {
          attribute_name: 'sku',
          attribute_value: sku,
        },
      },
      limit: 1,
    },
  })
  return (data.objects || [])[0] || null
}

async function upsertListing(listing, locationId) {
  const sku = skuFor(listing)
  const amount = moneyAmount(listing.price)
  if (amount == null) {
    return { status: 'skipped', reason: 'no price', sku }
  }

  const existing = await findVariationBySku(sku)
  const itemTempId = `#item_${listing.id}`
  const varTempId = `#var_${listing.id}`
  const variationName = listing.note || listing.size || 'Standard'
  const abbreviation = inferClubAbbrev(listing.title)
  const description = [
    listing.brand ? `Brand: ${listing.brand}` : '',
    listing.tag ? `Type: ${listing.tag}` : '',
    listing.note ? `Size: ${listing.note}` : '',
    `POS: ${abbreviation}`,
    listing.url ? `Imported from eBay: ${listing.url}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  let itemId
  let variationId

  if (existing) {
    variationId = existing.id
    itemId = existing.item_variation_data?.item_id
    const version = existing.version
    await square('/v2/catalog/object', {
      method: 'POST',
      body: {
        idempotency_key: randomUUID(),
        object: {
          type: 'ITEM_VARIATION',
          id: variationId,
          version,
          present_at_all_locations: true,
          item_variation_data: {
            ...existing.item_variation_data,
            name: variationName,
            sku,
            pricing_type: 'FIXED_PRICING',
            price_money: { amount, currency: listing.currency || 'USD' },
            track_inventory: true,
            sellable: true,
            stockable: true,
          },
        },
      },
    })
    // Refresh parent item name/description if we have item id
    if (itemId) {
      const parent = await square(`/v2/catalog/object/${itemId}`)
      const obj = parent.object
      if (obj?.item_data) {
        await square('/v2/catalog/object', {
          method: 'POST',
          body: {
            idempotency_key: randomUUID(),
            object: {
              ...obj,
              present_at_all_locations: true,
              item_data: {
                ...obj.item_data,
                name: listing.title,
                description,
                abbreviation,
                product_type: 'REGULAR',
              },
            },
          },
        })
      }
    }
  } else {
    const created = await square('/v2/catalog/batch-upsert', {
      method: 'POST',
      body: {
        idempotency_key: `create-${listing.id}-${amount}`,
        batches: [
          {
            objects: [
              {
                type: 'ITEM',
                id: itemTempId,
                present_at_all_locations: true,
                item_data: {
                  name: listing.title,
                  description,
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
                        price_money: { amount, currency: listing.currency || 'USD' },
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
    itemId = idMap.find((m) => m.client_object_id === itemTempId)?.object_id
    variationId = idMap.find((m) => m.client_object_id === varTempId)?.object_id
    if (!variationId) {
      // Fallback: read from objects
      const variation = (created.objects || []).find((o) => o.type === 'ITEM_VARIATION')
      variationId = variation?.id
      itemId = variation?.item_variation_data?.item_id || itemId
    }
    if (!variationId) throw new Error(`Create failed for ${sku}: no variation id returned`)
  }

  // Inventory
  const qty = Math.max(0, Number.parseInt(String(listing.quantity ?? 1), 10) || 1)
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
            quantity: String(qty),
            state: 'IN_STOCK',
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })

  // Image
  if (!SKIP_IMAGES && listing.image && itemId) {
    try {
      const imgRes = await fetch(listing.image)
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer())
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        const form = new FormData()
        form.append(
          'request',
          new Blob(
            [
              JSON.stringify({
                idempotency_key: `img-${listing.id}`,
                object_id: itemId,
                is_primary: true,
                image: {
                  name: listing.title.slice(0, 50),
                  caption: listing.note || '',
                },
              }),
            ],
            { type: 'application/json' },
          ),
        )
        form.append('file', new Blob([buf], { type: contentType }), `${listing.id}.jpg`)
        await square('/v2/catalog/images', { method: 'POST', body: form })
      }
    } catch (err) {
      console.warn(`  image skip ${sku}: ${err.message}`)
    }
  }

  return { status: existing ? 'updated' : 'created', sku, itemId, variationId }
}

const raw = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
const listings = raw.listings || []
if (listings.length === 0) {
  console.error('No listings in public/listings.json to push')
  process.exit(1)
}

console.log(`Pushing ${listings.length} listings to Square (${ENV})…`)
const locationId = await primaryLocationId()

let created = 0
let updated = 0
let skipped = 0
let failed = 0

for (const [index, listing] of listings.entries()) {
  const label = `${index + 1}/${listings.length} ${listing.title.slice(0, 60)}`
  try {
    const result = await upsertListing(listing, locationId)
    if (result.status === 'created') {
      created += 1
      console.log(`✓ created ${label}`)
    } else if (result.status === 'updated') {
      updated += 1
      console.log(`✓ updated ${label}`)
    } else {
      skipped += 1
      console.log(`· skipped ${label} (${result.reason})`)
    }
  } catch (err) {
    failed += 1
    console.error(`✗ failed ${label}`)
    console.error(`  ${err.message}`)
  }
}

console.log('')
console.log(`Done. created=${created} updated=${updated} skipped=${skipped} failed=${failed}`)
console.log('Next: open Square Items / Square Online and confirm products are visible, then run sync:square.')
if (failed > 0) process.exit(1)
