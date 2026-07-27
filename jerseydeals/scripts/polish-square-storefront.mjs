#!/usr/bin/env node
/**
 * Upsert a professional Jersey Deals storefront snippet onto Square Online.
 * Merges brand CSS/JS polish with the existing buy-bridge payment-link map.
 *
 * Requires: SQUARE_ACCESS_TOKEN
 *
 * Usage:
 *   node jerseydeals/scripts/polish-square-storefront.mjs
 *   node jerseydeals/scripts/polish-square-storefront.mjs --dry-run
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LINKS_PATH = join(__dirname, '../public/checkout-links.json')
const SOLD_OUT_PATH = join(__dirname, '../public/sold-out.json')
const PURCHASERS_PATH = join(__dirname, '../public/purchasers.json')

const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const DRY = process.argv.includes('--dry-run')
const SITE_OVERRIDE = process.env.SQUARE_SITE_ID || ''

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

function extractBuyMap(existingContent) {
  if (!existingContent) return null
  const m = existingContent.match(/var\s+MAP\s*=\s*(\{[\s\S]*?\});/)
  if (!m) return null
  try {
    // MAP is JSON-compatible (double-quoted keys/values)
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

function loadLinksMap() {
  const map = {
    byItemId: {},
    byVariationId: {},
    byItemIdDiscount: {},
    byVariationIdDiscount: {},
  }
  if (!existsSync(LINKS_PATH)) return map
  try {
    const raw = JSON.parse(readFileSync(LINKS_PATH, 'utf8'))
    for (const row of raw.links || []) {
      if (row.itemId && row.url) map.byItemId[row.itemId] = row.url
      if (row.variationId && row.url) map.byVariationId[row.variationId] = row.url
      if (row.itemId && row.discountUrl) map.byItemIdDiscount[row.itemId] = row.discountUrl
      if (row.variationId && row.discountUrl) {
        map.byVariationIdDiscount[row.variationId] = row.discountUrl
      }
    }
  } catch {
    /* ignore */
  }
  return map
}

function mergeMaps(base, extra) {
  const out = {
    byItemId: { ...(base?.byItemId || {}) },
    byVariationId: { ...(base?.byVariationId || {}) },
    byItemIdDiscount: { ...(base?.byItemIdDiscount || {}) },
    byVariationIdDiscount: { ...(base?.byVariationIdDiscount || {}) },
  }
  Object.assign(out.byItemId, extra.byItemId || {})
  Object.assign(out.byVariationId, extra.byVariationId || {})
  Object.assign(out.byItemIdDiscount, extra.byItemIdDiscount || {})
  Object.assign(out.byVariationIdDiscount, extra.byVariationIdDiscount || {})
  return out
}

function loadSoldOutIds() {
  const ids = new Set()
  if (!existsSync(SOLD_OUT_PATH)) return ids
  try {
    const raw = JSON.parse(readFileSync(SOLD_OUT_PATH, 'utf8'))
    for (const item of raw.items || []) {
      if (item.variationId) ids.add(item.variationId)
      if (item.itemId) ids.add(item.itemId)
    }
  } catch {
    /* ignore */
  }
  return ids
}

/** File map is source of truth; drop sold kits and any orphan snippet URLs. */
function authoritativeBuyMap(fromSnippet, fromFile) {
  const sold = loadSoldOutIds()
  const merged = mergeMaps(fromSnippet, fromFile)
  const allowedItemIds = new Set(Object.keys(fromFile.byItemId || {}))
  const allowedVariationIds = new Set(Object.keys(fromFile.byVariationId || {}))

  function scrub(obj, allowed) {
    const out = {}
    for (const [key, value] of Object.entries(obj || {})) {
      if (sold.has(key)) continue
      if (allowed && !allowed.has(key)) continue
      out[key] = value
    }
    return out
  }

  return {
    byItemId: scrub(merged.byItemId, allowedItemIds),
    byVariationId: scrub(merged.byVariationId, allowedVariationIds),
    byItemIdDiscount: scrub(merged.byItemIdDiscount, allowedItemIds),
    byVariationIdDiscount: scrub(merged.byVariationIdDiscount, allowedVariationIds),
  }
}

function loadPurchaserEmails() {
  if (!existsSync(PURCHASERS_PATH)) return []
  try {
    const raw = JSON.parse(readFileSync(PURCHASERS_PATH, 'utf8'))
    return (raw.emails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean)
  } catch {
    return []
  }
}

