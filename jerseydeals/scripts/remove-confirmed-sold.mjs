#!/usr/bin/env node
/**
 * Remove kits that were confirmed sold (Square order / eBay SoldList) but got
 * restored + relisted. Ends current eBay ItemIDs, zeros Square, updates site JSON.
 *
 * Usage:
 *   node jerseydeals/scripts/remove-confirmed-sold.mjs
 *   DRY_RUN=1 node jerseydeals/scripts/remove-confirmed-sold.mjs
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRY = process.env.DRY_RUN === '1'
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const SQUARE_HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''

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

const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const LINKS_PATH = join(__dirname, '../public/checkout-links.json')
const SOLD_OUT_PATH = join(__dirname, '../public/sold-out.json')
const EXCEPTIONS_PATH = join(__dirname, '../public/reconcile-exceptions.json')

/**
 * Confirmed sell-through restored by accident (from pre-restore sold-out +
 * eBay SoldList Messi + Square COMPLETED Man City 17/18). Exact variation IDs.
 */
const CONFIRMED_SOLD_VARIATION_IDS = [
  '3J2OXHY3PHBWVK264JTYPLBD', // Inter Miami 24/25 Home Youth XL (Square)
  '6DXVTBZHQXRZQ7Q5G23SYRWL', // Inter Miami 23/24 Away Youth XL (Square)
  'M4HDCO7DHEXMS4SXW2S2QYOL', // Maroon UA Waffle S (eBay sold)
  '5E47JH42BMEZCGDI6BM344VV', // Grey adidas L (Square) — already out
  '5IGOAAVG5N3HVSBTOXMQ6AH7', // Man City 25/26 Pre-Match XL (eBay sold)
  'DX72TIG4T47LOPW5S6BWHJAC', // PSG 22/23 Pre-Match L (Square) — already out
  'IICEPL6TBH6ZVJPRURFJ4HBU', // Tottenham 23/24 Pre-Match M (eBay sold)
  'LOZJTBWZQOMQHZNL2RDVIC7I', // Crystal Palace scarf (eBay sold)
  'D64QTOZEGBEVILNL7Z56KCXZ', // Atletico Madrid 22/23 Home XL (eBay sold)
  'THLDKRIEWM4TJP4DHLAIC7C5', // AC Milan 23/24 Pre-Match L (eBay sold)
  '4GJCJOMTUO2XTLHDGFL2W6Y3', // Inter Miami 22/23 Home M (eBay sold)
  'VW5JS2QK6DEVPFE7WUCXJNMK', // Man City 25/26 Third Youth L (eBay sold)
  'NK4QWAQHIVIST5HLZRY7DWRH', // Inter Miami Messi #10 XL (eBay sold)
  'NWSMDPZORSCBZ5KWSG3L46SO', // Man City 17/18 Home Youth L (Square completed)
]

