#!/usr/bin/env node
/**
 * Polish Square Catalog item names + descriptions for a more professional storefront.
 *
 * Prefers original titles from jerseydeals/public/listings.json when present
 * (matched by itemId / variation id), so player names survive re-runs.
 *
 * Requires: SQUARE_ACCESS_TOKEN
 * Optional: SQUARE_ENVIRONMENT=production|sandbox
 *
 * Usage:
 *   node jerseydeals/scripts/polish-square-catalog.mjs
 *   node jerseydeals/scripts/polish-square-catalog.mjs --dry-run
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { polishTitle, polishDescription } from './lib/listing-copy.mjs'
import { inferClubAbbrev } from './lib/club-abbrev.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const DRY = process.argv.includes('--dry-run')

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

async function listAllItems() {
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

function loadListingIndex() {
  try {
    const data = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
    const byItem = new Map()
    const byVar = new Map()
    for (const listing of data.listings || []) {
      if (listing.itemId) byItem.set(listing.itemId, listing)
      if (listing.id) byVar.set(listing.id, listing)
    }
    return { byItem, byVar }
  } catch {
    return { byItem: new Map(), byVar: new Map() }
  }
}

function metaFromItem(data, listing) {
  const meta = {
    brand: listing?.brand || '',
    tag: listing?.tag || '',
    size: listing?.size || data.variations?.[0]?.item_variation_data?.name || '',
    note: listing?.note || data.variations?.[0]?.item_variation_data?.name || '',
  }
  if (meta.brand) {
    const m = meta.brand.match(/\b(Adidas|Nike|Puma|Under\s*Armour|Pro\s*Edge)\b/i)
    meta.brand = m ? m[1] : meta.brand.split(/\s+/)[0]
  }
  return meta
}

async function main() {
  console.log(`Polishing Square catalog (${ENV})${DRY ? ' [dry-run]' : ''}…`)
  const { byItem, byVar } = loadListingIndex()
  console.log(`Loaded ${byItem.size} listing titles from listings.json`)
  const items = await listAllItems()
  console.log(`Found ${items.length} items`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const obj of items) {
    try {
      const fresh = DRY ? { object: obj } : await square(`/v2/catalog/object/${obj.id}`)
      const latest = fresh.object
      const data = latest.item_data || {}
      const oldName = data.name || ''
      const varId = data.variations?.[0]?.id
      const listing = byItem.get(latest.id) || (varId ? byVar.get(varId) : null)
      if (!listing?.title) {
        console.warn(`  no listings.json title for ${latest.id}; skipping`)
        skipped += 1
        continue
      }
      const source = String(listing.title).replace(/\s*[—–-]\s*Size\s+\S+.*$/i, '').trim()
      const meta = metaFromItem(data, listing)

      const displayName = polishTitle(source, meta)
      const newDesc = polishDescription(source, meta)
      const abbreviation = inferClubAbbrev(source)

      const sameName = displayName === oldName
      const sameDesc =
        (data.description_plaintext || data.description || '').trim() === newDesc.trim()

      if (sameName && sameDesc) {
        skipped += 1
        continue
      }

      console.log(`\n${oldName}`)
      console.log(`  ← ${source.slice(0, 72)}${source.length > 72 ? '…' : ''}`)
      console.log(`  → ${displayName}`)

      if (DRY) {
        updated += 1
        continue
      }

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
              name: displayName,
              description: newDesc,
              abbreviation,
              product_type: data.product_type || 'REGULAR',
              is_taxable: data.is_taxable !== false,
              ecom_visibility: data.ecom_visibility || 'VISIBLE',
              ...(data.categories ? { categories: data.categories } : {}),
              ...(data.image_ids ? { image_ids: data.image_ids } : {}),
              variations: data.variations,
            },
          },
        },
      })
      updated += 1
      await new Promise((r) => setTimeout(r, 150))
    } catch (err) {
      failed += 1
      console.error(`  FAILED ${obj.id}: ${err.message}`)
    }
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} failed=${failed}`)
  if (failed) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
