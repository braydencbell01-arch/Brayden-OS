import {
  compareLeaguesForDisplay,
  continentalLeagues,
  domesticCupsForCountry,
  findLeague,
  getLeague,
  inferInternationalSeasonStartYear,
  inferSoccerSeasonStartYear,
  isFriendlyLeagueId,
  isInternationalLeague,
  internationalLeagues,
  LEAGUES,
  regularSeasonCupsForLeague,
  type LeagueId,
} from './leagues'
import { leagueIdFromEspnCode, resolveTeamDomesticLeagueId } from './search'
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
  favoriteTeamIds?: Set<string> | null,
): Array<{ leagueId: LeagueId; matches: Match[] }> {
  const map = new Map<LeagueId, Match[]>()
  for (const match of matches) {
    const list = map.get(match.leagueId)
    if (list) list.push(match)
    else map.set(match.leagueId, [match])
  }

  // Leagues with a favorited team on this slate count as favorites for ordering.
  const pinnedLeagueIds = new Set<string>(favoriteLeagueIds ?? [])
  if (favoriteTeamIds && favoriteTeamIds.size > 0) {
    for (const [leagueId, leagueMatches] of map) {
      if (
        leagueMatches.some(
          (match) =>
            (Boolean(match.home.id) && favoriteTeamIds.has(match.home.id)) ||
            (Boolean(match.away.id) && favoriteTeamIds.has(match.away.id)),
        )
      ) {
        pinnedLeagueIds.add(leagueId)
      }
    }
  }

  return [...map.keys()]
    .sort((a, b) => compareLeaguesForDisplay(a, b, pinnedLeagueIds, preferredLeagueId))
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
  return recentFormMatchesForTeam(matches, teamId, limit)
    .map((match) => teamResult(match, teamId))
    .filter((result): result is TeamFormResult => result != null)
}

/** Finished matches backing the form strip (oldest → newest). */
export function recentFormMatchesForTeam(
  matches: Match[],
  teamId: string,
  limit = 5,
): Match[] {
  return matchesForTeam(matches, teamId)
    .filter((match) => match.status === 'finished')
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, limit)
    .reverse()
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

/** All fixtures for a league, chronological (team-profile Matches timeline style). */
export function matchesForLeague(matches: Match[], leagueId: LeagueId): Match[] {
  return matches
    .filter((match) => match.leagueId === leagueId)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

/** First upcoming (or live) fixture in a league timeline. */
export function nextMatchForLeague(
  matches: Match[],
  leagueId: LeagueId,
  todayKey: string,
): Match | null {
  return matchesForLeague(matches, leagueId).find(
    (match) =>
      match.status === 'live' ||
      match.status === 'scheduled' ||
      (match.status === 'other' && match.dateKey >= todayKey),
  ) ?? null
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
  const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/teams/${encodeURIComponent(teamId)}/schedule`
  const seasonHints =
    league.kind === 'international'
      ? [
          undefined,
          inferInternationalSeasonStartYear(),
          inferInternationalSeasonStartYear() - 1,
          inferInternationalSeasonStartYear() + 1,
        ]
      : [undefined, inferSoccerSeasonStartYear(), inferSoccerSeasonStartYear() - 1]

  const byEvent = new Map<string, Match>()
  for (const season of seasonHints) {
    const url = new URL(base)
    if (season != null) url.searchParams.set('season', String(season))
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as EspnScoreboard
      for (const event of data.events ?? []) {
        const match = normalizeEvent(event, league.id)
        if (match && !byEvent.has(match.espnEventId)) byEvent.set(match.espnEventId, match)
      }
    } catch {
      // try next season hint
    }
  }
  return [...byEvent.values()]
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
 * Club schedule from ESPN to fill Match Day cache gaps.
 * Always fans out from the club's domestic league (not a cup they were opened from).
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

  let domesticId = leagueId
  if (league.kind !== 'domestic' || league.format !== 'league') {
    const resolved = await resolveTeamDomesticLeagueId(teamId, undefined, leagueId)
    if (resolved) domesticId = resolved
  }
  const domestic = getLeague(domesticId)

  const cupIds = domesticCupsForCountry(domestic.country).map((cup) => cup.id)
  const continentalIds = continentalLeagues().map((entry) => entry.id)
  const codes = [
    domesticId,
    ...cupIds.filter((id) => id !== domesticId),
    ...continentalIds.filter((id) => id !== domesticId),
    'club-friendly' as LeagueId,
  ]
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

/**
 * Seasons run 1 Aug → 31 Jul for clubs and nationals.
 * `seasonYear` is the August start year (2026 → 26/27; 1999 → 1999/00).
 */
export function matchInSeasonYear(
  match: Match,
  seasonYear: number,
  _opts?: { international?: boolean },
): boolean {
  const start = `${seasonYear}-08-01`
  const end = `${seasonYear + 1}-07-31`
  return match.dateKey >= start && match.dateKey <= end
}

export type TeamCompetitionEntry = {
  key: string
  name: string
  /** Present when BrayStats has a league profile for this competition. */
  leagueId?: LeagueId
}

const espnLeagueNameCache = new Map<string, string>()

async function espnLeagueDisplayName(espnCode: string): Promise<string> {
  const cached = espnLeagueNameCache.get(espnCode)
  if (cached) return cached
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard`,
    )
    if (res.ok) {
      const data = (await res.json()) as {
        leagues?: Array<{ name?: string; shortName?: string }>
      }
      const name = data.leagues?.[0]?.name || data.leagues?.[0]?.shortName
      if (name) {
        espnLeagueNameCache.set(espnCode, name)
        return name
      }
    }
  } catch {
    // fall through
  }
  const fallback = espnCode.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  espnLeagueNameCache.set(espnCode, fallback)
  return fallback
}

