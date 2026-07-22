# Brayden Stats

Interactive soccer stats app shell — player ratings, pay-per-stat insights, and the top five European leagues.

## Live site

**Permanent URL (after you turn on GitHub Pages once):**  
https://braydencbell01-arch.github.io/Brayden-OS/

### One-time setup on your phone
1. Open: https://github.com/braydencbell01-arch/Brayden-OS/settings/pages  
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**  
3. Branch: **gh-pages** / folder: **/ (root)** → Save  

After that, the link above stays the same. When you ask the agent for site changes, it redeploys `gh-pages` and the link updates.

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

## Build & deploy

```bash
npm run build
npm run deploy:pages   # updates the permanent GitHub Pages site
```
