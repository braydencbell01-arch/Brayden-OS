/**
 * Jefferson — external data inventory for Brayden Stats (Big 5 only).
 *
 * Goal: keep fixtures, scores, standings, and player stats fresh without
 * typing numbers in by hand. Prefer free, CORS-friendly sources first.
 */

export type DataTier = 'live-now' | 'next' | 'paid-upgrade'

export type StatFeed = {
  id: string
  name: string
  tier: DataTier
  auth: 'none' | 'free-key' | 'paid-key'
  updateStyle: string
  whatWeCanGet: string[]
  gaps: string[]
  notes: string
}

/** Ranked options for constantly updating Brayden Stats. */
export const STAT_FEEDS: StatFeed[] = [
  {
    id: 'espn-public',
    name: 'ESPN public soccer APIs',
    tier: 'live-now',
    auth: 'none',
    updateStyle: 'Client poll (≈45s live / ≈5m idle) — already in app',
    whatWeCanGet: [
      'Big 5 fixtures + scores (±100 day windows)',
      'League standings (P/W/D/L/GD/Pts)',
      'Team match box score (possession, shots, passes, tackles, cards, corners)',
      'Per-player match line (goals, assists, shots, SOG, fouls, cards, saves, goals conceded)',
      'Match leaders (shots / accurate passes / saves)',
      'Goal & card timeline (keyEvents)',
      'Team rosters + athlete IDs',
      'Season goal leaders (core API) + athlete game logs',
    ],
    gaps: [
      'No xG / xA',
      'No progressive passes / carries',
      'No reliable minutes played in match roster payload',
      'No transfer fees (needed for pay-per-stat)',
      'Unofficial/undocumented endpoints — treat as best-effort',
    ],
    notes: 'Primary feed today. Free, CORS-open, good enough for v1 ratings.',
  },
  {
    id: 'api-football',
    name: 'API-Football (api-sports)',
    tier: 'next',
    auth: 'free-key',
    updateStyle: 'Server/worker proxy + short TTL cache (teammate worker sketch exists)',
    whatWeCanGet: [
      'Fixtures, live scores, lineups, events',
      'Player season stats (apps, minutes, goals, assists, cards, rating)',
      'Some match player stats depending on plan',
    ],
    gaps: [
      'Free tier ~100 req/day — too small for aggressive live polling alone',
      'xG not guaranteed everywhere',
      'Needs Cloudflare Worker (or similar) so the key stays off the client',
    ],
    notes: 'Good upgrade path once we have a key + worker. Pair with ESPN for live scores.',
  },
  {
    id: 'bigballs-footystats',
    name: 'Big Balls / FootyStats-style APIs',
    tier: 'next',
    auth: 'free-key',
    updateStyle: 'Daily/hourly season refresh + on-demand player pages',
    whatWeCanGet: [
      'Season player stats including xG where offered',
      'Club form / appearances / minutes',
      'Match stored stats (possession, shots, sometimes xG)',
    ],
    gaps: ['Key required', 'Coverage and field names vary by provider', 'Not ideal as sole live score source'],
    notes: 'Best free-ish path to xG for rating v2 (over/underperformance vs chance quality).',
  },
  {
    id: 'fbref-statsbomb',
    name: 'FBref / StatsBomb-style advanced metrics',
    tier: 'paid-upgrade',
    auth: 'none',
    updateStyle: 'Batch scrape or open-data import (not second-by-second live)',
    whatWeCanGet: [
      'xG, xA, progressive passes/carries',
      'Per-90 advanced tables for scouting-grade ratings',
    ],
    gaps: ['Not a live API', 'Scraping ToS/rate limits', 'Heavy ops for constant update'],
    notes: 'Use for offline model training / weekly enrichment, not matchday polling.',
  },
  {
    id: 'transfermarkt-manual',
    name: 'Transfer values (Transfermarkt or paid market APIs)',
    tier: 'next',
    auth: 'none',
    updateStyle: 'Weekly cache of market values / fees',
    whatWeCanGet: ['Player market value', 'Transfer fees for pay-per-stat'],
    gaps: ['No official free API', 'Scraping fragile', 'Values are estimates'],
    notes: 'Required for Brayden “pay per goal/assist” product pitch.',
  },
]

export const REFRESH_POLICY = {
  liveScoresSeconds: 45,
  idleScoresSeconds: 300,
  standingsMinutes: 30,
  playerSeasonHours: 6,
  marketValuesDays: 7,
} as const
