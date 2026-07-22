# Jersey Deals

Separate storefront landing page for **Jersey Deals** (sibling project to Brayden Stats in this repo).

## Permanent live links

| App | URL |
|-----|-----|
| **Jersey Deals** (this project) | https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/ |
| Brayden Stats (repo root app) | https://braydencbell01-arch.github.io/Brayden-OS/ |

The Jersey Deals URL always serves **this** landing page (logo, youth apparel, shop the sale) — not Brayden Stats. Pushes to `Brayden-OS` rebuild and publish both apps via the root deploy workflow.

## What’s on the page

- Top-left **Jersey Deals** wordmark (matches logo type)
- Centered circular logo (`public/logo.png`)
- Two black photo placeholders: **youth apparel** and **shop the sale**
- Featured gear, buy-direct story, and **Enter the storefront** CTAs

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Framer Motion
- Fonts: Libre Baskerville, Barlow Condensed, Outfit, Comic Neue

## Develop

```bash
cd jerseydeals
npm install
npm run dev
```

Set `STOREFRONT_URL` in `src/App.tsx` to your live Shopify or Square store link.

## Build

```bash
cd jerseydeals
npm run build
npm run preview
```

Vite `base` is `/Brayden-OS/jerseydeals/` so assets resolve correctly on GitHub Pages.
