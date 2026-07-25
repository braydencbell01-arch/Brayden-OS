#!/usr/bin/env node
/**
 * Pull complete listing details from eBay (description + condition) onto Square
 * and jerseydeals/public/listings.json. eBay is the source of truth.
 *
 * Requires: SQUARE_ACCESS_TOKEN, EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID, EBAY_USER_TOKEN
 *
 *   node jerseydeals/scripts/sync-ebay-listing-details.mjs
 *   DRY_RUN=1 node jerseydeals/scripts/sync-ebay-listing-details.mjs
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const DRY = process.env.DRY_RUN === '1'

const EBAY = {
  app: process.env.EBAY_APP_ID,
  cert: process.env.EBAY_CERT_ID,
  dev: process.env.EBAY_DEV_ID,
  token: process.env.EBAY_USER_TOKEN,
  endpoint: 'https://api.ebay.com/ws/api.dll',
  compat: '1271',
  ns: 'urn:ebay:apis:eBLBaseComponents',
}

for (const [name, value] of [
  ['SQUARE_ACCESS_TOKEN', TOKEN],
  ['EBAY_APP_ID', EBAY.app],
  ['EBAY_CERT_ID', EBAY.cert],
  ['EBAY_DEV_ID', EBAY.dev],
  ['EBAY_USER_TOKEN', EBAY.token],
]) {
  if (!value) {
    console.error(`Missing required secret: ${name}`)
    process.exit(1)
  }
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': '2026-04-26',
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

async function tradingCall(callName, innerXml) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="${EBAY.ns}">
  <RequesterCredentials>
    <eBayAuthToken>${EBAY.token}</eBayAuthToken>
  </RequesterCredentials>
  ${innerXml}
</${callName}Request>`
  const res = await fetch(EBAY.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': EBAY.compat,
      'X-EBAY-API-DEV-NAME': EBAY.dev,
      'X-EBAY-API-APP-NAME': EBAY.app,
      'X-EBAY-API-CERT-NAME': EBAY.cert,
      'X-EBAY-API-CALL-NAME': callName,
      'X-EBAY-API-SITEID': '0',
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${callName} HTTP ${res.status}`)
  return text
}

function xmlText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function htmlToPlain(html) {
  return String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function normalizeCondition(displayName, conditionId) {
  const raw = String(displayName || '').trim()
  const id = String(conditionId || '').trim()
  if (/^1000$/.test(id) || /\bnew\b/i.test(raw)) return { label: 'New', ebay: raw || 'New', id: id || '1000' }
  if (/^3000$/.test(id) || /\bused\b/i.test(raw)) {
    return { label: 'Used', ebay: raw || 'Used', id: id || '3000' }
  }
  if (/pre-?owned|worn/i.test(raw)) return { label: 'Used', ebay: raw || 'Used', id: id || '3000' }
  if (raw) return { label: raw, ebay: raw, id }
  return { label: 'Used', ebay: 'Used', id: id || '3000' }
}

function ebayIdFromSku(sku) {
  const m = String(sku || '').match(/^ebay:(\d+)/i)
  return m ? m[1] : ''
}

function buildSquareDescription({ condition, ebayDescription, title }) {
  const lines = []
  lines.push(`Condition: ${condition.ebay || condition.label}`)
  lines.push('')
  if (ebayDescription) {
    lines.push(ebayDescription)
  } else {
    lines.push(`${title}`.trim())
  }
  lines.push('')
  lines.push('Ships from our US inventory. Real product photos. Secure Square checkout.')
  return lines.join('\n').trim()
}

async function fetchEbayDetails(itemId) {
  const xml = await tradingCall(
    'GetItem',
    `<ItemID>${itemId}</ItemID><DetailLevel>ReturnAll</DetailLevel><IncludeItemSpecifics>true</IncludeItemSpecifics>`,
  )
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(xml)) {
    const short = xmlText(xml, 'ShortMessage')
    throw new Error(short || 'GetItem failed')
  }
  const status = xmlText(xml, 'ListingStatus')
  const title = xmlText(xml, 'Title')
  const conditionId = xmlText(xml, 'ConditionID')
  const conditionDisplayName = xmlText(xml, 'ConditionDisplayName')
  const descriptionHtml = xmlText(xml, 'Description')
  const description = htmlToPlain(descriptionHtml)
  const condition = normalizeCondition(conditionDisplayName, conditionId)
  return { status, title, description, condition, conditionId, conditionDisplayName }
}

async function updateSquareItemDescription(itemId, description) {
  const fresh = await square(`/v2/catalog/object/${itemId}`)
  const latest = fresh.object
  if (!latest || latest.type !== 'ITEM') throw new Error('not an ITEM')
  const data = latest.item_data || {}
  const current = (data.description_plaintext || data.description || '').trim()
  if (current === description.trim()) return false
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
          ...data,
          name: data.name,
          description,
          product_type: data.product_type || 'REGULAR',
          is_taxable: data.is_taxable !== false,
          ecom_visibility: data.ecom_visibility || 'VISIBLE',
          variations: data.variations,
          ...(data.categories ? { categories: data.categories } : {}),
          ...(data.image_ids ? { image_ids: data.image_ids } : {}),
          ...(data.abbreviation ? { abbreviation: data.abbreviation } : {}),
        },
      },
    },
  })
  return true
}

async function main() {
  if (!existsSync(LISTINGS_PATH)) {
    console.error('Missing listings.json — run sync:inventory first')
    process.exit(1)
  }
  const payload = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
  const listings = payload.listings || []
  console.log(
    `Syncing eBay description + condition for ${listings.length} listings${DRY ? ' [dry-run]' : ''}…`,
  )

  let updatedSquare = 0
  let updatedListings = 0
  let skipped = 0
  let failed = 0

  for (const listing of listings) {
    const ebayId = ebayIdFromSku(listing.sku) || (/^\d{9,}$/.test(String(listing.id)) ? String(listing.id) : '')
    if (!ebayId) {
      skipped += 1
      continue
    }
    try {
      const details = await fetchEbayDetails(ebayId)
      if (/completed|ended/i.test(details.status) && !details.description) {
        console.warn(`· ebay ${ebayId} status=${details.status}; using available fields`)
      }
      const squareDesc = buildSquareDescription({
        condition: details.condition,
        ebayDescription: details.description,
        title: listing.title,
      })

      let squareChanged = false
      if (listing.itemId && !DRY) {
        squareChanged = await updateSquareItemDescription(listing.itemId, squareDesc)
        if (squareChanged) updatedSquare += 1
      } else if (listing.itemId && DRY) {
        updatedSquare += 1
        squareChanged = true
      }

      const nextCondition = details.condition.label
      const nextDesc = details.description || listing.description || ''
      const listingChanged =
        listing.condition !== nextCondition ||
        listing.conditionEbay !== details.condition.ebay ||
        listing.description !== nextDesc ||
        listing.conditionId !== details.condition.id

      if (listingChanged) {
        listing.condition = nextCondition
        listing.conditionEbay = details.condition.ebay
        listing.conditionId = details.condition.id
        listing.description = nextDesc
        updatedListings += 1
      }

      console.log(
        `${squareChanged || listingChanged ? '✓' : '·'} ${listing.title.slice(0, 64)} · ${nextCondition}${
          details.description ? '' : ' (no desc)'
        }`,
      )
      await new Promise((r) => setTimeout(r, 220))
    } catch (err) {
      failed += 1
      console.error(`✗ ${listing.title.slice(0, 50)}: ${err.message}`)
    }
  }

  payload.syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  payload.ebayDetailsSyncedAt = payload.syncedAt
  if (!DRY) {
    writeFileSync(LISTINGS_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  }
  console.log(
    `Done. squareDesc=${updatedSquare} listingsPatched=${updatedListings} skipped=${skipped} failed=${failed}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
