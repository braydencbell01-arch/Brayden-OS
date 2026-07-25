import {
  compareLeaguesForDisplay,
  domesticCupsForCountry,
  internationalLeagues,
  LEAGUES,
  type LeagueId,
} from './leagues'
import { addDays, dateKeyFromIso, formatEspnDate, startOfDay, toDateKey } from './dates'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'other'

export type MatchTeam = {
  id: string
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
  /** False when ESPN has a date but no reliable kickoff clock yet. */
  kickoffTimeKnown: boolean
  status: MatchStatus
  statusText: string
  home: MatchTeam
  away: MatchTeam
  venue?: string
}

type EspnCompetitor = {
  homeAway?: string
  score?: string | number | { value?: number; displayValue?: string }
  winner?: boolean
  team?: {
    id?: string
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
    timeValid?: boolean
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
  STATUS_EXTRA_TIME: 'live',
  STATUS_EXTRA_HALF_TIME: 'live',
  STATUS_SHOOTOUT: 'live',
  STATUS_FULL_TIME: 'finished',
  STATUS_FINAL: 'finished',
  STATUS_FINAL_AET: 'finished',
  STATUS_FINAL_PEN: 'finished',
  STATUS_AFTER_EXTRA_TIME: 'finished',
  STATUS_AFTER_PEN: 'finished',
  STATUS_SHOOTOUT_COMPLETE: 'finished',
  STATUS_END_OF_EXTRATIME: 'finished',
  STATUS_POSTPONED: 'postponed',
  STATUS_CANCELED: 'postponed',
  STATUS_CANCELLED: 'postponed',
  STATUS_ABANDONED: 'other',
}

function mapStatus(status: EspnEvent['status'] | undefined): MatchStatus {
  const type = status?.type
  const mapped = type?.name ? STATUS_MAP[type.name] : undefined
  if (mapped) return mapped
  if (type?.completed || type?.state === 'post') return 'finished'
  if (type?.state === 'in') return 'live'
  if (type?.state === 'pre') return 'scheduled'
  return 'other'
}

function parseScore(
  value: EspnCompetitor['score'] | undefined,
  status: MatchStatus,
): number | null {
  if (status === 'scheduled') return null
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'object') {
    if (typeof value.value === 'number' && Number.isFinite(value.value)) return value.value
    if (value.displayValue != null && value.displayValue !== '') {
      const n = Number(value.displayValue)
      return Number.isFinite(n) ? n : null
    }
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function mapCompetitor(comp: EspnCompetitor | undefined, status: MatchStatus): MatchTeam {
  const team = comp?.team
  const rawName = team?.displayName || team?.name
  const name = rawName && rawName.trim() && rawName !== 'TBD' ? rawName.trim() : ''
  const shortRaw = team?.shortDisplayName || team?.abbreviation || team?.name
  const shortName =
    shortRaw && shortRaw.trim() && shortRaw !== 'TBD' ? shortRaw.trim() : ''
  return {
    id: team?.id || (name || shortName || 'unknown').toLowerCase().replace(/\s+/g, '-'),
    name,
    shortName: shortName || name,
    abbreviation: team?.abbreviation?.trim() || '',
    score: parseScore(comp?.score, status),
  }
}

function normalizeEvent(event: EspnEvent, leagueId: LeagueId): Match | null {
  const competition = event.competitions?.[0]
  const kickoff = competition?.date || event.date
  if (!kickoff || !event.id) return null

  const statusName = competition?.status?.type?.name || event.status?.type?.name || ''
  const status = mapStatus(competition?.status ?? event.status)
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
  const venue = competition?.venue?.fullName?.trim()

  return {
    id: `${leagueId}-${event.id}`,
    espnEventId: event.id,
    leagueId,
    kickoff,
    dateKey: dateKeyFromIso(kickoff),
    kickoffTimeKnown: competition?.timeValid !== false,
    status,
    statusText,
    home: mapCompetitor(home, status),
    away: mapCompetitor(away, status),
    venue: venue || undefined,
  }
}

async function fetchLeagueScoreboard(
  leagueId: LeagueId,
  espnCode: string,
  from: Date,
  to: Date,
): Promise<Match[]> {
  // Pad ±1 day so local-midnight vs ESPN day-boundary skew doesn't drop edge fixtures.
  const paddedFrom = addDays(startOfDay(from), -1)
  const paddedTo = addDays(startOfDay(to), 1)
  const range = `${formatEspnDate(paddedFrom)}-${formatEspnDate(paddedTo)}`
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

export type BigFiveWindowResult = {
  matches: Match[]
  /** League display names that failed for this window (partial ESPN outage). */
  failedLeagues: string[]
}

export async function fetchBigFiveWindow(
  from: Date,
  to: Date,
): Promise<BigFiveWindowResult> {
  const pollLeagues = LEAGUES.filter((league) => league.matchDayPoll !== false)
  const results = await Promise.allSettled(
    pollLeagues.map((league) => fetchLeagueScoreboard(league.id, league.espnCode, from, to)),
  )

  const matches: Match[] = []
  const failedLeagues: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      matches.push(...result.value)
    } else {
      failedLeagues.push(pollLeagues[index].name)
    }
  })

  // Only fail hard when every league request failed. Empty windows (future
  // discovery) or partial ESPN outages must not blank Match day.
  if (failedLeagues.length === pollLeagues.length) {
    throw new Error(`Could not load fixtures for ${failedLeagues.join(', ')}`)
  }

  return {
    matches: matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    failedLeagues,
  }
}

