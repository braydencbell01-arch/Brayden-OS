import { API_ID_TO_LEAGUE, isBig5ApiLeagueId, LEAGUE_LABELS } from './leagues'
import type { FixturesResponse, LeagueId, Match, MatchStatus } from './types'

type ApiFixture = {
  fixture: {
    id: number
    date: string
    status: {
      long: string
      short: string
      elapsed: number | null
    }
  }
  league: {
    id: number
    name: string
  }
  teams: {
    home: { id: number; name: string; logo?: string }
    away: { id: number; name: string; logo?: string }
  }
  goals: {
    home: number | null
    away: number | null
  }
}

function apiBase(): string {
  const base = import.meta.env.VITE_FOOTBALL_API_BASE as string | undefined
  return (base ?? '').replace(/\/$/, '')
}

export function hasLiveApiConfigured(): boolean {
  return Boolean(apiBase())
}

function mapStatus(short: string): MatchStatus {
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

export function mapApiFixture(raw: ApiFixture): Match | null {
  if (!isBig5ApiLeagueId(raw.league.id)) return null
  const leagueId = API_ID_TO_LEAGUE[raw.league.id]
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

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Football API ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function fetchFixturesByDate(
  date: Date,
  leagueId?: LeagueId | null,
  signal?: AbortSignal,
): Promise<FixturesResponse> {
  const dateKey = toDateKey(date)
  const params = new URLSearchParams({ date: dateKey })
  if (leagueId) params.set('league', leagueId)

  const data = await fetchJson<{ matches: Match[]; updatedAt?: string }>(
    `/fixtures?${params.toString()}`,
    signal,
  )

  return {
    matches: data.matches ?? [],
    source: 'live',
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export async function fetchLiveFixtures(
  leagueId?: LeagueId | null,
  signal?: AbortSignal,
): Promise<FixturesResponse> {
  const params = new URLSearchParams()
  if (leagueId) params.set('league', leagueId)
  const qs = params.toString()
  const data = await fetchJson<{ matches: Match[]; updatedAt?: string }>(
    `/live${qs ? `?${qs}` : ''}`,
    signal,
  )

  return {
    matches: data.matches ?? [],
    source: 'live',
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export function mergeLiveScores(dayMatches: Match[], liveMatches: Match[]): Match[] {
  if (liveMatches.length === 0) return dayMatches
  const liveById = new Map(liveMatches.map((m) => [m.id, m]))
  const seen = new Set<number>()

  const merged = dayMatches.map((m) => {
    const live = liveById.get(m.id)
    if (!live) return m
    seen.add(m.id)
    return live
  })

  for (const live of liveMatches) {
    if (!seen.has(live.id)) merged.push(live)
  }

  return merged.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

export function hasInPlay(matches: Match[]): boolean {
  return matches.some((m) => m.status === 'live' || m.status === 'halftime')
}
