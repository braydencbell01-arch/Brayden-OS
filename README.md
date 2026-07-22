# Brayden-OS

Monorepo-style workspace with two independent Vite apps:

| Path | App |
|------|-----|
| `/` (repo root) | **Brayden Stats** — soccer stats app shell |
| [`jerseydeals/`](./jerseydeals) | **Jersey Deals** — storefront landing page |

---

# Brayden Stats

Interactive soccer stats app shell — player ratings, pay-per-stat insights, and the top five European leagues.

## What's included

- **Home**: Brayden Stats branding, horizontally scrollable match calendar, league list
- **Leagues**: Premier League, La Liga, Bundesliga, Serie A, Ligue 1 — each opens its own screen
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

Separate project — see [`jerseydeals/README.md`](./jerseydeals/README.md).

**Permanent live link (always latest deploy):**  
https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/

Brayden Stats (root of the same Pages site):  
https://braydencbell01-arch.github.io/Brayden-OS/

Pushes to `Brayden-OS` rebuild and publish both apps via GitHub Actions.

```bash
cd jerseydeals
npm install
npm run dev
```
