import { LEAGUES, type LeagueId } from './leagues'
import { dateKeyFromIso, formatEspnDate, startOfDay, toDateKey } from './dates'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'other'

export type MatchTeam = {
  name: string
  shortName: string
  abbreviation: string
  score: number | null
}

export type Match = {
  id: string
  espnEventId: string
  leagueId: LeagueId
  kickoff: string
  dateKey: string
  status: MatchStatus
  statusText: string
  home: MatchTeam
  away: MatchTeam
  venue?: string
}

type EspnCompetitor = {
  homeAway?: string
  score?: string
  winner?: boolean
  team?: {
    displayName?: string
    shortDisplayName?: string
    abbreviation?: string
    name?: string
  }
}

type EspnEvent = {
  id?: string
  date?: string
  status?: {
    type?: {
      name?: string
      state?: string
      completed?: boolean
      description?: string
      shortDetail?: string
    }
  }
  competitions?: Array<{
    date?: string
    venue?: { fullName?: string }
    competitors?: EspnCompetitor[]
    status?: EspnEvent['status']
  }>
}

type EspnScoreboard = {
  events?: EspnEvent[]
}

const STATUS_MAP: Record<string, MatchStatus> = {
  STATUS_SCHEDULED: 'scheduled',
  STATUS_IN_PROGRESS: 'live',
  STATUS_HALFTIME: 'live',
  STATUS_FIRST_HALF: 'live',
  STATUS_SECOND_HALF: 'live',
  STATUS_FULL_TIME: 'finished',
  STATUS_FINAL: 'finished',
  STATUS_POSTPONED: 'postponed',
  STATUS_CANCELED: 'postponed',
  STATUS_CANCELLED: 'postponed',
  STATUS_ABANDONED: 'other',
}

function parseScore(value: string | undefined, status: MatchStatus): number | null {
  if (status === 'scheduled') return null
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function mapCompetitor(comp: EspnCompetitor | undefined, status: MatchStatus): MatchTeam {
  const team = comp?.team
  return {
    name: team?.displayName || team?.name || 'TBD',
    shortName: team?.shortDisplayName || team?.abbreviation || team?.name || 'TBD',
    abbreviation: team?.abbreviation || '—',
    score: parseScore(comp?.score, status),
  }
}

function normalizeEvent(event: EspnEvent, leagueId: LeagueId): Match | null {
  const competition = event.competitions?.[0]
  const kickoff = competition?.date || event.date
  if (!kickoff || !event.id) return null

  const statusName = competition?.status?.type?.name || event.status?.type?.name || ''
  const status = STATUS_MAP[statusName] ?? 'other'
  const statusText =
    competition?.status?.type?.shortDetail ||
    event.status?.type?.shortDetail ||
    competition?.status?.type?.description ||
    event.status?.type?.description ||
    statusName.replace(/^STATUS_/, '').replaceAll('_', ' ') ||
    'Scheduled'

  const competitors = competition?.competitors ?? []
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0]
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1]

  return {
    id: `${leagueId}-${event.id}`,
    espnEventId: event.id,
    leagueId,
    kickoff,
    dateKey: dateKeyFromIso(kickoff),
    status,
    statusText,
    home: mapCompetitor(home, status),
    away: mapCompetitor(away, status),
    venue: competition?.venue?.fullName,
  }
}

async function fetchLeagueScoreboard(
  leagueId: LeagueId,
  espnCode: string,
  from: Date,
  to: Date,
): Promise<Match[]> {
  const range = `${formatEspnDate(from)}-${formatEspnDate(to)}`
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard?dates=${range}&limit=400`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load ${leagueId} fixtures (${res.status})`)
  }
  const data = (await res.json()) as EspnScoreboard
  return (data.events ?? [])
    .map((event) => normalizeEvent(event, leagueId))
    .filter((match): match is Match => match != null)
}

export async function fetchBigFiveWindow(from: Date, to: Date): Promise<Match[]> {
  const results = await Promise.allSettled(
    LEAGUES.map((league) => fetchLeagueScoreboard(league.id, league.espnCode, from, to)),
  )

  const matches: Match[] = []
  const errors: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      matches.push(...result.value)
    } else {
      errors.push(LEAGUES[index].name)
    }
  })

  if (matches.length === 0 && errors.length > 0) {
    throw new Error(`Could not load fixtures for ${errors.join(', ')}`)
  }

  return matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

export function matchesOnDate(matches: Match[], date: Date): Match[] {
  const key = toDateKey(startOfDay(date))
  return matches.filter((match) => match.dateKey === key)
}

export function matchesForLeagueFrom(
  matches: Match[],
  leagueId: LeagueId,
  from: Date,
  to: Date,
): Match[] {
  const fromKey = toDateKey(startOfDay(from))
  const toKey = toDateKey(startOfDay(to))
  return matches.filter(
    (match) =>
      match.leagueId === leagueId && match.dateKey >= fromKey && match.dateKey <= toKey,
  )
}

export function groupMatchesByDate(matches: Match[]): Array<{ dateKey: string; matches: Match[] }> {
  const map = new Map<string, Match[]>()
  for (const match of matches) {
    const list = map.get(match.dateKey)
    if (list) list.push(match)
    else map.set(match.dateKey, [match])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayMatches]) => ({ dateKey, matches: dayMatches }))
}

export function dateKeysWithMatches(matches: Match[]): Set<string> {
  return new Set(matches.map((match) => match.dateKey))
}

export function dateFromKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return startOfDay(new Date(y, m - 1, d))
}

/** Next calendar day with fixtures on/after the selected date (inclusive). */
export function findNextMatchDate(matches: Match[], from: Date): Date | null {
  const fromKey = toDateKey(startOfDay(from))
  const keys = Array.from(dateKeysWithMatches(matches)).sort()
  const next = keys.find((key) => key >= fromKey)
  return next ? dateFromKey(next) : null
}

/** Previous calendar day with fixtures before the selected date. */
export function findPreviousMatchDate(matches: Match[], before: Date): Date | null {
  const beforeKey = toDateKey(startOfDay(before))
  const keys = Array.from(dateKeysWithMatches(matches)).sort()
  const prev = [...keys].reverse().find((key) => key < beforeKey)
  return prev ? dateFromKey(prev) : null
}

export function upcomingMatchDays(
  matches: Match[],
  from: Date,
  limit = 4,
): Array<{ dateKey: string; count: number }> {
  const fromKey = toDateKey(startOfDay(from))
  const counts = new Map<string, number>()
  for (const match of matches) {
    if (match.dateKey < fromKey) continue
    counts.set(match.dateKey, (counts.get(match.dateKey) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limit)
    .map(([dateKey, count]) => ({ dateKey, count }))
}