/**
 * Discover every ESPN competition a team played in an Aug–Jul season
 * (including comps not yet in the BrayStats catalog).
 */
export async function discoverTeamSeasonCompetitions(
  teamId: string,
  seasonYear: number,
): Promise<TeamCompetitionEntry[]> {
  const from = `${seasonYear}0801`
  const to = `${seasonYear + 1}0731`
  const url = new URL(
    `https://sports.core.api.espn.com/v2/sports/soccer/teams/${encodeURIComponent(teamId)}/events`,
  )
  url.searchParams.set('dates', `${from}-${to}`)
  url.searchParams.set('limit', '200')

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as { items?: Array<{ $ref?: string }> }
    const counts = new Map<string, number>()
    for (const item of data.items ?? []) {
      const match = item.$ref?.match(/\/leagues\/([^/]+)\/events\//)
      if (!match?.[1]) continue
      const code = match[1]
      counts.set(code, (counts.get(code) ?? 0) + 1)
    }

    const entries = await Promise.all(
      [...counts.keys()].map(async (espnCode) => {
        const leagueId = leagueIdFromEspnCode(espnCode) ?? undefined
        const name = leagueId
          ? getLeague(leagueId).name
          : await espnLeagueDisplayName(espnCode)
        return {
          key: leagueId || `espn:${espnCode}`,
          name,
          leagueId,
        } satisfies TeamCompetitionEntry
      }),
    )
    return entries
  } catch {
    return []
  }
}

/**
 * Competitions for a team profile Overview.
 * Clubs: domestic league first, then domestic cups, then any season fixtures
 * (including unknown ESPN comps passed via `extras`).
 * Nationals: season comps sorted by importance (biggest first).
 */
export function buildTeamSeasonCompetitions(
  teamId: string,
  primaryLeagueId: LeagueId,
  matches: Match[],
  seasonYear: number | null,
  extras: TeamCompetitionEntry[] = [],
): TeamCompetitionEntry[] {
  const international =
    isInternationalLeague(primaryLeagueId) ||
    findLeague(primaryLeagueId)?.kind === 'international'
  const year =
    seasonYear ??
    (international ? inferInternationalSeasonStartYear() : inferSoccerSeasonStartYear())

  const byKey = new Map<string, TeamCompetitionEntry>()
  const add = (entry: TeamCompetitionEntry) => {
    if (!byKey.has(entry.key)) byKey.set(entry.key, entry)
  }

  if (!international && !isFriendlyLeagueId(primaryLeagueId)) {
    const domestic = getLeague(primaryLeagueId)
    if (domestic.kind === 'domestic' && domestic.format === 'league') {
      add({ key: domestic.id, name: domestic.name, leagueId: domestic.id })
      for (const cupId of regularSeasonCupsForLeague(primaryLeagueId)) {
        const cup = getLeague(cupId)
        add({ key: cup.id, name: cup.name, leagueId: cup.id })
      }
    }
  }

  for (const match of matches) {
    if (match.home.id !== teamId && match.away.id !== teamId) continue
    if (!matchInSeasonYear(match, year, { international })) continue
    if (isFriendlyLeagueId(match.leagueId) && !international) {
      // Still list friendlies when played — after competitive comps.
      const friendly = getLeague(match.leagueId)
      add({ key: friendly.id, name: friendly.name, leagueId: friendly.id })
      continue
    }
    const league = getLeague(match.leagueId)
    add({ key: league.id, name: league.name, leagueId: league.id })
  }

  for (const extra of extras) add(extra)

  const domesticId =
    !international &&
    findLeague(primaryLeagueId)?.kind === 'domestic' &&
    findLeague(primaryLeagueId)?.format === 'league'
      ? primaryLeagueId
      : null

  return [...byKey.values()].sort((a, b) => {
    if (domesticId) {
      if (a.leagueId === domesticId) return -1
      if (b.leagueId === domesticId) return 1
    }
    const aKnown = a.leagueId ? 0 : 1
    const bKnown = b.leagueId ? 0 : 1
    if (aKnown !== bKnown) return aKnown - bKnown
    if (a.leagueId && b.leagueId) {
      return compareLeaguesForDisplay(a.leagueId, b.leagueId)
    }
    return a.name.localeCompare(b.name)
  })
}

/** @deprecated Prefer `buildTeamSeasonCompetitions`. */
export function teamSeasonCompetitionIds(
  teamId: string,
  primaryLeagueId: LeagueId,
  matches: Match[],
  seasonYear: number | null,
): LeagueId[] {
  return buildTeamSeasonCompetitions(teamId, primaryLeagueId, matches, seasonYear)
    .map((entry) => entry.leagueId)
    .filter((id): id is LeagueId => Boolean(id))
}

/** Merge Match Day cache with schedule extras; cache rows win on id collisions. */
export function mergeTeamMatches(primary: Match[], extras: Match[]): Match[] {
  const byEvent = new Map<string, Match>()
  for (const match of extras) byEvent.set(match.espnEventId, match)
  for (const match of primary) byEvent.set(match.espnEventId, match)
  return [...byEvent.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}
