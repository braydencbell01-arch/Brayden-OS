# Jersey Deals

Storefront landing page for **Jersey Deals** (sibling to BrayStats in this repo).

**Live:** https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/

## What’s on the page

- Full-bleed hero (brand + offer + CTAs)
- Category paths: youth, sale (under $25), full catalog
- New drops + featured gear from live `listings.json` (eBay sync)
- Condition labels, buy-direct trust, FAQ, restock email alerts
- Sticky mobile shop CTA + lightweight analytics hooks

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
npm run dev
```

## Build

```bash
cd jerseydeals
npm run build
npm run preview
```
