# Jersey Deals

Storefront landing page for **Jersey Deals** (sibling to BrayStats in this repo).

**Live:** https://jerseydeals.online/

## What’s on the page

Retail homepage patterned after Upper 90 / Goal Kick / Soccer.com-style kit shops:

- Promo announcement bar + sticky nav with search + mobile menu
- Cinematic hero, brand marquee, service strip
- Editorial collections + Men’s / Youth audience paths
- New drops, **Trending now** (filter chips), lookbook campaign
- Training edit, staff picks, **shop by club**, shop by brand
- Full-bleed sale + sale picks + category lookbook
- Filterable inventory with multi-photo galleries + Square Payment Links
- Product cards with sale + low-stock badges
- Brand story, guarantees, how-it-works, size guide, FAQ
- Newsletter / restock alerts, multi-column footer, sticky mobile CTA
- Privacy policy at `/privacy.html`

## Config

Edit `src/config.ts` or set env vars when building:

| Variable | Purpose |
|----------|---------|
| `VITE_SQUARE_STORE_URL` | Square Online storefront URL (CTAs switch to Square when set) |
| `VITE_JERSEYDEALS_EMAIL_FORM_ENDPOINT` | Jersey Deals form POST URL. Default: FormSubmit → `shop@jerseydeals.online` (`CONTACT_EMAIL`). |
| `VITE_JERSEYDEALS_EMAIL_API_URL` | Collector API that upserts **Square Customers** (Cloudflare Worker). |
| `VITE_JERSEYDEALS_EMAIL_API_SECRET` | Optional shared secret header for the collector. |
| `VITE_GA_ID` | Optional GA4 measurement ID |

Until Square Catalog sync is configured, primary checkout stays on eBay (`@jerseydealsofficial`).

## Develop

```bash
cd jerseydeals
npm install
npm run sync:inventory   # Square if secrets exist, else eBay
npm run dev
```

## Inventory sync

### Prefer Square (direct checkout)

```bash
cd jerseydeals
npm run sync:square
# or
npm run sync:inventory
```

Requires:

| Secret | Purpose |
|--------|---------|
| `SQUARE_ACCESS_TOKEN` | Square API token with **ITEMS_READ** (+ **INVENTORY_READ** recommended) |
| `SQUARE_STORE_URL` | Square Online base URL, e.g. `https://your-shop.square.site` |

Optional:

| Secret | Purpose |
|--------|---------|
| `SQUARE_ENVIRONMENT` | `production` (default) or `sandbox` |
| `SQUARE_LOCATION_ID` | Limit inventory counts to one location |
| `SQUARE_INCLUDE_ZERO` | Set `1` to keep zero-qty variations |

**How to get a token**

