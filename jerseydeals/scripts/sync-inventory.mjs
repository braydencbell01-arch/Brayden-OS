#!/usr/bin/env node
/**
 * Prefer Square catalog when credentials exist; otherwise sync from eBay.
 *
 *   SQUARE_ACCESS_TOKEN + SQUARE_STORE_URL  → sync:square
 *   otherwise                               → sync:ebay (EBAY_* required)
 */

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const hasSquare = Boolean(process.env.SQUARE_ACCESS_TOKEN && (process.env.SQUARE_STORE_URL || process.env.VITE_SQUARE_STORE_URL))
const script = hasSquare ? 'sync-square-catalog.mjs' : 'sync-ebay-listings.mjs'

console.log(
  hasSquare
    ? 'Inventory source: Square Catalog API'
    : 'Inventory source: eBay (set SQUARE_ACCESS_TOKEN + SQUARE_STORE_URL to switch)',
)

const result = spawnSync(process.execPath, [join(__dirname, script)], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
