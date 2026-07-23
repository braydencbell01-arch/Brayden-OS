#!/usr/bin/env node
/**
 * Set Square POS abbreviations (CatalogItem.abbreviation) from club names.
 * Uses listings.json titles when SKU matches ebay:{id}, otherwise item name.
 *
 * Requires: SQUARE_ACCESS_TOKEN
 * Optional: SQUARE_ENVIRONMENT
 *
 *   node jerseydeals/scripts/update-square-pos-abbrevs.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
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
    const msg = json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') || text.slice(0, 400)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
}

function titleBySku() {
  const map = new Map()
  if (!existsSync(LISTINGS_PATH)) return map
  const raw = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
  for (const listing of raw.listings || []) {
    if (listing.id && listing.title) map.set(`ebay:${listing.id}`, listing.title)
  }
  return map
}

async function listItems() {
  const objects = []
  let cursor = ''
  do {
    const qs = new URLSearchParams({ types: 'ITEM' })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/catalog/list?${qs}`)
    objects.push(...(data.objects || []))
    cursor = data.cursor || ''
  } while (cursor)
  return objects.filter((o) => !o.is_deleted)
}

const skuTitles = titleBySku()
const items = await listItems()
console.log(`Updating POS abbreviations on ${items.length} Square items…`)

let updated = 0
let unchanged = 0
let failed = 0

for (const item of items) {
  const name = item.item_data?.name || ''
  // Prefer original title from listings.json when variation sku is ebay:*
  let title = name
  for (const variation of item.item_data?.variations || []) {
    const sku = variation.item_variation_data?.sku || ''
    if (skuTitles.has(sku)) {
      title = skuTitles.get(sku)
      break
    }
  }

  const abbrev = inferClubAbbrev(title)
  const current = item.item_data?.abbreviation || ''
  if (current === abbrev) {
    unchanged += 1
    continue
  }

  try {
    await square('/v2/catalog/object', {
      method: 'POST',
      body: {
        idempotency_key: randomUUID(),
        object: {
          ...item,
          item_data: {
            ...item.item_data,
            abbreviation: abbrev,
          },
        },
      },
    })
    updated += 1
    console.log(`✓ ${abbrev.padEnd(4)} ← ${name.slice(0, 70)}`)
  } catch (err) {
    failed += 1
    console.error(`✗ ${name.slice(0, 60)} — ${err.message}`)
  }
}

console.log(`Done. updated=${updated} unchanged=${unchanged} failed=${failed}`)
if (failed > 0) process.exit(1)
