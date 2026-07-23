# Jersey Deals

Storefront landing page for **Jersey Deals** (sibling to BrayStats in this repo).

**Live:** https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/

## What’s on the page

- Full-bleed hero (brand + offer + CTAs)
- Category paths: youth, sale (under $25), full catalog
- New drops + featured gear from live `listings.json` (eBay sync)
- Condition labels, buy-direct trust, FAQ, restock email alerts
- Sticky mobile shop CTA + lightweight analytics hooks
- Privacy policy at `/privacy.html` (eBay OAuth / app settings)

## Config

Edit `src/config.ts` or set env vars when building:

| Variable | Purpose |
|----------|---------|
| `VITE_SQUARE_STORE_URL` | Square Online storefront URL (when live, CTAs switch to Square) |
| `VITE_GA_ID` | Optional GA4 measurement ID |

Until Square is set, primary checkout stays on eBay (`@jerseydealsofficial`).

## Develop

```bash
cd jerseydeals
npm install
npm run sync:ebay   # requires EBAY_* secrets in the environment
npm run dev
```

### Sync live eBay listings

```bash
cd jerseydeals
npm run sync:ebay
```

Requires:

- `EBAY_APP_ID`
- `EBAY_CERT_ID`
- `EBAY_DEV_ID`
- `EBAY_USER_TOKEN`

Writes `public/listings.json` for the static GitHub Pages build.

### Scheduled sync (GitHub Actions)

Workflow: `.github/workflows/sync-jerseydeals-ebay.yml`

- Runs twice daily (UTC) and on manual `workflow_dispatch`
- Updates `jerseydeals/public/listings.json` on `Brayden-OS`
- Triggers the Pages deploy when inventory changed

Add the same four `EBAY_*` values as **repository Actions secrets** so the scheduled job can authenticate. Refresh the Auth’n’Auth user token in the eBay Developer portal when `HardExpirationWarning` appears in the sync logs.

## Build

```bash
cd jerseydeals
npm run build
npm run preview
```
