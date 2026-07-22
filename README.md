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
- **League profiles**: tap a league on home or Favorites to open its profile (season snapshot, table, upcoming fixtures)
- **Team profiles**: tap any club name on home fixtures, league tables, match lists, or Favorites to open a simple club page (table line, form, upcoming/recent matches). From a team profile, tap the league name to open that league’s profile
- **Live fixture + stats pipeline (Jefferson)**: ESPN public soccer APIs for scores, team match stats, key moments, and standings — auto-refreshes (faster while matches are live)
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
