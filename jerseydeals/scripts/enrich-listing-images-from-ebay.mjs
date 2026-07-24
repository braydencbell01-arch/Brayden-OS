#!/usr/bin/env node
/**
 * Merge full eBay PictureURL sets into Square listings.json by ebay:SKU.
 * Keeps Square as source; cover image stays the current primary when present.
 *
 * Requires: EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN
 * Usage: node jerseydeals/scripts/enrich-listing-images-from-ebay.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const APP = process.env.EBAY_APP_ID
const CERT = process.env.EBAY_CERT_ID
const DEV = process.env.EBAY_DEV_ID
const TOKEN = process.env.EBAY_USER_TOKEN

if (!APP || !CERT || !DEV || !TOKEN) {
  console.error('Missing eBay secrets (EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN)')
  process.exit(1)
}

function upscaleImage(url) {
  return String(url || '')
    .trim()
    .replace(/s-l(64|96|140|225|300)\.jpg/i, 's-l1600.jpg')
    .replace(/\/\$_\d+\.JPG/i, '/$_57.JPG')
}

function ebayIdFromListing(listing) {
  const sku = String(listing.sku || '')
  const m = sku.match(/^ebay:(\d+)/i)
  if (m) return m[1]
  if (/^\d{9,}$/.test(String(listing.id || ''))) return String(listing.id)
  return ''
}

async function fetchEbayPictures(itemId) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
</GetItemRequest>`

  const res = await fetch('https://api.ebay.com/ws/api.dll', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1271',
      'X-EBAY-API-DEV-NAME': DEV,
      'X-EBAY-API-APP-NAME': APP,
      'X-EBAY-API-CERT-NAME': CERT,
      'X-EBAY-API-CALL-NAME': 'GetItem',
      'X-EBAY-API-SITEID': '0',
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`GetItem HTTP ${res.status}`)
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(text)) {
    throw new Error(`GetItem Ack failed: ${(text.match(/<ShortMessage>([^<]+)/) || [])[1] || 'unknown'}`)
  }
  const urls = []
  const re = /<PictureURL>([^<]+)<\/PictureURL>/gi
  let m
  while ((m = re.exec(text))) {
    const url = upscaleImage(m[1])
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

function mergeImages(existing, ebay) {
  const out = []
  for (const url of [...existing, ...ebay]) {
    if (url && !out.includes(url)) out.push(url)
  }
  return out
}

async function main() {
  const data = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
  const listings = data.listings || []
  let enriched = 0
  let added = 0
  let failed = 0

  const concurrency = 4
  for (let i = 0; i < listings.length; i += concurrency) {
    const chunk = listings.slice(i, i + concurrency)
    await Promise.all(
      chunk.map(async (listing) => {
        const ebayId = ebayIdFromListing(listing)
        if (!ebayId) return
        try {
          const ebayPics = await fetchEbayPictures(ebayId)
          if (!ebayPics.length) return
          const existing = listing.images?.length
            ? listing.images
            : listing.image
              ? [listing.image]
              : []
          // If Square already has a full (or fuller) set, keep it — avoid duplicate CDN+eBay URLs.
          if (existing.length >= ebayPics.length) return
          const before = existing.length
          const merged = mergeImages(existing, ebayPics)
          const primary = listing.image && merged.includes(listing.image) ? listing.image : merged[0]
          listing.image = primary
          listing.images =
            primary && merged[0] !== primary
              ? [primary, ...merged.filter((u) => u !== primary)]
              : merged
          enriched += 1
          added += Math.max(0, merged.length - before)
        } catch (err) {
          failed += 1
          console.warn(`eBay photos skip ${ebayId}: ${err.message}`)
        }
      }),
    )
    console.log(`Processed ${Math.min(i + concurrency, listings.length)}/${listings.length}`)
  }

  data.syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  writeFileSync(LISTINGS_PATH, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`Done. listings_enriched=${enriched} photos_added=${added} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
