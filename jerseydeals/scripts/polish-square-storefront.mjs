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

function buildSnippet(map) {
  const mapJson = JSON.stringify(map || { byItemId: {}, byVariationId: {} })

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
html{scroll-behavior:smooth}
body{
  font-family:"Outfit",system-ui,sans-serif!important;
  color:var(--jd-navy)!important;
  background:var(--jd-chalk)!important;
  -webkit-font-smoothing:antialiased;
}
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
/* Hero / banner */
[class*="banner"],[data-ux="Banner"],section[class*="Banner"]{
  position:relative;
  min-height:min(72vh,640px);
  background:
    linear-gradient(135deg,rgba(6,16,28,.88),rgba(11,34,63,.72) 45%,rgba(215,40,47,.35)),
    radial-gradient(1200px 500px at 80% 20%,rgba(215,40,47,.25),transparent 60%),
    #06101c!important;
  background-size:cover!important;
  background-position:center!important;
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
/* Shop / Shop All card titles under product photos */
a[href*="/product/"] [class*="title"],a[href*="/product/"] h2,a[href*="/product/"] h3,
a[href*="/product/"] h4,
[class*="ProductCard"] [class*="title"],
[class*="product-card"] [class*="title"],
[class*="ProductGrid"] [class*="title"],
[class*="product-grid"] [class*="title"]{
  font-family:"Outfit",system-ui,sans-serif!important;
  font-weight:600!important;
  color:var(--jd-white)!important;
  font-size:.95rem!important;
  line-height:1.35!important;
  letter-spacing:.01em;
}
/* Product detail page title (beside/under gallery photos) */
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
  color:var(--jd-white)!important;
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
</style>
<script id="jd-storefront-polish">
(function(){
  var MAP=${mapJson};
  var HERO="Authentic kits. Real stock. Ships from the U.S.";
  var HERO_SUB="Club, youth, and training jerseys — photographed from our inventory.";
  var FOOTER_DEMO=/Thanks for exploring this Square Online Theme/i;
  var TEMPLATE_HERO=/Get started with this free eCommerce template for retailers\\.?/i;

  function walkText(root, fn){
    var w=document.createTreeWalker(root||document.body, NodeFilter.SHOW_TEXT, null);
    var n; while((n=w.nextNode())) fn(n);
  }

  function polishCopy(){
    walkText(document.body, function(n){
      var t=n.nodeValue||"";
      if(TEMPLATE_HERO.test(t)){
        n.nodeValue=t.replace(TEMPLATE_HERO, HERO);
        var el=n.parentElement;
        if(el && !el.getAttribute("data-jd-hero")){
          el.setAttribute("data-jd-hero","1");
          if(!el.parentElement.querySelector(".jd-hero-eyebrow")){
            var eye=document.createElement("span");
            eye.className="jd-hero-eyebrow";
            eye.textContent="Jersey Deals";
            el.parentElement.insertBefore(eye, el);
          }
          if(!el.parentElement.querySelector(".jd-hero-sub")){
            var sub=document.createElement("p");
            sub.className="jd-hero-sub";
            sub.textContent=HERO_SUB;
            sub.style.cssText="color:rgba(243,245,247,.88);max-width:36ch;margin:.75rem auto 0;text-align:center;font-size:1rem;line-height:1.5";
            el.parentElement.insertBefore(sub, el.nextSibling);
          }
        }
      }
      if(FOOTER_DEMO.test(t)){
        n.nodeValue="Thanks for signing up — we'll share new drops and deals. No spam.";
      }
      if(/^Stay in the Loop$/i.test(t.trim())){
        n.nodeValue="Join the drop list";
      }
    });
  }

  function ensureTrust(){
    if(document.getElementById("jd-trust-bar")) return;
    var bar=document.createElement("div");
    bar.id="jd-trust-bar";
    bar.className="jd-trust";
    bar.innerHTML="<span>Ships from US inventory</span><span>Secure Square checkout</span><span>Real product photos</span><span>Adult &amp; youth sizing</span>";
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
    if(document.getElementById("jd-buy-now-btn")) return;
    var wrap=document.createElement("div");
    wrap.id="jd-buy-now-btn";
    wrap.style.cssText="display:flex;flex-wrap:wrap;gap:.6rem;margin:.75rem 0 1rem";
    var btn=document.createElement("a");
    btn.className="jd-buy-now";
    btn.href=url;
    btn.target="_blank";
    btn.rel="noopener noreferrer";
    btn.textContent="Buy now — secure checkout";
    var cart=document.createElement("a");
    cart.className="jd-buy-now";
    cart.href="/s/cart";
    cart.textContent="View cart";
    cart.style.background="#0b223f";
    wrap.appendChild(btn);
    wrap.appendChild(cart);
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
    var link=findLink();
    if(link) ensureBuyButton(link);
    patchCards();
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

  const map = extractBuyMap(existing) || { byItemId: {}, byVariationId: {} }
  console.log(
    `Buy-bridge map: ${Object.keys(map.byItemId || {}).length} items / ${Object.keys(map.byVariationId || {}).length} variations`,
  )

  const content = buildSnippet(map)
  console.log(`New snippet length: ${content.length}`)
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
