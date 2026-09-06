#!/usr/bin/env node
/**
 * Set Square + listings.json item titles to the exact active eBay listing titles.
 *
 * Requires: EBAY_* + SQUARE_ACCESS_TOKEN
 * Optional: --dry-run
 *
 * Usage:
 *   node jerseydeals/scripts/restore-ebay-titles.mjs
 *   node jerseydeals/scripts/restore-ebay-titles.mjs --dry-run
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { polishTitle } from './lib/listing-copy.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const DRY = process.argv.includes('--dry-run')

const APP = process.env.EBAY_APP_ID
const CERT = process.env.EBAY_CERT_ID
const DEV = process.env.EBAY_DEV_ID
const EBAY_TOKEN = process.env.EBAY_USER_TOKEN
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN

if (!APP || !CERT || !DEV || !EBAY_TOKEN) {
  console.error('Missing eBay credentials (EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN)')
  process.exit(1)
}
if (!SQUARE_TOKEN) {
  console.error('Missing SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

function decodeXml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function tradingCall(callName, innerXml) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials><eBayAuthToken>${EBAY_TOKEN}</eBayAuthToken></RequesterCredentials>
  ${innerXml}
</${callName}Request>`
  const res = await fetch('https://api.ebay.com/ws/api.dll', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': callName,
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-APP-NAME': APP,
      'X-EBAY-API-DEV-NAME': DEV,
      'X-EBAY-API-CERT-NAME': CERT,
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`eBay ${callName} HTTP ${res.status}: ${text.slice(0, 300)}`)
  if (/<Ack>Failure<\/Ack>/i.test(text)) {
    throw new Error(`eBay ${callName} failed: ${text.slice(0, 400)}`)
  }
  return text
}

async function fetchEbayTitles() {
  const byId = new Map()
  let page = 1
  let totalPages = 1
  while (page <= totalPages) {
    const xml = await tradingCall(
      'GetMyeBaySelling',
      `<ActiveList>
        <Include>true</Include>
        <Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination>
      </ActiveList>
      <DetailLevel>ReturnAll</DetailLevel>`,
    )
    totalPages = Number(xml.match(/<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/)?.[1] || 1)
    for (const m of xml.matchAll(/<Item>([\s\S]*?)<\/Item>/g)) {
      const item = m[1]
      const id = item.match(/<ItemID>([^<]+)<\/ItemID>/)?.[1]
      const title = decodeXml(item.match(/<Title>([^<]*)<\/Title>/)?.[1] || '')
      if (id && title) byId.set(id, polishTitle(title))
    }
    page += 1
  }
  return byId
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SQUARE_TOKEN}`,
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
    throw new Error(`Square ${method} ${path} non-JSON (${res.status}): ${text.slice(0, 300)}`)
  }
  if (!res.ok) {
    const msg = json?.errors?.map((e) => e.detail || e.code).join('; ') || text.slice(0, 300)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
}

async function findVariationBySku(sku) {
  const data = await square('/v2/catalog/search', {
    method: 'POST',
    body: {
      object_types: ['ITEM_VARIATION'],
      query: { exact_query: { attribute_name: 'sku', attribute_value: sku } },
      limit: 1,
    },
  })
  return (data.objects || [])[0] || null
}

async function main() {
  console.log(`Restoring eBay titles → Square + listings.json${DRY ? ' [dry-run]' : ''}…`)
  const ebayTitles = await fetchEbayTitles()
  console.log(`Fetched ${ebayTitles.size} active eBay titles`)

  const payload = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
  let listingsUpdated = 0
  let squareUpdated = 0
  let squareSkipped = 0
  let squareFailed = 0
  let unmatched = 0

  for (const listing of payload.listings || []) {
    const ebayId = String(listing.sku || '').replace(/^ebay:/i, '')
    if (!ebayId || !/^\d+$/.test(ebayId)) {
      unmatched += 1
      continue
    }
    const ebayTitle = ebayTitles.get(ebayId)
    if (!ebayTitle) {
      unmatched += 1
      continue
    }

    if (listing.title !== ebayTitle) {
      console.log(`listings.json: ${listing.title}`)
      console.log(`  → ${ebayTitle}`)
      listing.title = ebayTitle
      listingsUpdated += 1
    }

    try {
      const variation = await findVariationBySku(`ebay:${ebayId}`)
      if (!variation) {
        squareSkipped += 1
        continue
      }
      const itemId = variation.item_variation_data?.item_id
      if (!itemId) {
        squareSkipped += 1
        continue
      }
      const fresh = await square(`/v2/catalog/object/${itemId}`)
      const obj = fresh.object
      const oldName = obj?.item_data?.name || ''
      if (oldName === ebayTitle) {
        squareSkipped += 1
        continue
      }
      console.log(`Square: ${oldName}`)
      console.log(`  → ${ebayTitle}`)
      if (!DRY) {
        await square('/v2/catalog/object', {
          method: 'POST',
          body: {
            idempotency_key: randomUUID(),
            object: {
              ...obj,
              present_at_all_locations: true,
              item_data: {
                ...obj.item_data,
                name: ebayTitle,
              },
            },
          },
        })
      }
      squareUpdated += 1
    } catch (err) {
      squareFailed += 1
      console.error(`  Square update failed for ebay:${ebayId}: ${err.message || err}`)
    }
  }

  if (!DRY) {
    payload.syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    writeFileSync(LISTINGS_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  }

  console.log(
    JSON.stringify(
      { listingsUpdated, squareUpdated, squareSkipped, squareFailed, unmatched, dryRun: DRY },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
