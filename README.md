# Brayden-OS

Two **separate** projects with two permanent GitHub Pages URLs:

| App | Source | Permanent live URL |
|-----|--------|--------------------|
| **Brayden Stats** | repo root (`/`) | https://braydencbell01-arch.github.io/Brayden-OS/ |
| **Jersey Deals** | [`jerseydeals/`](./jerseydeals) | https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/ |

Do not publish Brayden Stats into `/jerseydeals/`, or Jersey Deals into the site root.

---

# Brayden Stats

Interactive soccer stats app shell — player ratings, pay-per-stat insights, and league screens.

**Permanent live link:** https://braydencbell01-arch.github.io/Brayden-OS/

## What's included

- **Home**: Brayden Stats branding, horizontally scrollable match calendar (±100 days), league list
- **Leagues**: Premier League (ENG), La Liga, Bundesliga, Serie A, Ligue 1, MLS (USA), Eredivisie (NED)
- Tiny **Today** jump control; Yesterday / Today / Tomorrow labels
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

## Build & deploy (Brayden Stats only)

```bash
npm run build
npm run deploy:pages   # updates Pages root; preserves /jerseydeals/
```
