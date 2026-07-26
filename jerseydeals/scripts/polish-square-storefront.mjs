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

function buildSnippet(map, purchaserEmails = [], collectUrl = '', contactEmail = 'braydencbell01@gmail.com') {
  const mapJson = JSON.stringify(
    map || { byItemId: {}, byVariationId: {}, byItemIdDiscount: {}, byVariationIdDiscount: {} },
  )
  const emailsJson = JSON.stringify(purchaserEmails || [])
  const collectUrlJson = JSON.stringify(collectUrl || '')
  const contactEmailJson = JSON.stringify(contactEmail || 'braydencbell01@gmail.com')
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
  --jd-muted:#5a6470;
  --jd-white:#ffffff;
}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{
  font-family:"Outfit",system-ui,sans-serif!important;
  color:var(--jd-navy)!important;
  background:var(--jd-chalk)!important;
  -webkit-font-smoothing:antialiased;
}
/* Stop iOS auto-zoom on focus (fields under 16px zoom the page). */
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([type="file"]):not([type="hidden"]),
textarea,
select{font-size:16px!important}
/* Header */
header,[class*="header"],[data-ux="Header"]{
  background:rgba(6,16,28,.96)!important;
  border-bottom:1px solid rgba(255,255,255,.08)!important;
  backdrop-filter:saturate(1.2) blur(8px);
}
header a,header button,header span,header svg,
[class*="header"] a,[class*="header"] button,[class*="header"] span{
  color:var(--jd-white)!important;
  fill:currentColor;
}
header a:hover,[class*="header"] a:hover{color:#fff!important;opacity:.88}
/* Brand wordmark */
header a[href="/"],header [class*="logo"],[data-aid="HEADER_LOGO_RENDERED"]{
  font-family:"Libre Baskerville",Georgia,serif!important;
  font-weight:700!important;
  letter-spacing:.02em!important;
  font-size:1.15rem!important;
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
/* Hero / banner — Premier League tunnel backdrop */
[class*="banner"],[data-ux="Banner"],section[class*="Banner"]{
  position:relative;
  min-height:min(72vh,640px);
  background:
    linear-gradient(135deg,rgba(6,16,28,.88),rgba(11,34,63,.72) 45%,rgba(215,40,47,.28)),
    url("https://jerseydeals.online/epl-tunnel.jpg") center/cover no-repeat,
    #06101c!important;
  background-size:cover!important;
  background-position:center!important;
}
.jd-epl-badge{
  position:absolute;top:1rem;right:1rem;z-index:5;
  width:4.5rem;height:4.5rem;object-fit:contain;
  filter:drop-shadow(0 6px 16px rgba(0,0,0,.45));
  pointer-events:none;
}
.jd-shop-epl{
  display:inline-flex!important;align-items:center;justify-content:center;
  margin:1rem auto 0;padding:.9rem 1.4rem!important;
  background:var(--jd-crimson)!important;color:#fff!important;
  border-radius:999px!important;font-weight:700!important;
  letter-spacing:.14em;text-transform:uppercase;text-decoration:none!important;
  font-size:.72rem!important;
}
[class*="banner"] h1,[class*="banner"] h2,[class*="banner"] [class*="title"],
[class*="banner"] [class*="Headline"],[data-ux="Banner"] h1,[data-ux="Banner"] h2{
  font-family:"Libre Baskerville",Georgia,serif!important;
  color:#fff!important;
  font-weight:700!important;
  letter-spacing:-.01em;
  text-wrap:balance;
  max-width:18ch;
  margin-left:auto;margin-right:auto;
  text-shadow:0 2px 24px rgba(0,0,0,.35);
}
[class*="banner"] p,[class*="banner"] [class*="subtitle"]{
  color:rgba(243,245,247,.88)!important;
  font-family:"Outfit",system-ui,sans-serif!important;
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
  color:var(--jd-muted)!important;
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
  padding:.85rem 1rem;background:var(--jd-navy);color:#fff;
  font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
}
.jd-trust span{opacity:.92}
.jd-trust span+span::before{
  content:"";display:inline-block;width:4px;height:4px;border-radius:50%;
  background:var(--jd-crimson);margin-right:1.25rem;vertical-align:middle;
}
/* Buy bridge */
.jd-buy-now{display:inline-flex!important;align-items:center;justify-content:center;gap:.4rem;
padding:.8rem 1.25rem;margin:.5rem 0;text-decoration:none!important;cursor:pointer}
.jd-oos-hide,[data-jd-oos-hidden="1"]{display:none!important}
/* Eyebrow injected above hero title */
.jd-hero-eyebrow{
  display:block;margin:0 auto .75rem;color:rgba(255,255,255,.72);
  font-family:"Outfit",system-ui,sans-serif;font-size:.72rem;font-weight:600;
  letter-spacing:.22em;text-transform:uppercase;text-align:center;
}
@media (max-width:720px){
  [class*="banner"],[data-ux="Banner"]{min-height:58vh}
  .jd-trust{letter-spacing:.1em;font-size:.65rem;gap:.55rem .9rem}
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
  var EMAIL_KEY="jerseydeals.buyerEmail.v1";
  var HERO="Shop Premier League";
  var HERO_SUB="Club, country, and training jerseys — photographed from our inventory.";
  var JD_SITE="https://jerseydeals.online/";
  var EPL_URL=JD_SITE+"#epl";
  var EPL_TUNNEL=JD_SITE+"epl-tunnel.jpg";
  var EPL_BADGE=JD_SITE+"premier-league-badge.png";
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
  function hasPurchased(){ return storageGet(PURCHASED_KEY)==="1"; }
  function markPurchased(){ storageSet(PURCHASED_KEY,"1"); }
  function readOffer(){
    try{
      var raw=storageGet(OFFER_KEY);
      if(!raw) return {activated:false,email:storageGet(EMAIL_KEY)};
      var o=JSON.parse(raw);
      return {activated:!!o.activated,email:(o.email||storageGet(EMAIL_KEY)||"").toLowerCase()};
    }catch(e){ return {activated:false,email:storageGet(EMAIL_KEY)}; }
  }
  function writeOffer(o){
    storageSet(OFFER_KEY, JSON.stringify(o));
    if(o.email) storageSet(EMAIL_KEY, o.email);
  }
  function validEmail(e){ return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test((e||"").trim()); }
  function capturePurchase(){
    try{
      var u=new URL(location.href);
      var f=u.searchParams.get("purchase")||u.searchParams.get("purchased");
      if(f==="1"||f==="true"){
        markPurchased();
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

  function collectLead(email, source){
    var tasks=[];
    if(COLLECT_URL){
      var headers={"Content-Type":"application/json","Accept":"application/json"};
      if(COLLECT_SECRET) headers["X-JD-Collect-Secret"]=COLLECT_SECRET;
      tasks.push(fetch(COLLECT_URL,{
        method:"POST",
        headers:headers,
        body:JSON.stringify({email:email,source:source,product:"Jersey Deals",site:"Jersey Deals"})
      }).catch(function(){ return null; }));
    }
    if(CONTACT_EMAIL){
      tasks.push(fetch("https://formsubmit.co/ajax/"+encodeURIComponent(CONTACT_EMAIL),{
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({
          email:email,
          source:source,
          product:"Jersey Deals",
          site:"Square Online",
          list:"jerseydeals_leads",
          _subject:"[Jersey Deals] signup · "+source,
          _template:"table",
          _captcha:"false"
        })
      }).catch(function(){ return null; }));
    }
    return Promise.all(tasks);
  }

  function walkText(root, fn){
    var w=document.createTreeWalker(root||document.body, NodeFilter.SHOW_TEXT, null);
    var n; while((n=w.nextNode())) fn(n);
  }

  function decorateHero(el){
    if(!el || el.getAttribute("data-jd-hero")) return;
    el.setAttribute("data-jd-hero","1");
    var host=el.parentElement||el;
    var banner=el.closest('[class*="banner"],[data-ux="Banner"],section')||host;
    if(banner && !banner.querySelector(".jd-epl-badge")){
      var badge=document.createElement("img");
      badge.className="jd-epl-badge";
      badge.src=EPL_BADGE;
      badge.alt="Premier League";
      badge.width=72;badge.height=72;
      banner.style.position=banner.style.position||"relative";
      banner.appendChild(badge);
    }
    if(host && !host.querySelector(".jd-hero-eyebrow")){
      var eye=document.createElement("span");
      eye.className="jd-hero-eyebrow";
      eye.textContent="Jersey Deals";
      host.insertBefore(eye, el);
    }
    if(host && !host.querySelector(".jd-hero-sub")){
      var sub=document.createElement("p");
      sub.className="jd-hero-sub";
      sub.textContent=HERO_SUB;
      sub.style.cssText="color:rgba(243,245,247,.92);max-width:36ch;margin:.75rem auto 0;text-align:center;font-size:1rem;line-height:1.5";
      host.insertBefore(sub, el.nextSibling);
    }
    if(host && !host.querySelector(".jd-shop-epl")){
      var cta=document.createElement("a");
      cta.className="jd-shop-epl";
      cta.href=EPL_URL;
      cta.target="_blank";
      cta.rel="noopener noreferrer";
      cta.textContent="Shop EPL";
      var after=host.querySelector(".jd-hero-sub")||el;
      if(after.nextSibling) host.insertBefore(cta, after.nextSibling);
      else host.appendChild(cta);
    }
  }

  function polishCopy(){
    walkText(document.body, function(n){
      var t=n.nodeValue||"";
      if(TEMPLATE_HERO.test(t) || /Authentic kits\.?\s*Real stock/i.test(t) || /^Shop Premier League$/i.test(t.trim())){
        if(TEMPLATE_HERO.test(t) || /Authentic kits\.?\s*Real stock/i.test(t)){
          n.nodeValue=t.replace(TEMPLATE_HERO, HERO).replace(/Authentic kits\.?\s*Real stock\.?\s*Ships from the U\.S\.?/i, HERO);
        }
        decorateHero(n.parentElement);
      }
      if(/Club,\s*youth,\s*and\s*training\s*jerseys/i.test(t)){
        n.nodeValue=t.replace(/Club,\s*youth,\s*and\s*training\s*jerseys/ig, "Club, country, and training jerseys");
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

  function ensureTrust(){
    if(document.getElementById("jd-trust-bar")) return;
    var bar=document.createElement("div");
    bar.id="jd-trust-bar";
    bar.className="jd-trust";
    bar.innerHTML="<span>Ships from US inventory</span><span>10% shipping on every order</span><span>Secure Square checkout</span><span>Real product photos</span>";
    var header=document.querySelector("header,[class*=\\"header\\"],[data-ux=\\"Header\\"]");
    if(header && header.parentNode){
      header.parentNode.insertBefore(bar, header.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }

  function findLink(){
    try{
      var path=location.pathname||"";
      var offer=readOffer();
      var disc=offer.activated;
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
    if(hasPurchased()) return;
    if(readOffer().activated) return;
    if(sessionGet("jerseydeals.offer.dismissed")==="1") return;
    if(document.getElementById("jd-offer-root")) return;
    var root=document.createElement("div");
    root.id="jd-offer-root";
    root.innerHTML='<div id="jd-offer-card" role="dialog" aria-modal="true">'
      +'<button type="button" id="jd-offer-close" aria-label="Close">✕</button>'
      +'<div style="font-size:.68rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d7282f">First-time buyer offer</div>'
      +'<h2>10% off all items</h2>'
      +'<p>Activate your welcome offer for first-time buyers. Enter your email, then press Activate offer.</p>'
      +'<label for="jd-offer-email">Email <span class="jd-req">*</span> <span class="jd-req" style="letter-spacing:0;text-transform:none;font-size:.72rem">mandatory</span></label>'
      +'<input id="jd-offer-email" type="email" autocomplete="email" placeholder="you@email.com" required />'
      +'<div class="jd-offer-err" id="jd-offer-err" hidden></div>'
      +'<button type="button" id="jd-offer-activate">Activate offer</button>'
      +'</div>';
    document.body.appendChild(root);
    function close(){
      sessionSet("jerseydeals.offer.dismissed","1");
      root.remove();
    }
    root.querySelector("#jd-offer-close").onclick=close;
    root.addEventListener("click", function(e){ if(e.target===root) close(); });
    root.querySelector("#jd-offer-activate").onclick=async function(){
      var input=root.querySelector("#jd-offer-email");
      var err=root.querySelector("#jd-offer-err");
      var email=(input.value||"").trim().toLowerCase();
      err.hidden=true;
      if(!validEmail(email)){ err.textContent="Enter a valid email address."; err.hidden=false; return; }
      if(emailHasPurchase(email)){
        markPurchased();
        storageSet(EMAIL_KEY, email);
        collectLead(email, "first_buyer_offer_returning");
        err.textContent="This email already has a purchase — the first-time 10% offer isn’t available.";
        err.hidden=false;
        setTimeout(close, 1600);
        return;
      }
      writeOffer({activated:true,email:email,activatedAt:Date.now()});
      collectLead(email, "first_buyer_offer");
      close();
      polishPrices();
      var link=findLink();
      if(link){
        var btn=document.querySelector("#jd-buy-now-btn .jd-buy-now");
        if(btn) btn.href=link;
      }
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
        if(emailHasPurchase(val)) markPurchased();
        storageSet(EMAIL_KEY, val);
        collectLead(val, "square_checkout_gate");
        root.remove();
        var href=anchor.getAttribute("href");
        if(href) window.open(href, "_blank", "noopener,noreferrer");
      };
    }, true);
  }

  function polishPrices(){
    if(!readOffer().activated) return;
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

  function ensureBuyButton(url){
    if(!url) return;
    var existing=document.getElementById("jd-buy-now-btn");
    if(existing){
      var a=existing.querySelector("a.jd-buy-now");
      if(a && a.href!==url) a.href=url;
      ensureEmailBeforeCheckout(a);
      return;
    }
    var wrap=document.createElement("div");
    wrap.id="jd-buy-now-btn";
    wrap.style.cssText="display:flex;flex-wrap:wrap;gap:.6rem;margin:.75rem 0 1rem";
    var btn=document.createElement("a");
    btn.className="jd-buy-now";
    btn.href=url;
    btn.target="_blank";
    btn.rel="noopener noreferrer";
    btn.textContent="Buy now — secure checkout";
    ensureEmailBeforeCheckout(btn);
    var cart=document.createElement("a");
    cart.className="jd-buy-now";
    cart.href="/s/cart";
    cart.textContent="View cart";
    cart.style.background="#0b223f";
    wrap.appendChild(btn);
    wrap.appendChild(cart);
    var ship=document.createElement("div");
    ship.style.cssText="flex-basis:100%;font:600 12px/1.3 system-ui,sans-serif;color:#0b223f;margin-top:.15rem";
    ship.textContent="Shipping: 10% added at checkout · email required";
    wrap.appendChild(ship);
    var host=document.querySelector('[class*="product"], main, #content, body');
    var price=null;
    var all=document.querySelectorAll("body *");
    for(var i=0;i<all.length;i++){
      var t=(all[i].textContent||"").trim();
      if(/^\\$\\d/.test(t) && t.length<12){ price=all[i]; break; }
    }
    if(price && price.parentNode){ price.parentNode.insertBefore(wrap, price.nextSibling); }
    else if(host){ host.insertBefore(wrap, host.firstChild); }
    else { document.body.appendChild(wrap); }
  }

  function ensureCartNav(){
    if(document.getElementById("jd-cart-nav")) return;
    var header=document.querySelector("header,[class*='header'],[data-ux='Header']");
    if(!header) return;
    var a=document.createElement("a");
    a.id="jd-cart-nav";
    a.href="/s/cart";
    a.textContent="Cart";
    a.setAttribute("aria-label","Open cart");
    a.style.cssText="margin-left:auto;display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .9rem;border:1px solid rgba(255,255,255,.35);border-radius:999px;font-weight:600;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;color:#fff";
    header.appendChild(a);
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
    ensureCartNav();
    polishCopy();
    hideOos(document);
    ensureOfferPopup();
    polishPrices();
    var link=findLink();
    if(link) ensureBuyButton(link);
    patchCards();
    var checkoutAnchors=document.querySelectorAll('a[href*="square.link"],a[href*="checkout.square"],a[href*="/checkout"],a[href*="/s/cart"] button, button[class*="checkout"], a[class*="checkout"]');
    for(var i=0;i<checkoutAnchors.length;i++){
      if(checkoutAnchors[i].tagName==="A") ensureEmailBeforeCheckout(checkoutAnchors[i]);
    }
  }

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
  const contactEmail = (process.env.JERSEYDEALS_CONTACT_EMAIL || 'braydencbell01@gmail.com').trim()
  const content = buildSnippet(map, purchaserEmails, collectUrl, contactEmail)
  console.log(
    `New snippet length: ${content.length} (prior emails: ${purchaserEmails.length}, collectUrl: ${collectUrl || 'formsubmit-only'})`,
  )
  if (content.length > 65000) {
    throw new Error(`Snippet too long (${content.length}); Square limit is 65535`)
  }

  if (DRY) {
    console.log('[dry-run] skipping upsert')
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
