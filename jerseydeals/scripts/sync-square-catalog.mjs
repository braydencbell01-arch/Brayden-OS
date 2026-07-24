#!/usr/bin/env node
/**
 * Sync Square Catalog inventory into public/listings.json for Jersey Deals.
 *
 * Requires:
 *   SQUARE_ACCESS_TOKEN   — personal access token or OAuth token (ITEMS_READ + INVENTORY_READ)
 *   SQUARE_STORE_URL      — Square Online storefront base URL (e.g. https://jerseydeals.square.site)
 *
 * Optional:
 *   SQUARE_ENVIRONMENT    — production (default) | sandbox
 *   SQUARE_LOCATION_ID    — limit inventory counts to one location
 *   SQUARE_INCLUDE_ZERO   — if "1", keep items with 0 sellable qty
 *
 * Usage:
 *   node jerseydeals/scripts/sync-square-catalog.mjs
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/listings.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const STORE_URL = (process.env.SQUARE_STORE_URL || process.env.VITE_SQUARE_STORE_URL || '')
  .trim()
  .replace(/\/$/, '')
  .replace(/^http:\/\//i, 'https://')
const LOCATION_ID = process.env.SQUARE_LOCATION_ID || ''
const INCLUDE_ZERO = process.env.SQUARE_INCLUDE_ZERO === '1'

if (!TOKEN) {
  console.error('Missing required secret: SQUARE_ACCESS_TOKEN')
  console.error('Create one at https://developer.squareup.com/apps → Credentials')
  process.exit(1)
}
if (!STORE_URL) {
  console.error('Missing required secret: SQUARE_STORE_URL')
  console.error('Example: https://your-shop.square.site')
  process.exit(1)
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Square ${method} ${path} returned non-JSON (${res.status}): ${text.slice(0, 400)}`)
  }
  if (!res.ok) {
    const msg = json?.errors?.map((e) => e.detail || e.code).join('; ') || text.slice(0, 400)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
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
  return s ? s.toUpperCase() : ''
}

function inferSize(...parts) {
  const title = parts.filter(Boolean).join(' ')
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

  const withWord = title.match(
    /\b(XXL|XL|XS|[SML])\b\s+(?:Extra(?:\s+Extra)?\s+Large|Large|Medium|Small)\b/i,
  )
  if (withWord) {
    const size = normalizeSizeWord(withWord[1])
    return { note: `Size ${size}`, size }
  }

  const bare = title.match(/\b(XXL|XL|XS|[SML])\b/i)
  if (bare) {
    const size = normalizeSizeWord(bare[1])
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

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function productUrl(itemId, name, seoPermalink, ecomUri) {
  if (ecomUri && /^https?:\/\//i.test(ecomUri)) return ecomUri
  const slug = seoPermalink || slugify(name) || 'item'
  // Square Online common product path pattern
  return `${STORE_URL}/product/${slug}/${itemId}`
}

async function listAllCatalog() {
  const objects = []
  let cursor = ''
  let page = 0
  do {
    const qs = new URLSearchParams({ types: 'ITEM,IMAGE,CATEGORY' })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/catalog/list?${qs}`)
    const batch = data.objects || []
    objects.push(...batch)
    cursor = data.cursor || ''
    page += 1
    console.log(`Fetched catalog page ${page} (+${batch.length}, total ${objects.length})`)
  } while (cursor)
  return objects
}

async function inventoryByVariation(variationIds) {
  const counts = new Map()
  if (variationIds.length === 0) return counts

  const chunkSize = 100
  for (let i = 0; i < variationIds.length; i += chunkSize) {
    const chunk = variationIds.slice(i, i + chunkSize)
    const body = { catalog_object_ids: chunk }
    if (LOCATION_ID) body.location_ids = [LOCATION_ID]
    const data = await square('/v2/inventory/counts/batch-retrieve', { method: 'POST', body })
    for (const row of data.counts || []) {
      if (row.state && row.state !== 'IN_STOCK') continue
      const id = row.catalog_object_id
      const qty = Number.parseFloat(row.quantity || '0') || 0
      counts.set(id, (counts.get(id) || 0) + qty)
    }
  }
  return counts
}

async function merchantName() {
  try {
    const data = await square('/v2/merchants/me')
    return data.merchant?.business_name || data.merchant?.company_name || 'Jersey Deals'
  } catch {
    return 'Jersey Deals'
  }
}

function moneyToNumber(money) {
  if (!money || money.amount == null) return null
  // Square amounts are in the smallest currency unit
  return Number(money.amount) / 100
}

const catalogObjects = await listAllCatalog()
const images = new Map()
const categories = new Map()
const items = []

for (const obj of catalogObjects) {
  if (obj.type === 'IMAGE' && obj.image_data?.url) {
    images.set(obj.id, obj.image_data.url)
  } else if (obj.type === 'CATEGORY' && obj.category_data?.name) {
    categories.set(obj.id, obj.category_data.name)
  } else if (obj.type === 'ITEM' && !obj.is_deleted) {
    items.push(obj)
  }
}

// Resolve any IMAGE ids referenced by items but missing from ListCatalog page set
const missingImageIds = new Set()
for (const item of items) {
  for (const id of item.item_data?.image_ids || []) {
    if (!images.has(id)) missingImageIds.add(id)
  }
  for (const variation of item.item_data?.variations || []) {
    for (const id of variation.item_variation_data?.image_ids || variation.image_ids || []) {
      if (!images.has(id)) missingImageIds.add(id)
    }
  }
}

if (missingImageIds.size > 0) {
  const ids = [...missingImageIds]
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const data = await square('/v2/catalog/batch-retrieve', {
      method: 'POST',
      body: { object_ids: chunk, include_related_objects: false },
    })
    for (const obj of data.objects || []) {
      if (obj.type === 'IMAGE' && obj.image_data?.url) images.set(obj.id, obj.image_data.url)
    }
  }
  console.log(`Resolved ${images.size} catalog images (${missingImageIds.size} fetched by id)`)
}

function imagesForItem(item) {
  const data = item.item_data || {}
  const ids = [...(data.image_ids || [])]
  for (const variation of data.variations || []) {
    for (const id of variation.item_variation_data?.image_ids || variation.image_ids || []) {
      if (!ids.includes(id)) ids.push(id)
    }
  }
  const urls = []
  for (const id of ids) {
    const url = images.get(id)
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

const variationIds = []
for (const item of items) {
  for (const v of item.item_data?.variations || []) {
    if (v.id) variationIds.push(v.id)
  }
}

const inv = await inventoryByVariation(variationIds)
const seller = await merchantName()
const listings = []

for (const item of items) {
  const data = item.item_data || {}
  if (data.is_archived) continue

  const name = data.name || 'Untitled'
  const description = data.description_plaintext || data.description || ''
  const itemImages = imagesForItem(item)
  const image = itemImages[0] || ''
  // Keep every Square Catalog photo — browse UI shows cover only; quick view shows all.
  const categoryName = (data.categories || [])
    .map((c) => categories.get(c.id) || c.id)
    .filter(Boolean)[0]
  const ecomUri = data.ecom_uri || ''
  const seoPermalink = data.ecom_seo_data?.permalink_slug || ''

  const variations = data.variations || []
  for (const variation of variations) {
    if (variation.is_deleted) continue
    const vdata = variation.item_variation_data || {}
    if (vdata.sellable === false) continue

    const qty = inv.has(variation.id) ? inv.get(variation.id) : null
    if (!INCLUDE_ZERO && qty != null && qty <= 0) continue
    // If inventory API returned nothing for this variation, still include (some items are untracked)
    const quantity = qty == null ? 1 : Math.max(0, Math.floor(qty))
    if (!INCLUDE_ZERO && quantity <= 0) continue

    // Prefer the polished Square item name; only append variation name when it adds new info
    const varLabel = String(vdata.name || '').trim()
    const nameHasSize =
      /(?:·|\bSize\b|\bYouth\b|\bYth|\bXXL\b|\bXL\b|\bXS\b|\b[SML]\b|\d+\s*[-–]\s*\d+\s*YRS?)/i.test(
        name,
      )
    const title =
      varLabel && !nameHasSize && !name.toLowerCase().includes(varLabel.toLowerCase())
        ? `${name} — ${varLabel}`
        : name
    const haystack = `${title} ${description} ${categoryName || ''}`
    const { note, size } = inferSize(haystack, vdata.name, name)
    const price = moneyToNumber(vdata.price_money)
    const currency = vdata.price_money?.currency || 'USD'
    const sku = vdata.sku || ''

    listings.push({
      id: variation.id || item.id,
      itemId: item.id,
      sku,
      title,
      price,
      currency,
      url: productUrl(item.id, name, seoPermalink, ecomUri),
      image,
      images: itemImages,
      quantity,
      tag: inferTag(haystack),
      note,
      size,
      brand: inferBrand(haystack),
      source: 'square',
      category: categoryName || '',
    })
  }
}

listings.sort((a, b) => {
  const priceDiff = (b.price ?? 0) - (a.price ?? 0)
  if (priceDiff !== 0) return priceDiff
  return a.title.localeCompare(b.title)
})

const payload = {
  syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  source: 'square',
  seller,
  sellerUrl: STORE_URL,
  shopUrl: STORE_URL,
  count: listings.length,
  listings,
}

mkdirSync(dirname(OUT), { recursive: true })

if (listings.length === 0 && process.env.SQUARE_ALLOW_EMPTY !== '1') {
  console.warn(
    '::warning title=Square catalog empty::No sellable Square items found. Leaving listings.json unchanged. Add products in Square Online / Items, then re-run sync. Set SQUARE_ALLOW_EMPTY=1 to force an empty write.',
  )
  process.exit(0)
}

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Wrote ${listings.length} Square listings → ${OUT}`)
console.log(`Storefront: ${STORE_URL}`)
if (listings.length === 0) {
  console.warn(
    '::warning title=Square catalog empty::No sellable Square items found. Add products in Square or set SQUARE_INCLUDE_ZERO=1.',
  )
}

// Preserve Payment Link checkout URLs from a prior enable-square-buyable-checkout run
const LINKS_PATH = join(__dirname, '../public/checkout-links.json')
if (existsSync(LINKS_PATH) && listings.length > 0) {
  try {
    const linksFile = JSON.parse(readFileSync(LINKS_PATH, 'utf8'))
    const byVar = new Map()
    const byItem = new Map()
    for (const row of linksFile.links || []) {
      if (row.variationId && row.url) byVar.set(row.variationId, row.url)
      if (row.itemId && row.url) byItem.set(row.itemId, row.url)
    }
    let patched = 0
    for (const listing of listings) {
      const checkout = byVar.get(listing.id) || byItem.get(listing.itemId) || ''
      if (checkout) {
        listing.checkoutUrl = checkout
        // Keep listing.url as the Square Online product page so the site can
        // use Add to cart + /s/cart; Payment Links remain on checkoutUrl.
        patched += 1
      }
    }
    if (patched > 0) {
      payload.checkoutMode = 'square-online-cart+payment-links'
      payload.listings = listings
      payload.count = listings.length
      writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`)
      console.log(`Merged ${patched} Square Payment Link checkout URLs (product URLs preserved)`)
    }
  } catch (err) {
    console.warn(`checkout-links merge skipped: ${err.message}`)
  }
}

// Prefer eBay PictureURL order for landing-page galleries (cover-first, exact order).
if (
  listings.length > 0 &&
  process.env.EBAY_APP_ID &&
  process.env.EBAY_CERT_ID &&
  process.env.EBAY_DEV_ID &&
  process.env.EBAY_USER_TOKEN &&
  process.env.SQUARE_SKIP_EBAY_IMAGE_ORDER !== '1'
) {
  const enrich = spawnSync(process.execPath, [join(__dirname, 'enrich-listing-images-from-ebay.mjs')], {
    stdio: 'inherit',
    env: process.env,
  })
  if (enrich.status !== 0) {
    console.warn('eBay image-order enrich failed; listings keep Square image order for now')
  }
}