if (!SQUARE_TOKEN) {
  console.error('Missing SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function ebayIdFromSku(sku) {
  const m = String(sku || '').match(/^ebay:(\d+)/i)
  return m ? m[1] : ''
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${SQUARE_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SQUARE_TOKEN}`,
      'Square-Version': '2025-10-16',
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      json?.errors?.map((e) => `${e.code}: ${e.detail}`).join('; ') ||
        `Square ${method} ${path} HTTP ${res.status}`,
    )
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

async function primaryLocationId() {
  if (LOCATION_OVERRIDE) return LOCATION_OVERRIDE
  const data = await square('/v2/locations')
  const loc =
    (data.locations || []).find((l) => l.status === 'ACTIVE') || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location')
  return loc.id
}

async function setInventoryZero(variationId, locationId) {
  const counts = await square('/v2/inventory/counts/batch-retrieve', {
    method: 'POST',
    body: { catalog_object_ids: [variationId], location_ids: [locationId] },
  })
  const qty = Number((counts.counts || []).find((c) => c.state === 'IN_STOCK')?.quantity || 0)
  if (!Number.isFinite(qty) || qty <= 0) return
  await square('/v2/inventory/changes/batch-create', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      changes: [
        {
          type: 'ADJUSTMENT',
          adjustment: {
            catalog_object_id: variationId,
            location_id: locationId,
            quantity: String(Math.floor(qty)),
            from_state: 'IN_STOCK',
            to_state: 'SOLD',
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    },
  })
}

async function markUnsellable(variationId) {
  const data = await square(`/v2/catalog/object/${variationId}`)
  const obj = data.object
  if (!obj || obj.type !== 'ITEM_VARIATION') throw new Error('not a variation')
  const vd = obj.item_variation_data || {}
  if (vd.sellable === false) {
    return { sku: vd.sku || '', itemId: vd.item_id || '', title: vd.name || '' }
  }
  await square('/v2/catalog/object', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      object: {
        ...obj,
        item_variation_data: { ...vd, sellable: false, track_inventory: true },
      },
    },
  })
  return { sku: vd.sku || '', itemId: vd.item_id || '', title: vd.name || '' }
}

async function endEbay(ebayId) {
  if (!HAS_EBAY || !ebayId) return { ok: false, skipped: true }
  const text = await ebayCall(
    'EndItem',
    `<ItemID>${ebayId}</ItemID><EndingReason>NotAvailable</EndingReason>`,
  )
  if (/<Ack>(Success|Warning)<\/Ack>/i.test(text)) return { ok: true }
  const short = (text.match(/<ShortMessage>([^<]+)/i) || [])[1] || ''
  if (/already\s+ended|not\s+a\s+current\s+listing|listing\s+has\s+been\s+ended/i.test(short)) {
    return { ok: true, alreadyEnded: true }
  }
  return { ok: false, message: short || text.slice(0, 180) }
}

async function deletePaymentLink(id) {
  if (!id) return
  try {
    await square(`/v2/online-checkout/payment-links/${id}`, { method: 'DELETE' })
  } catch {
    /* already gone */
  }
}

async function parentTitle(itemId, fallback) {
  if (!itemId) return fallback
  try {
    const data = await square(`/v2/catalog/object/${itemId}`)
    return data.object?.item_data?.name || fallback
  } catch {
    return fallback
  }
}

async function main() {
  console.log(`Remove confirmed sold kits${DRY ? ' (dry-run)' : ''}`)
  const locationId = await primaryLocationId()
  const listingsFile = loadJson(LISTINGS_PATH, { listings: [] })
  const linksFile = loadJson(LINKS_PATH, { links: [] })
  const soldOut = loadJson(SOLD_OUT_PATH, { items: [] })
  const exceptions = loadJson(EXCEPTIONS_PATH, { keepInStockVariationIds: [] })

  const listings = Array.isArray(listingsFile)
    ? listingsFile
    : listingsFile.listings || listingsFile.items || []
  const links = linksFile.links || []

  const target = new Set(CONFIRMED_SOLD_VARIATION_IDS)
  const endedEbay = new Set()
  const removed = []

  for (const variationId of target) {
    let sku = ''
    let itemId = ''
    let title = variationId
    try {
      if (!DRY) {
        await setInventoryZero(variationId, locationId)
        const cat = await markUnsellable(variationId)
        sku = cat.sku
        itemId = cat.itemId
        title = (await parentTitle(itemId, cat.title)) || cat.title || variationId
      } else {
        const data = await square(`/v2/catalog/object/${variationId}`)
        const vd = data.object?.item_variation_data || {}
        sku = vd.sku || ''
        itemId = vd.item_id || ''
        title = (await parentTitle(itemId, vd.name || '')) || variationId
      }
    } catch (err) {
      console.warn(`  ✗ Square ${variationId}: ${err.message}`)
      continue
    }

    const ebayId = ebayIdFromSku(sku)
    const linkRow = links.find((r) => r.variationId === variationId)
    if (!DRY) {
      await deletePaymentLink(linkRow?.paymentLinkId)
      await deletePaymentLink(linkRow?.discountPaymentLinkId)
    }

    let ebayEnded = false
    if (ebayId && !endedEbay.has(ebayId)) {
      if (DRY) {
        ebayEnded = true
      } else {
        const ended = await endEbay(ebayId)
        ebayEnded = Boolean(ended.ok)
        if (!ended.ok && !ended.skipped) {
          console.warn(`  ✗ eBay EndItem ${ebayId}: ${ended.message}`)
        }
      }
      if (ebayEnded) endedEbay.add(ebayId)
    }

    removed.push({
      variationId,
      itemId,
      title,
      ebayId,
      sku,
      sources: ['confirmed-sold-restore-cleanup'],
      soldAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    })
    console.log(
      `  ✓ ${title.slice(0, 60)}  ebay=${ebayId || '—'} ended=${ebayEnded}${DRY ? ' (dry)' : ''}`,
    )
  }

  // Also drop catalog-dupe rows that share an ended eBay ItemID.
  const endedIds = new Set(removed.map((r) => r.ebayId).filter(Boolean))
  const removeVars = new Set(removed.map((r) => r.variationId))
  for (const row of listings) {
    const id = row.variationId || row.id
    const ebayId = ebayIdFromSku(row.sku) || row.ebayId
    if (ebayId && endedIds.has(String(ebayId))) removeVars.add(id)
  }
  for (const row of links) {
    const ebayId = ebayIdFromSku(row.sku)
    if (ebayId && endedIds.has(ebayId)) removeVars.add(row.variationId)
  }

  const nextListings = listings.filter((l) => !removeVars.has(l.variationId || l.id))
  const nextLinks = links.filter((l) => !removeVars.has(l.variationId))

  const soldItems = [...(soldOut.items || [])]
  const soldVar = new Set(soldItems.map((i) => i.variationId))
  for (const row of removed) {
    if (soldVar.has(row.variationId)) {
      const prev = soldItems.find((i) => i.variationId === row.variationId)
      if (prev && row.ebayId) prev.ebayId = row.ebayId
      continue
    }
    soldItems.push(row)
    soldVar.add(row.variationId)
  }

  // Never keep confirmed sold kits in the restore-protection list.
  const keep = (exceptions.keepInStockVariationIds || []).filter((id) => !removeVars.has(id))
  const confirmed = [
    ...new Set([...(exceptions.confirmedSoldVariationIds || []), ...removeVars]),
  ].sort()

  if (!DRY) {
    const outListings = Array.isArray(listingsFile)
      ? nextListings
      : {
          ...listingsFile,
          listings: nextListings,
          count: nextListings.length,
          syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        }
    writeFileSync(LISTINGS_PATH, JSON.stringify(outListings, null, 2) + '\n')
    writeFileSync(
      LINKS_PATH,
      JSON.stringify(
        {
          ...linksFile,
          links: nextLinks,
          count: nextLinks.length,
          syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        },
        null,
        2,
      ) + '\n',
    )
    writeFileSync(
      SOLD_OUT_PATH,
      JSON.stringify(
        {
          syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
          count: soldItems.length,
          items: soldItems,
        },
        null,
        2,
      ) + '\n',
    )
    writeFileSync(
      EXCEPTIONS_PATH,
      JSON.stringify(
        {
          ...exceptions,
          keepInStockVariationIds: keep,
          confirmedSoldVariationIds: confirmed,
        },
        null,
        2,
      ) + '\n',
    )
  }

  console.log('')
  console.log(
    `Done. removed=${removed.length} listings ${listings.length}→${nextListings.length} soldOut=${soldItems.length} keepInStock ${ (exceptions.keepInStockVariationIds || []).length}→${keep.length}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