export function matchesOnDate(matches: Match[], date: Date): Match[] {
  const key = toDateKey(startOfDay(date))
  return matches.filter((match) => match.dateKey === key)
}

export function matchesForLeagueFrom(
  matches: Match[],
  leagueId: LeagueId,
  from: Date,
  to?: Date,
): Match[] {
  const fromKey = toDateKey(startOfDay(from))
  const toKey = to ? toDateKey(startOfDay(to)) : null
  return matches
    .filter((match) => {
      if (match.leagueId !== leagueId) return false
      if (match.dateKey < fromKey) return false
      if (toKey != null && match.dateKey > toKey) return false
      // League "upcoming" should not list finished / postponed games.
      if (match.status === 'finished' || match.status === 'postponed') return false
      return true
    })
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
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

export function groupMatchesByLeague(
  matches: Match[],
  favoriteLeagueIds?: Set<string> | null,
  preferredLeagueId?: string | null,
): Array<{ leagueId: LeagueId; matches: Match[] }> {
  const map = new Map<LeagueId, Match[]>()
  for (const match of matches) {
    const list = map.get(match.leagueId)
    if (list) list.push(match)
    else map.set(match.leagueId, [match])
  }

  return [...map.keys()]
    .sort((a, b) => compareLeaguesForDisplay(a, b, favoriteLeagueIds, preferredLeagueId))
    .map((leagueId) => ({
      leagueId,
      matches: (map.get(leagueId) ?? []).slice().sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    }))
}

export function dateKeysWithMatches(matches: Match[]): Set<string> {
  return new Set(matches.map((match) => match.dateKey))
}

/**
 * True when the match should get yellow Home / Match day chrome.
 * Only favorited **leagues** and **teams** qualify — never favorite players
 * (or their clubs via player.teamId).
 */
export function isFavoriteMatch(
  match: Match,
  favoriteLeagueIds: Set<string>,
  favoriteTeamIds: Set<string>,
): boolean {
  if (favoriteLeagueIds.has(match.leagueId)) return true
  if (!match.home.id && !match.away.id) return false
  return (
    (Boolean(match.home.id) && favoriteTeamIds.has(match.home.id)) ||
    (Boolean(match.away.id) && favoriteTeamIds.has(match.away.id))
  )
}

export function dateKeysForFavorites(
  matches: Match[],
  favoriteLeagueIds: Set<string>,
  favoriteTeamIds: Set<string>,
): Set<string> {
  if (favoriteLeagueIds.size === 0 && favoriteTeamIds.size === 0) {
    return new Set()
  }

  const keys = new Set<string>()
  for (const match of matches) {
    if (isFavoriteMatch(match, favoriteLeagueIds, favoriteTeamIds)) {
      keys.add(match.dateKey)
    }
  }
  return keys
}

export function matchesForTeam(matches: Match[], teamId: string): Match[] {
  return matches
    .filter((match) => match.home.id === teamId || match.away.id === teamId)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

export type TeamFormResult = 'W' | 'D' | 'L'

export function teamResult(match: Match, teamId: string): TeamFormResult | null {
  if (match.status !== 'finished') return null
  const homeScore = match.home.score
  const awayScore = match.away.score
  if (homeScore == null || awayScore == null) return null

  const isHome = match.home.id === teamId
  const isAway = match.away.id === teamId
  if (!isHome && !isAway) return null

  if (homeScore === awayScore) return 'D'
  const teamWon = isHome ? homeScore > awayScore : awayScore > homeScore
  return teamWon ? 'W' : 'L'
}

/** Most recent finished results for a club (newest last, like a form strip). */
export function recentFormForTeam(
  matches: Match[],
  teamId: string,
  limit = 5,
): TeamFormResult[] {
  const finished = matchesForTeam(matches, teamId)
    .filter((match) => match.status === 'finished')
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, limit)
    .reverse()

  return finished
    .map((match) => teamResult(match, teamId))
    .filter((result): result is TeamFormResult => result != null)
}

export type SideRecord = {
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}

export type HomeAwayRecord = {
  home: SideRecord
  away: SideRecord
}

function emptySideRecord(): SideRecord {
  return { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }
}

/** Home vs away W-D-L and goals from finished matches in the loaded window. */
export function homeAwayRecordForTeam(matches: Match[], teamId: string): HomeAwayRecord {
  const home = emptySideRecord()
  const away = emptySideRecord()

  for (const match of matchesForTeam(matches, teamId)) {
    if (match.status !== 'finished') continue
    const hs = match.home.score
    const as = match.away.score
    if (hs == null || as == null) continue

    const isHome = match.home.id === teamId
    const side = isHome ? home : away
    const gf = isHome ? hs : as
    const ga = isHome ? as : hs
    side.played += 1
    side.goalsFor += gf
    side.goalsAgainst += ga
    if (gf > ga) side.won += 1
    else if (gf < ga) side.lost += 1
    else side.drawn += 1
  }

  return { home, away }
}

export function formatSideRecord(record: SideRecord): string {
  if (record.played === 0) return '—'
  return `${record.won}W-${record.drawn}D-${record.lost}L · ${record.goalsFor}:${record.goalsAgainst}`
}

/** First upcoming (or live) fixture for a team. */
export function nextMatchForTeam(
  matches: Match[],
  teamId: string,
  todayKey: string,
): Match | null {
  const { upcoming } = splitTeamFixtures(matches, teamId, todayKey)
  return upcoming[0] ?? null
}

/** Finished league matches newest-first (for a league profile Results accordion). */
export function recentLeagueResults(matches: Match[], leagueId: LeagueId, limit = 40): Match[] {
  return matches
    .filter((match) => match.leagueId === leagueId && match.status === 'finished')
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, limit)
}

