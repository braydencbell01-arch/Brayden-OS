#!/usr/bin/env node
/**
 * Make Square inventory buyable without Online Shipping fulfillment.
 *
 * Square's API cannot enable Online store Shipping (Dashboard-only). Until that
 * is configured, products show "Out of stock" on *.square.site even with qty.
 *
 * This script:
 *  1. Creates a Square Payment Link (asks for shipping address) per variation
 *  2. Writes jerseydeals/public/checkout-links.json
 *  3. Points listings.json `url` at those buy links
 *  4. Injects a Square Online snippet that replaces "Out of stock" with Buy Now
 *
 * Requires: SQUARE_ACCESS_TOKEN, SQUARE_STORE_URL (or VITE_SQUARE_STORE_URL)
 * Optional: SQUARE_ENVIRONMENT, SQUARE_LOCATION_ID, SQUARE_SHIPPING_CENTS
 *
 *   node jerseydeals/scripts/enable-square-buyable-checkout.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LISTINGS_PATH = join(__dirname, '../public/listings.json')
const LINKS_PATH = join(__dirname, '../public/checkout-links.json')
const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2026-04-26'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOCATION_OVERRIDE = process.env.SQUARE_LOCATION_ID || ''
const SHIPPING_CENTS = Number.parseInt(process.env.SQUARE_SHIPPING_CENTS || '0', 10)

if (!TOKEN) {
  console.error('Missing required secret: SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': API_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
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

async function primaryLocationId() {
  if (LOCATION_OVERRIDE) return LOCATION_OVERRIDE
  const data = await square('/v2/locations')
  const active = (data.locations || []).filter((l) => l.status === 'ACTIVE')
  const loc = active[0] || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location found')
  return loc.id
}

async function listItems() {
  const objects = []
  let cursor = ''
  do {
    const qs = new URLSearchParams({ types: 'ITEM' })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/catalog/list?${qs}`)
    objects.push(...(data.objects || []).filter((o) => !o.is_deleted))
    cursor = data.cursor || ''
  } while (cursor)
  return objects
}

function loadExistingLinks() {
  if (!existsSync(LINKS_PATH)) return {}
  try {
    const raw = JSON.parse(readFileSync(LINKS_PATH, 'utf8'))
    const map = {}
    for (const row of raw.links || []) {
      if (row.variationId && row.url) map[row.variationId] = row
    }
    return map
  } catch {
    return {}
  }
}

async function createPaymentLink({ variationId, name, locationId }) {
  const order = {
    location_id: locationId,
    line_items: [
      {
        quantity: '1',
        catalog_object_id: variationId,
      },
    ],
  }
  if (SHIPPING_CENTS > 0) {
    order.service_charges = [
      {
        name: 'Shipping',
        amount_money: { amount: SHIPPING_CENTS, currency: 'USD' },
        calculation_phase: 'TOTAL_PHASE',
      },
    ]
  }

  const data = await square('/v2/online-checkout/payment-links', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      description: name.slice(0, 100),
      checkout_options: {
        ask_for_shipping_address: true,
        allow_tipping: false,
      },
      order,
    },
  })
  const link = data.payment_link
  return {
    variationId,
    paymentLinkId: link.id,
    url: link.url,
    longUrl: link.long_url,
    orderId: link.order_id,
  }
}

function buildSnippet(linksByItemId, linksByVariationId) {
  const payload = {
    byItemId: linksByItemId,
    byVariationId: linksByVariationId,
  }
  // Keep snippet compact; Square Online injects this on every page.
  return `<!-- jerseydeals-buy-bridge -->
<style id="jd-buy-bridge-css">
.jd-buy-now{display:inline-flex!important;align-items:center;justify-content:center;gap:.4rem;
padding:.75rem 1.1rem;margin:.35rem 0;border-radius:999px;background:#111!important;color:#fff!important;
font:600 14px/1.2 system-ui,sans-serif;text-decoration:none!important;border:0;cursor:pointer}
.jd-buy-now:hover{opacity:.92}
.jd-oos-hide,[data-jd-oos-hidden="1"]{display:none!important}
</style>
<script id="jd-buy-bridge">
(function(){
  var MAP=${JSON.stringify(payload)};
  function findLink(){
    try{
      var path=location.pathname||'';
      var m=path.match(/\\/product\\/[^/]+\\/([A-Z0-9]+)/i);
      if(m && MAP.byItemId[m[1]]) return MAP.byItemId[m[1]];
      var keys=Object.keys(MAP.byItemId||{});
      for(var i=0;i<keys.length;i++){
        if(path.indexOf(keys[i])!==-1) return MAP.byItemId[keys[i]];
      }
    }catch(e){}
    return null;
  }
  function hideOos(root){
    var nodes=(root||document).querySelectorAll('body *');
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(!el||!el.childNodes||el.childNodes.length!==1) continue;
      var t=(el.textContent||'').trim();
      if(/^out of stock$/i.test(t)){
        el.setAttribute('data-jd-oos-hidden','1');
        el.classList.add('jd-oos-hide');
      }
    }
  }
  function ensureBuyButton(url){
    if(!url) return;
    if(document.getElementById('jd-buy-now-btn')) return;
    var btn=document.createElement('a');
    btn.id='jd-buy-now-btn';
    btn.className='jd-buy-now';
    btn.href=url;
    btn.target='_blank';
    btn.rel='noopener noreferrer';
    btn.textContent='Buy now — secure checkout';
    var host=document.querySelector('[class*="product"], main, #content, body');
    var price=null;
    var all=document.querySelectorAll('body *');
    for(var i=0;i<all.length;i++){
      var t=(all[i].textContent||'').trim();
      if(/^\\$\\d/.test(t) && t.length<12){ price=all[i]; break; }
    }
    if(price && price.parentNode){ price.parentNode.insertBefore(btn, price.nextSibling); }
    else if(host){ host.insertBefore(btn, host.firstChild); }
    else { document.body.appendChild(btn); }
  }
  function patchCards(){
    var anchors=document.querySelectorAll('a[href*="/product/"]');
    for(var i=0;i<anchors.length;i++){
      var a=anchors[i];
      var href=a.getAttribute('href')||'';
      var m=href.match(/\\/product\\/[^/]+\\/([A-Z0-9]+)/i);
      if(!m) continue;
      var link=MAP.byItemId[m[1]];
      if(!link) continue;
      a.setAttribute('data-jd-checkout', link);
      // On shop cards, clicking still goes to PDP; badge text swapped below.
    }
    hideOos(document);
  }
  function run(){
    hideOos(document);
    var link=findLink();
    if(link) ensureBuyButton(link);
    patchCards();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  setInterval(run, 1500);
})();
</script>`
}

async function upsertSnippet(content) {
  const sites = await square('/v2/sites')
  const site = (sites.sites || []).find((s) => s.is_published) || (sites.sites || [])[0]
  if (!site?.id) throw new Error('No Square Online site found')
  const siteId = site.id.startsWith('site_') ? site.id : `site_${site.id}`
  console.log(`Upserting snippet on site ${site.site_title || siteId} (${siteId})`)
  await square(`/v2/sites/${siteId}/snippet`, {
    method: 'POST',
    body: { snippet: { content } },
  })
  return siteId
}

const locationId = await primaryLocationId()
const existing = loadExistingLinks()
const items = await listItems()
console.log(`Creating/reusing payment links for ${items.length} items…`)

const links = []
const byItemId = {}
const byVariationId = {}
let created = 0
let reused = 0
let failed = 0

for (const item of items) {
  const name = item.item_data?.name || item.id
  for (const variation of item.item_data?.variations || []) {
    if (variation.is_deleted) continue
    const vdata = variation.item_variation_data || {}
    if (vdata.sellable === false) continue
    const variationId = variation.id
    try {
      let row = existing[variationId]
      // Reuse only if URL still looks valid; otherwise recreate
      if (!row?.url || !row.paymentLinkId) {
        row = await createPaymentLink({ variationId, name, locationId })
        created += 1
        console.log(`✓ created ${name.slice(0, 60)}`)
      } else {
        reused += 1
      }
      const record = {
        itemId: item.id,
        variationId,
        title: name,
        sku: vdata.sku || '',
        paymentLinkId: row.paymentLinkId,
        url: row.url,
        longUrl: row.longUrl || row.url,
      }
      links.push(record)
      byItemId[item.id] = record.url
      byVariationId[variationId] = record.url
    } catch (err) {
      failed += 1
      console.error(`✗ ${name.slice(0, 60)}: ${err.message}`)
    }
  }
}

mkdirSync(dirname(LINKS_PATH), { recursive: true })
const linksPayload = {
  syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  source: 'square-payment-links',
  locationId,
  shippingCents: SHIPPING_CENTS,
  count: links.length,
  links,
}
writeFileSync(LINKS_PATH, `${JSON.stringify(linksPayload, null, 2)}\n`)
console.log(`Wrote ${links.length} checkout links → ${LINKS_PATH}`)

if (existsSync(LISTINGS_PATH)) {
  const listings = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8'))
  let updated = 0
  for (const listing of listings.listings || []) {
    const checkout =
      byVariationId[listing.id] || (listing.itemId ? byItemId[listing.itemId] : '') || ''
    if (checkout) {
      listing.checkoutUrl = checkout
      listing.url = checkout
      updated += 1
    }
  }
  listings.checkoutMode = 'square-payment-links'
  listings.syncedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  writeFileSync(LISTINGS_PATH, `${JSON.stringify(listings, null, 2)}\n`)
  console.log(`Updated ${updated} listings.json URLs to payment links`)
}

const snippet = buildSnippet(byItemId, byVariationId)
await upsertSnippet(snippet)
console.log('')
console.log(`Done. created=${created} reused=${reused} failed=${failed}`)
console.log(
  'Square Online now gets a Buy Now bridge via snippet. Jersey Deals listings point at Payment Links.',
)

// Re-apply brand storefront polish so this script does not wipe navy/crimson CSS + hero copy.
try {
  const { spawnSync } = await import('node:child_process')
  const polish = spawnSync(process.execPath, [join(__dirname, 'polish-square-storefront.mjs')], {
    stdio: 'inherit',
    env: process.env,
  })
  if (polish.status !== 0) {
    console.warn('storefront polish follow-up failed; run: npm run square:polish-storefront')
  }
} catch (err) {
  console.warn(`storefront polish follow-up skipped: ${err.message}`)
}

if (failed > 0) process.exit(1)