function buildSnippet(map, purchaserEmails = [], collectUrl = '', contactEmail = 'shop@jerseydeals.online') {
  const mapJson = JSON.stringify(
    map || { byItemId: {}, byVariationId: {}, byItemIdDiscount: {}, byVariationIdDiscount: {} },
  )
  const emailsJson = JSON.stringify(purchaserEmails || [])
  const collectUrlJson = JSON.stringify(collectUrl || '')
  const contactEmailJson = JSON.stringify(contactEmail || 'shop@jerseydeals.online')
  const collectSecretJson = JSON.stringify(process.env.JERSEYDEALS_EMAIL_API_SECRET || '')

  // Keep head-safe elements only (style/script/link/meta).
  return `<!-- jerseydeals-storefront-polish -->
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style id="jd-storefront-css">

:root{
  --jd-navy:#0b223f;
  --jd-navy-deep:#06101c;
  --jd-crimson:#d7282f;
  --jd-chalk:#f3f5f7;
  --jd-mist:#e4e9ef;
  --jd-muted:#3d4650;
  --jd-white:#ffffff;
}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{
  font-family:"Outfit",system-ui,sans-serif!important;
  color:var(--jd-navy)!important;
  background:var(--jd-navy-deep)!important;
  -webkit-font-smoothing:antialiased;
}
/* Kill the “card floating on another screen” inset look */
.w-container.main-container,.main-container{
  padding-left:0!important;padding-right:0!important;margin:0!important;
  max-width:none!important;width:100%!important;
}
.app-container,#app,.theme-square{
  margin:0!important;border-radius:0!important;box-shadow:none!important;
  background:#fcf5e9!important;
}
main.main-content,.user-content,.w-cell.user-content{
  background:#fcf5e9!important;
}
/* Stop iOS auto-zoom on focus (fields under 16px zoom the page). */
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([type="file"]):not([type="hidden"]),
textarea,
select{font-size:16px!important}
/* Header — site chrome only. Never match product__header (that made the PDP black box). */
header,[data-ux="Header"],
.header-banner-wrapper,[class*="header-banner"],
[class*="header"]:not([class*="product"]):not([class*="Product"]){
  background:var(--jd-navy-deep)!important;
  border-bottom:1px solid rgba(255,255,255,.08)!important;
  backdrop-filter:none!important;
  box-shadow:none!important;
  border-radius:0!important;
}
header a,header button,header span,header svg,
[data-ux="Header"] a,[data-ux="Header"] button,[data-ux="Header"] span,[data-ux="Header"] svg,
.header-banner-wrapper a,.header-banner-wrapper button,.header-banner-wrapper span,.header-banner-wrapper svg,
[class*="header-banner"] a,[class*="header-banner"] button,[class*="header-banner"] span{
  color:var(--jd-white)!important;
  fill:currentColor;
}
header a:hover,[data-ux="Header"] a:hover,.header-banner-wrapper a:hover{color:#fff!important;opacity:.88}
/* PDP product info panel — same white as gallery / sticky bar (not navy) */
.product__header,
.badge-around.product__header,
[class*="product__header"],
.product_meta__wrapper,
[class*="product_meta"],
[class*="product-detail"],
[class*="ProductDetail"],
[class*="product_details"],
[data-aid*="PRODUCT_DETAIL"]{
  background:#fff!important;
  background-color:#fff!important;
  color:var(--jd-navy)!important;
  box-shadow:none!important;
}
/* Keep the whole listing page from shifting sideways on swipe */
html,body{
  overflow-x:hidden!important;
  overscroll-behavior-x:none;
  max-width:100%!important;
}
html.jd-pdp,html.jd-pdp body,#app.jd-pdp-lock,.jd-pdp-lock{
  overflow-x:clip!important;
  overscroll-behavior-x:none;
  touch-action:pan-y;
  max-width:100vw!important;
}
html.jd-pdp [class*="gallery"],html.jd-pdp [class*="Gallery"],
html.jd-pdp [class*="carousel"],html.jd-pdp [class*="Carousel"],
html.jd-pdp [class*="swiper"],html.jd-pdp [class*="Swiper"],
html.jd-pdp [class*="product-image"],html.jd-pdp [class*="product__image"]{
  touch-action:pan-x pinch-zoom;
  overscroll-behavior-x:contain;
}
.jd-sticky-view-cart{
  background:var(--jd-navy)!important;
  color:#fff!important;
  box-shadow:0 8px 24px rgba(11,34,63,.28)!important;
}
/* Force logo visible top-left */
header .header__logo,header [class*="header__logo"],header .logo__link,
header a[href="/"],header [data-aid="HEADER_LOGO_RENDERED"],
#jd-header-logo{
  display:inline-flex!important;align-items:center!important;
  flex:0 0 auto!important;min-width:2.75rem!important;max-width:7.5rem!important;
  width:auto!important;height:auto!important;margin:0!important;padding:0!important;
  overflow:visible!important;opacity:1!important;visibility:visible!important;
}
header .header__logo img,header .logo__link img,header a[href="/"] img,
#jd-header-logo img{
  display:block!important;width:2.75rem!important;height:2.75rem!important;
  max-width:2.75rem!important;max-height:2.75rem!important;min-width:2.75rem!important;
  object-fit:contain!important;opacity:1!important;visibility:visible!important;
  border-radius:8px!important;background:transparent!important;
}
#jd-header-logo{
  margin-right:.5rem!important;text-decoration:none!important;
}
/* Primary buttons */
a[class*="button"],button[class*="button"],[class*="Button"],.wsite-button,
[data-aid*="BUTTON"],.jd-buy-now{
  background:var(--jd-crimson)!important;
  color:#fff!important;
  border:0!important;
  border-radius:999px!important;
  font-family:"Outfit",system-ui,sans-serif!important;
  font-weight:600!important;
  letter-spacing:.02em;
  box-shadow:0 8px 24px rgba(215,40,47,.28);
  transition:transform .15s ease,opacity .15s ease,box-shadow .15s ease;
}
a[class*="button"]:hover,button[class*="button"]:hover,[class*="Button"]:hover,.jd-buy-now:hover{
  opacity:.94;transform:translateY(-1px);
  box-shadow:0 10px 28px rgba(215,40,47,.34);
}
/* Homepage banners only — never header-banner-wrapper (that was the huge black CART gap). */
.banner-1,[class*="banner-1"],.w-block-banner,[class*="banner-block"],
[data-ux="Banner"]:not([class*="header"]),
.w-block-wrapper.banner,
.banner-slide-wrapper{
  position:relative;
  min-height:min(72vh,640px);
  background:
    linear-gradient(180deg,rgba(6,16,28,.62) 0%,rgba(6,16,28,.78) 42%,rgba(6,16,28,.9) 100%),
    linear-gradient(135deg,rgba(6,16,28,.55),rgba(11,34,63,.35) 55%,rgba(215,40,47,.22)),
    url("https://jerseydeals.online/epl-tunnel.jpg") center/cover no-repeat,
    #06101c!important;
  background-size:cover!important;
  background-position:center!important;
  color:#fff!important;
}
/* Undo accidental mega-height on Square's header chrome */
header,[class*="header-banner"],.header-banner-wrapper{
  min-height:0!important;
  height:auto!important;
  max-height:none!important;
  background:rgba(6,16,28,.96)!important;
  padding-top:.35rem!important;
  padding-bottom:.35rem!important;
}
header .banner-1,header .w-block-banner,header [class*="banner-1"],
header .banner-slide-wrapper,header .w-block-wrapper.banner{
  display:none!important;
  min-height:0!important;
  height:0!important;
  overflow:hidden!important;
  padding:0!important;
  margin:0!important;
}
/* Premier League mark — white lion on transparent (no purple/black plate) */
.jd-epl-badge,.jd-hero-panel .jd-epl-badge{
  position:static!important;display:block!important;
  width:3.6rem!important;height:3.6rem!important;
  margin:0 auto .85rem!important;
  object-fit:contain!important;object-position:center!important;
  border-radius:0!important;
  filter:drop-shadow(0 6px 16px rgba(0,0,0,.45));
  pointer-events:none;
  background:transparent!important;
  box-sizing:border-box!important;padding:0!important;
}
.jd-shop-epl,.jd-shop-all{
  display:inline-flex!important;align-items:center;justify-content:center;
  margin:.9rem auto 0;padding:.9rem 1.4rem!important;
  border-radius:999px!important;font-weight:700!important;
  letter-spacing:.14em;text-transform:uppercase;text-decoration:none!important;
  font-size:.72rem!important;
}
.jd-shop-epl{
  background:var(--jd-crimson)!important;color:#fff!important;
  border:0!important;
  box-shadow:0 10px 28px rgba(0,0,0,.35)!important;
}
.jd-shop-all{
  margin-top:.7rem!important;
  background:rgba(6,16,28,.42)!important;color:#fff!important;
  border:1.5px solid rgba(255,255,255,.9)!important;
  box-shadow:0 8px 28px rgba(0,0,0,.28)!important;
  backdrop-filter:blur(8px);
}
.jd-shop-all:hover{background:rgba(6,16,28,.62)!important;border-color:#fff!important}
/* Force readable light type across Square hero chrome (overrides theme gray/transparent). */
[class*="banner"] h1,[class*="banner"] h2,[class*="banner"] h3,
[class*="banner"] [class*="title"],[class*="banner"] [class*="Headline"],
[class*="banner"] [class*="heading"],[class*="banner"] [class*="Heading"],
[data-ux="Banner"] h1,[data-ux="Banner"] h2,[data-ux="Banner"] h3,
[class*="banner"] [data-aid*="TITLE"],[class*="banner"] [data-aid*="HEADLINE"]{
  font-family:"Libre Baskerville",Georgia,serif!important;
  color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  font-weight:700!important;
  letter-spacing:-.01em;
  text-wrap:balance;
  max-width:18ch;
  margin-left:auto;margin-right:auto;
  text-shadow:0 1px 2px rgba(0,0,0,.75),0 6px 28px rgba(0,0,0,.55)!important;
  opacity:1!important;
}
[class*="banner"] p,[class*="banner"] [class*="subtitle"],[class*="banner"] [class*="Subtitle"],
[class*="banner"] [class*="description"],[class*="banner"] [class*="Description"],
[class*="banner"] span,[class*="banner"] li,.jd-hero-sub,.jd-hero-eyebrow{
  color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  font-family:"Outfit",system-ui,sans-serif!important;
  text-shadow:0 1px 2px rgba(0,0,0,.7),0 4px 18px rgba(0,0,0,.45)!important;
  opacity:1!important;
}
[class*="banner"] p,[class*="banner"] [class*="subtitle"],.jd-hero-sub{
  color:rgba(255,255,255,.96)!important;
  -webkit-text-fill-color:rgba(255,255,255,.96)!important;
}
/* Transparent-but-readable ghost CTAs in the hero (Shop All, etc.) */
[class*="banner"] a,[data-ux="Banner"] a,
[class*="banner"] a[class*="button"],[class*="banner"] button[class*="button"],
[class*="banner"] [class*="Button"],[class*="banner"] [data-aid*="BUTTON"],
[data-ux="Banner"] a[class*="button"],[data-ux="Banner"] [data-aid*="BUTTON"]{
  color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  border:1.5px solid rgba(255,255,255,.9)!important;
  background:rgba(6,16,28,.42)!important;
  backdrop-filter:blur(8px) saturate(1.1);
  -webkit-backdrop-filter:blur(8px) saturate(1.1);
  box-shadow:0 8px 28px rgba(0,0,0,.35)!important;
  text-shadow:0 1px 2px rgba(0,0,0,.55)!important;
  opacity:1!important;
}
[class*="banner"] a:hover,[data-ux="Banner"] a:hover,
[class*="banner"] a[class*="button"]:hover,[class*="banner"] [data-aid*="BUTTON"]:hover{
  background:rgba(6,16,28,.62)!important;
  border-color:#fff!important;
  color:#fff!important;
}
/* Keep primary crimson CTA (Shop EPL) solid when present */
[class*="banner"] a.jd-shop-epl,.jd-shop-epl{
  background:var(--jd-crimson)!important;
  border-color:var(--jd-crimson)!important;
  color:#fff!important;
}
/* Hide generic template art where possible */
[class*="banner"] img[src*="Artboard"],[class*="banner"] [style*="Artboard"]{
  opacity:.15!important;filter:grayscale(1);
}
/* Product grids */
[class*="product"] img,a[href*="/product/"] img,[class*="ProductCard"] img{
  border-radius:12px!important;
  background:#fff;
  object-fit:cover;
  aspect-ratio:1/1;
}
a[href*="/product/"]{
  text-decoration:none!important;
}
/* Shop / Shop All card titles — navy on light cards (never white-on-chalk). */
a[href*="/product/"] [class*="title"],a[href*="/product/"] h2,a[href*="/product/"] h3,
a[href*="/product/"] h4,
[class*="ProductCard"] [class*="title"],
[class*="product-card"] [class*="title"],
[class*="ProductGrid"] [class*="title"],
[class*="product-grid"] [class*="title"]{
  font-family:"Outfit",system-ui,sans-serif!important;
  font-weight:600!important;
  color:var(--jd-navy)!important;
  font-size:.95rem!important;
  line-height:1.35!important;
  letter-spacing:.01em;
}
/* Product detail page title (beside/under gallery photos) — high contrast on light PDP */
h1.w-product-title,
h1.text-component.w-product-title,
.w-product-title,
[data-aid*="PRODUCT_NAME"],
[data-aid*="PRODUCT_TITLE"],
[class*="ProductDetails"] h1,
[class*="product-details"] h1,
[class*="productDetail"] h1{
  font-family:"Outfit",system-ui,sans-serif!important;
  font-weight:700!important;
  color:var(--jd-navy)!important;
  text-shadow:none!important;
}
/* Cart / empty states — never dark-on-dark or light-on-light */
[class*="cart"] ,[class*="Cart"],[data-ux*="Cart"],[href*="/s/cart"],
[class*="mini-cart"],[class*="MiniCart"],[class*="drawer"]{
  --jd-cart-fg:var(--jd-navy);
}
[class*="cart"] h1,[class*="cart"] h2,[class*="cart"] h3,[class*="cart"] p,
[class*="Cart"] h1,[class*="Cart"] h2,[class*="Cart"] h3,[class*="Cart"] p,
[data-ux*="Cart"] h1,[data-ux*="Cart"] h2,[data-ux*="Cart"] h3,[data-ux*="Cart"] p,
[class*="cart"] [class*="empty"],[class*="Cart"] [class*="empty"],
[class*="cart"] [class*="title"],[class*="Cart"] [class*="title"]{
  color:var(--jd-navy)!important;
}
/* If a cart panel is dark, force light text */
[class*="cart"][style*="rgb(6"],[class*="cart"][style*="#06"],
[class*="Cart"][class*="dark"],.bg-navy [class*="cart"]{
  color:#fff!important;
}
/* Hard override for common empty-cart copy */
[class*="cart"] *:not(a):not(button),[class*="Cart"] *:not(a):not(button){
  text-shadow:none!important;
}
[class*="price"],[data-aid*="PRODUCT_PRICE"]{
  font-family:"Outfit",system-ui,sans-serif!important;
  font-weight:700!important;
  color:var(--jd-crimson)!important;
}
/* Cards: subtle lift without heavy chrome */
a[href*="/product/"]:hover img{
  box-shadow:0 12px 32px rgba(6,16,28,.14);
  transform:translateY(-2px);
  transition:transform .2s ease,box-shadow .2s ease;
}
/* Shop / filters chrome */
aside,[class*="filter"],[class*="Filter"]{
  color:var(--jd-navy)!important;
}
aside [class*="label"],[class*="filter"] label,[class*="Filter"] label,
aside span,[class*="filter"] span{
  color:var(--jd-navy)!important;
  opacity:1!important;
}
/* Featured / section headings on light backgrounds */
[class*="featured"] h2,[class*="Featured"] h2,main h2,main h3{
  color:var(--jd-navy)!important;
  opacity:1!important;
}
/* Footer */
footer,[class*="footer"],[data-ux="Footer"]{
  background:var(--jd-navy-deep)!important;
  color:rgba(255,255,255,.82)!important;
  border-top:1px solid rgba(255,255,255,.08)!important;
}
footer a,[class*="footer"] a{color:#fff!important}
footer input,footer [type="email"]{
  border-radius:999px!important;
  border:1px solid rgba(255,255,255,.18)!important;
  background:rgba(255,255,255,.06)!important;
  color:#fff!important;
}
/* Trust strip injected by JS */
.jd-trust{
  display:flex;flex-wrap:wrap;gap:.75rem 1.25rem;justify-content:center;
  padding:.85rem 1rem;background:var(--jd-navy-deep);color:#fff;
  font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
}
.jd-trust span{opacity:.92}
/* No bullet dots between trust lines */
.jd-trust span+span::before{content:none!important;display:none!important}
/* Buy bridge */
.jd-buy-now{display:inline-flex!important;align-items:center;justify-content:center;gap:.4rem;
padding:.8rem 1.25rem;margin:.5rem 0;text-decoration:none!important;cursor:pointer}
.jd-oos-hide,[data-jd-oos-hidden="1"]{display:none!important}
/* Eyebrow injected above hero title */
.jd-hero-eyebrow{
  display:block;margin:0 auto .75rem;color:#fff!important;
  font-family:"Outfit",system-ui,sans-serif;font-size:.72rem;font-weight:700;
  letter-spacing:.22em;text-transform:uppercase;text-align:center;
  text-shadow:0 1px 2px rgba(0,0,0,.7),0 4px 18px rgba(0,0,0,.45)!important;
}
.jd-hero-sub{
  color:rgba(255,255,255,.96)!important;
  max-width:36ch;margin:.85rem auto 0;text-align:center;
  font-size:1.05rem;line-height:1.5;font-weight:500;
  text-shadow:0 1px 2px rgba(0,0,0,.7),0 4px 18px rgba(0,0,0,.45)!important;
}
/* Injected hero — full-bleed, replaces empty Square banner black box */
.jd-hero-panel{
  position:relative;display:flex;align-items:center;justify-content:center;
  min-height:min(48vh,420px);padding:2.25rem 1.25rem 2.25rem;text-align:center;overflow:visible;
  width:100%!important;margin:0!important;border-radius:0!important;
  background:
    linear-gradient(180deg,rgba(6,16,28,.55) 0%,rgba(6,16,28,.78) 45%,rgba(6,16,28,.92) 100%),
    url("https://jerseydeals.online/epl-tunnel.jpg") center/cover no-repeat,
    #06101c!important;
  color:#fff!important;
}
.jd-hero-panel .jd-hero-inner{position:relative;z-index:2;max-width:34rem;margin:0 auto;padding:0 .25rem}
.jd-hero-panel h2{
  font-family:"Libre Baskerville",Georgia,serif!important;color:#fff!important;
  font-size:clamp(2rem,7vw,3.25rem)!important;line-height:1.08;margin:.2rem 0 .15rem;
  max-width:16ch;margin-left:auto;margin-right:auto;
  text-shadow:0 1px 2px rgba(0,0,0,.75),0 6px 28px rgba(0,0,0,.55)!important;
}
.jd-hero-panel .jd-shop-epl{margin-top:1rem!important}
.jd-hero-panel .jd-hero-sub{margin-left:auto;margin-right:auto}
.jd-trust{
  width:100%!important;margin:0!important;border-radius:0!important;
  background:var(--jd-navy-deep)!important;
  border-bottom:1px solid rgba(255,255,255,.08)!important;
}
[data-jd-banner-hidden="1"]{display:none!important}
/* Header email — compact, never crush the logo */
.jd-header-email{
  display:flex!important;align-items:center;gap:.3rem;flex:1 1 auto;min-width:0;
  max-width:11.5rem;margin:0 .35rem 0 .4rem;
}
.jd-header-email input[type="email"]{
  flex:1 1 auto;min-width:0;width:100%;
  border:1px solid rgba(255,255,255,.4)!important;
  background:rgba(255,255,255,.12)!important;color:#fff!important;
  -webkit-text-fill-color:#fff!important;
  border-radius:999px!important;padding:.45rem .85rem!important;
  font-size:16px!important;font-family:"Outfit",system-ui,sans-serif!important;
  outline:none!important;
}
.jd-header-email input::placeholder{color:rgba(255,255,255,.75)!important;opacity:1!important}
.jd-header-email button{
  flex:0 0 auto;border:0!important;border-radius:999px!important;
  background:var(--jd-crimson)!important;color:#fff!important;
  font-weight:700!important;font-size:.62rem!important;letter-spacing:.12em;
  text-transform:uppercase;padding:.55rem .75rem!important;cursor:pointer;
  white-space:nowrap;
}
.jd-header-email .jd-header-email-ok{
  color:#fff!important;font-size:.62rem;font-weight:600;letter-spacing:.04em;line-height:1.25;white-space:normal;
}
.jd-header-email .jd-see-offers{
  display:inline-block;margin-top:.2rem;border:0;background:transparent;color:#fff;font-size:.58rem;
  font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:underline;cursor:pointer;padding:0;
}
@media (max-width:720px){
  .banner-1,[class*="banner-1"],.w-block-banner,[data-ux="Banner"]:not([class*="header"]){min-height:48vh}
  [class*="header-banner"],.header-banner-wrapper{min-height:0!important}
  .jd-trust{letter-spacing:.1em;font-size:.65rem;gap:.55rem .9rem}
  .jd-hero-panel{min-height:42vh;padding:1.75rem 1rem 2rem}
  .jd-header-email{max-width:10.5rem;margin-left:.25rem}
  .jd-header-email button{padding:.55rem .55rem!important;font-size:.58rem!important}
  header .header__logo img,header .logo__link img,#jd-header-logo img{
    width:2.4rem!important;height:2.4rem!important;max-width:2.4rem!important;max-height:2.4rem!important;
  }
}
/* First-time buyer offer modal */
#jd-offer-root{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(6,16,28,.72)}
#jd-offer-card{width:min(100%,26rem);background:#06101c;color:#fff;border:1px solid rgba(255,255,255,.12);padding:1.5rem;box-shadow:0 24px 60px rgba(0,0,0,.45);font-family:"Outfit",system-ui,sans-serif}
#jd-offer-card h2{font-family:"Libre Baskerville",Georgia,serif;font-size:1.75rem;line-height:1.1;margin:.35rem 0 .75rem;color:#fff}
#jd-offer-card p{color:rgba(255,255,255,.82);font-size:.92rem;line-height:1.45;margin:0}
#jd-offer-card label{display:flex;align-items:center;gap:.35rem;margin:1rem 0 .4rem;font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.85)}
#jd-offer-card .jd-req{color:#d7282f;font-weight:700}
#jd-offer-card input[type="email"]{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.22);background:#0b223f;color:#fff;padding:.85rem .9rem;font-size:16px}
#jd-offer-card .jd-offer-err{color:#ff7a7f;font-size:.78rem;margin:.45rem 0 0}
#jd-offer-activate{display:flex;width:100%;justify-content:center;margin-top:.85rem;padding:.95rem 1rem;border:0;background:#d7282f;color:#fff;font-weight:700;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}
#jd-offer-close{position:absolute;top:.55rem;right:.7rem;background:transparent;border:0;color:rgba(255,255,255,.7);font-size:1.1rem;cursor:pointer}
#jd-offer-card{position:relative}
.jd-price-was{text-decoration:line-through;opacity:.65;margin-left:.4rem;font-size:.9em}
.jd-offer-chip{display:inline-block;margin-top:.25rem;color:#d7282f;font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}

/* Legacy injected cart pill — hide if an old snippet left it in the DOM */
#jd-cart-nav{display:none!important}
a[data-jd-cart-icon="1"] svg,button[data-jd-cart-icon="1"] svg{
  width:1rem;height:1rem;flex-shrink:0;stroke:currentColor
}

</style>
<script id="jd-storefront-polish">

(function(){
  var MAP=${mapJson};
  var PRIOR_EMAILS=${emailsJson};
  var COLLECT_URL=${collectUrlJson};
  var COLLECT_SECRET=${collectSecretJson};
  var CONTACT_EMAIL=${contactEmailJson};
  var OFFER_KEY="jerseydeals.offer.v1";
  var PURCHASED_KEY="jerseydeals.purchased.v1";
  var PURCHASED_SOURCE_KEY="jerseydeals.purchasedSource.v1";
  var EMAIL_KEY="jerseydeals.buyerEmail.v1";
  var REWARDS_KEY="jerseydeals.rewardsMember.v1";
  var OFFERS_KEY="jerseydeals.offers.v1";
  var FIRST10_CLAIMED_KEY="jerseydeals.first10Claimed.v1";
  var HERO="Shop Premier League";
  var HERO_SUB="Club, country, and training jerseys — photographed from our inventory.";
  var JD_SITE="https://jerseydeals.online/";
  var EPL_URL=JD_SITE+"#epl-clubs";
  var SHOP_ALL_URL="/s/shop";
  var EPL_TUNNEL=JD_SITE+"epl-tunnel.jpg";
  // Transparent white lion (no purple/black plate). Cache-bust when asset changes.
  var EPL_BADGE=JD_SITE+"premier-league-badge.png?v=lion1";
  var SITE_LOGO=JD_SITE+"logo.png";
  var FOOTER_DEMO=/Thanks for exploring this Square Online Theme/i;
  var TEMPLATE_HERO=/Get started with this free eCommerce template for retailers\\.?/i;

  // Prevent mobile browsers from auto-zooming on focus / search.
  try{
    var vp=document.querySelector('meta[name="viewport"]');
    var content="width=device-width, initial-scale=1, maximum-scale=1";
    if(vp) vp.setAttribute("content", content);
    else{
      vp=document.createElement("meta");
      vp.setAttribute("name","viewport");
      vp.setAttribute("content", content);
      document.head.appendChild(vp);
    }
  }catch(e){}
  function storageGet(k){ try{ return localStorage.getItem(k)||""; }catch(e){ return ""; } }
  function storageSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function sessionGet(k){ try{ return sessionStorage.getItem(k)||""; }catch(e){ return ""; } }
  function sessionSet(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
  function rewardsMember(){
    try{ var o=JSON.parse(storageGet(REWARDS_KEY)||"null"); return o&&(o.email||o.phone)?o:null; }catch(e){ return null; }
  }
  function lockRewards(form){
    if(!form) return;
    form.innerHTML='<span class="jd-header-email-ok">You are already a Rewards member</span>'
      +'<button type="button" id="jd-see-offers" class="jd-see-offers">See my offers</button>';
    var btn=form.querySelector("#jd-see-offers");
    if(btn) btn.onclick=function(e){ e.preventDefault(); openOffersScreen(); };
  }
  function hasPurchased(){ return storageGet(PURCHASED_KEY)==="1"; }
  function purchasedSource(){ return storageGet(PURCHASED_SOURCE_KEY)||""; }
  function markPurchased(source){
    storageSet(PURCHASED_KEY,"1");
    storageSet(PURCHASED_SOURCE_KEY, source||"confirmed");
    try{
      var w=JSON.parse(storageGet(OFFERS_KEY)||'{"offers":[]}');
      var now=new Date().toISOString();
      (w.offers||[]).forEach(function(o){ if(o.id===w.activeId||o.status==="activated"||o.id==="first10"){ o.status="used"; o.usedAt=now; } });
      w.activeId=null; storageSet(OFFERS_KEY, JSON.stringify(w));
    }catch(e){}
    writeOffer({activated:false,email:storageGet(EMAIL_KEY)||readOffer().email||"",claimed:true});
  }
  function clearPurchasedFlag(){
    storageSet(PURCHASED_KEY,"");
    storageSet(PURCHASED_SOURCE_KEY,"");
    try{ localStorage.removeItem(PURCHASED_KEY); localStorage.removeItem(PURCHASED_SOURCE_KEY); }catch(e){}
  }
  function restoreFirst10AfterFalsePurchase(){
    if(hasPurchased()) return;
    try{
      var w=JSON.parse(storageGet(OFFERS_KEY)||'{"offers":[]}');
      var changed=false;
      (w.offers||[]).forEach(function(o){
        if(o.id==="first10" && o.status==="used"){ o.status="available"; delete o.usedAt; delete o.activatedAt; changed=true; }
      });
      if(w.activeId==="first10"){ w.activeId=null; changed=true; }
      if(changed) storageSet(OFFERS_KEY, JSON.stringify(w));
      if(hasFirst10() || readOffer().claimed) claimOfferId("first10", storageGet(EMAIL_KEY)||readOffer().email||"");
    }catch(e){}
  }
  function syncPurchasedFromList(){
    var known=storageGet(EMAIL_KEY)||readOffer().email||"";
    if(!known) return hasPurchased();
    if(emailHasPurchase(known)){
      if(!hasPurchased()) markPurchased("purchasers-sync");
      else if(!purchasedSource()) storageSet(PURCHASED_SOURCE_KEY,"purchasers-sync");
      return true;
    }
    if(hasPurchased()){
      var src=purchasedSource();
      if(src!=="url" && src!=="confirmed"){
        clearPurchasedFlag();
        restoreFirst10AfterFalsePurchase();
      }
    }
    return false;
  }
  function readOffer(){
    try{
      var o=JSON.parse(storageGet(OFFER_KEY)||"null")||{};
      return {activated:!!o.activated,email:(o.email||storageGet(EMAIL_KEY)||"").toLowerCase(),claimed:!!o.claimed||!!o.activated};
    }catch(e){ return {activated:false,email:storageGet(EMAIL_KEY),claimed:false}; }
  }
  function writeOffer(o){
    storageSet(OFFER_KEY, JSON.stringify({activated:!!o.activated,email:(o.email||"").toLowerCase(),claimed:!!o.claimed,activatedAt:o.activatedAt}));
    if(o.email) storageSet(EMAIL_KEY, o.email);
  }
  function activeOfferId(){
    try{ var o=JSON.parse(storageGet(OFFERS_KEY)||"null"); return o&&(o.activeId==="first10"||o.activeId==="pl5")?o.activeId:null; }catch(e){ return null; }
  }
  function claimOfferId(id,email){
    if(email) writeOffer({activated:false,email:email,claimed:true});
    if(id==="first10") storageSet(FIRST10_CLAIMED_KEY,"1");
    try{
      var w=JSON.parse(storageGet(OFFERS_KEY)||'{"offers":[],"activeId":null}');
      if(!w.offers) w.offers=[];
      if(!w.offers.some(function(x){ return x.id===id; })){
        w.offers.push({id:id,status:"available",claimedAt:new Date().toISOString()});
        storageSet(OFFERS_KEY, JSON.stringify(w));
      }
    }catch(e){}
  }
  function hasFirst10(){
    if(storageGet(FIRST10_CLAIMED_KEY)==="1") return true;
    if(readOffer().claimed){ storageSet(FIRST10_CLAIMED_KEY,"1"); return true; }
    try{
      var hit=(JSON.parse(storageGet(OFFERS_KEY)||'{"offers":[]}').offers||[]).some(function(o){ return o.id==="first10"; });
      if(hit) storageSet(FIRST10_CLAIMED_KEY,"1");
      return hit;
    }catch(e){ return false; }
  }
  function loadOffersUi(cb){
    if(window.jdOpenOffers){ if(cb) cb(); return; }
    if(document.getElementById("jd-square-offers-js")){ if(cb) setTimeout(cb,250); return; }
    var s=document.createElement("script");
    s.id="jd-square-offers-js"; s.src=JD_SITE+"square-offers.js?v=2"; s.async=true;
    s.onload=function(){ if(cb) cb(); }; document.head.appendChild(s);
  }
  function openOffersScreen(){ loadOffersUi(function(){ if(window.jdOpenOffers) window.jdOpenOffers(); }); }
  function ensureCartOffers(){ loadOffersUi(function(){ if(window.jdEnsureCartOffers) window.jdEnsureCartOffers(); }); }
  function validEmail(e){ return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test((e||"").trim()); }
  function capturePurchase(){
    try{
      var u=new URL(location.href);
      var f=u.searchParams.get("purchase")||u.searchParams.get("purchased");
      if(f==="1"||f==="true"){
        markPurchased("url");
        u.searchParams.delete("purchase");
        u.searchParams.delete("purchased");
        history.replaceState({},"",u.pathname+u.search+u.hash);
      }
    }catch(e){}
  }
  function emailHasPurchase(email){
    var want=(email||"").toLowerCase();
    if(!want) return false;
    for(var i=0;i<(PRIOR_EMAILS||[]).length;i++){
      if(PRIOR_EMAILS[i]===want) return true;
    }
    return false;
  }

  function collectLead(email, source, extras){
    var tasks=[];
    var extra=extras||{};
    var payload={
      email:email,
      source:source,
      product:"Jersey Deals",
      site:"Square Online",
      list:"jerseydeals_leads",
      collected_at:new Date().toISOString()
    };
    Object.keys(extra).forEach(function(k){
      var v=String(extra[k]||"").trim();
      if(v) payload[k]=v.slice(0,500);
    });
    if(COLLECT_URL){
      var headers={"Content-Type":"application/json","Accept":"application/json"};
      if(COLLECT_SECRET) headers["X-JD-Collect-Secret"]=COLLECT_SECRET;
      tasks.push(fetch(COLLECT_URL,{
        method:"POST",
        headers:headers,
        body:JSON.stringify(payload)
      }).catch(function(){ return null; }));
    }
    if(CONTACT_EMAIL){
      tasks.push(fetch("https://formsubmit.co/ajax/"+encodeURIComponent(CONTACT_EMAIL),{
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify(Object.assign({}, payload, {
          _subject:"[Jersey Deals / Square] new info · "+source,
          _template:"table",
          _captcha:"false",
          _replyto:email
        }))
      }).catch(function(){ return null; }));
    }
    return Promise.all(tasks);
  }

  function walkText(root, fn){
    var w=document.createTreeWalker(root||document.body, NodeFilter.SHOW_TEXT, null);
    var n; while((n=w.nextNode())) fn(n);
  }

  function decorateHero(el){
    if(!el) return;
    var host=el.parentElement||el;
    var banner=el.closest('[class*="banner"],[data-ux="Banner"],section')||host;
    // Badge lives inside #jd-hero-panel title stack — do not absolute-pin over copy.
    if(host && !host.querySelector(".jd-hero-eyebrow")){
      var eye=document.createElement("span");
      eye.className="jd-hero-eyebrow";
      eye.textContent="Jersey Deals";
      host.insertBefore(eye, el);
    }
    // Order under the title: Shop EPL first, supporting line second.
    var cta=host.querySelector(".jd-shop-epl");
    if(host && !cta){
      cta=document.createElement("a");
      cta.className="jd-shop-epl";
      cta.href=EPL_URL;
      cta.target="_blank";
      cta.rel="noopener noreferrer";
      cta.textContent="Shop EPL";
      host.insertBefore(cta, el.nextSibling);
    }
    var sub=host.querySelector(".jd-hero-sub");
    if(host && !sub){
      sub=document.createElement("p");
      sub.className="jd-hero-sub";
      sub.textContent=HERO_SUB;
      host.appendChild(sub);
    } else if(sub){
      sub.textContent=HERO_SUB;
    }
    if(host && cta && sub){
      host.insertBefore(cta, el.nextSibling);
      host.insertBefore(sub, cta.nextSibling);
    }
    el.setAttribute("data-jd-hero","1");
  }

  function polishCopy(){
    walkText(document.body, function(n){
      var t=n.nodeValue||"";
      if(TEMPLATE_HERO.test(t) || /Authentic kits.?s*Real stock/i.test(t) || /^Shop Premier League$/i.test(t.trim())){
        if(TEMPLATE_HERO.test(t) || /Authentic kits.?s*Real stock/i.test(t)){
          n.nodeValue=t.replace(TEMPLATE_HERO, HERO).replace(/Authentic kits.?s*Real stock.?s*Ships from the U.S.?/i, HERO);
        }
        decorateHero(n.parentElement);
      }
      if(/Club,s*youth,s*ands*trainings*jerseys/i.test(t)){
        n.nodeValue=t.replace(/Club,s*youth,s*ands*trainings*jerseys/ig, "Club, country, and training jerseys");
      }
      if(FOOTER_DEMO.test(t)){
        n.nodeValue="Thanks for signing up — we'll share new drops and deals. No spam.";
      }
      if(/^Stay in the Loop$/i.test(t.trim())){
        n.nodeValue="Join the drop list";
      }
      // Empty-cart contrast: force readable navy text when Square uses dark panels
      if(/your cart is empty|cart is empty/i.test(t.trim())){
        var p=n.parentElement;
        if(p){
          p.style.color="#0b223f";
          p.style.background="#f3f5f7";
          p.style.padding="1.25rem";
          var box=p.closest('[class*="cart"],[class*="Cart"],[data-ux*="Cart"]')||p.parentElement;
          if(box){
            box.style.background="#f3f5f7";
            box.style.color="#0b223f";
          }
        }
      }
    });
  }

  function siteHeader(){
    return document.querySelector(".app-container header, #app header, .main-container header, header");
  }

  function ensureTrust(){
    var bar=document.getElementById("jd-trust-bar");
    if(!bar){
      bar=document.createElement("div");
      bar.id="jd-trust-bar";
      bar.className="jd-trust";
      var header=siteHeader();
      if(header && header.parentNode){
        header.parentNode.insertBefore(bar, header.nextSibling);
      } else {
        document.body.insertBefore(bar, document.body.firstChild);
      }
    }
    bar.className="jd-trust";
    bar.innerHTML="<span>Ships from US inventory</span><span>Free shipping on $100+</span><span>Secure Square checkout</span><span>Real product photos</span>";
  }

  function placeChrome(){
    var header=siteHeader();
    var trust=document.getElementById("jd-trust-bar");
    var hero=document.getElementById("jd-hero-panel");
    if(!header || !header.parentNode) return;
    // If trust/hero were parked before .app-container, tuck them under the real header.
    if(trust && trust.parentNode!==header.parentNode){
      header.parentNode.insertBefore(trust, header.nextSibling);
    }
    if(hero && hero.parentNode!==header.parentNode){
      var after=trust && trust.parentNode===header.parentNode ? trust : header;
      after.parentNode.insertBefore(hero, after.nextSibling);
    } else if(hero && trust && trust.parentNode===header.parentNode && hero.previousElementSibling!==trust){
      trust.parentNode.insertBefore(hero, trust.nextSibling);
    }
  }

  function heroMarkup(){
    return ''
      +'<div class="jd-hero-inner">'
      +'<img class="jd-epl-badge" src="'+EPL_BADGE+'" alt="Premier League" width="56" height="56"/>'
      +'<span class="jd-hero-eyebrow">Jersey Deals</span>'
      +'<h2>Shop Premier League</h2>'
      +'<a class="jd-shop-epl" href="'+EPL_URL+'" target="_blank" rel="noopener noreferrer">Shop EPL</a>'
      +'<p class="jd-hero-sub">'+HERO_SUB+'</p>'
      +'<a class="jd-shop-all" href="'+SHOP_ALL_URL+'">Shop All</a>'
      +'</div>';
  }

  function syncHeroPanel(panel){
    if(!panel) return;
    var inner=panel.querySelector(".jd-hero-inner");
    if(!inner){
      panel.innerHTML=heroMarkup();
      inner=panel.querySelector(".jd-hero-inner");
    }
    // Move any absolute/out-of-flow badge into the inner stack above the title.
    var badge=panel.querySelector(".jd-epl-badge");
    if(!badge){
      badge=document.createElement("img");
      badge.className="jd-epl-badge";
      badge.alt="Premier League";
      badge.width=56;badge.height=56;
      inner.insertBefore(badge, inner.firstChild);
    } else if(badge.parentNode!==inner){
      inner.insertBefore(badge, inner.firstChild);
    } else if(inner.firstChild!==badge){
      inner.insertBefore(badge, inner.firstChild);
    }
    badge.src=EPL_BADGE;
    badge.style.position="static";
    var sub=inner.querySelector(".jd-hero-sub");
    if(sub) sub.textContent=HERO_SUB;
    var epl=inner.querySelector(".jd-shop-epl");
    if(epl){ epl.href=EPL_URL; epl.target="_blank"; epl.rel="noopener noreferrer"; }
    var shopAll=inner.querySelector(".jd-shop-all");
    if(!shopAll){
      shopAll=document.createElement("a");
      shopAll.className="jd-shop-all";
      shopAll.textContent="Shop All";
      if(sub && sub.parentNode) sub.parentNode.insertBefore(shopAll, sub.nextSibling);
      else inner.appendChild(shopAll);
    }
    shopAll.href=SHOP_ALL_URL;
  }

  function ensureHeroPanel(){
    var existing=document.getElementById("jd-hero-panel");
    if(!existing){
      var panel=document.createElement("section");
      panel.id="jd-hero-panel";
      panel.className="jd-hero-panel";
      panel.setAttribute("aria-label","Shop Premier League");
      panel.innerHTML=heroMarkup();
      var trust=document.getElementById("jd-trust-bar");
      var header=siteHeader();
      if(trust && trust.parentNode){
        trust.parentNode.insertBefore(panel, trust.nextSibling);
      } else if(header && header.parentNode){
        header.parentNode.insertBefore(panel, header.nextSibling);
      } else {
        document.body.insertBefore(panel, document.body.firstChild);
      }
      existing=panel;
    }
    syncHeroPanel(existing);
    // Hide homepage banner slides/blocks only (not the whole header chrome).
    var banners=document.querySelectorAll(
      '.banner-1, [class*="banner-1"], .w-block-banner, [class*="banner-block"], .banner-slide-wrapper, .w-image-block--responsive.banner-1, .w-block-wrapper.banner, [data-ux="Banner"]'
    );
    for(var i=0;i<banners.length;i++){
      var b=banners[i];
      if(!b || b.id==="jd-hero-panel" || b.classList.contains("jd-hero-panel")) continue;
      if(b.closest("#jd-hero-panel")) continue;
      var cn=typeof b.className==="string"?b.className:"";
      if(/header-banner/i.test(cn) || b.closest('[class*="header-banner"]')) {
        b.removeAttribute("data-jd-banner-hidden");
        continue;
      }
      b.setAttribute("data-jd-banner-hidden","1");
    }
    // Unhide header chrome previously hidden by the broad banner selector.
    var restore=document.querySelectorAll('[class*="header-banner"][data-jd-banner-hidden="1"]');
    for(var r=0;r<restore.length;r++) restore[r].removeAttribute("data-jd-banner-hidden");
    // Compact Square header so it can't leave a tall black void under CART.
    var hdr=siteHeader();
    if(hdr){
      hdr.style.minHeight="0";
      hdr.style.height="auto";
      hdr.style.paddingTop="0.35rem";
      hdr.style.paddingBottom="0.35rem";
    }
    // Move trust + hero under Square header so CART is not stranded in a black gap.
    placeChrome();
    // Keep every Shop EPL CTA on the clubs grid destination.
    var eplLinks=document.querySelectorAll("a.jd-shop-epl");
    for(var e=0;e<eplLinks.length;e++){
      var a=eplLinks[e];
      if(!a) continue;
      a.href=EPL_URL;
      a.target="_blank";
      a.rel="noopener noreferrer";
    }
  }

  function ensureHeaderLogo(){
    var header=siteHeader();
    if(!header) return;
    var host=header.querySelector(".header-banner-wrapper, [class*='header-banner'], .w-cell")||header;
    var logo=header.querySelector(".header__logo a, a.logo__link, a[href='/'], [data-aid='HEADER_LOGO_RENDERED']");
    var img=logo && logo.querySelector("img");
    if(logo && img){
      // Un-collapse Square's logo slot and force a readable mark.
      logo.style.cssText="display:inline-flex;align-items:center;flex:0 0 auto;min-width:2.75rem;margin:0;padding:0;order:-1";
      if(logo.parentElement) logo.parentElement.style.cssText="display:inline-flex;align-items:center;flex:0 0 auto;min-width:2.75rem;order:-1";
      img.src=SITE_LOGO;
      img.alt="Jersey Deals";
      img.width=44;img.height=44;
      img.style.cssText="display:block;width:2.75rem;height:2.75rem;object-fit:contain;border-radius:8px";
      return;
    }
    if(document.getElementById("jd-header-logo")) return;
    var a=document.createElement("a");
    a.id="jd-header-logo";
    a.href="/";
    a.setAttribute("aria-label","Jersey Deals home");
    a.innerHTML='<img src="'+SITE_LOGO+'" alt="Jersey Deals" width="44" height="44"/>';
    host.insertBefore(a, host.firstChild);
  }

  function ensureHeaderEmail(){
    var header=siteHeader();
    if(!header) return;
    ensureHeaderLogo();
    var form=document.getElementById("jd-header-email");
    var member=rewardsMember();
    if(!form){
      form=document.createElement("form");
      form.id="jd-header-email";
      form.className="jd-header-email";
      form.setAttribute("aria-label","Jersey Deals Rewards Club");
      if(member){
        lockRewards(form);
      } else {
        form.innerHTML=
          '<input type="email" name="email" autocomplete="email" required placeholder="Free Rewards Club" aria-label="Email for free Rewards Club signup"/>'
          +'<button type="submit">Join</button>';
        form.addEventListener("submit", function(e){
          e.preventDefault();
          if(rewardsMember()){ lockRewards(form); return; }
          var input=form.querySelector('input[type="email"]');
          var val=((input&&input.value)||"").trim().toLowerCase();
          if(!validEmail(val)){ if(input) input.focus(); return; }
          storageSet(REWARDS_KEY, JSON.stringify({email:val,at:new Date().toISOString()}));
          storageSet(EMAIL_KEY, val);
          collectLead(val, "rewards_club");
          claimOfferId("pl5");
          lockRewards(form);
        });
      }
      var logo=header.querySelector("#jd-header-logo, .header__logo, a.logo__link, a[href='/']");
      if(logo && logo.parentNode){
        if(logo.nextSibling) logo.parentNode.insertBefore(form, logo.nextSibling);
        else logo.parentNode.appendChild(form);
      } else {
        header.insertBefore(form, header.firstChild ? header.firstChild.nextSibling : null);
        if(!form.parentNode) header.appendChild(form);
      }
    } else if(member){
      lockRewards(form);
    } else if(!form.querySelector(".jd-header-email-ok")){
      var input=form.querySelector('input[type="email"]');
      if(input){ input.placeholder="Free Rewards Club"; input.setAttribute("aria-label","Email for free Rewards Club signup"); }
      if(hasFirst10() && !form.querySelector("#jd-see-offers")){
        var see=document.createElement("button");
        see.type="button";
        see.id="jd-see-offers";
        see.className="jd-see-offers";
        see.textContent="See my offers";
        see.onclick=function(e){ e.preventDefault(); openOffersScreen(); };
        form.appendChild(see);
      }
    }
    form.style.flex="1 1 auto";
    form.style.minWidth="0";
    form.style.maxWidth="11.5rem";
  }

  function findLink(){
    try{
      var path=location.pathname||"";
      var disc=activeOfferId()==="first10";
      var m=path.match(/\\/product\\/[^/]+\\/([A-Z0-9]+)/i);
      var id=m && m[1];
      if(id){
        if(disc && MAP.byItemIdDiscount && MAP.byItemIdDiscount[id]) return MAP.byItemIdDiscount[id];
        if(MAP.byItemId && MAP.byItemId[id]) return MAP.byItemId[id];
      }
      var keys=Object.keys(MAP.byItemId||{});
      for(var i=0;i<keys.length;i++){
        if(path.indexOf(keys[i])!==-1){
          if(disc && MAP.byItemIdDiscount && MAP.byItemIdDiscount[keys[i]]) return MAP.byItemIdDiscount[keys[i]];
          return MAP.byItemId[keys[i]];
        }
      }
    }catch(e){}
    return null;
  }

  function ensureOfferPopup(){
    capturePurchase();
    if(rewardsMember()) claimOfferId("pl5");
    syncPurchasedFromList();
    if(hasPurchased()) return;
    if(hasFirst10()) return;
    if(document.getElementById("jd-offer-root")) return;
    var root=document.createElement("div");
    root.id="jd-offer-root";
    root.innerHTML='<div id="jd-offer-card" role="dialog" aria-modal="true">'
      +'<button type="button" id="jd-offer-close" aria-label="Close">✕</button>'
      +'<div style="font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d7282f">First-time buyer offer</div>'
      +'<h2>10% off all items</h2>'
      +'<p>Enter your email to claim 10% off your first order. Find it in My offers and activate at checkout.</p>'
      +'<label for="jd-offer-email">Email <span class="jd-req">*</span></label>'
      +'<input id="jd-offer-email" type="email" autocomplete="email" placeholder="you@email.com" required />'
      +'<div class="jd-offer-err" id="jd-offer-err" hidden></div>'
      +'<button type="button" id="jd-offer-activate">Claim offer</button>'
      +'</div>';
    document.body.appendChild(root);
    function close(){ root.remove(); }
    root.querySelector("#jd-offer-close").onclick=close;
    root.addEventListener("click", function(e){ if(e.target===root) close(); });
    root.querySelector("#jd-offer-activate").onclick=function(){
      var input=root.querySelector("#jd-offer-email");
      var err=root.querySelector("#jd-offer-err");
      var email=(input.value||"").trim().toLowerCase();
      err.hidden=true;
      if(!validEmail(email)){ err.textContent="Enter a valid email address."; err.hidden=false; return; }
      if(emailHasPurchase(email)){
        markPurchased("purchasers-sync");
        storageSet(EMAIL_KEY, email);
        collectLead(email, "first_buyer_offer_returning");
        err.textContent="This email already has a purchase — the first-time 10% offer isn’t available.";
        err.hidden=false;
        setTimeout(close, 1600);
        return;
      }
      claimOfferId("first10", email);
      collectLead(email, "first_buyer_offer");
      close();
      openOffersScreen();
    };
  }

  function ensureEmailBeforeCheckout(anchor){
    if(!anchor || anchor.getAttribute("data-jd-email-bound")==="1") return;
    anchor.setAttribute("data-jd-email-bound","1");
    anchor.addEventListener("click", function(e){
      var email=storageGet(EMAIL_KEY) || readOffer().email;
      if(email) return;
      e.preventDefault();
      e.stopPropagation();
      // Reuse offer modal as email gate when possible
      sessionSet("jerseydeals.offer.dismissed","");
      var existing=document.getElementById("jd-offer-root");
      if(existing) existing.remove();
      // Force gate UI
      var root=document.createElement("div");
      root.id="jd-offer-root";
      root.innerHTML='<div id="jd-offer-card" role="dialog" aria-modal="true">'
        +'<div style="font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d7282f">Email required</div>'
        +'<h2>Add your email to checkout</h2>'
        +'<p>Email is mandatory before you can buy.</p>'
        +'<label for="jd-offer-email">Email <span class="jd-req">*</span> <span class="jd-req" style="letter-spacing:0;text-transform:none;font-size:.72rem">mandatory</span></label>'
        +'<input id="jd-offer-email" type="email" autocomplete="email" placeholder="you@email.com" required />'
        +'<div class="jd-offer-err" id="jd-offer-err" hidden></div>'
        +'<button type="button" id="jd-offer-activate">Continue to checkout</button>'
        +'</div>';
      document.body.appendChild(root);
      root.querySelector("#jd-offer-activate").onclick=function(){
        var input=root.querySelector("#jd-offer-email");
        var err=root.querySelector("#jd-offer-err");
        var val=(input.value||"").trim().toLowerCase();
        err.hidden=true;
        if(!validEmail(val)){ err.textContent="Enter a valid email address."; err.hidden=false; return; }
        if(emailHasPurchase(val)) markPurchased("purchasers-sync");
        storageSet(EMAIL_KEY, val);
        collectLead(val, "square_checkout_gate");
        root.remove();
        var href=anchor.getAttribute("href");
        if(href) window.open(href, "_blank", "noopener,noreferrer");
      };
    }, true);
  }

  function polishPrices(){
    if(activeOfferId()!=="first10") return;
    var nodes=document.querySelectorAll("body *");
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(!el || el.childNodes.length!==1 || el.getAttribute("data-jd-priced")==="1") continue;
      var t=(el.textContent||"").trim();
      var m=t.match(/^\\$(\\d+(?:\\.\\d{2})?)$/);
      if(!m) continue;
      var price=parseFloat(m[1]);
      if(!(price>0) || price>500) continue;
      var next=Math.round(price*0.9*100)/100;
      el.setAttribute("data-jd-priced","1");
      var was=document.createElement("span");
      was.className="jd-price-was";
      was.textContent=t;
      el.textContent="$"+(Number.isInteger(next)?next:next.toFixed(2));
      el.appendChild(was);
      var chip=document.createElement("div");
      chip.className="jd-offer-chip";
      chip.textContent="10% first-time offer";
      if(el.parentNode) el.parentNode.insertBefore(chip, el.nextSibling);
    }
  }

  function hideOos(root){
    var nodes=(root||document).querySelectorAll("body *");
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(!el||!el.childNodes||el.childNodes.length!==1) continue;
      var t=(el.textContent||"").trim();
      if(/^out of stock$/i.test(t)){
        el.setAttribute("data-jd-oos-hidden","1");
        el.classList.add("jd-oos-hide");
      }
    }
  }

  function isProductPage(){
    return /\\/product\\//i.test(location.pathname||"");
  }

  function isVisibleEl(el){
    if(!el) return false;
    try{
      var r=el.getBoundingClientRect();
      if(r.width < 24 || r.height < 18) return false;
      var style=window.getComputedStyle(el);
      if(style.display==="none" || style.visibility==="hidden" || Number(style.opacity)===0) return false;
      return true;
    }catch(err){ return false; }
  }

  function findNativeAddToCart(){
    var marked=document.querySelector('[data-jd-sticky-cart="1"]');
    if(marked && marked.isConnected && isVisibleEl(marked)) return marked;
    if(marked && marked.isConnected && !isVisibleEl(marked)){
      marked.removeAttribute("data-jd-sticky-cart");
      marked.removeAttribute("data-jd-view-bound");
      marked.classList.remove("jd-sticky-view-cart");
    }
    var nodes=document.querySelectorAll('button, [role="button"], a[class*="button"], [data-aid*="CART"], [data-aid*="BUY"], [data-aid*="PRODUCT"]');
    var stickyCandidate=null;
    var labeledCandidate=null;
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(!el || el.closest("#jd-buy-now-btn")) continue;
      if(el.getAttribute("data-jd-role")==="add-to-cart") continue;
      if(!isVisibleEl(el)) continue;
      var aid=((el.getAttribute("data-aid")||"")+" "+(el.getAttribute("aria-label")||"")).toLowerCase();
      var t=(el.textContent||"").replace(/\\s+/g," ").trim();
      var style=window.getComputedStyle(el);
      var parent=el.parentElement;
      var pStyle=parent ? window.getComputedStyle(parent) : null;
      var fixed=/(fixed|sticky)/.test(style.position||"") || (pStyle && /(fixed|sticky)/.test(pStyle.position||""));
      var nearBottom=false;
      try{
        var r=el.getBoundingClientRect();
        nearBottom=r.bottom > (window.innerHeight-140) && r.width > 80;
      }catch(err){}
      if(/add[_ -]?to[_ -]?cart|product_add|buy_button|sticky.*cart/.test(aid)){
        if(fixed || nearBottom) return el;
        if(!labeledCandidate) labeledCandidate=el;
      }
      if(/^view cart\\b/i.test(t) && (fixed || nearBottom)) return el;
      if(/^add to cart\\b/i.test(t) || (/add to cart/i.test(t) && t.length<48)){
        if(fixed || nearBottom) return el;
        if(!labeledCandidate) labeledCandidate=el;
      }
      // Sticky bar often shows only a price (e.g. "$49.99") with no "Add to Cart" label.
      if(!stickyCandidate && (/^\\$\\d/.test(t) && t.length<20 || /add to cart/i.test(t))){
        if(fixed || nearBottom) stickyCandidate=el;
      }
    }
    return stickyCandidate || labeledCandidate;
  }

  function bindInjectedAddToCart(btn){
    if(!btn || btn.getAttribute("data-jd-atc-bound")==="1") return;
    btn.setAttribute("data-jd-atc-bound","1");
    btn.addEventListener("click", function(e){
      e.preventDefault();
      var native=findNativeAddToCart();
      if(native){
        try{ native.click(); }catch(err){}
      }else{
        location.href="/s/cart";
      }
    });
  }

  function ensureCartButtonSwap(){
    if(!isProductPage()) return;
    var wrap=document.getElementById("jd-buy-now-btn");
    if(wrap){
      var links=wrap.querySelectorAll("a.jd-buy-now");
      var addBtn=wrap.querySelector('a[data-jd-role="add-to-cart"]');
      if(!addBtn){
        for(var i=0;i<links.length;i++){
          var href=links[i].getAttribute("href")||"";
          var t=(links[i].textContent||"").trim();
          if(/view cart/i.test(t) || /add to cart/i.test(t) || href.indexOf("/s/cart")>=0){
            addBtn=links[i];
            break;
          }
        }
      }
      if(!addBtn && links.length>=2) addBtn=links[1];
      if(addBtn){
        addBtn.setAttribute("data-jd-role","add-to-cart");
        addBtn.classList.add("jd-buy-now");
        addBtn.textContent="Add to Cart";
        addBtn.setAttribute("href","#");
        addBtn.removeAttribute("target");
        addBtn.style.background="";
        bindInjectedAddToCart(addBtn);
      }
    }
    var native=findNativeAddToCart();
    if(!native) return;
    native.setAttribute("data-jd-sticky-cart","1");
    native.classList.add("jd-sticky-view-cart");
    var txt=(native.textContent||"").replace(/\\s+/g," ").trim();
    if(!/^view cart\\b/i.test(txt)){
      var priceMatch=txt.match(/\\$[\\d.,]+/);
      native.textContent=priceMatch ? ("View cart "+priceMatch[0]) : "View cart";
    }
    if(native.getAttribute("data-jd-view-bound")==="1") return;
    native.setAttribute("data-jd-view-bound","1");
    native.addEventListener("click", function(e){
      // Programmatic clicks from our Add to Cart must still add the item.
      if(!e.isTrusted) return;
      e.preventDefault();
      e.stopPropagation();
      location.href="/s/cart";
    }, true);
  }

  function lockPdpHorizontalSwipe(){
    var onPdp=isProductPage();
    document.documentElement.classList.toggle("jd-pdp", onPdp);
    document.body.classList.toggle("jd-pdp-lock", onPdp);
    var app=document.getElementById("app")||document.querySelector(".app-container,.theme-square");
    if(app) app.classList.toggle("jd-pdp-lock", onPdp);
    if(!onPdp || window.__jdSwipeLockBound) return;
    window.__jdSwipeLockBound=true;
    var startX=0, startY=0;
    document.addEventListener("touchstart", function(e){
      if(!e.touches||!e.touches[0]) return;
      startX=e.touches[0].clientX; startY=e.touches[0].clientY;
    }, {passive:true});
    document.addEventListener("touchmove", function(e){
      if(!isProductPage()||!e.touches||!e.touches[0]) return;
      var dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
      if(Math.abs(dx)<=Math.abs(dy)||Math.abs(dx)<8) return;
      if(e.target&&e.target.closest&&e.target.closest('[class*="gallery"],[class*="Gallery"],[class*="carousel"],[class*="Carousel"],[class*="swiper"],[class*="product-image"],[class*="product__image"]')) return;
      if(window.scrollX) window.scrollTo(0, window.scrollY||0);
      if(e.cancelable) e.preventDefault();
    }, {passive:false});
  }

  function findPdpPriceEl(){
    var scope=document.querySelector('.product__header, [class*="product__header"], .product_meta__wrapper, [class*="product_meta"], [class*="product-detail"]')||document;
    var all=scope.querySelectorAll("h1, h2, [class*='price'], [data-aid*='PRICE'], [data-aid*='PRODUCT'], span, div, p");
    var best=null;
    for(var i=0;i<all.length;i++){
      var el=all[i];
      if(!el || el.closest("#jd-buy-now-btn") || el.closest("header") || el.closest("footer")) continue;
      if((el.children||[]).length > 4) continue;
      var t=(el.textContent||"").replace(/\\s+/g," ").trim();
      if(!/^\\$\\d/.test(t) || t.length>18) continue;
      if(!isVisibleEl(el)) continue;
      best=el;
      break;
    }
    return best;
  }

  function remountBuyWrapIfNeeded(wrap){
    if(!wrap || !isProductPage()) return wrap;
    var host=document.querySelector('.product__header, .badge-around.product__header, [class*="product__header"], .product_meta__wrapper, [class*="product_meta"]');
    if(!host) return wrap;
    if(host.contains(wrap)) return wrap;
    var price=findPdpPriceEl();
    if(price && host.contains(price) && price.parentNode){
      price.parentNode.insertBefore(wrap, price.nextSibling);
    }else{
      host.appendChild(wrap);
    }
    return wrap;
  }

  function mountBuyWrap(){
    var existing=document.getElementById("jd-buy-now-btn");
    if(existing) return remountBuyWrapIfNeeded(existing);
    if(!isProductPage()) return null;
    var wrap=document.createElement("div");
    wrap.id="jd-buy-now-btn";
    wrap.style.cssText="display:flex;flex-direction:column;flex-wrap:nowrap;gap:.6rem;margin:.75rem 0 1rem;background:transparent;width:100%;max-width:100%;box-sizing:border-box";
    var cart=document.createElement("a");
    cart.className="jd-buy-now";
    cart.href="#";
    cart.setAttribute("data-jd-role","add-to-cart");
    cart.textContent="Add to Cart";
    bindInjectedAddToCart(cart);
    wrap.appendChild(cart);
    var ship=document.createElement("div");
    ship.setAttribute("data-jd-ship","1");
    ship.style.cssText="flex-basis:100%;font:600 12px/1.3 Outfit,system-ui,sans-serif;color:#0b223f;margin-top:.15rem";
    ship.textContent="Free shipping $100+ · else 10% · email required";
    wrap.appendChild(ship);
    var host=document.querySelector('.product__header, .badge-around.product__header, [class*="product__header"], .product_meta__wrapper, [class*="product_meta"]');
    var price=findPdpPriceEl();
    if(price && price.parentNode && (!host || host.contains(price))){
      price.parentNode.insertBefore(wrap, price.nextSibling);
    }else if(host){
      host.appendChild(wrap);
    }else if(price && price.parentNode){
      price.parentNode.insertBefore(wrap, price.nextSibling);
    }else{
      var main=document.querySelector('main, [class*="product-detail"], #content');
      if(main) main.insertBefore(wrap, main.firstChild);
      else document.body.appendChild(wrap);
    }
    return wrap;
  }

  function ensureBuyButton(url){
    var wrap=mountBuyWrap();
    if(!wrap) return;
    var shipLine=wrap.querySelector("[data-jd-ship]");
    if(shipLine){
      shipLine.textContent="Free shipping $100+ · else 10% · email required";
    }
    var buy=wrap.querySelector('a.jd-buy-now:not([data-jd-role="add-to-cart"])');
    if(url){
      if(!buy){
        buy=document.createElement("a");
        buy.className="jd-buy-now";
        buy.target="_blank";
        buy.rel="noopener noreferrer";
        buy.textContent="Buy now — secure checkout";
        wrap.insertBefore(buy, wrap.firstChild);
      }
      if(buy.href!==url) buy.href=url;
      ensureEmailBeforeCheckout(buy);
    }
    var addBtn=wrap.querySelector('a[data-jd-role="add-to-cart"]');
    if(!addBtn){
      addBtn=document.createElement("a");
      addBtn.className="jd-buy-now";
      addBtn.href="#";
      addBtn.setAttribute("data-jd-role","add-to-cart");
      addBtn.textContent="Add to Cart";
      var ship=wrap.querySelector("div");
      if(ship) wrap.insertBefore(addBtn, ship);
      else wrap.appendChild(addBtn);
    }
    bindInjectedAddToCart(addBtn);
    ensureCartButtonSwap();
  }

  function cartIconSvg(){
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H7"></path></svg>';
  }

  function ensureCartNav(){
    // Remove our old full-width Cart pill — Square's native header cart icon is enough.
    var legacy=document.getElementById("jd-cart-nav");
    if(legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
    // Strip icons we previously injected so we don't show two carts.
    var extras=document.querySelectorAll('header [data-jd-cart-icon="1"]');
    for(var i=0;i<extras.length;i++){
      var p=extras[i];
      var injected=p.querySelector('span[aria-hidden="true"]');
      if(injected && injected.querySelector("svg") && injected.parentNode===p) injected.parentNode.removeChild(injected);
      p.removeAttribute("data-jd-cart-icon");
    }
  }

  function patchCards(){
    var anchors=document.querySelectorAll('a[href*="/product/"]');
    for(var i=0;i<anchors.length;i++){
      var a=anchors[i];
      var href=a.getAttribute("href")||"";
      var m=href.match(/\\/product\\/[^/]+\\/([A-Z0-9]+)/i);
      if(!m) continue;
      var link=MAP.byItemId[m[1]];
      if(!link) continue;
      a.setAttribute("data-jd-checkout", link);
    }
    hideOos(document);
  }

  function run(){
    ensureTrust();
    ensureHeaderLogo();
    ensureHeaderEmail();
    ensureHeroPanel();
    ensureCartNav();
    polishCopy();
    hideOos(document);
    ensureOfferPopup();
    ensureCartOffers();
    polishPrices();
    lockPdpHorizontalSwipe();
    var link=findLink();
    if(link || isProductPage()) ensureBuyButton(link||"");
    ensureCartButtonSwap();
    patchCards();
    var checkoutAnchors=document.querySelectorAll('a[href*="square.link"],a[href*="checkout.square"],a[href*="/checkout"],a[href*="/s/cart"] button, button[class*="checkout"], a[class*="checkout"]');
    for(var i=0;i<checkoutAnchors.length;i++){
      if(checkoutAnchors[i].tagName==="A") ensureEmailBeforeCheckout(checkoutAnchors[i]);
    }
  }

  window.addEventListener("jd-offers-activated", function(){
    polishPrices();
    var link=findLink();
    var btn=document.querySelector("#jd-buy-now-btn .jd-buy-now");
    if(btn&&link) btn.href=link;
  });
  loadOffersUi();

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 1500);
})();

</script>`
}

