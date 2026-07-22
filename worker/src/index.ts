/**
 * Cloudflare Worker proxy for API-Football.
 *
 * Keeps your API key off the client and only exposes Big 5 league fixtures.
 *
 * Secrets / vars:
 *   API_FOOTBALL_KEY  – required (wrangler secret put API_FOOTBALL_KEY)
 *   CORS_ORIGIN       – optional, default *
 *
 * Deploy:
 *   cd worker && npm install && npx wrangler secret put API_FOOTBALL_KEY && npx wrangler deploy
 */

import { BIG5_API_IDS, API_FOOTBALL_LEAGUE_IDS, API_ID_TO_LEAGUE, LEAGUE_LABELS } from './leagues'

export interface Env {
  API_FOOTBALL_KEY: string
  CORS_ORIGIN?: string
}

const API_HOST = 'https://v3.football.api-sports.io'

type LeagueId = keyof typeof API_FOOTBALL_LEAGUE_IDS

type ApiFixture = {
  fixture: {
    id: number
    date: string
    status: { long: string; short: string; elapsed: number | null }
  }
  league: { id: number; name: string }
  teams: {
    home: { id: number; name: string; logo?: string }
    away: { id: number; name: string; logo?: string }
  }
  goals: { home: number | null; away: number | null }
}

function corsHeaders(origin: string | undefined): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data: unknown, status: number, origin: string | undefined): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=15',
      ...corsHeaders(origin),
    },
  })
}

function mapStatus(short: string): string {
  switch (short) {
    case '1H':
    case '2H':
    case 'ET':
    case 'BT':
    case 'P':
    case 'LIVE':
      return 'live'
    case 'HT':
      return 'halftime'
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'finished'
    case 'NS':
    case 'TBD':
      return 'scheduled'
    case 'PST':
      return 'postponed'
    case 'CANC':
    case 'ABD':
    case 'AWD':
    case 'WO':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

function statusLabel(short: string, elapsed: number | null): string {
  if (['1H', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(short)) {
    return elapsed != null ? `${elapsed}'` : 'LIVE'
  }
  if (short === 'HT') return 'HT'
  if (['FT', 'AET', 'PEN'].includes(short)) return 'FT'
  if (short === 'NS' || short === 'TBD') return 'NS'
  if (short === 'PST') return 'PPD'
  if (['CANC', 'ABD', 'AWD', 'WO'].includes(short)) return 'CANC'
  return short || '—'
}

function shortName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase()
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

function mapFixture(raw: ApiFixture) {
  if (!(raw.league.id in API_ID_TO_LEAGUE)) return null
  const leagueId = API_ID_TO_LEAGUE[raw.league.id as keyof typeof API_ID_TO_LEAGUE]
  const short = raw.fixture.status.short
  return {
    id: raw.fixture.id,
    leagueId,
    leagueName: LEAGUE_LABELS[leagueId] ?? raw.league.name,
    kickoff: raw.fixture.date,
    status: mapStatus(short),
    statusLabel: statusLabel(short, raw.fixture.status.elapsed),
    elapsed: raw.fixture.status.elapsed,
    home: {
      id: raw.teams.home.id,
      name: raw.teams.home.name,
      shortName: shortName(raw.teams.home.name),
      logo: raw.teams.home.logo,
    },
    away: {
      id: raw.teams.away.id,
      name: raw.teams.away.name,
      shortName: shortName(raw.teams.away.name),
      logo: raw.teams.away.logo,
    },
    score: {
      home: raw.goals.home,
      away: raw.goals.away,
    },
  }
}

async function apiFootball(path: string, key: string): Promise<ApiFixture[]> {
  const res = await fetch(`${API_HOST}${path}`, {
    headers: {
      'x-apisports-key': key,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API-Football ${res.status}: ${text || res.statusText}`)
  }
  const body = (await res.json()) as { response?: ApiFixture[]; errors?: unknown }
  if (body.errors && Object.keys(body.errors as object).length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(body.errors)}`)
  }
  return body.response ?? []
}

function parseLeagueFilter(value: string | null): LeagueId | null {
  if (!value) return null
  if (value in API_FOOTBALL_LEAGUE_IDS) return value as LeagueId
  return null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.CORS_ORIGIN || '*'
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405, origin)
    }

    if (!env.API_FOOTBALL_KEY) {
      return json({ error: 'API_FOOTBALL_KEY is not configured on the worker' }, 500, origin)
    }

    try {
      if (url.pathname === '/health') {
        return json({ ok: true }, 200, origin)
      }

      if (url.pathname === '/fixtures') {
        const date = url.searchParams.get('date')
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return json({ error: 'Query param date=YYYY-MM-DD is required' }, 400, origin)
        }
        const leagueFilter = parseLeagueFilter(url.searchParams.get('league'))
        const raw = await apiFootball(`/fixtures?date=${date}`, env.API_FOOTBALL_KEY)
        let matches = raw.map(mapFixture).filter((m): m is NonNullable<typeof m> => m != null)
        if (leagueFilter) {
          matches = matches.filter((m) => m.leagueId === leagueFilter)
        }
        return json({ matches, updatedAt: new Date().toISOString(), source: 'live' }, 200, origin)
      }

      if (url.pathname === '/live') {
        const leagueFilter = parseLeagueFilter(url.searchParams.get('league'))
        const liveParam = leagueFilter
          ? String(API_FOOTBALL_LEAGUE_IDS[leagueFilter])
          : BIG5_API_IDS.join('-')
        const raw = await apiFootball(`/fixtures?live=${liveParam}`, env.API_FOOTBALL_KEY)
        let matches = raw.map(mapFixture).filter((m): m is NonNullable<typeof m> => m != null)
        if (leagueFilter) {
          matches = matches.filter((m) => m.leagueId === leagueFilter)
        }
        return json({ matches, updatedAt: new Date().toISOString(), source: 'live' }, 200, origin)
      }

      return json({ error: 'Not found. Try GET /fixtures?date=YYYY-MM-DD or GET /live' }, 404, origin)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return json({ error: message }, 502, origin)
    }
  },
}
