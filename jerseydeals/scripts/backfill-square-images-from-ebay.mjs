#!/usr/bin/env node
/**
 * Backfill Square listings.json image URLs from matching eBay active listings.
 * Keeps Square URLs/source, copies image + images[] from eBay by title match.
 *
 * Usage: node jerseydeals/scripts/backfill-square-images-from-ebay.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS = join(__dirname, '../public/listings.json')
const TMP_EBAY = join(__dirname, '../.ebay-listings.tmp.json')

function normTitle(title) {
  return String(title || '')
    .replace(/\s*[—-]\s*(Size|Youth|See listing).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Sync eBay into a temp file without clobbering Square listings
const square = JSON.parse(readFileSync(LISTINGS, 'utf8'))
if (square.source !== 'square') {
  console.error(`Expected listings.json source=square, got ${square.source}`)
  process.exit(1)
}

writeFileSync(TMP_EBAY, JSON.stringify(square, null, 2)) // placeholder path ownership
const sync = spawnSync(process.execPath, [join(__dirname, 'sync-ebay-listings.mjs')], {
  env: process.env,
  encoding: 'utf8',
})
if (sync.status !== 0) {
  console.error(sync.stdout)
  console.error(sync.stderr)
  process.exit(sync.status || 1)
}

const ebay = JSON.parse(readFileSync(LISTINGS, 'utf8'))
// Restore square shell then merge images
const ebayByNorm = new Map()
for (const item of ebay.listings || []) {
  ebayByNorm.set(normTitle(item.title), item)
}

let filled = 0
const merged = {
  ...square,
  syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  listings: (square.listings || []).map((item) => {
    const hit =
      ebayByNorm.get(normTitle(item.title)) ||
      [...ebayByNorm.entries()].find(([k]) => normTitle(item.title).includes(k) || k.includes(normTitle(item.title)))?.[1]
    if (!hit) return item
    const images = hit.images?.length ? hit.images : hit.image ? [hit.image] : []
    if (!images.length) return item
    filled += 1
    return {
      ...item,
      image: images[0],
      images,
    }
  }),
}

writeFileSync(LISTINGS, `${JSON.stringify(merged, null, 2)}\n`)
console.log(`Backfilled images on ${filled}/${merged.listings.length} Square listings from eBay photos`)
