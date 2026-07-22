# Brayden Stats

Interactive soccer stats app shell — player ratings, pay-per-stat insights, and league screens.

## Live site

**https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/**

Deploys update only the `jerseydeals/` folder on the `gh-pages` branch so other work at the Pages root is left alone.

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

## Build & deploy

```bash
npm run build
npm run deploy:pages   # publishes to the live jerseydeals/ URL above
```