1. Open [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Create/select an application
3. Credentials → copy the **Access token** (production or sandbox)
4. Confirm **Items** (and Inventory) read permissions
5. Add products in Square Online / Square Dashboard so Catalog isn’t empty
6. Store secrets in GitHub Actions **and** local env / Cursor Cloud secrets

Also set `VITE_SQUARE_STORE_URL` (same store URL) for production builds so CTAs stay on Square even before the next sync.

### eBay fallback

```bash
cd jerseydeals
npm run sync:ebay
```

Requires `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_DEV_ID`, `EBAY_USER_TOKEN`.

`npm run sync:inventory` uses Square when `SQUARE_ACCESS_TOKEN` + `SQUARE_STORE_URL` are present; otherwise eBay.

### Cross-platform listing sync (new + updates)

`npm run sync:cross-platform` keeps **eBay ↔ Square** aligned (Jersey Deals site follows Square):

| Direction | What syncs |
|-----------|------------|
| eBay → Square | New actives create Square items (`sku = ebay:{itemId}`); price / title / qty / description updates |
| Square → eBay | Linked kits revise eBay **price / qty** (up or down) when Square changes; Square-only sellable kits create an eBay listing and write back the SKU |
| Sold / removed | `reconcile:sold` clears Square + eBay + site on Square orders, qty 0, unsellable, eBay SoldList, or eBay ended/UnsoldList |

Scheduled with **Sync Jersey Deals inventory** (every ~10 minutes), after sold reconcile and before site catalog refresh + Payment Links.

Requires repo secrets `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_DEV_ID`, `EBAY_USER_TOKEN` plus `SQUARE_ACCESS_TOKEN`. If eBay secrets are missing, the step skips (exit 0) so Square-only inventory sync can still finish — restore those secrets for scheduled cross-platform carry.

```bash
cd jerseydeals
DRY_RUN=1 npm run sync:cross-platform
npm run sync:cross-platform
```

### Push eBay listings into Square (manual bulk)

If Square Catalog is empty, import the current `listings.json` (usually from eBay) into Square:

```bash
cd jerseydeals
npm run push:square
```

Or run GitHub Action **Push listings to Square** (workflow_dispatch). Then run **Sync Jersey Deals inventory**.
`push:square` only accepts numeric eBay ItemIDs or existing `sku: ebay:{itemId}` (never invents SKUs from Square variation ids).

### Update Square POS titles (club abbreviations)

Sets each item’s Square POS abbreviation from the club name (e.g. Manchester City → `MC`):

```bash
cd jerseydeals
npm run square:pos-abbrevs
```

Or run GitHub Action **Update Square POS abbreviations**.

### Fix Square stock + photos

Re-apply qty **1** on every variation and upload remaining eBay photos onto Square items (up to 12 per item):

```bash
cd jerseydeals
npm run square:fix-stock-images
npm run square:reorder-images   # rebuild Square image_ids in exact eBay PictureURL order
npm run sync:square             # also rewrites listings.json galleries to eBay order
# Or just: npm run enrich:images
```

Requires Square + eBay secrets. Browse cards show the cover photo only; clicking a listing opens a swipeable gallery of every photo in **eBay’s order**.

**Square Online “Out of stock”:** Catalog API cannot enable online Shipping fulfillment. In Square Dashboard → Online → Shipping / Item fulfillment, enable **Shipping** (and assign the Jersey Deals location), then bulk-enable Shipping on items. Until that is set, the `.square.site` storefront can show Out of stock even when Inventory API qty is 1.

Primary landing CTAs say **Browse kits** and open this site’s inventory. Product cards and the cart drawer checkout via Square **Payment Links** (`checkoutUrl`), which work without Online Shipping.

### First-time buyer 10% offer

Creates Square Payment Links with a **10% catalog discount**, syncs `checkoutUrlDiscounted` into `listings.json`, writes `purchasers.json` (emails from Square orders/customers), and powers the welcome popup on Jersey Deals + Square Online:

```bash
cd jerseydeals
npm run square:first10-links
npm run square:polish-storefront
```

The popup only shows for browsers that have never completed a purchase (local flag + prior Square emails). Checkout requires an email on both storefronts.

### Collect offer / checkout emails into Square Customers

Offer + checkout email gates POST to:

1. **Square Customers** via `jerseydeals/email-api` (Cloudflare Worker), when `VITE_JERSEYDEALS_EMAIL_API_URL` / `JERSEYDEALS_EMAIL_API_URL` is set
2. **FormSubmit** inbox → `CONTACT_EMAIL` (confirm the first activation email once)
3. **Permanent landing lists** (member vs non-member) via Actions → **Ingest Jersey Deals inbox emails**
   - Reads FormSubmit lead mail from `shop@jerseydeals.online` over IMAP (`SMTP_USER` / `SMTP_PASS`)
   - Writes `public/rewards-members.json` + `public/non-member-emails.json`
   - Runs every 15 minutes (and on manual workflow_dispatch)

Deploy the worker (GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SQUARE_ACCESS_TOKEN`):

```bash
# local test collector
cd jerseydeals
SQUARE_ACCESS_TOKEN=... npm run email:collect-server
```

Workflow: **Deploy Jersey Deals email API**. Then set `VITE_JERSEYDEALS_EMAIL_API_URL` to the Worker URL and re-polish:

```bash
JERSEYDEALS_EMAIL_API_URL=https://jerseydeals-email-api.<account>.workers.dev npm run square:polish-storefront
```

List collected emails anytime from Square Dashboard → Customers, or:

```bash
npm run square:first10-links   # refreshes public/purchasers.json from Square
```

### Buyable checkout without Online Shipping

Until Shipping is enabled in the Dashboard, run:

```bash
cd jerseydeals
npm run square:buyable-checkout
```

This creates a Square **Payment Link** per item (asks for shipping address), stores them on `checkoutUrl`, and injects a Square Online snippet with **Buy now** + **View cart** (`/s/cart`).

The Jersey Deals landing page has its own **Add to cart** drawer: shoppers can bag kits here, then **Checkout on Square** (Payment Link). Use **Open Square cart** for the native Square Online cart once Shipping is enabled in the Dashboard.

### Polish Square Online storefront + catalog copy

Makes the `.square.site` store look less like the default template:

```bash
cd jerseydeals
npm run square:polish-catalog     # cleaner titles + buyer-facing descriptions
npm run square:polish-storefront  # brand CSS/JS snippet (hero copy, trust bar, crimson CTAs)
npm run sync:square               # refresh listings.json after catalog polish
```

`square:polish-storefront` upserts the Square Snippets API (preserves the buy-now payment-link map). It cannot change Square’s theme editor settings (logo upload, native colors) — do those in Square Dashboard → Online → Website if needed.

### Sold-item reconcile (must-have)

When a kit sells on **Square or eBay**, `npm run reconcile:sold` removes it from:

- Square (qty 0 + unsellable + Payment Links deleted)
- eBay (`EndItem` when SKU is `ebay:{itemId}`; also reads eBay SoldList so eBay-first sales clear Square/site)
- Jersey Deals (`listings.json` + `sold-out.json` for instant client hide)

Test purchases that should stay in stock can be restored with `npm run restore:listing` and recorded in `public/reconcile-exceptions.json`.

### eBay details sync

`npm run sync:ebay-details` copies each eBay listing’s **description** and **condition** onto Square catalog items and `listings.json` (eBay is source of truth).

### Scheduled sync (GitHub Actions)

Workflow: `.github/workflows/sync-jerseydeals-inventory.yml`

- Runs every ~10 minutes and on manual `workflow_dispatch`
- Reconciles sold kits, then refreshes inventory
- Updates `listings.json` / `sold-out.json` / `checkout-links.json` on `Brayden-OS`
- Triggers the Pages deploy when inventory changed

## Build

```bash
cd jerseydeals
npm run build
npm run preview
```

## Facebook Page posts (Graph API)

Agents can publish to the Jersey Deals Facebook Page via GitHub Actions (no password sharing).

**Repo secrets (on `braydencbell01-arch/Brayden-OS`):**

| Secret | Purpose |
|--------|---------|
| `FACEBOOK_PAGE_ID` | Numeric Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Long-lived **Page** access token |

**Permissions on the token:** `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`

**Publish:** Actions → **Post to Facebook Page** → Run workflow (message / optional link / optional image URL).

Local dry run:

```bash
FACEBOOK_PAGE_ID=... FACEBOOK_PAGE_ACCESS_TOKEN=... \
  MESSAGE="Test" DRY_RUN=1 node jerseydeals/scripts/post-facebook.mjs
```

## Rewards / shop email (IONOS SMTP)

Send from **shop@jerseydeals.online** via GitHub Actions (no password in chat).

**Repo secrets:**

| Secret | Example |
|--------|---------|
| `SMTP_HOST` | `smtp.ionos.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `shop@jerseydeals.online` |
| `SMTP_PASS` | mailbox password |
| `SMTP_FROM` | `Jersey Deals <shop@jerseydeals.online>` |

**Send:** Actions → **Send SMTP email** → Run workflow.

- Audience **test** → emails `shop@` (self-test)
- Audience **rewards** → everyone in `public/rewards-members.json`
- Audience **non_members** → everyone in `public/non-member-emails.json`
- Optional **item_name** fills the “new kit just dropped” template
- **dry_run** prints the payload without sending

Messages are sent **one recipient at a time** (private To:), as multipart text+HTML, with
`Reply-To`, aligned `Message-ID` (`@jerseydeals.online`), and `List-Unsubscribe` headers.

### Automatic “new listing” digest (Rewards only)

After each inventory sync, `npm run email:notify-new-listings`:

1. Diffs live `listings.json` against `public/rewards-new-listings-state.json`
2. Queues brand-new kits (by SKU / id)
3. Emails **Rewards members only**, plain-text, short digest
4. **Max once per calendar day** (`America/New_York`) — if you list 8 kits in a day, members get **one** email listing them all
5. First run bootstraps the current catalog with **no email** (so existing stock isn’t blasted)

State file: `jerseydeals/public/rewards-new-listings-state.json` (committed by the inventory sync workflow).

### Automatic “new offer” digest (Rewards only)

**You don’t manage this manually.** When a new Rewards offer is added so it shows
under **My offers** for members, they get a short plain-text email (max once/day).

Source of truth: `src/rewardsOffersCatalog.json`
- App auto-adds those offers to My offers for Rewards members
- Notify job emails members when a new catalog offer appears
- First run bootstraps with no email

When you want a new member offer: tell the agent what it is — they add it to the
catalog, **merge to `Brayden-OS` the same turn** (no “make it live” ask), and
My offers + the new-offer email stay in sync automatically.

```bash
SMTP_HOST=smtp.ionos.com SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... \
  AUDIENCE=test ITEM_NAME="Inter Milan Home" DRY_RUN=1 \
  node jerseydeals/scripts/send-smtp-email.mjs
```

### Deliverability (keep mail out of Junk)

Current DNS for `jerseydeals.online`:

| Record | Status |
|--------|--------|
| SPF TXT `@` | `v=spf1 include:_spf-us.ionos.com ~all` |
| DKIM CNAME `s1-ionos._domainkey` | → `s1.dkim.ionos.com` |
| DKIM CNAME `s2-ionos._domainkey` | → `s2.dkim.ionos.com` |
| DKIM CNAME `s42582890._domainkey` | **missing** — add → `s42582890.dkim.ionos.com` |
| DMARC TXT `_dmarc` | `v=DMARC1; p=none;` (via IONOS) |

**In IONOS DNS for `jerseydeals.online`, add the missing CNAME:**

| Hostname | Points to |
|----------|-----------|
| `s42582890._domainkey` | `s42582890.dkim.ionos.com` |

**Why promos still hit Junk (even when auth is OK):**

- Shared IONOS SMTP IPs have mixed reputation for cold marketing
- First-touch + bullet-list promo copy scores as newsletter spam (esp. iCloud / school filters)
- Resending the **same** invite quickly makes filters *more* aggressive — wait, don’t blast again

**What actually helps next:**

1. Recipients mark **Not spam** / move to Inbox once
2. Add the missing DKIM CNAME above
3. For the next invite, use a calmer subject and plain-text (`PLAIN_TEXT_ONLY=1`)
4. Longer term: send marketing via a dedicated ESP (Resend / Postmark) and keep IONOS for shop replies