export type LeagueFormRow = {
  teamId: string
  team: string
  shortName: string
  form: TeamFormResult[]
}

/** Last-N form strips aligned to standings order. */
export function leagueFormTable(
  matches: Match[],
  rows: Array<{ teamId: string; team: string; shortName: string }>,
  limit = 5,
): LeagueFormRow[] {
  return rows.map((row) => ({
    teamId: row.teamId,
    team: row.team,
    shortName: row.shortName,
    form: recentFormForTeam(matches, row.teamId, limit),
  }))
}

export function splitTeamFixtures(
  matches: Match[],
  teamId: string,
  todayKey: string,
): { recent: Match[]; upcoming: Match[] } {
  const teamMatches = matchesForTeam(matches, teamId)
  const recent = teamMatches
    .filter((match) => match.dateKey < todayKey || match.status === 'finished')
    .filter((match) => match.status === 'finished' || match.status === 'postponed')
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
  const upcoming = teamMatches
    .filter(
      (match) =>
        match.status === 'scheduled' ||
        match.status === 'live' ||
        (match.status === 'other' && match.dateKey >= todayKey),
    )
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  return { recent, upcoming }
}

async function fetchScheduleForLeague(teamId: string, leagueId: LeagueId): Promise<Match[]> {
  const league = LEAGUES.find((entry) => entry.id === leagueId)
  if (!league) return []
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/teams/${encodeURIComponent(teamId)}/schedule`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as EspnScoreboard
  return (data.events ?? [])
    .map((event) => normalizeEvent(event, league.id))
    .filter((match): match is Match => match != null)
}

/**
 * Pull a national side's fixtures from ESPN team schedules across international comps.
 * Used to fill gaps when the Match Day scoreboard window is sparse.
 */
export async function fetchNationalTeamSchedules(
  teamId: string,
  preferredLeagueId?: LeagueId,
): Promise<Match[]> {
  const preferred = preferredLeagueId ? LEAGUES.find((league) => league.id === preferredLeagueId) : null
  const codes = [
    ...(preferred?.kind === 'international' ? [preferred] : []),
    ...internationalLeagues().filter((league) => league.id !== preferred?.id),
  ]

  const results = await Promise.allSettled(
    codes.map((league) => fetchScheduleForLeague(teamId, league.id)),
  )

  const byEvent = new Map<string, Match>()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const match of result.value) {
      if (!byEvent.has(match.espnEventId)) byEvent.set(match.espnEventId, match)
    }
  }

  return [...byEvent.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

/**
 * Club (or national) schedule from ESPN to fill Match Day cache gaps.
 * Clubs: preferred league + same-country domestic cups.
 * Nationals: all international comps.
 */
export async function fetchTeamSchedule(
  teamId: string,
  leagueId: LeagueId,
): Promise<Match[]> {
  const league = LEAGUES.find((entry) => entry.id === leagueId)
  if (!league) return []
  if (league.kind === 'international') {
    return fetchNationalTeamSchedules(teamId, leagueId)
  }

  const cupIds = domesticCupsForCountry(league.country).map((cup) => cup.id)
  const codes = [leagueId, ...cupIds.filter((id) => id !== leagueId)]
  const results = await Promise.allSettled(
    codes.map((id) => fetchScheduleForLeague(teamId, id)),
  )

  const byEvent = new Map<string, Match>()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const match of result.value) {
      if (!byEvent.has(match.espnEventId)) byEvent.set(match.espnEventId, match)
    }
  }
  return [...byEvent.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

/** Merge Match Day cache with schedule extras; cache rows win on id collisions. */
export function mergeTeamMatches(primary: Match[], extras: Match[]): Match[] {
  const byEvent = new Map<string, Match>()
  for (const match of extras) byEvent.set(match.espnEventId, match)
  for (const match of primary) byEvent.set(match.espnEventId, match)
  return [...byEvent.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}
