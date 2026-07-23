# Jersey Deals

Storefront landing page for **Jersey Deals** (sibling to BrayStats in this repo).

**Live:** https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/

## What’s on the page

- Full-bleed hero (brand + offer + CTAs)
- Category paths: youth, sale (under $25), full catalog
- New drops + featured gear + **filterable full inventory** from `listings.json`
- Condition labels, buy-direct trust, FAQ, restock email alerts
- Sticky mobile shop CTA + lightweight analytics hooks
- Privacy policy at `/privacy.html` (eBay OAuth / app settings)

## Config

Edit `src/config.ts` or set env vars when building:

| Variable | Purpose |
|----------|---------|
| `VITE_SQUARE_STORE_URL` | Square Online storefront URL (CTAs switch to Square when set) |
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

### Push eBay listings into Square

If Square Catalog is empty, import the current `listings.json` (usually from eBay) into Square:

```bash
cd jerseydeals
npm run push:square
```

Or run GitHub Action **Push listings to Square** (workflow_dispatch). Then run **Sync Jersey Deals inventory**.

### Update Square POS titles (club abbreviations)

Sets each item’s Square POS abbreviation from the club name (e.g. Manchester City → `MC`):

```bash
cd jerseydeals
npm run square:pos-abbrevs
```

Or run GitHub Action **Update Square POS abbreviations**.

### Fix Square stock + photos

Re-apply qty **1** on every variation and upload eBay photos onto items missing images:

```bash
cd jerseydeals
npm run square:fix-stock-images
```

Requires Square + eBay secrets. Then run `npm run sync:square` so `listings.json` picks up the new image URLs.

**Square Online “Out of stock”:** Catalog API cannot enable online Shipping fulfillment. In Square Dashboard → Online → Shipping / Item fulfillment, enable **Shipping** (and assign the Jersey Deals location), then bulk-enable Shipping on items. Until that is set, the `.square.site` storefront can show Out of stock even when Inventory API qty is 1.

### Scheduled sync (GitHub Actions)

Workflow: `.github/workflows/sync-jerseydeals-inventory.yml`

- Runs twice daily (UTC) and on manual `workflow_dispatch`
- Updates `jerseydeals/public/listings.json` on `Brayden-OS`
- Triggers the Pages deploy when inventory changed

## Build

```bash
cd jerseydeals
npm run build
npm run preview
```
