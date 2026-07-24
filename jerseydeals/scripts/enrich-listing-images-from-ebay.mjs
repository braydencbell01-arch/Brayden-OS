#!/usr/bin/env node
/**
 * Set listings.json photos from eBay PictureURLs in eBay's exact order.
 *
 * Default: REPLACE each listing's images with the eBay set (cover = first eBay photo).
 * Use --merge to only append missing eBay URLs when Square has fewer photos.
 *
 * Requires: EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN
 * Usage:
 *   node jerseydeals/scripts/enrich-listing-images-from-ebay.mjs
 *   node jerseydeals/scripts/enrich-listing-images-from-ebay.mjs --merge
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
const MERGE = process.argv.includes('--merge')

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

/** PictureURL nodes in document order — this is eBay's gallery order. */
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
  let changed = 0
  let failed = 0

  console.log(`Mode: ${MERGE ? 'merge gaps' : 'replace with eBay order'}`)

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
          enriched += 1

          if (MERGE) {
            const existing = listing.images?.length
              ? listing.images
              : listing.image
                ? [listing.image]
                : []
            if (existing.length >= ebayPics.length) return
            const merged = mergeImages(existing, ebayPics)
            listing.image = listing.image && merged.includes(listing.image) ? listing.image : merged[0]
            listing.images =
              listing.image && merged[0] !== listing.image
                ? [listing.image, ...merged.filter((u) => u !== listing.image)]
                : merged
            changed += 1
            return
          }

          // Replace: exact eBay gallery order (no Square CDN interleave).
          const same =
            Array.isArray(listing.images) &&
            listing.images.length === ebayPics.length &&
            listing.images.every((u, idx) => u === ebayPics[idx])
          if (same && listing.image === ebayPics[0]) return
          listing.image = ebayPics[0]
          listing.images = ebayPics
          changed += 1
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
  console.log(`Done. fetched=${enriched} updated=${changed} failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
