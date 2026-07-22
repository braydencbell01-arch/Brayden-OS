# Brayden-OS

Monorepo-style workspace with two independent Vite apps and two **permanent** GitHub Pages URLs:

| App | Source | Permanent live URL |
|-----|--------|--------------------|
| **Brayden Stats** | repo root (`/`) | https://braydencbell01-arch.github.io/Brayden-OS/ |
| **Jersey Deals** | [`jerseydeals/`](./jerseydeals) | https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/ |

These URLs never change. Every push to `Brayden-OS` rebuilds **both** apps via [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml): Stats → site root, Jersey Deals → `/jerseydeals/` only (never the reverse).

---

# Brayden Stats

Interactive soccer stats app shell — player ratings, pay-per-stat insights, and major leagues.

**Permanent live link:** https://braydencbell01-arch.github.io/Brayden-OS/

## What's included

- **Home**: Brayden Stats branding, horizontally scrollable match calendar (±100 days), league list
- **Leagues**: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, MLS, Eredivisie — each opens its own screen
- Built as a mobile-friendly web app you can wrap later (Capacitor / PWA / native shell)

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Framer Motion
- Fonts: Bebas Neue, Manrope

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

---

# Jersey Deals

Separate storefront landing — see [`jerseydeals/README.md`](./jerseydeals/README.md).

**Permanent live link:** https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/

```bash
cd jerseydeals
npm install
npm run dev
```
