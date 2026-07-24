#!/usr/bin/env node
/**
 * Sync active eBay listings for Jersey Deals into public/listings.json.
 *
 * Requires env secrets:
 *   EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN
 *
 * Usage (from jerseydeals/ or repo root):
 *   node jerseydeals/scripts/sync-ebay-listings.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/listings.json')
const ENDPOINT = 'https://api.ebay.com/ws/api.dll'
const COMPAT = '1271'
const NS = 'urn:ebay:apis:eBLBaseComponents'

const APP = process.env.EBAY_APP_ID
const CERT = process.env.EBAY_CERT_ID
const DEV = process.env.EBAY_DEV_ID
const TOKEN = process.env.EBAY_USER_TOKEN

for (const [name, value] of [
  ['EBAY_APP_ID', APP],
  ['EBAY_CERT_ID', CERT],
  ['EBAY_DEV_ID', DEV],
  ['EBAY_USER_TOKEN', TOKEN],
]) {
  if (!value) {
    console.error(`Missing required secret: ${name}`)
    process.exit(1)
  }
}

async function tradingCall(callName, innerXml) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="${NS}">
  <RequesterCredentials>
    <eBayAuthToken>${TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  ${innerXml}
</${callName}Request>`

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': COMPAT,
      'X-EBAY-API-DEV-NAME': DEV,
      'X-EBAY-API-APP-NAME': APP,
      'X-EBAY-API-CERT-NAME': CERT,
      'X-EBAY-API-CALL-NAME': callName,
      'X-EBAY-API-SITEID': '0',
    },
    body,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${callName} HTTP ${res.status}: ${text.slice(0, 500)}`)
  }
  return text
}

function xmlText(xml, tagPath) {
  // tagPath like "ActiveList>PaginationResult>TotalNumberOfPages"
  const parts = tagPath.split('>')
  let cursor = xml
  for (const part of parts) {
    const re = new RegExp(`<${part}(?:\\s[^>]*)?>([\\s\\S]*?)</${part}>`, 'i')
    const m = cursor.match(re)
    if (!m) return ''
    cursor = m[1]
  }
  return cursor.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function xmlAttr(fragment, attr) {
  const re = new RegExp(`${attr}="([^"]*)"`, 'i')
  const m = fragment.match(re)
  return m ? m[1] : ''
}

function eachItem(xml) {
  const items = []
  const re = /<Item>([\s\S]*?)<\/Item>/gi
  let m
  while ((m = re.exec(xml))) items.push(m[1])
  return items
}

function upscaleImage(url) {
  if (!url) return url
  return url
    .replace(/s-l(64|96|140|225)\.jpg/i, 's-l500.jpg')
    .replace(/\$_\d+\.JPG/i, '$$_57.JPG')
}

function collectEbayImages(itemXml) {
  const urls = []
  const re = /<PictureURL>([^<]+)<\/PictureURL>/gi
  let m
  while ((m = re.exec(itemXml))) {
    const url = upscaleImage(decodeXml(m[1].trim()))
    if (url && !urls.includes(url)) urls.push(url)
  }
  const gallery = upscaleImage(decodeXml(xmlText(itemXml, 'PictureDetails>GalleryURL')))
  if (gallery && !urls.includes(gallery)) urls.unshift(gallery)
  return urls
}

async function enrichListingPictures(listings) {
  const out = []
  const concurrency = 5
  for (let i = 0; i < listings.length; i += concurrency) {
    const chunk = listings.slice(i, i + concurrency)
    const enriched = await Promise.all(
      chunk.map(async (listing) => {
        try {
          const xml = await tradingCall(
            'GetItem',
            `
  <ErrorLanguage>en_US</ErrorLanguage>
  <ItemID>${listing.id}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>`,
          )
          const ack = xmlText(xml, 'Ack')
          if (ack !== 'Success' && ack !== 'Warning') return listing
          const images = collectEbayImages(xml)
          if (images.length === 0) return listing
          const primary = images[0]
          return { ...listing, image: primary, images }
        } catch (err) {
          console.warn(`GetItem pictures failed for ${listing.id}: ${err.message}`)
          return listing
        }
      }),
    )
    out.push(...enriched)
    console.log(`Enriched pictures ${Math.min(i + concurrency, listings.length)}/${listings.length}`)
  }
  return out
}

function inferTag(title) {
  const t = title.toLowerCase()
  if (/\b(youth|yth|yrs|boys|girls|kids|junior)\b/.test(t)) return 'Youth'
  if (/\b(hoodie|jacket|pants?|shorts?)\b/.test(t)) return 'Court / Sideline'
  if (/\b(training|pre-?match|warmup|warm-up)\b/.test(t)) return 'Training'
  if (/\b(jersey|kit)\b/.test(t)) return 'Jerseys'
  return 'Apparel'
}

function normalizeSizeWord(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  if (/^extra\s+extra\s+large$|^xxl$/.test(s)) return 'XXL'
  if (/^extra\s+large$|^xl$/.test(s)) return 'XL'
  if (/^large$|^l$/.test(s)) return 'L'
  if (/^medium$|^m$/.test(s)) return 'M'
  if (/^small$|^s$/.test(s)) return 'S'
  if (/^xs$|^extra\s+small$/.test(s)) return 'XS'
  return s.toUpperCase()
}

function inferSize(title) {
  const yrs = title.match(/(\d{1,2}\s*[-–]\s*\d{1,2}\s*YRS?)/i)
  if (yrs) {
    const note = yrs[1].replace(/\s+/g, ' ')
    return { note, size: note }
  }

  const yth =
    title.match(/\bYth\s*(XXL|XL|XS|[SML])\b/i) ||
    title.match(/\bYouth\s+(Extra\s+Large|Large|Medium|Small|XXL|XL|XS|[SML])\b/i)
  if (yth) {
    const size = `Youth ${normalizeSizeWord(yth[1])}`
    return { note: size, size }
  }

  // Prefer explicit size tokens that appear with size words (avoids matching "Men's")
  const withWord = title.match(
    /\b(XXL|XL|XS|[SML])\b\s+(?:Extra(?:\s+Extra)?\s+Large|Large|Medium|Small)\b/i,
  )
  if (withWord) {
    const size = normalizeSizeWord(withWord[1])
    return { note: `Size ${size}`, size }
  }

  const bare = title.match(/\b(XXL|XL|XS)\b/)
  if (bare) {
    const size = bare[1].toUpperCase()
    return { note: `Size ${size}`, size }
  }

  return { note: 'See listing', size: 'Other' }
}

function inferBrand(title) {
  const t = title.toLowerCase()
  if (/\bnike\b/.test(t)) return 'Nike'
  if (/\badidas\b/.test(t)) return 'Adidas'
  if (/\bpuma\b/.test(t)) return 'Puma'
  if (/\bunder\s*armour\b|\bua\b/.test(t)) return 'Under Armour'
  return ''
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function fetchActiveListings() {
  const listings = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const xml = await tradingCall(
      'GetMyeBaySelling',
      `
  <ErrorLanguage>en_US</ErrorLanguage>
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>`,
    )

    const ack = xmlText(xml, 'Ack')
    if (ack !== 'Success' && ack !== 'Warning') {
      throw new Error(`GetMyeBaySelling Ack=${ack}: ${xml.slice(0, 800)}`)
    }

    totalPages = Number(xmlText(xml, 'ActiveList>PaginationResult>TotalNumberOfPages') || '1')
    const totalEntries = xmlText(xml, 'ActiveList>PaginationResult>TotalNumberOfEntries')
    console.log(`Fetched page ${page}/${totalPages} (${totalEntries || '?'} active)`)

    const activeXml = xmlText(xml, 'ActiveList') || xml
    for (const item of eachItem(activeXml)) {
      const title = decodeXml(xmlText(item, 'Title'))
      if (!title) continue

      const priceFragment =
        item.match(/<CurrentPrice[^>]*>[\s\S]*?<\/CurrentPrice>/i)?.[0] ||
        item.match(/<BuyItNowPrice[^>]*>[\s\S]*?<\/BuyItNowPrice>/i)?.[0] ||
        ''
      const priceRaw =
        xmlText(item, 'SellingStatus>CurrentPrice') || xmlText(item, 'BuyItNowPrice')
      const currency = xmlAttr(priceFragment, 'currencyID') || 'USD'
      const qtyRaw = xmlText(item, 'QuantityAvailable') || xmlText(item, 'Quantity') || '1'
      const { note, size } = inferSize(title)

      listings.push({
        id: xmlText(item, 'ItemID'),
        title,
        price: priceRaw ? Number(priceRaw) : null,
        currency,
        url: decodeXml(xmlText(item, 'ListingDetails>ViewItemURL')),
        image: upscaleImage(decodeXml(xmlText(item, 'PictureDetails>GalleryURL'))),
        images: (() => {
          const imgs = collectEbayImages(item)
          const gallery = upscaleImage(decodeXml(xmlText(item, 'PictureDetails>GalleryURL')))
          if (gallery && !imgs.includes(gallery)) imgs.unshift(gallery)
          return imgs
        })(),
        quantity: Number.parseInt(qtyRaw, 10) || 1,
        tag: inferTag(title),
        note,
        size,
        brand: inferBrand(title),
        source: 'ebay',
      })
    }

    page += 1
  }

  return enrichListingPictures(listings)
}

async function fetchSeller() {
  const xml = await tradingCall('GetUser', '')
  const seller = xmlText(xml, 'User>UserID')
  const hardExpiration = xmlText(xml, 'HardExpirationWarning')
  return { seller, hardExpiration }
}

const { seller, hardExpiration } = await fetchSeller()
if (!seller) {
  console.error('Could not resolve eBay seller UserID from GetUser')
  process.exit(1)
}
if (hardExpiration) {
  // Surface in GitHub Actions UI when run under CI
  console.warn(`::warning title=eBay token HardExpirationWarning::${hardExpiration}`)
  console.warn(`eBay user token HardExpirationWarning: ${hardExpiration}`)
}

const listings = await fetchActiveListings()
listings.sort((a, b) => {
  const priceDiff = (b.price ?? 0) - (a.price ?? 0)
  if (priceDiff !== 0) return priceDiff
  return a.title.localeCompare(b.title)
})

const payload = {
  syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  source: 'ebay',
  seller,
  sellerUrl: `https://www.ebay.com/usr/${seller}`,
  shopUrl: `https://www.ebay.com/sch/i.html?_ssn=${encodeURIComponent(seller)}&_sop=10`,
  count: listings.length,
  listings,
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Wrote ${listings.length} listings → ${OUT}`)
