#!/usr/bin/env node
/**
 * Rewrite “message me/us if you have questions” variants to the canonical line
 * across listings.json, Square Catalog, and active eBay listings.
 *
 * Requires: SQUARE_ACCESS_TOKEN, EBAY_*
 * Optional: DRY_RUN=1
 *
 *   node jerseydeals/scripts/normalize-listing-contact-line.mjs
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONTACT_LINE, normalizeContactLine } from './lib/listing-copy.mjs'

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

const HAS_EBAY = Boolean(EBAY.app && EBAY.cert && EBAY.dev && EBAY.token)

if (!TOKEN) {
  console.error('Missing required secret: SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

function ebayIdFromSku(sku) {
  const m = String(sku || '').match(/^ebay:(\d+)/i)
  return m ? m[1] : ''
}

function needsRewrite(text) {
  return normalizeContactLine(text) !== text
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

async function ebayCall(callName, innerXml) {
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
  return res.text()
}

function xmlText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

async function updateSquareDescription(itemId, _description) {
  const fresh = await square(`/v2/catalog/object/${itemId}`)
  const latest = fresh.object
  if (!latest || latest.type !== 'ITEM') throw new Error('not an ITEM')
  const data = latest.item_data || {}
  const current = data.description_plaintext || data.description || ''
  const next = normalizeContactLine(current)
  if (next === current) return false
  if (DRY) return true
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
          description: next,
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

async function reviseEbayDescription(ebayId) {
  const getXml = await ebayCall(
    'GetItem',
    `<ItemID>${ebayId}</ItemID><DetailLevel>ReturnAll</DetailLevel>`,
  )
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(getXml)) {
    throw new Error(xmlText(getXml, 'ShortMessage') || 'GetItem failed')
  }
  const status = xmlText(getXml, 'ListingStatus')
  if (!/^active$/i.test(status)) return { ok: true, skipped: true, reason: `status=${status}` }
  const desc = xmlText(getXml, 'Description')
  const next = normalizeContactLine(desc)
  if (next === desc) return { ok: true, skipped: true, reason: 'unchanged' }
  if (DRY) return { ok: true, dry: true }
  const revise = await ebayCall(
    'ReviseItem',
    `<Item>
    <ItemID>${ebayId}</ItemID>
    <Description><![CDATA[${next}]]></Description>
  </Item>`,
  )
  if (!/<Ack>(Success|Warning)<\/Ack>/i.test(revise)) {
    throw new Error(xmlText(revise, 'ShortMessage') || xmlText(revise, 'LongMessage') || 'ReviseItem failed')
  }
  return { ok: true }
}

async function main() {
  if (!existsSync(LISTINGS_PATH)) {
    console.error('Missing listings.json')
    process.exit(1)
  }
  const payload = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
  const listings = payload.listings || []
  console.log(
    `Normalize contact line → "${CONTACT_LINE}" (${listings.length} listings${DRY ? ', dry-run' : ''}${
      HAS_EBAY ? ', ebay on' : ', ebay skip'
    })`,
  )

  let listingsChanged = 0
  let squareChanged = 0
  let ebayChanged = 0
  let ebaySkipped = 0
  let failed = 0

  for (const listing of listings) {
    const before = listing.description || ''
    const after = normalizeContactLine(before)
    const localNeeds = before !== after
    if (localNeeds) {
      listing.description = after
      listingsChanged += 1
    }

    try {
      if (listing.itemId && (localNeeds || needsRewrite(before))) {
        const changed = await updateSquareDescription(listing.itemId, after)
        if (changed) squareChanged += 1
      }
    } catch (err) {
      failed += 1
      console.warn(`✗ Square ${listing.title?.slice(0, 50)}: ${err.message}`)
    }

    const ebayId = ebayIdFromSku(listing.sku)
    if (HAS_EBAY && ebayId) {
      try {
        const result = await reviseEbayDescription(ebayId)
        if (result.skipped) ebaySkipped += 1
        else if (result.ok) ebayChanged += 1
        await new Promise((r) => setTimeout(r, 250))
      } catch (err) {
        failed += 1
        console.warn(`✗ eBay ${ebayId}: ${err.message}`)
      }
    }

    if (localNeeds) {
      console.log(`✓ ${listing.title?.slice(0, 64)}`)
    }
  }

  payload.syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  if (!DRY) {
    writeFileSync(LISTINGS_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  }

  console.log(
    `Done. listings=${listingsChanged} square=${squareChanged} ebayRevised=${ebayChanged} ebaySkipped=${ebaySkipped} failed=${failed}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
