# Jersey Deals

Separate storefront landing page for **Jersey Deals** (sibling project to BrayStats in this repo).

**Permanent live link (always the latest deployed version):**  
https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/

## What’s on the page

- Top-left **Jersey Deals** wordmark (matches logo type)
- Centered circular logo (`public/logo.png`)
- Category tiles linking into the live eBay shop (youth + full catalog)
- Featured gear pulled from active eBay listings (`public/listings.json`)
- Privacy policy at `/privacy.html` (eBay OAuth / app settings)

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Framer Motion
- Fonts: Libre Baskerville, Barlow Condensed, Outfit, Comic Neue

## Develop

```bash
cd jerseydeals
npm install
npm run sync:ebay   # requires EBAY_* secrets in the environment
npm run dev
```

### Sync live eBay listings

```bash
npm run sync:ebay
```

Requires:

- `EBAY_APP_ID`
- `EBAY_CERT_ID`
- `EBAY_DEV_ID`
- `EBAY_USER_TOKEN`

Writes `public/listings.json` for the static GitHub Pages build. Re-run whenever inventory changes (the Auth’n’Auth user token also expires — refresh it in the eBay Developer portal when `HardExpirationWarning` appears).

## Build

```bash
cd jerseydeals
npm run build
npm run preview
```
