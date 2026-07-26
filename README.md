# Brayden-OS

Two **separate** products with permanent GitHub Pages URLs:

| Product | Source | Permanent live URL |
|---------|--------|--------------------|
| **BrayStats** | repo root (`/`) | https://braydencbell01-arch.github.io/Brayden-OS/ |
| **Jersey Deals** | [`jerseydeals/`](./jerseydeals) | https://jerseydeals.online/ |

**Agents:** read [`AGENTS.md`](./AGENTS.md) before editing or deploying. Merge into `Brayden-OS` before treating work as done.

---

# BrayStats

Interactive soccer stats app shell — player ratings, pay-per-stat insights, and major league screens.

## What's included

- **Home**: BrayStats branding, match calendar with a **Today** jump button, and fixtures for the selected date
- **League profiles**: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, plus domestic cups (FA Cup, Copa del Rey, DFB-Pokal, …), continental competitions, and international tournaments — listed by importance; tap a competition for its profile (season snapshot, table when available, upcoming fixtures)
- **Domestic cups**: FA Cup, Carabao Cup, Community Shield, Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France, and more — knockout timelines, fixtures/results, starred on Match day
- **Team profiles**: tap any club name on home fixtures, league tables, match lists, or Favorites to open a simple club page (table line, form, upcoming/recent matches). From a team profile, tap the league name to open that league’s profile
- **Player profiles + Brayden Ratings**: expand a live/finished match for lineups with ratings; tap a player for stats, rating history, club path, and favorites (Favorites → Players). Rating = match performance /100 shown as /10 (26/100 → 2.6)
- **Live fixture + stats pipeline (Jefferson)**: ESPN public soccer APIs for scores, team match stats, key moments, and standings — auto-refreshes (faster while matches are live)
- Tap any kickoff/finished match for possession, shots, cards, lineups/ratings, and goal/card timeline
- **Installable PWA**: add BrayStats to your phone home screen (Safari → Share → Add to Home Screen, or Chrome → Install app). Updates still ship through normal GitHub Pages deploys.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Framer Motion
- PWA (`vite-plugin-pwa`) for home-screen install
- Fonts: Bebas Neue, Manrope

## Develop

```bash
npm install
npm run dev
```

## Install on your phone

1. Open https://braydencbell01-arch.github.io/Brayden-OS/ on your phone
2. **iPhone (Safari):** Share → **Add to Home Screen**
3. **Android (Chrome):** menu ⋮ → **Install app** / **Add to Home screen**

After that it opens full-screen like an app. New features still update automatically when we deploy — no App Store resubmit.

## Build

```bash
npm run build
npm run preview
```

---

# Jersey Deals

Separate project — see [`jerseydeals/README.md`](./jerseydeals/README.md).

**Permanent live link (always latest deploy):**  
https://jerseydeals.online/

BrayStats (root of the same Pages site):  
https://braydencbell01-arch.github.io/Brayden-OS/

Pushes to `Brayden-OS` rebuild and publish both apps via GitHub Actions.

```bash
cd jerseydeals
npm install
npm run dev
```
