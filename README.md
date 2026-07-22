# Brayden-OS

Monorepo-style workspace with two independent Vite apps:

| Path | App |
|------|-----|
| `/` (repo root) | **Brayden Stats** — soccer stats app shell |
| [`jerseydeals/`](./jerseydeals) | **Jersey Deals** — storefront landing page |

---

# Brayden Stats

Soccer intelligence app for the **Big 5** leagues — live fixtures and scores, with room for player ratings and pay-per-stat insights.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + Framer Motion
- API-Football (via a Cloudflare Worker proxy) for live Big 5 data

## Develop

```bash
npm install
npm run dev
```

With no API configured, the app uses **demo fixtures** (including simulated live score ticks) so you can build UI immediately.

## Live Big 5 scores (constant access)

Real match data comes from [API-Football](https://www.api-football.com/). The free plan includes fixtures + livescore for all leagues (100 requests/day). Your API key must **never** ship in the Vite bundle — use the included Worker proxy.

### 1. Get an API key

1. Register at [dashboard.api-football.com](https://dashboard.api-football.com/register)
2. Copy your `x-apisports-key`

### 2. Deploy the proxy (`worker/`)

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put API_FOOTBALL_KEY   # paste your key
npx wrangler deploy
```

Note the worker URL (e.g. `https://brayden-stats-football-proxy.<you>.workers.dev`).

### 3. Point the app at the proxy

```bash
cp .env.example .env
```

Set:

```
VITE_FOOTBALL_API_BASE=https://brayden-stats-football-proxy.<you>.workers.dev
```

Restart `npm run dev`.

### How updates work

| Endpoint | Purpose |
| --- | --- |
| `GET /fixtures?date=YYYY-MM-DD` | Day’s Big 5 fixtures (filter with `?league=premier-league`) |
| `GET /live` | In-play Big 5 scores only |
| `GET /health` | Proxy health check |

The app:

1. Loads fixtures for the selected calendar day
2. Polls `/live` every **30s** while matches are in play
3. Polls every **5 minutes** when nothing is live (saves free-tier quota)

Big 5 API-Football league IDs: EPL `39`, La Liga `140`, Bundesliga `78`, Serie A `135`, Ligue 1 `61`.

### Quota tip

Free tier = **100 requests/day**. Adaptive polling keeps usage low. For always-on multi-user traffic, upgrade API-Football (Pro starts at ~$19/mo) or add caching (e.g. KV) in the worker.

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