async function main() {
  const sites = await square('/v2/sites')
  const site = SITE_OVERRIDE
    ? (sites.sites || []).find((s) => s.id === SITE_OVERRIDE)
    : (sites.sites || []).find((s) => /jerseydeals/i.test(s.domain || s.site_title || '')) ||
      (sites.sites || [])[0]

  if (!site?.id) throw new Error('No Square Online site found')
  console.log(`Site: ${site.site_title} (${site.domain}) → ${site.id}`)

  let existing = ''
  try {
    const snip = await square(`/v2/sites/${site.id}/snippet`)
    existing = snip.snippet?.content || ''
    console.log(`Existing snippet: ${existing.length} chars`)
  } catch (err) {
    console.log(`No existing snippet (or read failed): ${err.message}`)
  }

  const fromSnippet = extractBuyMap(existing) || {
    byItemId: {},
    byVariationId: {},
    byItemIdDiscount: {},
    byVariationIdDiscount: {},
  }
  const fromFile = loadLinksMap()
  const map = authoritativeBuyMap(fromSnippet, fromFile)
  console.log(
    `Buy-bridge map: ${Object.keys(map.byItemId || {}).length} items / ${Object.keys(map.byItemIdDiscount || {}).length} discount links (sold scrubbed)`,
  )

  const purchaserEmails = loadPurchaserEmails()
  const collectUrl = (process.env.JERSEYDEALS_EMAIL_API_URL || process.env.VITE_JERSEYDEALS_EMAIL_API_URL || '').trim()
  const contactEmail = (process.env.JERSEYDEALS_CONTACT_EMAIL || 'shop@jerseydeals.online').trim()
  let content = buildSnippet(map, purchaserEmails, collectUrl, contactEmail)
  function shrink(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n[ \t]*\/\/[^\n]*/g, '')
  }
  // Square Online hard-caps snippet size; drop comments / optional payload if over budget.
  if (content.length > 65535) content = shrink(content)
  if (content.length > 65535) content = shrink(buildSnippet(map, purchaserEmails, '', contactEmail))
  if (content.length > 65535) content = shrink(buildSnippet(map, [], '', contactEmail))
  if (content.length > 65535) {
    content = content.replace(/[ \t]{2,}/g, ' ').replace(/\n{2,}/g, '\n')
  }
  console.log(
    `New snippet length: ${content.length} (prior emails: ${purchaserEmails.length}, collectUrl: ${collectUrl || 'formsubmit-only'})`,
  )
  if (content.length > 65535) {
    throw new Error(`Snippet too long (${content.length}); Square limit is 65535`)
  }

  if (DRY) {
    const { writeFileSync } = await import('node:fs')
    writeFileSync('/tmp/jd-storefront-snippet.html', content)
    console.log('[dry-run] wrote /tmp/jd-storefront-snippet.html; skipping upsert')
    return
  }

  const result = await square(`/v2/sites/${site.id}/snippet`, {
    method: 'POST',
    body: { snippet: { content } },
  })
  console.log(`Upserted snippet ${result.snippet?.id} at ${result.snippet?.updated_at}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
