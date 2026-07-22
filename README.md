# Brayden-OS

Two **separate** products with permanent GitHub Pages URLs:

| Product | Source | Permanent live URL |
|---------|--------|--------------------|
| **Brayden Stats** | repo root (`/`) | https://braydencbell01-arch.github.io/Brayden-OS/ |
| **Jersey Deals** | [`jerseydeals/`](./jerseydeals) | https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/ |

**Agents:** read [`AGENTS.md`](./AGENTS.md) before editing or deploying. Merge into `Brayden-OS` before treating work as done.

---

# Brayden Stats

Interactive soccer stats app shell — player ratings, pay-per-stat insights, and major league screens.

## What's included

- **Home**: Brayden Stats branding, match calendar with a **Today** jump button, and fixtures for the selected date
- **Leagues**: Premier League (ENG), La Liga, Bundesliga, Serie A, Ligue 1, MLS, Eredivisie, Primeira Liga — each shows that league’s table plus upcoming fixtures
- **Live fixture + stats pipeline (Jefferson)**: ESPN public soccer APIs for scores, team match stats, key moments, and standings — auto-refreshes (faster while matches are live)
- **Favorites**: star leagues/teams; yellow calendar dots only for favorited match days; Favorites screen (Leagues / Teams / Players)
- **Rating research (Jefferson)**: Brayden Rating v0 module + external data inventory (`src/lib/stats/rating.ts`, `dataSources.ts`) ready to score players from ESPN match lines; xG upgrade path documented
- Tap any kickoff/finished match for possession, shots, cards, and goal/card timeline
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
