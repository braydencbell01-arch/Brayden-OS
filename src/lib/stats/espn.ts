import {
  continentalLeagues,
  domesticCupsForCountry,
  domesticPyramidEspnCodes,
  getLeague,
  inferInternationalSeasonStartYear,
  inferSoccerSeasonStartYear,
  internationalLeagues,
  internationalSeasonDateBounds,
  isContinentalLeague,
  isFriendlyLeagueId,
  isInternationalLeague,
  leagueImportanceRank,
  LEAGUES,
  soccerSeasonShortLabel,
  uefaNationsLeagueLetter,
  type LeagueId,
} from '../leagues'
import { playoffWinnersLabel } from './divisionLabels'
import { layoutPlayersOnPitch, nextOpenFormationPlaces } from './formationPitch'
import { leagueIdFromTeamSlug, resolveTeamDomesticLeagueId } from '../search'
import {
  positionGroupFromAbbrev,
  rateMatchPerformance,
  rateSeasonForm,
  type MatchPlayerStats,
} from './rating'
import type {
  LeaderCategory,
  LeaderEntry,
  LeagueLeaders,
  LeaguePlayerStatBoard,
  LeaguePlayerStatTop,
  LeaguePlayerStatsOverview,
  LeagueSeasonOption,
  MatchDetailStats,
  MatchLineupPlayer,
  MatchLineupSide,
  MatchMoment,
  MostUsedStartingXi,
  MostUsedXiPlayer,
  PlayerCareerSeason,
  PlayerClubStint,
  PlayerProfile,
  PlayerRatingsCursor,
  PlayerRecentMatchRating,
  PlayerSeasonStatLine,
  StandingRow,
  TeamMatchStatLine,
  TeamRoster,
  TeamRosterGroup,
  TeamRosterPlayer,
  TeamStatLeaders,
} from './types'

const STAT_KEYS: Array<{ key: string; label: string }> = [
  { key: 'possessionPct', label: 'Possession' },
  { key: 'totalShots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'On target' },
  { key: 'wonCorners', label: 'Corners' },
  { key: 'foulsCommitted', label: 'Fouls' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' },
  { key: 'saves', label: 'Saves' },
]

type EspnStat = { name?: string; displayValue?: string; value?: number; label?: string }
type EspnBoxTeam = {
  homeAway?: string
  statistics?: EspnStat[]
  team?: { id?: string; displayName?: string }
}

type EspnKeyEvent = {
  id?: string
  text?: string
  shortText?: string
  scoringPlay?: boolean
  clock?: { displayValue?: string }
  type?: { text?: string; type?: string }
  team?: { id?: string; displayName?: string }
  participants?: Array<{ athlete?: { id?: string; displayName?: string } }>
}

type EspnRosterEntry = {
  active?: boolean
  starter?: boolean
  jersey?: string
  formationPlace?: string
  athlete?: {
    id?: string
    displayName?: string
    shortName?: string
    jerseyImages?: Array<{ href?: string }>
  }
  position?: { abbreviation?: string; displayName?: string }
  stats?: EspnStat[]
}

type EspnRosterSide = {
  homeAway?: string
  team?: { id?: string; displayName?: string; shortDisplayName?: string }
  roster?: EspnRosterEntry[]
  formation?: string
}

type EspnSummary = {
  boxscore?: { teams?: EspnBoxTeam[] }
  keyEvents?: EspnKeyEvent[]
  rosters?: EspnRosterSide[]
  header?: {
    competitions?: Array<{
      status?: {
        displayClock?: string
        period?: number
        type?: { name?: string; state?: string; detail?: string; shortDetail?: string }
      }
    }>
  }
}

type EspnStandingStat = { name?: string; displayValue?: string; value?: number }
type EspnStandingEntry = {
  team?: { id?: string; displayName?: string; shortDisplayName?: string }
  note?: { description?: string }
  stats?: EspnStandingStat[]
}

type EspnStandingsResponse = {
  children?: Array<{
    name?: string
    abbreviation?: string
    standings?: { entries?: EspnStandingEntry[] }
  }>
}

function statMap(stats: EspnStat[] | undefined): Map<string, string> {
  const map = new Map<string, string>()
  for (const stat of stats ?? []) {
    if (!stat.name) continue
    map.set(stat.name, stat.displayValue ?? '')
  }
  return map
}

function formatPossession(value: string): string {
  if (!value || value === '—') return value || ''
  return value.includes('%') ? value : `${value}%`
}

function buildStatLines(home: Map<string, string>, away: Map<string, string>): TeamMatchStatLine[] {
  return STAT_KEYS.map(({ key, label }) => {
    const homeRaw = home.get(key) ?? ''
    const awayRaw = away.get(key) ?? ''
    return {
      key,
      label,
      home: key === 'possessionPct' ? formatPossession(homeRaw) : homeRaw,
      away: key === 'possessionPct' ? formatPossession(awayRaw) : awayRaw,
    }
  }).filter((line) => line.home || line.away)
}

function classifyMoment(event: EspnKeyEvent): MatchMoment['kind'] {
  const type = (event.type?.type || event.type?.text || '').toLowerCase()
  if (event.scoringPlay || type.includes('goal')) return 'goal'
  if (type.includes('yellow') || type.includes('red') || type.includes('card')) return 'card'
  if (type.includes('subst') || type.includes('substitution') || type.includes('replace')) {
    return 'sub'
  }
  return 'other'
}

function momentCardKind(event: EspnKeyEvent): MatchMoment['cardKind'] | undefined {
  const type = (event.type?.type || event.type?.text || '').toLowerCase()
  if (type.includes('red')) return 'red'
  if (type.includes('yellow') || type.includes('card')) return 'yellow'
  return undefined
}

function momentLabel(event: EspnKeyEvent, kind: MatchMoment['kind']): string {
  const type = (event.type?.type || '').toLowerCase()
  const typeText = event.type?.text || ''
  if (kind === 'goal') {
    if (type.includes('own')) return 'Own goal'
    if (type.includes('penalty') || typeText.toLowerCase().includes('penalty')) return 'Penalty'
    return 'Goal'
  }
  if (kind === 'card') {
    if (type.includes('yellow') && type.includes('red')) return 'Second yellow'
    if (type.includes('red')) return 'Red card'
    if (type.includes('yellow')) return 'Yellow card'
    return typeText || 'Card'
  }
  if (kind === 'sub') return 'Substitution'
  return typeText || 'Event'
}

function buildMoments(events: EspnKeyEvent[] | undefined): MatchMoment[] {
  return (events ?? [])
    .filter((event) => {
      const kind = classifyMoment(event)
      return kind === 'goal' || kind === 'card' || kind === 'sub'
    })
    .map((event, index) => {
      const kind = classifyMoment(event)
      const participants = event.participants ?? []
      const primaryPlayer = participants[0]?.athlete?.displayName || undefined
      // Goals: second participant is typically the assister.
      // Subs: second participant is typically the player coming on.
      const secondaryPlayer =
        kind === 'goal' || kind === 'sub'
          ? participants[1]?.athlete?.displayName || undefined
          : undefined
      return {
        id: event.id || `moment-${index}`,
        clock: event.clock?.displayValue || '',
        text: event.text || event.shortText || event.type?.text || 'Event',
        kind,
        primaryPlayer,
        secondaryPlayer,
        teamName: event.team?.displayName || undefined,
        cardKind: kind === 'card' ? momentCardKind(event) : undefined,
        label: momentLabel(event, kind),
      } satisfies MatchMoment
    })
}

function readNumericStat(stats: EspnStat[] | undefined, name: string): number {
  const found = stats?.find((stat) => stat.name === name)
  if (!found) return 0
  if (typeof found.value === 'number' && Number.isFinite(found.value)) return found.value
  const n = Number(found.displayValue)
  return Number.isFinite(n) ? n : 0
}

/** Read the first matching ESPN stat name (for placeholder fields with aliases). */
function readNumericStatAlias(stats: EspnStat[] | undefined, names: string[]): number {
  for (const name of names) {
    const value = readNumericStat(stats, name)
    if (value > 0) return value
  }
  return 0
}

export function playerHeadshotUrl(playerId: string): string {
  return `https://a.espncdn.com/i/headshots/soccer/players/full/${playerId}.png`
}

/** @deprecated Prefer playerHeadshotUrl + separate jerseyUrl */
export function playerPhotoUrl(playerId: string, _jerseyUrl?: string): string {
  return playerHeadshotUrl(playerId)
}

function parseElapsedMinutes(summary: EspnSummary, live: boolean): number {
  if (!live) return 90
  const status = summary.header?.competitions?.[0]?.status
  const clock = status?.displayClock || status?.type?.detail || status?.type?.shortDetail || ''
  const match = clock.match(/(\d+)/)
  if (match) {
    const n = Number(match[1])
    if (Number.isFinite(n) && n > 0) return Math.min(120, n)
  }
  const period = status?.period
  if (period === 1) return 25
  if (period && period >= 2) return 70
  return 45
}

function toMatchPlayerStats(entry: EspnRosterEntry): MatchPlayerStats {
  return {
    appearances: readNumericStat(entry.stats, 'appearances'),
    starter: Boolean(entry.starter),
    totalGoals: readNumericStat(entry.stats, 'totalGoals'),
    goalAssists: readNumericStat(entry.stats, 'goalAssists'),
    totalShots: readNumericStat(entry.stats, 'totalShots'),
    shotsOnTarget: readNumericStat(entry.stats, 'shotsOnTarget'),
    foulsCommitted: readNumericStat(entry.stats, 'foulsCommitted'),
    foulsSuffered: readNumericStat(entry.stats, 'foulsSuffered'),
    yellowCards: readNumericStat(entry.stats, 'yellowCards'),
    redCards: readNumericStat(entry.stats, 'redCards'),
    offsides: readNumericStat(entry.stats, 'offsides'),
    ownGoals: readNumericStat(entry.stats, 'ownGoals'),
    saves: readNumericStat(entry.stats, 'saves'),
    goalsConceded: readNumericStat(entry.stats, 'goalsConceded'),
    shotsFaced: readNumericStat(entry.stats, 'shotsFaced'),
    // Placeholders — ESPN match lines usually omit these; aliases ready for future feeds.
    chancesCreated: readNumericStatAlias(entry.stats, [
      'chancesCreated',
      'chanceCreated',
      'keyPasses',
      'keyPass',
    ]),
    successfulDribbles: readNumericStatAlias(entry.stats, [
      'successfulDribbles',
      'dribblesWon',
      'takeOnsWon',
      'dribblesSuccessful',
    ]),
  }
}

/** True when the player entered the match — not merely named in the matchday squad. */
function playerAppearedOnPitch(entry: EspnRosterEntry, stats: MatchPlayerStats): boolean {
  if (entry.starter) return true
  if (stats.appearances > 0) return true
  // ESPN often flags unused substitutes as `active`; ignore that flag.
  // A used sub with delayed appearances still rates if they recorded an action.
  return (
    stats.totalGoals > 0 ||
    stats.goalAssists > 0 ||
    stats.totalShots > 0 ||
    stats.shotsOnTarget > 0 ||
    stats.foulsCommitted > 0 ||
    stats.foulsSuffered > 0 ||
    stats.yellowCards > 0 ||
    stats.redCards > 0 ||
    stats.offsides > 0 ||
    stats.ownGoals > 0 ||
    stats.saves > 0 ||
    stats.shotsFaced > 0
  )
}

function buildLineups(
  summary: EspnSummary,
  leagueId: LeagueId,
  live: boolean,
  elapsedMinutes: number,
): MatchLineupSide[] {
  return (summary.rosters ?? [])
    .map((side) => {
      const teamId = side.team?.id || 'unknown'
      const teamName = side.team?.displayName || side.team?.shortDisplayName || ''
      const homeAway: 'home' | 'away' = side.homeAway === 'away' ? 'away' : 'home'
      const players = (side.roster ?? []).flatMap((entry) => {
          const id = entry.athlete?.id
          if (!id) return []
          const name = entry.athlete?.displayName || ''
          const shortName = entry.athlete?.shortName || name
          const positionAbbrev = entry.position?.abbreviation || ''
          const jerseyUrl = entry.athlete?.jerseyImages?.[0]?.href
          const stats = toMatchPlayerStats(entry)
          const appeared = playerAppearedOnPitch(entry, stats)
          const ratingStats: MatchPlayerStats = {
            ...stats,
            appearances: appeared ? Math.max(stats.appearances, 1) : 0,
          }
          const minutesFromBox =
            readNumericStat(entry.stats, 'minutes') ||
            readNumericStat(entry.stats, 'minsPlayed') ||
            readNumericStat(entry.stats, 'minutesPlayed')
          const minutesPlayed =
            minutesFromBox > 0
              ? minutesFromBox
              : entry.starter
                ? live
                  ? elapsedMinutes
                  : 90
                : live
                  ? Math.max(1, Math.min(30, elapsedMinutes))
                  : 45
          const breakdown = rateMatchPerformance(
            ratingStats,
            positionGroupFromAbbrev(positionAbbrev),
            {
              minutesPlayed,
              live,
            },
          )
          const player: MatchLineupPlayer = {
            id,
            name,
            shortName,
            jersey: entry.jersey,
            photoUrl: playerHeadshotUrl(id),
            jerseyUrl,
            positionAbbrev,
            starter: Boolean(entry.starter),
            rating: breakdown?.rating ?? null,
            teamId,
            teamName,
            leagueId,
          }
          return [player]
        })

      const formation = side.formation?.trim() || undefined
      return {
        teamId,
        teamName,
        homeAway,
        formation,
        starters: players.filter((player) => player.starter),
        // Keep unused substitutes visible — they just have no rating.
        bench: players.filter((player) => !player.starter),
      } satisfies MatchLineupSide
    })
    .filter((side) => side.starters.length > 0 || side.bench.length > 0)
}

export async function fetchMatchDetailStats(
  leagueId: LeagueId,
  espnEventId: string,
  matchId: string,
): Promise<MatchDetailStats> {
  const league = getLeague(leagueId)
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/summary?event=${espnEventId}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not load match stats (${res.status})`)
  }

  const data = (await res.json()) as EspnSummary
  const teams = data.boxscore?.teams ?? []
  const home = teams.find((t) => t.homeAway === 'home') ?? teams[0]
  const away = teams.find((t) => t.homeAway === 'away') ?? teams[1]
  const statusName = data.header?.competitions?.[0]?.status?.type?.name || ''
  const live =
    statusName.includes('IN_PROGRESS') ||
    statusName.includes('HALFTIME') ||
    statusName.includes('FIRST_HALF') ||
    statusName.includes('SECOND_HALF') ||
    data.header?.competitions?.[0]?.status?.type?.state === 'in'
  const elapsedMinutes = parseElapsedMinutes(data, live)

  return {
    matchId,
    espnEventId,
    leagueId,
    fetchedAt: Date.now(),
    lines: buildStatLines(statMap(home?.statistics), statMap(away?.statistics)),
    moments: buildMoments(data.keyEvents),
    lineups: buildLineups(data, leagueId, live, elapsedMinutes),
    live,
    elapsedMinutes,
  }
}

type SeasonLineupEvent = {
  espnEventId: string
  espnCode: string
  leagueId: LeagueId
}

/**
 * ESPN slugs for a club “all competitions” season — domestic + cups + continental
 * + club friendlies.
 */
function competitiveEspnCodesForClub(
  leagueId: LeagueId,
  domesticEspnCode?: string,
): string[] {
  const league = getLeague(leagueId)
  const codes = new Set<string>()
  if (domesticEspnCode) codes.add(domesticEspnCode)
  codes.add(league.espnCode)

  if (league.kind === 'domestic') {
    if (league.format === 'league') {
      for (const code of domesticPyramidEspnCodes(leagueId)) codes.add(code)
    }
    for (const cup of domesticCupsForCountry(league.country)) {
      codes.add(cup.espnCode)
    }
    for (const continental of continentalLeagues()) {
      codes.add(continental.espnCode)
    }
    codes.add('club.friendly')
  } else if (league.kind === 'international') {
    for (const item of internationalLeagues()) {
      codes.add(item.espnCode)
    }
  } else {
    for (const continental of continentalLeagues()) {
      codes.add(continental.espnCode)
    }
    codes.add('club.friendly')
  }

  return [...codes]
}

/** All international ESPN slugs for national-team season stats (includes friendlies). */
function nationalTeamEspnCodes(): string[] {
  return internationalLeagues().map((item) => item.espnCode)
}

type NationalLeaderSource = {
  espnCode: string
  year: number
  /** Completed or scheduled matches inside the Aug–Jul window. */
  matchCount: number
}

/**
 * ESPN competition/year pairs with matches inside the national
 * Aug 1 – Jul 31 window (scheduled or completed).
 */
async function nationalTeamLeaderSources(
  teamId: string,
  seasonStartYear: number,
): Promise<NationalLeaderSource[]> {
  const { from, to } = internationalSeasonDateBounds(seasonStartYear)
  const fromMs = from.getTime()
  const toMs = to.getTime()
  const codes = nationalTeamEspnCodes()
  const years = [seasonStartYear - 1, seasonStartYear, seasonStartYear + 1]
  const pairs = codes.flatMap((espnCode) => years.map((year) => ({ espnCode, year })))

  return mapPool(pairs, 6, async ({ espnCode, year }) => {
    try {
      const url = new URL(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/teams/${encodeURIComponent(teamId)}/schedule`,
      )
      url.searchParams.set('season', String(year))
      const res = await fetch(url)
      if (!res.ok) return null
      const data = (await res.json()) as {
        events?: Array<{ date?: string }>
      }
      let matchCount = 0
      for (const event of data.events ?? []) {
        if (!event.date) continue
        const ms = new Date(event.date).getTime()
        if (Number.isFinite(ms) && ms >= fromMs && ms <= toMs) matchCount += 1
      }
      return matchCount > 0 ? { espnCode, year, matchCount } : null
    } catch {
      return null
    }
  })
}

/** Biggest non-friendly tournament a nation played in an Aug–Jul season. */
function biggestNationalTournament(
  sources: NationalLeaderSource[],
): { espnCode: string; year: number; leagueId: LeagueId; name: string } | null {
  const competitive = sources
    .map((source) => {
      const league = LEAGUES.find((item) => item.espnCode === source.espnCode)
      if (!league || isFriendlyLeagueId(league.id)) return null
      return { source, league }
    })
    .filter((row): row is { source: NationalLeaderSource; league: (typeof LEAGUES)[number] } =>
      Boolean(row),
    )
  if (competitive.length === 0) return null

  competitive.sort((a, b) => {
    const rank = leagueImportanceRank(a.league.id) - leagueImportanceRank(b.league.id)
    if (rank !== 0) return rank
    return b.source.matchCount - a.source.matchCount
  })
  const top = competitive[0]!
  return {
    espnCode: top.source.espnCode,
    year: top.source.year,
    leagueId: top.league.id,
    name: top.league.name,
  }
}

function isCompetitiveEspnCode(espnCode: string): boolean {
  if (/friendly/i.test(espnCode)) return false
  const match = LEAGUES.find((item) => item.espnCode === espnCode)
  if (!match) return true
  return !isFriendlyLeagueId(match.id)
}

async function listTeamSeasonLineupEvents(
  leagueId: LeagueId,
  teamId: string,
  seasonYear: number,
  espnCodeOverride?: string,
): Promise<SeasonLineupEvent[]> {
  const codeList = competitiveEspnCodesForClub(leagueId, espnCodeOverride)
  const chunks = await mapPool(codeList, 4, async (espnCode) => {
    try {
      const url = new URL(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/teams/${encodeURIComponent(teamId)}/schedule`,
      )
      url.searchParams.set('season', String(seasonYear))
      const res = await fetch(url)
      if (!res.ok) return [] as SeasonLineupEvent[]
      const data = (await res.json()) as {
        events?: Array<{
          id?: string
          competitions?: Array<{ status?: { type?: { completed?: boolean; name?: string } } }>
        }>
      }
      const leagueForCode =
        LEAGUES.find((item) => item.espnCode === espnCode)?.id ?? leagueId

      return (data.events ?? []).flatMap((event) => {
        const id = event.id
        if (!id) return []
        const competition = event.competitions?.[0]
        const completed =
          competition?.status?.type?.completed ||
          competition?.status?.type?.name === 'STATUS_FULL_TIME'
        if (!completed) return []
        return [{ espnEventId: id, espnCode, leagueId: leagueForCode }]
      })
    } catch {
      return [] as SeasonLineupEvent[]
    }
  })

  const byId = new Map<string, SeasonLineupEvent>()
  for (const list of chunks) {
    for (const event of list) {
      if (!byId.has(event.espnEventId)) byId.set(event.espnEventId, event)
    }
  }
  return [...byId.values()]
}

/**
 * Most common starting XI for a club season across competitive fixtures.
 * Samples recent finished matches (excludes friendlies).
 */
export async function fetchMostUsedStartingXi(
  leagueId: LeagueId,
  teamId: string,
  seasonYear: number,
  espnCodeOverride?: string,
): Promise<MostUsedStartingXi> {
  const events = await listTeamSeasonLineupEvents(
    leagueId,
    teamId,
    seasonYear,
    espnCodeOverride,
  )
  // All competitive fixtures for the season (newest first). Soft cap avoids runaway seasons.
  const sample = events.slice(-80).reverse()

  type PlaceStat = {
    id: string
    name: string
    shortName: string
    jersey?: string
    positionAbbrev: string
    starts: number
    goals: number
    assists: number
    ratingSum: number
    ratingCount: number
  }

  type MatchXiSample = {
    formation: string
    starters: Array<{
      place: number
      id: string
      name: string
      shortName: string
      jersey?: string
      positionAbbrev: string
      goals: number
      assists: number
      rating: number | null
    }>
  }

  const samples = await mapPool(sample, 4, async (event) => {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${event.espnCode}/summary?event=${event.espnEventId}`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = (await res.json()) as EspnSummary
      const side = (data.rosters ?? []).find((entry) => entry.team?.id === teamId)
      if (!side) return null
      const formation = side.formation?.trim()
      if (!formation) return null

      const starters: MatchXiSample['starters'] = []
      for (const entry of side.roster ?? []) {
        if (!entry.starter || !entry.athlete?.id) continue
        const place = Number(entry.formationPlace)
        if (!Number.isFinite(place) || place <= 0) continue
        const stats = toMatchPlayerStats(entry)
        const breakdown = rateMatchPerformance(
          stats,
          positionGroupFromAbbrev(entry.position?.abbreviation || ''),
          { minutesPlayed: 90, live: false },
        )
        starters.push({
          place,
          id: entry.athlete.id,
          name: entry.athlete.displayName || '',
          shortName: entry.athlete.shortName || entry.athlete.displayName || '',
          jersey: entry.jersey,
          positionAbbrev: entry.position?.abbreviation || '',
          goals: stats.totalGoals,
          assists: stats.goalAssists,
          rating: breakdown?.rating ?? null,
        })
      }
      if (starters.length === 0) return null
      return { formation, starters } satisfies MatchXiSample
    } catch {
      return null
    }
  })

  const matchesSampled = samples.length
  const formationCounts = new Map<string, number>()
  for (const sampleRow of samples) {
    formationCounts.set(
      sampleRow.formation,
      (formationCounts.get(sampleRow.formation) || 0) + 1,
    )
  }

  let formation = '4-3-3'
  let bestCount = 0
  for (const [key, count] of formationCounts) {
    if (count > bestCount) {
      formation = key
      bestCount = count
    }
  }

  const formationSamples = samples.filter((row) => row.formation === formation)
  const placeSource = formationSamples.length >= 3 ? formationSamples : samples
  const placePlayers = new Map<number, Map<string, PlaceStat>>()

  for (const sampleRow of placeSource) {
    for (const starter of sampleRow.starters) {
      const byPlayer = placePlayers.get(starter.place) ?? new Map<string, PlaceStat>()
      const current = byPlayer.get(starter.id) ?? {
        id: starter.id,
        name: starter.name,
        shortName: starter.shortName,
        jersey: starter.jersey,
        positionAbbrev: starter.positionAbbrev,
        starts: 0,
        goals: 0,
        assists: 0,
        ratingSum: 0,
        ratingCount: 0,
      }
      current.starts += 1
      current.goals += starter.goals
      current.assists += starter.assists
      if (starter.rating != null) {
        current.ratingSum += starter.rating
        current.ratingCount += 1
      }
      if (!current.positionAbbrev && starter.positionAbbrev) {
        current.positionAbbrev = starter.positionAbbrev
      }
      byPlayer.set(starter.id, current)
      placePlayers.set(starter.place, byPlayer)
    }
  }

  const xiCore: Array<Omit<MostUsedXiPlayer, 'x' | 'y'>> = []
  const places = [...placePlayers.keys()].sort((a, b) => a - b)
  for (const place of places) {
    const candidates = [...(placePlayers.get(place)?.values() ?? [])]
    candidates.sort((a, b) => b.starts - a.starts || b.goals - a.goals)
    const top = candidates[0]
    if (!top) continue
    if (xiCore.some((player) => player.id === top.id)) continue
    xiCore.push({
      id: top.id,
      name: top.name,
      shortName: top.shortName,
      jersey: top.jersey,
      photoUrl: playerHeadshotUrl(top.id),
      positionAbbrev: top.positionAbbrev,
      formationPlace: place,
      starts: top.starts,
      goals: top.goals,
      assists: top.assists,
      avgRating:
        top.ratingCount > 0
          ? Math.round((top.ratingSum / top.ratingCount) * 10) / 10
          : null,
    })
    if (xiCore.length >= 11) break
  }

  // If places were sparse, fill with overall most-started players.
  if (xiCore.length < 11) {
    const overall = new Map<string, PlaceStat>()
    for (const byPlayer of placePlayers.values()) {
      for (const stat of byPlayer.values()) {
        const current = overall.get(stat.id)
        if (!current) {
          overall.set(stat.id, { ...stat })
          continue
        }
        current.starts += stat.starts
        current.goals += stat.goals
        current.assists += stat.assists
        current.ratingSum += stat.ratingSum
        current.ratingCount += stat.ratingCount
      }
    }
    const fillers = [...overall.values()]
      .filter((stat) => !xiCore.some((player) => player.id === stat.id))
      .sort((a, b) => b.starts - a.starts)
    const openPlaces = nextOpenFormationPlaces(
      formation,
      xiCore.map((player) => player.formationPlace),
      11 - xiCore.length,
    )
    let placeIndex = 0
    for (const top of fillers) {
      const place = openPlaces[placeIndex] ?? placeIndex + 12
      placeIndex += 1
      xiCore.push({
        id: top.id,
        name: top.name,
        shortName: top.shortName,
        jersey: top.jersey,
        photoUrl: playerHeadshotUrl(top.id),
        positionAbbrev: top.positionAbbrev,
        formationPlace: place,
        starts: top.starts,
        goals: top.goals,
        assists: top.assists,
        avgRating:
          top.ratingCount > 0
            ? Math.round((top.ratingSum / top.ratingCount) * 10) / 10
            : null,
      })
      if (xiCore.length >= 11) break
    }
  }

  // Overlay season G/A from the same all-competitions leaders feed as the Stats tab.
  try {
    const leaders = await fetchTeamStatLeaders(
      leagueId,
      teamId,
      40,
      seasonYear,
      espnCodeOverride,
    )
    const goalsById = new Map<string, number>()
    const assistsById = new Map<string, number>()
    for (const category of leaders.categories) {
      const id = category.id.toLowerCase()
      const target =
        id === 'goals' || id === 'goalsleaders'
          ? goalsById
          : id === 'assists' || id === 'assistsleaders'
            ? assistsById
            : null
      if (!target) continue
      for (const leader of category.leaders) {
        if (!leader.id || !/^\d+$/.test(leader.id)) continue
        target.set(leader.id, leader.value)
      }
    }
    for (const player of xiCore) {
      if (goalsById.has(player.id)) player.goals = goalsById.get(player.id)!
      if (assistsById.has(player.id)) player.assists = assistsById.get(player.id)!
    }
  } catch {
    // Keep per-match aggregates when season leaders are unavailable.
  }

  const players = layoutPlayersOnPitch(formation, xiCore.slice(0, 11))

  return {
    teamId,
    seasonYear,
    formation,
    matchesSampled: events.length > 0 ? events.length : matchesSampled,
    players,
    fetchedAt: Date.now(),
  }
}

function readStat(entry: EspnStandingEntry, name: string): number {
  const found = entry.stats?.find((stat) => stat.name === name)
  if (!found) return 0
  if (typeof found.value === 'number' && Number.isFinite(found.value)) return found.value
  const n = Number(found.displayValue)
  return Number.isFinite(n) ? n : 0
}

type EspnSiteLeaderAthlete = {
  id?: string
  displayName?: string
  shortName?: string
  jersey?: string
  team?: {
    id?: string
    displayName?: string
    shortDisplayName?: string
  }
}

type EspnSiteLeader = {
  displayValue?: string
  shortDisplayValue?: string
  value?: number
  athlete?: EspnSiteLeaderAthlete
  team?: {
    id?: string
    displayName?: string
    shortDisplayName?: string
  }
}

type EspnSiteStatisticsResponse = {
  season?: { year?: number; displayName?: string }
  stats?: Array<{
    name?: string
    displayName?: string
    leaders?: EspnSiteLeader[]
  }>
}

async function fetchStandingsForSeason(
  leagueId: LeagueId,
  season?: number,
): Promise<StandingRow[]> {
  const league = getLeague(leagueId)
  if (!league.hasStandings) return []

  const url = new URL(
    `https://site.api.espn.com/apis/v2/sports/soccer/${league.espnCode}/standings`,
  )
  if (season != null) url.searchParams.set('season', String(season))
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not load ${league.name} table (${res.status})`)
  }

  const data = (await res.json()) as EspnStandingsResponse
  const children = data.children ?? []
  const multiGroup = children.filter((child) => (child.standings?.entries?.length ?? 0) > 0).length > 1

  const rows = children.flatMap((child) => {
    const groupLabel = multiGroup
      ? child.name || child.abbreviation || undefined
      : undefined
    return (child.standings?.entries ?? []).map((entry, index) => {
      const teamName = entry.team?.displayName || ''
      return {
        rank: readStat(entry, 'rank') || index + 1,
        teamId: entry.team?.id || teamName.toLowerCase().replace(/\s+/g, '-') || `team-${index}`,
        team: teamName,
        shortName: entry.team?.shortDisplayName || entry.team?.displayName || '',
        played: readStat(entry, 'gamesPlayed'),
        won: readStat(entry, 'wins'),
        drawn: readStat(entry, 'ties'),
        lost: readStat(entry, 'losses'),
        goalDiff: readStat(entry, 'pointDifferential'),
        points: readStat(entry, 'points'),
        goalsFor: readStat(entry, 'pointsFor'),
        goalsAgainst: readStat(entry, 'pointsAgainst'),
        note: entry.note?.description,
        group: groupLabel,
      }
    })
  })

  const normalized = expandMultiGroupStandingNotes(rows)

  const sorted = normalized.sort((a, b) => {
    const groupCmp = (a.group || '').localeCompare(b.group || '')
    if (groupCmp !== 0) return groupCmp
    return a.rank - b.rank || b.points - a.points
  })

  const nationsLetter = uefaNationsLeagueLetter(leagueId)
  if (!nationsLetter) return sorted
  return sorted.filter((row) => multiGroupLetter(row.group) === nationsLetter)
}

/** League / group letter from labels like "Group A1" / "League B Group 3". */
/** League / group letter from labels like "Group A1" / "League B Group 3". */
export function multiGroupLetter(group?: string): string | null {
  if (!group) return null
  const league = group.match(/\bLeague\s+([A-D])\b/i)
  if (league) return league[1]!.toUpperCase()
  const grouped = group.match(/\b([A-D])\s*\d+\b/i)
  if (grouped) return grouped[1]!.toUpperCase()
  const lone = group.match(/\bGroup\s+([A-H])\b/i)
  return lone ? lone[1]!.toUpperCase() : null
}

/** Whether an ESPN key list/range ("A", "A, B", "B-D") includes this letter. */
function multiGroupKeysInclude(keys: string, letter: string): boolean {
  const code = letter.toUpperCase().charCodeAt(0)
  for (const token of keys.split(',').map((part) => part.trim()).filter(Boolean)) {
    const range = token.match(/^([A-H])\s*[-–—]\s*([A-H])$/i)
    if (range) {
      const a = range[1]!.toUpperCase().charCodeAt(0)
      const b = range[2]!.toUpperCase().charCodeAt(0)
      if (code >= Math.min(a, b) && code <= Math.max(a, b)) return true
      continue
    }
    if (token.toUpperCase() === letter.toUpperCase()) return true
  }
  return false
}

function isCompoundMultiGroupNote(description: string): boolean {
  // e.g. "A: Qualifies for QFs; B-D: Promotion"
  return /[A-H]\s*[,:-]|[A-H]\s*[-–—]\s*[A-H]/i.test(description) && description.includes(':')
}

function filterCompoundMultiGroupNote(description: string, letter: string): string | null {
  const parts = description
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  const matched: string[] = []
  for (const part of parts) {
    const split = part.match(/^([^:]+):\s*(.+)$/)
    if (!split) continue
    if (multiGroupKeysInclude(split[1]!, letter)) matched.push(split[2]!.trim())
  }
  return matched.length > 0 ? matched.join('; ') : null
}

/**
 * ESPN sometimes packs every group's outcomes into one note on a single group
 * (Nations League A1), or omits notes on later groups. Expand notes by rank to
 * every group, and for compound "A: …; B-D: …" notes keep only this group's letter.
 */
function expandMultiGroupStandingNotes(rows: StandingRow[]): StandingRow[] {
  const groupCount = new Set(rows.map((row) => row.group).filter(Boolean)).size
  if (groupCount <= 1) return rows

  const notesByRank = new Map<number, string>()
  for (const row of rows) {
    const raw = row.note?.trim()
    if (!raw || notesByRank.has(row.rank)) continue
    notesByRank.set(row.rank, raw)
  }
  if (notesByRank.size === 0) return rows

  const anyCompound = [...notesByRank.values()].some(isCompoundMultiGroupNote)

  return rows.map((row) => {
    const raw = notesByRank.get(row.rank)
    if (!raw) return { ...row, note: row.note }

    if (anyCompound && isCompoundMultiGroupNote(raw)) {
      const letter = multiGroupLetter(row.group)
      if (!letter) return { ...row, note: undefined }
      const filtered = filterCompoundMultiGroupNote(raw, letter)
      return { ...row, note: filtered || undefined }
    }

    // Plain notes: fill missing groups from the same rank elsewhere.
    if (row.note?.trim()) return row
    return { ...row, note: raw }
  })
}

export async function fetchLeagueStandings(
  leagueId: LeagueId,
  seasonYear?: number,
): Promise<StandingRow[]> {
  return fetchStandingsForSeason(leagueId, seasonYear)
}

/** Team id → Nations League letter (A–D) from the shared ESPN standings. */
const uefaNationsTeamLettersCache = new Map<string, Map<string, 'A' | 'B' | 'C' | 'D'>>()

export async function fetchUefaNationsTeamLetters(
  seasonYear?: number,
): Promise<Map<string, 'A' | 'B' | 'C' | 'D'>> {
  const cacheKey = seasonYear != null ? String(seasonYear) : 'current'
  const cached = uefaNationsTeamLettersCache.get(cacheKey)
  if (cached) return cached

  // Fetch via League A id — all four leagues share ESPN `uefa.nations`.
  const league = getLeague('uefa-nations-a')
  const url = new URL(
    `https://site.api.espn.com/apis/v2/sports/soccer/${league.espnCode}/standings`,
  )
  if (seasonYear != null) url.searchParams.set('season', String(seasonYear))
  const map = new Map<string, 'A' | 'B' | 'C' | 'D'>()
  try {
    const res = await fetch(url)
    if (!res.ok) {
      uefaNationsTeamLettersCache.set(cacheKey, map)
      return map
    }
    const data = (await res.json()) as EspnStandingsResponse
    for (const child of data.children ?? []) {
      const letter = multiGroupLetter(child.name || child.abbreviation)
      if (letter !== 'A' && letter !== 'B' && letter !== 'C' && letter !== 'D') continue
      for (const entry of child.standings?.entries ?? []) {
        const id = entry.team?.id
        if (id) map.set(id, letter)
      }
    }
  } catch {
    // leave empty — callers fall back to unfiltered
  }
  uefaNationsTeamLettersCache.set(cacheKey, map)
  return map
}

/** Team ids that belong to this Nations League division for the season. */
async function uefaNationsDivisionTeamIds(
  leagueId: LeagueId,
  seasonYear?: number,
): Promise<Set<string> | null> {
  const letter = uefaNationsLeagueLetter(leagueId)
  if (!letter) return null
  const map = await fetchUefaNationsTeamLetters(seasonYear)
  if (map.size === 0) return null
  const ids = new Set<string>()
  for (const [teamId, teamLetter] of map) {
    if (teamLetter === letter) ids.add(teamId)
  }
  return ids.size > 0 ? ids : null
}

type EspnTeamRosterAthlete = {
  id?: string
  displayName?: string
  fullName?: string
  shortName?: string
  jersey?: string | null
  headshot?: { href?: string } | null
  position?: {
    abbreviation?: string
    displayName?: string
    name?: string
  }
}

type EspnTeamRosterResponse = {
  season?: { year?: number; displayName?: string }
  athletes?: EspnTeamRosterAthlete[]
}

const ROSTER_GROUP_ORDER: Array<{ id: TeamRosterGroup['id']; label: string }> = [
  { id: 'GK', label: 'Goalkeepers' },
  { id: 'DEF', label: 'Defenders' },
  { id: 'MID', label: 'Midfielders' },
  { id: 'FWD', label: 'Forwards' },
  { id: 'UNK', label: 'Other' },
]

function jerseySortValue(jersey?: string): number {
  if (!jersey) return Number.MAX_SAFE_INTEGER
  const n = Number(jersey)
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

/** League name fragment from ESPN season displayName (e.g. "English League Championship"). */
function leagueNameFromSeasonDisplay(displayName: string | undefined, year: number): string {
  if (!displayName?.trim()) return ''
  return displayName
    .replace(/^\d{4}\s*[-/]\s*\d{2,4}\s*/i, '')
    .replace(new RegExp(`^${year}\\s*`, 'i'), '')
    .trim()
}

type EspnStandingNoteEntry = {
  team?: { id?: string | number }
  note?: { description?: string; rank?: number }
}

/** Standing row note for a club in a league season (e.g. "Promotion via playoffs"). */
async function fetchTeamStandingNote(
  espnCode: string,
  year: number,
  teamId: string,
): Promise<string | null> {
  const cacheKey = `${espnCode}:${year}:${teamId}`
  const cached = standingNoteCache.get(cacheKey)
  if (cached !== undefined) return cached

  try {
    const url = new URL(
      `https://site.api.espn.com/apis/v2/sports/soccer/${espnCode}/standings`,
    )
    url.searchParams.set('season', String(year))
    const res = await fetch(url)
    if (!res.ok) {
      standingNoteCache.set(cacheKey, null)
      return null
    }
    const data = (await res.json()) as unknown
    let note: string | null = null
    const visit = (value: unknown) => {
      if (note || value == null) return
      if (Array.isArray(value)) {
        for (const item of value) visit(item)
        return
      }
      if (typeof value !== 'object') return
      const row = value as EspnStandingNoteEntry
      if (row.team && String(row.team.id) === teamId) {
        const description = row.note?.description?.trim()
        if (description) note = description
        return
      }
      for (const child of Object.values(value as Record<string, unknown>)) visit(child)
    }
    visit(data)
    standingNoteCache.set(cacheKey, note)
    return note
  } catch {
    standingNoteCache.set(cacheKey, null)
    return null
  }
}

async function teamHasRosterInLeague(
  espnCode: string,
  year: number,
  teamId: string,
): Promise<boolean> {
  try {
    const url = new URL(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/teams/${encodeURIComponent(teamId)}/roster`,
    )
    url.searchParams.set('season', String(year))
    const res = await fetch(url)
    if (!res.ok) return false
    const data = (await res.json()) as EspnTeamRosterResponse
    return (data.athletes ?? []).length > 0
  } catch {
    return false
  }
}

/**
 * When a club won promotion through the play-offs, prefer that over the plain
 * division name (e.g. "Championship play-off winners" instead of "Championship").
 */
async function divisionSeasonLabel(input: {
  divisionName: string
  espnCode: string
  year: number
  teamId: string
  pyramidCodes: string[]
}): Promise<string> {
  const note = await fetchTeamStandingNote(input.espnCode, input.year, input.teamId)
  if (!note) return input.divisionName
  const normalized = note.toLowerCase()

  // Modern ESPN wording for the play-off winner.
  if (normalized.includes('promotion') && normalized.includes('via playoff')) {
    return playoffWinnersLabel(input.divisionName)
  }

  // Older tables mark the play-off places with "Promotion play-offs" for every
  // participant — only keep the label if the club moved up the next season.
  if (
    normalized.includes('promotion') &&
    (normalized.includes('play-off') || normalized.includes('playoff'))
  ) {
    const codeIndex = input.pyramidCodes.indexOf(input.espnCode)
    const higherCode = codeIndex > 0 ? input.pyramidCodes[codeIndex - 1] : null
    if (higherCode && (await teamHasRosterInLeague(higherCode, input.year + 1, input.teamId))) {
      return playoffWinnersLabel(input.divisionName)
    }
  }

  return input.divisionName
}

/**
 * Seasons a club actually fielded a squad, labeled with that year's division
 * (Premier League, Championship, League One, …) — not the nav league for every year.
 */
export async function fetchTeamSeasonOptions(
  leagueId: LeagueId,
  teamId: string,
  opts?: { labelMode?: 'division' | 'all-competitions' },
): Promise<LeagueSeasonOption[]> {
  const cacheKey = `${leagueId}:${teamId}:${opts?.labelMode ?? 'division'}`
  const cached = teamSeasonOptionsCache.get(cacheKey)
  if (cached) return cached

  const league = getLeague(leagueId)
  const labelMode = opts?.labelMode ?? 'division'

  if (league.kind === 'international') {
    const current = inferInternationalSeasonStartYear()
    const years = Array.from({ length: 8 }, (_, index) => current - index)
    const resolved = await mapPool(years, 2, async (seasonStartYear) => {
      const sources = await nationalTeamLeaderSources(teamId, seasonStartYear)
      const shortLabel = formatSeasonShortLabel(
        seasonStartYear,
        `${seasonStartYear}-${String(seasonStartYear + 1).slice(2)}`,
      )

      // Always keep the open current season even before first match.
      if (sources.length === 0 && seasonStartYear !== current) return null

      if (labelMode === 'all-competitions') {
        return {
          year: seasonStartYear,
          shortLabel,
          label: 'All competitions',
          key: `national-stats:${teamId}:${seasonStartYear}`,
          espnCode: sources[0]?.espnCode || league.espnCode,
          teamId,
        } satisfies LeagueSeasonOption
      }

      // Squad: label by biggest tournament that year (WC, Gold Cup, Copa, …).
      const biggest = biggestNationalTournament(sources)
      const friendly = sources.find((source) => /friendly/i.test(source.espnCode))
      const espnCode = biggest?.espnCode || friendly?.espnCode || league.espnCode
      const rosterYear = biggest?.year || friendly?.year || seasonStartYear
      const label = biggest?.name || 'International Friendlies'
      return {
        year: rosterYear,
        shortLabel,
        label,
        key: `national-squad:${teamId}:${seasonStartYear}:${espnCode}:${rosterYear}`,
        espnCode,
        teamId,
      } satisfies LeagueSeasonOption
    })
    const options = resolved.flatMap((option) => (option ? [option] : []))
    // Newest Aug–Jul season-start year first (encoded in key as …:YYYY:…).
    options.sort((a, b) => {
      const aYear = Number(a.key?.split(':')[2]) || a.year
      const bYear = Number(b.key?.split(':')[2]) || b.year
      return bYear - aYear
    })
    teamSeasonOptionsCache.set(cacheKey, options)
    return options
  }

  const codes = domesticPyramidEspnCodes(leagueId)
  const yearSets = await mapPool(codes, 4, async (espnCode) => {
    try {
      return await listLeagueSeasonYears(espnCode)
    } catch {
      return [] as number[]
    }
  })
  const currentClubSeason = inferSoccerSeasonStartYear()
  const years = [...new Set([currentClubSeason, ...yearSets.flat()])]
    .sort((a, b) => b - a)
    .slice(0, 24)

  const resolved = await mapPool(years, 4, async (year) => {
    for (const espnCode of codes) {
      try {
        const url = new URL(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/teams/${encodeURIComponent(teamId)}/roster`,
        )
        url.searchParams.set('season', String(year))
        const res = await fetch(url)
        if (!res.ok) {
          // Keep the open current season even if ESPN has no roster yet.
          if (year === currentClubSeason && espnCode === codes[0]) {
            const labels = await fetchSeasonLabels(espnCode, year)
            return {
              year,
              shortLabel: labels.shortLabel,
              label: labelMode === 'all-competitions' ? 'All competitions' : labels.label,
              key: `${espnCode}:${year}`,
              espnCode,
              teamId,
            } satisfies LeagueSeasonOption
          }
          continue
        }
        const data = (await res.json()) as EspnTeamRosterResponse
        if (!(data.athletes ?? []).length) {
          if (year === currentClubSeason && espnCode === codes[0]) {
            const labels = await fetchSeasonLabels(espnCode, year)
            return {
              year,
              shortLabel: labels.shortLabel,
              label: labelMode === 'all-competitions' ? 'All competitions' : labels.label,
              key: `${espnCode}:${year}`,
              espnCode,
              teamId,
            } satisfies LeagueSeasonOption
          }
          continue
        }
        const labels = await fetchSeasonLabels(espnCode, year)
        const divisionName =
          leagueNameFromSeasonDisplay(data.season?.displayName, year) ||
          leagueNameFromSeasonDisplay(labels.label, year) ||
          LEAGUES.find((item) => item.espnCode === espnCode)?.name ||
          espnCode
        const label =
          labelMode === 'all-competitions'
            ? 'All competitions'
            : await divisionSeasonLabel({
                divisionName,
                espnCode,
                year,
                teamId,
                pyramidCodes: codes,
              })
        return {
          year,
          shortLabel: labels.shortLabel,
          label,
          key: `${espnCode}:${year}`,
          espnCode,
          teamId,
        } satisfies LeagueSeasonOption
      } catch {
        // try next division
      }
    }
    return null
  })

  const options = resolved.flatMap((option) => (option ? [option] : []))
  options.sort((a, b) => b.year - a.year)

  teamSeasonOptionsCache.set(cacheKey, options)
  return options
}

/** Full squad, grouped by position (GK → DEF → MID → FWD). */
export async function fetchTeamRoster(
  leagueId: LeagueId,
  teamId: string,
  seasonYear?: number,
  espnCodeOverride?: string,
): Promise<TeamRoster> {
  const league = getLeague(leagueId)
  const nowYear = new Date().getUTCFullYear()
  const yearsToTry =
    seasonYear != null
      ? ([seasonYear] as const)
      : ([nowYear, nowYear - 1, nowYear - 2, null] as const)
  const codesToTry = [
    ...(espnCodeOverride ? [espnCodeOverride] : []),
    league.espnCode,
    ...(league.kind === 'domestic' && league.format === 'league'
      ? domesticPyramidEspnCodes(leagueId).filter(
          (code) => code !== league.espnCode && code !== espnCodeOverride,
        )
      : []),
    ...(league.kind === 'international'
      ? internationalLeagues()
          .filter((item) => item.espnCode !== league.espnCode)
          .map((item) => item.espnCode)
      : []),
    // Clubs opened from UCL/UEL often only roster under their domestic code.
    ...(league.kind === 'continental'
      ? LEAGUES.filter((item) => item.kind === 'domestic').map((item) => item.espnCode)
      : []),
  ]

  let athletes: EspnTeamRosterAthlete[] = []
  let season = seasonYear ?? nowYear
  let seasonLabel = String(seasonYear ?? nowYear)
  let resolvedLeagueId = leagueId
  let resolvedEspnCode = espnCodeOverride || league.espnCode

  outer: for (const espnCode of codesToTry) {
    for (const year of yearsToTry) {
      const url = new URL(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/teams/${encodeURIComponent(teamId)}/roster`,
      )
      if (year != null) url.searchParams.set('season', String(year))
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as EspnTeamRosterResponse
      const list = data.athletes ?? []
      if (list.length === 0) continue
      athletes = list
      season = data.season?.year ?? year ?? nowYear
      seasonLabel = data.season?.displayName || `${season} season`
      resolvedEspnCode = espnCode
      const matched = LEAGUES.find((item) => item.espnCode === espnCode)
      if (matched) resolvedLeagueId = matched.id
      break outer
    }
  }

  if (athletes.length === 0) {
    throw new Error(
      seasonYear != null
        ? `No roster available for this side in that season`
        : league.kind === 'international'
          ? `No roster available for this national team yet`
          : `No roster available for this club yet`,
    )
  }

  if (league.kind === 'domestic' && league.format === 'league') {
    const divisionName =
      leagueNameFromSeasonDisplay(seasonLabel, season) || seasonLabel
    const outcomeLabel = await divisionSeasonLabel({
      divisionName,
      espnCode: resolvedEspnCode,
      year: season,
      teamId,
      pyramidCodes: domesticPyramidEspnCodes(leagueId),
    })
    if (outcomeLabel !== divisionName) {
      const short = formatSeasonShortLabel(season)
      seasonLabel = `${short} · ${outcomeLabel}`
    }
  }

  const buckets = new Map<string, TeamRosterPlayer[]>()
  for (const entry of athletes) {
    if (!entry.id || !entry.displayName) continue
    const positionAbbrev = entry.position?.abbreviation || ''
    const groupId = positionGroupFromAbbrev(positionAbbrev)
    const player: TeamRosterPlayer = {
      id: entry.id,
      name: entry.displayName,
      shortName: entry.shortName || entry.displayName,
      jersey: entry.jersey?.trim() || undefined,
      positionAbbrev,
      positionLabel: entry.position?.displayName || entry.position?.name || positionAbbrev,
      photoUrl: entry.headshot?.href || playerHeadshotUrl(entry.id),
    }
    const list = buckets.get(groupId)
    if (list) list.push(player)
    else buckets.set(groupId, [player])
  }

  const groups: TeamRosterGroup[] = ROSTER_GROUP_ORDER.flatMap(({ id, label }) => {
    const players = (buckets.get(id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          jerseySortValue(a.jersey) - jerseySortValue(b.jersey) ||
          a.name.localeCompare(b.name),
      )
    if (players.length === 0) return []
    return [{ id, label, players }]
  })

  return {
    leagueId: resolvedLeagueId,
    teamId,
    season,
    seasonLabel,
    groups,
    fetchedAt: Date.now(),
  }
}

function teamLeadersFromStandings(rows: StandingRow[], limit: number): LeaderCategory[] {
  const played = rows.filter((row) => row.played > 0)
  if (played.length === 0) return []

  const byPoints = [...played].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff)
  const byGoals = [...played].sort((a, b) => b.goalsFor - a.goalsFor || b.goalDiff - a.goalDiff)
  const byDiff = [...played].sort((a, b) => b.goalDiff - a.goalDiff || b.points - a.points)
  const byAgainst = [...played].sort(
    (a, b) => a.goalsAgainst - b.goalsAgainst || b.goalDiff - a.goalDiff,
  )

  const toEntries = (list: StandingRow[], valueOf: (row: StandingRow) => number): LeaderEntry[] =>
    list.slice(0, limit).map((row, index) => ({
      rank: index + 1,
      id: row.teamId,
      name: row.team,
      shortName: row.shortName,
      teamId: row.teamId,
      teamName: row.team,
      value: valueOf(row),
      displayValue: String(valueOf(row)),
    }))

  return [
    { id: 'team-points', label: 'Points', kind: 'team' as const, leaders: toEntries(byPoints, (r) => r.points) },
    {
      id: 'team-goals',
      label: 'Goals scored',
      kind: 'team' as const,
      leaders: toEntries(byGoals, (r) => r.goalsFor),
    },
    {
      id: 'team-ga',
      label: 'Fewest conceded',
      kind: 'team' as const,
      leaders: toEntries(byAgainst, (r) => r.goalsAgainst),
    },
    {
      id: 'team-gd',
      label: 'Goal difference',
      kind: 'team' as const,
      leaders: toEntries(byDiff, (r) => r.goalDiff),
    },
  ].filter((category) => category.leaders.length > 0)
}

function playerLeadersFromSiteStats(
  stats: EspnSiteStatisticsResponse['stats'],
  limit: number,
  allowedTeamIds?: Set<string> | null,
): LeaderCategory[] {
  const wanted = [
    { name: 'goalsLeaders', label: 'Top scorers' },
    { name: 'assistsLeaders', label: 'Top assists' },
  ]

  return wanted
    .map(({ name, label }) => {
      const block = stats?.find((item) => item.name === name)
      const filtered = (block?.leaders ?? []).filter((leader) => {
        if (!allowedTeamIds) return true
        const teamId =
          leader.athlete?.team?.id || leader.team?.id || undefined
        return Boolean(teamId && allowedTeamIds.has(teamId))
      })
      const leaders = filtered.slice(0, limit).map((leader, index) => {
        const athlete = leader.athlete
        const nameText = athlete?.displayName || ''
        const team =
          athlete?.team ||
          leader.team ||
          undefined
        return {
          rank: index + 1,
          id: athlete?.id || `${name}-${index}`,
          name: nameText,
          shortName: athlete?.shortName || nameText,
          jersey: athlete?.jersey,
          teamId: team?.id,
          teamName: team?.displayName || team?.shortDisplayName,
          value: typeof leader.value === 'number' ? leader.value : Number(leader.value) || 0,
          displayValue: leader.shortDisplayValue || leader.displayValue || String(leader.value ?? ''),
        }
      })
      return {
        id: name,
        label,
        kind: 'player' as const,
        leaders,
      }
    })
    .filter((category) => category.leaders.length > 0)
}

export async function fetchLeagueLeaders(
  leagueId: LeagueId,
  limit = 8,
  seasonYear?: number,
): Promise<LeagueLeaders> {
  const league = getLeague(leagueId)
  const nowYear = new Date().getUTCFullYear()
  const yearsToTry =
    seasonYear != null ? [seasonYear] : [nowYear, nowYear - 1, nowYear - 2]

  let season = seasonYear ?? nowYear
  let seasonLabel = String(seasonYear ?? nowYear)
  let playerCategories: LeaderCategory[] = []
  let teamCategories: LeaderCategory[] = []

  for (const year of yearsToTry) {
    const url = new URL(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/statistics`,
    )
    url.searchParams.set('season', String(year))
    const res = await fetch(url)
    if (!res.ok) continue
    const data = (await res.json()) as EspnSiteStatisticsResponse
    const allowedTeams = await uefaNationsDivisionTeamIds(leagueId, year)
    const players = playerLeadersFromSiteStats(data.stats, limit, allowedTeams)
    if (players.length === 0 && !allowedTeams) continue
    if (players.length === 0 && allowedTeams) {
      // Division filter emptied the board — still try team leaders from standings.
      season = data.season?.year ?? year
      seasonLabel = data.season?.displayName || `${year} season`
      playerCategories = []
    } else if (players.length === 0) {
      continue
    } else {
      season = data.season?.year ?? year
      seasonLabel = data.season?.displayName || `${year} season`
      playerCategories = players
    }

    try {
      const standings = await fetchStandingsForSeason(leagueId, year)
      teamCategories = teamLeadersFromStandings(standings, limit)
    } catch {
      teamCategories = []
    }
    if (playerCategories.length > 0 || teamCategories.length > 0) break
  }

  if (playerCategories.length === 0 && teamCategories.length === 0) {
    throw new Error(
      seasonYear != null
        ? `No ${league.name} stats leaders for that season`
        : `No ${league.name} stats leaders available yet`,
    )
  }

  return {
    leagueId,
    season,
    seasonLabel,
    categories: [...playerCategories, ...teamCategories],
    fetchedAt: Date.now(),
  }
}

type EspnCoreLeadersResponse = {
  categories?: Array<{
    name?: string
    displayName?: string
    shortDisplayName?: string
    leaders?: Array<{
      displayValue?: string
      shortDisplayValue?: string
      value?: number
      athlete?: { $ref?: string }
      team?: { $ref?: string }
    }>
  }>
}

type EspnCoreNamed = {
  id?: string | number
  displayName?: string
  shortName?: string
  shortDisplayName?: string
  abbreviation?: string
  jersey?: string
}

/** Prefer canonical categories; skip *Leaders duplicates from the same feed. */
const PLAYER_STAT_CATEGORY_ORDER = [
  'goals',
  'assists',
  'shotsOnTarget',
  'totalShots',
  'accuratePasses',
  'foulsSuffered',
  'foulsCommitted',
  'yellowCards',
  'redCards',
  'saves',
] as const

function idFromCoreRef(ref: string | undefined, kind: 'athletes' | 'teams'): string | null {
  if (!ref) return null
  const match = ref.match(new RegExp(`/${kind}/(\\d+)`))
  return match?.[1] ?? null
}

async function fetchCoreNamed(ref: string | undefined): Promise<EspnCoreNamed | null> {
  if (!ref) return null
  try {
    const res = await fetch(ref.replace(/^http:\/\//, 'https://'))
    if (!res.ok) return null
    return (await res.json()) as EspnCoreNamed
  } catch {
    return null
  }
}

/**
 * Top players per available league stat (goals, assists, shots, cards, saves, …).
 * Uses ESPN core leaders; `boards` hold top N, `rows` keep the #1 snapshot.
 */
export async function fetchLeaguePlayerStatsOverview(
  leagueId: LeagueId,
  limit = 5,
  seasonYear?: number,
): Promise<LeaguePlayerStatsOverview> {
  const league = getLeague(leagueId)
  const nowYear = new Date().getUTCFullYear()
  const yearsToTry =
    seasonYear != null ? [seasonYear] : [nowYear, nowYear - 1, nowYear - 2]
  const perCategoryCap = Math.max(1, Math.min(limit, 50))
  // Nations League shares one ESPN leaders feed — pull a deep pool then filter by division.
  const needsDivisionFilter = uefaNationsLeagueLetter(leagueId) != null
  const fetchLimit = needsDivisionFilter ? Math.max(200, limit) : Math.max(50, limit)

  let payload: EspnCoreLeadersResponse | null = null
  let season = seasonYear ?? nowYear
  let allowedTeams: Set<string> | null = null

  for (const year of yearsToTry) {
    const data = await fetchCoreLeadersForSeason(league.espnCode, year, fetchLimit)
    if (!data?.categories?.length) continue
    allowedTeams = await uefaNationsDivisionTeamIds(leagueId, year)
    payload = data
    season = year
    break
  }

  if (!payload?.categories?.length) {
    // Explicit season pick with no boards yet — return empty instead of failing the picker.
    if (seasonYear != null) {
      const labels = await fetchSeasonLabels(league.espnCode, seasonYear)
      return {
        leagueId,
        season: seasonYear,
        seasonLabel: `${labels.shortLabel} season`,
        rows: [],
        boards: [],
        fetchedAt: Date.now(),
      }
    }
    throw new Error(`No ${league.name} player stats available yet`)
  }

  const byName = new Map(
    payload.categories
      .filter((category) => category.name)
      .map((category) => [category.name as string, category]),
  )

  const selected = PLAYER_STAT_CATEGORY_ORDER.map((name) => byName.get(name)).filter(
    (category): category is NonNullable<typeof category> => Boolean(category?.leaders?.[0]),
  )

  const divisionLeaders = (
    category: NonNullable<(typeof selected)[number]>,
  ) => {
    const raw = category.leaders ?? []
    if (!allowedTeams) return raw
    return raw.filter((leader) => {
      const teamId = idFromCoreRef(leader.team?.$ref, 'teams')
      return Boolean(teamId && allowedTeams.has(teamId))
    })
  }

  const athleteRefs = new Map<string, string>()
  const teamRefs = new Map<string, string>()
  for (const category of selected) {
    for (const leader of divisionLeaders(category).slice(0, perCategoryCap)) {
      const athleteId = idFromCoreRef(leader.athlete?.$ref, 'athletes')
      const teamId = idFromCoreRef(leader.team?.$ref, 'teams')
      if (athleteId && leader.athlete?.$ref) athleteRefs.set(athleteId, leader.athlete.$ref)
      if (teamId && leader.team?.$ref) teamRefs.set(teamId, leader.team.$ref)
    }
  }

  const [athletes, teams] = await Promise.all([
    Promise.all(
      [...athleteRefs.entries()].map(async ([id, ref]) => [id, await fetchCoreNamed(ref)] as const),
    ),
    Promise.all(
      [...teamRefs.entries()].map(async ([id, ref]) => [id, await fetchCoreNamed(ref)] as const),
    ),
  ])
  const athleteById = new Map(athletes)
  const teamById = new Map(teams)

  const toEntry = (
    categoryName: string | undefined,
    leader: NonNullable<EspnCoreLeadersResponse['categories']>[number]['leaders'] extends
      | Array<infer L>
      | undefined
      ? L
      : never,
    rank: number,
  ): LeaderEntry => {
    const athleteId = idFromCoreRef(leader.athlete?.$ref, 'athletes') || `${categoryName}-${rank}`
    const teamId = idFromCoreRef(leader.team?.$ref, 'teams')
    const athlete = athleteId ? athleteById.get(athleteId) : null
    const team = teamId ? teamById.get(teamId) : null
    const name = athlete?.displayName || ''
    const value = typeof leader.value === 'number' ? leader.value : Number(leader.value) || 0
    return {
      rank,
      id: athleteId,
      name,
      shortName: athlete?.shortName || athlete?.shortDisplayName || name,
      jersey: athlete?.jersey,
      teamId: teamId || undefined,
      teamName: team?.displayName || team?.shortDisplayName || team?.abbreviation,
      value,
      displayValue: String(value),
    }
  }

  const boards: LeaguePlayerStatBoard[] = selected
    .map((category) => {
      const leaders = divisionLeaders(category)
        .slice(0, perCategoryCap)
        .map((leader, index) => toEntry(category.name, leader, index + 1))
      return {
        categoryId: category.name || 'stat',
        label: category.displayName || category.shortDisplayName || category.name || 'Stat',
        leaders,
      }
    })
    .filter((board) => board.leaders.length > 0)

  const rows: LeaguePlayerStatTop[] = boards
    .filter((board) => board.leaders[0])
    .map((board) => ({
      categoryId: board.categoryId,
      label: board.label,
      player: board.leaders[0]!,
    }))

  if (rows.length === 0) {
    if (seasonYear != null) {
      const labels = await fetchSeasonLabels(league.espnCode, seasonYear)
      return {
        leagueId,
        season: seasonYear,
        seasonLabel: `${labels.shortLabel} season`,
        rows: [],
        boards: [],
        fetchedAt: Date.now(),
      }
    }
    throw new Error(`No ${league.name} player stats available yet`)
  }

  const labels = await fetchSeasonLabels(league.espnCode, season)

  return {
    leagueId,
    season,
    seasonLabel: `${labels.shortLabel} season`,
    rows,
    boards,
    fetchedAt: Date.now(),
  }
}

/**
 * Top players on a club for each meaningful season stat.
 * Filters ESPN core league leaders down to the requested team.
 * Pass `seasonYear` to load a specific season; otherwise picks the newest with data.
 */
async function fetchTeamLeadersPayload(
  espnCode: string,
  year: number,
  teamId: string,
): Promise<EspnCoreLeadersResponse | null> {
  const typeIds = await listSeasonTypeIds(espnCode, year)
  const ordered = [...typeIds].sort((a, b) => {
    if (a === 1) return -1
    if (b === 1) return 1
    return a - b
  })

  for (const typeId of ordered) {
    const teamUrl = new URL(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${year}/types/${typeId}/teams/${encodeURIComponent(teamId)}/leaders`,
    )
    teamUrl.searchParams.set('limit', '50')
    try {
      const teamRes = await fetch(teamUrl)
      if (teamRes.ok) {
        const teamData = (await teamRes.json()) as EspnCoreLeadersResponse
        if (teamData.categories?.length) return teamData
      }
    } catch {
      // try league-wide leaders for this type
    }
  }

  return fetchCoreLeadersForSeason(espnCode, year, 1000)
}

type AggLeader = {
  athleteId: string
  athleteRef?: string
  value: number
  label: string
  categoryId: string
}

function mergeLeaderPayloads(
  payloads: Array<{ espnCode: string; payload: EspnCoreLeadersResponse }>,
  teamId: string,
): {
  mergedByCategory: Map<string, Map<string, AggLeader>>
  categoryLabels: Map<string, string>
} {
  const mergedByCategory = new Map<string, Map<string, AggLeader>>()
  const categoryLabels = new Map<string, string>()

  for (const { payload } of payloads) {
    for (const category of payload.categories ?? []) {
      const categoryId = category.name
      if (!categoryId || !(PLAYER_STAT_CATEGORY_ORDER as readonly string[]).includes(categoryId)) {
        continue
      }
      if (!categoryLabels.has(categoryId)) {
        categoryLabels.set(
          categoryId,
          category.displayName || category.shortDisplayName || categoryId,
        )
      }
      const byAthlete = mergedByCategory.get(categoryId) ?? new Map<string, AggLeader>()
      for (const leader of category.leaders ?? []) {
        const athleteId = idFromCoreRef(leader.athlete?.$ref, 'athletes')
        if (!athleteId) continue
        const leaderTeamId = idFromCoreRef(leader.team?.$ref, 'teams')
        if (leaderTeamId && leaderTeamId !== teamId) continue
        const value = typeof leader.value === 'number' ? leader.value : Number(leader.value) || 0
        if (value <= 0) continue
        const current = byAthlete.get(athleteId)
        if (current) {
          current.value += value
        } else {
          byAthlete.set(athleteId, {
            athleteId,
            athleteRef: leader.athlete?.$ref,
            value,
            label: categoryLabels.get(categoryId) || categoryId,
            categoryId,
          })
        }
      }
      mergedByCategory.set(categoryId, byAthlete)
    }
  }

  return { mergedByCategory, categoryLabels }
}

/**
 * Club/national player leaders for a season, summed across competitions.
 * Clubs: domestic + cups + continental (friendlies excluded).
 * Nationals: all international comps including friendlies, Aug 1 – Jul 31 window.
 */
export async function fetchTeamStatLeaders(
  leagueId: LeagueId,
  teamId: string,
  limit = 3,
  seasonYear?: number,
  espnCodeOverride?: string,
): Promise<TeamStatLeaders> {
  const league = getLeague(leagueId)
  const perCategoryCap = Math.max(1, Math.min(limit, 8))
  const isNational = league.kind === 'international'

  const yearsToTry =
    seasonYear != null
      ? [seasonYear]
      : isNational
        ? [
            inferInternationalSeasonStartYear(),
            inferInternationalSeasonStartYear() - 1,
            inferInternationalSeasonStartYear() - 2,
            inferInternationalSeasonStartYear() - 3,
          ]
        : [
            inferSoccerSeasonStartYear(),
            inferSoccerSeasonStartYear() - 1,
            inferSoccerSeasonStartYear() - 2,
            inferSoccerSeasonStartYear() - 3,
          ]

  let season = yearsToTry[0]!
  let seasonMeta: { label: string; shortLabel: string } | null = null
  let labelEspnCode = espnCodeOverride || league.espnCode
  let mergedByCategory = new Map<string, Map<string, AggLeader>>()
  let categoryLabels = new Map<string, string>()

  for (const year of yearsToTry) {
    let payloads: Array<{ espnCode: string; payload: EspnCoreLeadersResponse }> = []

    if (isNational) {
      const sources = await nationalTeamLeaderSources(teamId, year)
      if (sources.length === 0) continue
      payloads = await mapPool(sources, 4, async ({ espnCode, year: espnYear }) => {
        const payload = await fetchTeamLeadersPayload(espnCode, espnYear, teamId)
        return payload ? { espnCode, payload } : null
      })
      labelEspnCode = sources[0]?.espnCode || labelEspnCode
    } else {
      const codes = competitiveEspnCodesForClub(leagueId, espnCodeOverride || league.espnCode)
      payloads = await mapPool(codes, 4, async (espnCode) => {
        const payload = await fetchTeamLeadersPayload(espnCode, year, teamId)
        return payload ? { espnCode, payload } : null
      })
    }

    if (payloads.length === 0) continue

    const merged = mergeLeaderPayloads(payloads, teamId)
    const hasLeaders = [...merged.mergedByCategory.values()].some((map) => map.size > 0)
    if (!hasLeaders) continue

    season = year
    mergedByCategory = merged.mergedByCategory
    categoryLabels = merged.categoryLabels
    seasonMeta = isNational
      ? {
          label: 'All competitions',
          shortLabel: formatSeasonShortLabel(year, `${year}-${String(year + 1).slice(2)}`),
        }
      : await fetchSeasonLabels(labelEspnCode, year)
    break
  }

  if (!seasonMeta) {
    seasonMeta = isNational
      ? {
          label: 'All competitions',
          shortLabel: formatSeasonShortLabel(season, `${season}-${String(season + 1).slice(2)}`),
        }
      : await fetchSeasonLabels(labelEspnCode, season)
  }

  const orderedCategoryIds = PLAYER_STAT_CATEGORY_ORDER.filter((id) => {
    const map = mergedByCategory.get(id)
    return Boolean(map && [...map.values()].some((row) => row.value > 0))
  })

  if (orderedCategoryIds.length === 0) {
    throw new Error(
      seasonYear != null
        ? `No player stats for that season`
        : isNational
          ? `No player stats available for this national team yet`
          : `No player stats available for this club yet`,
    )
  }

  const athleteRefs = new Map<string, string>()
  for (const categoryId of orderedCategoryIds) {
    const leaders = [...(mergedByCategory.get(categoryId)?.values() ?? [])]
      .sort((a, b) => b.value - a.value)
      .slice(0, perCategoryCap)
    for (const leader of leaders) {
      if (leader.athleteRef) athleteRefs.set(leader.athleteId, leader.athleteRef)
    }
  }

  const athletes = await Promise.all(
    [...athleteRefs.entries()].map(async ([id, ref]) => [id, await fetchCoreNamed(ref)] as const),
  )
  const athleteById = new Map(athletes)

  const categories: LeaderCategory[] = orderedCategoryIds.map((categoryId) => {
    const leaders = [...(mergedByCategory.get(categoryId)?.values() ?? [])]
      .sort((a, b) => b.value - a.value)
      .slice(0, perCategoryCap)
    return {
      id: categoryId,
      label: categoryLabels.get(categoryId) || categoryId,
      kind: 'player' as const,
      leaders: leaders.map((leader, index) => {
        const athlete = athleteById.get(leader.athleteId)
        const name = athlete?.displayName || ''
        const value = Math.round(leader.value * 10) / 10
        return {
          rank: index + 1,
          id: leader.athleteId,
          name,
          shortName: athlete?.shortName || athlete?.shortDisplayName || name,
          jersey: athlete?.jersey,
          teamId,
          value,
          displayValue: Number.isInteger(value) ? String(value) : value.toFixed(1),
        }
      }),
    }
  })

  return {
    leagueId,
    teamId,
    season,
    seasonLabel: 'All competitions',
    seasonShortLabel: seasonMeta.shortLabel,
    categories,
    fetchedAt: Date.now(),
  }
}

type EspnSeasonList = {
  count?: number
  pageCount?: number
  items?: Array<{ $ref?: string }>
}

type EspnSeasonDetail = {
  year?: number
  displayName?: string
  abbreviation?: string
  startDate?: string
  endDate?: string
}

const leaderSeasonsCache = new Map<string, LeagueSeasonOption[]>()
const allSeasonsCache = new Map<string, LeagueSeasonOption[]>()
const teamSeasonOptionsCache = new Map<string, LeagueSeasonOption[]>()
const standingNoteCache = new Map<string, string | null>()
const seasonLabelsCache = new Map<string, { label: string; shortLabel: string }>()
const seasonPlayMidCache = new Map<string, Date | null>()

function isCrossYearSeasonAbbr(abbr: string): boolean {
  return /^(\d{4})[-/](\d{2,4})$/.test(abbr.trim())
}

function isBareYearSeasonAbbr(abbr: string): boolean {
  return /^\d{4}$/.test(abbr.trim())
}

/** ESPN often pads internationals as Jan 1–Dec 31; those dates are not real play windows. */
function isCalendarYearPadding(startIso?: string, endIso?: string): boolean {
  if (!startIso || !endIso) return true
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true
  const startJan = start.getUTCMonth() === 0 && start.getUTCDate() <= 2
  const endDec = end.getUTCMonth() === 11 && end.getUTCDate() >= 29
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  return startJan && endDec && sameYear
}

/**
 * Midpoint of real matches in an ESPN season edition (for Aug–Jul labeling).
 * Prefers site scoreboard date windows so we do not hydrate every core event ref.
 */
async function sampleSeasonPlayMidDate(
  espnCode: string,
  year: number,
): Promise<Date | null> {
  const cacheKey = `${espnCode}:${year}`
  if (seasonPlayMidCache.has(cacheKey)) return seasonPlayMidCache.get(cacheKey) ?? null

  const windows = [
    `${year}0601-${year}0731`,
    `${year}1101-${year}1231`,
    `${year}0101-${year}0531`,
    `${year}0801-${year}1031`,
    // Delayed winter tournaments (e.g. AFCON “2023” played Jan 2024).
    `${year + 1}0101-${year + 1}0531`,
    `${year + 1}0601-${year + 1}0731`,
  ]

  const dates: string[] = []
  for (const range of windows) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(espnCode)}/scoreboard?dates=${range}&limit=50`,
      )
      if (!res.ok) continue
      const data = (await res.json()) as { events?: Array<{ date?: string }> }
      for (const event of data.events ?? []) {
        if (event.date) dates.push(event.date)
      }
      if (dates.length >= 2) break
    } catch {
      // try next window
    }
  }

  if (dates.length === 0) {
    // Fallback: hydrate a few core event refs from the first/last season types.
    try {
      const typeIds = await listSeasonTypeIds(espnCode, year)
      const sampleTypeIds = [...new Set([typeIds[0], typeIds[typeIds.length - 1]].filter(Boolean))]
      for (const typeId of sampleTypeIds) {
        const listRes = await fetch(
          `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${year}/types/${typeId}/events?limit=3`,
        )
        if (!listRes.ok) continue
        const list = (await listRes.json()) as {
          items?: Array<{ $ref?: string }>
          pageCount?: number
        }
        const refs = [...(list.items ?? [])]
        if ((list.pageCount ?? 1) > 1) {
          const lastPage = await fetch(
            `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${year}/types/${typeId}/events?limit=3&page=${list.pageCount}`,
          )
          if (lastPage.ok) {
            const last = (await lastPage.json()) as { items?: Array<{ $ref?: string }> }
            refs.push(...(last.items ?? []))
          }
        }
        for (const item of refs.slice(0, 4)) {
          if (!item.$ref) continue
          const evRes = await fetch(item.$ref.replace(/^http:\/\//i, 'https://'))
          if (!evRes.ok) continue
          const ev = (await evRes.json()) as { date?: string }
          if (ev.date) dates.push(ev.date)
        }
      }
    } catch {
      // ignore
    }
  }

  if (dates.length === 0) {
    seasonPlayMidCache.set(cacheKey, null)
    return null
  }

  dates.sort()
  const first = Date.parse(dates[0])
  const last = Date.parse(dates[dates.length - 1])
  const mid = new Date((first + last) / 2)
  seasonPlayMidCache.set(cacheKey, mid)
  return mid
}

/** Compact season chip: Aug–Jul label (never a bare calendar year). */
export function formatSeasonShortLabel(year: number, abbreviation?: string): string {
  const abbr = (abbreviation || '').trim()
  const cross = abbr.match(/^(\d{4})[-/](\d{2,4})$/)
  if (cross) {
    const start = Number(cross[1])
    return soccerSeasonShortLabel(Number.isFinite(start) ? start : year)
  }
  // Short `YY/YY` abbreviations lose the century — prefer the known start year.
  if (/^\d{2}\/\d{2}$/.test(abbr) && Number.isFinite(year) && year > 0) {
    return soccerSeasonShortLabel(year)
  }
  const fullStart = abbr.match(/^(\d{4})\/\d{2}$/)
  if (fullStart) return soccerSeasonShortLabel(Number(fullStart[1]))
  // Bare edition year (Copa América “2024”, Euro “2024”) is a calendar year, not an
  // Aug-start year. Summer midpoint is a sync fallback; prefer fetchSeasonLabels.
  if (isBareYearSeasonAbbr(abbr)) {
    const edition = Number(abbr)
    return soccerSeasonShortLabel(
      inferSoccerSeasonStartYear(new Date(edition, 5, 15)),
    )
  }
  return soccerSeasonShortLabel(year)
}

/**
 * Display labels for an ESPN season edition.
 * Keeps API `year` as-is for fetches; shortLabel follows Aug 1–Jul 31 from real play dates
 * so summer internationals (Copa América 2024 → 23/24) are labeled correctly.
 */
async function fetchSeasonLabels(
  espnCode: string,
  year: number,
): Promise<{ label: string; shortLabel: string }> {
  const cacheKey = `${espnCode}:${year}`
  const cached = seasonLabelsCache.get(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${year}`,
    )
    if (res.ok) {
      const detail = (await res.json()) as EspnSeasonDetail
      const abbr = (detail.abbreviation || '').trim()
      const label =
        detail.displayName || detail.abbreviation || `${soccerSeasonShortLabel(year)} season`

      // Club-style cross-year abbreviations already encode the Aug start year.
      if (isCrossYearSeasonAbbr(abbr) || /^\d{2}\/\d{2}$/.test(abbr) || /^\d{4}\/\d{2}$/.test(abbr)) {
        const result = {
          label,
          shortLabel: formatSeasonShortLabel(year, abbr),
        }
        seasonLabelsCache.set(cacheKey, result)
        return result
      }

      let playDate: Date | null = null
      if (
        detail.startDate &&
        detail.endDate &&
        !isCalendarYearPadding(detail.startDate, detail.endDate)
      ) {
        const startMs = Date.parse(detail.startDate)
        const endMs = Date.parse(detail.endDate)
        if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
          playDate = new Date((startMs + endMs) / 2)
        }
      }
      if (!playDate) {
        playDate = await sampleSeasonPlayMidDate(espnCode, year)
      }

      if (playDate) {
        const result = {
          label,
          shortLabel: soccerSeasonShortLabel(inferSoccerSeasonStartYear(playDate)),
        }
        seasonLabelsCache.set(cacheKey, result)
        return result
      }

      const result = {
        label,
        shortLabel: formatSeasonShortLabel(year, abbr || undefined),
      }
      seasonLabelsCache.set(cacheKey, result)
      return result
    }
  } catch {
    // fall through
  }

  const shortLabel = soccerSeasonShortLabel(year)
  const fallback = { label: `${shortLabel} season`, shortLabel }
  seasonLabelsCache.set(cacheKey, fallback)
  return fallback
}

async function listLeagueSeasonYears(espnCode: string): Promise<number[]> {
  const years: number[] = []
  let page = 1
  let pageCount = 1
  while (page <= pageCount && page <= 4) {
    const url = new URL(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${espnCode}/seasons`,
    )
    url.searchParams.set('limit', '50')
    url.searchParams.set('page', String(page))
    const res = await fetch(url)
    if (!res.ok) break
    const data = (await res.json()) as EspnSeasonList
    pageCount = Math.max(1, data.pageCount ?? 1)
    for (const item of data.items ?? []) {
      const match = item.$ref?.match(/\/seasons\/(\d+)/)
      if (match?.[1]) years.push(Number(match[1]))
    }
    page += 1
  }
  return [...new Set(years)].sort((a, b) => b - a)
}

/** ESPN season edition years for a competition (newest first). */
export async function fetchLeagueEditionYears(leagueId: LeagueId): Promise<number[]> {
  return listLeagueSeasonYears(getLeague(leagueId).espnCode)
}

/**
 * Scoreboard date window for an ESPN season edition (from season types when
 * available). Falls back to Aug–Jul for that year.
 */
export async function fetchEspnSeasonScoreboardWindow(
  espnCode: string,
  seasonYear: number,
): Promise<{ from: string; to: string }> {
  try {
    const res = await fetch(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${seasonYear}/types`,
    )
    if (res.ok) {
      const list = (await res.json()) as { items?: Array<{ $ref?: string }> }
      const dates: string[] = []
      await Promise.all(
        (list.items ?? []).map(async (item) => {
          if (!item.$ref) return
          try {
            const typeRes = await fetch(item.$ref.replace(/^http:\/\//i, 'https://'))
            if (!typeRes.ok) return
            const type = (await typeRes.json()) as { startDate?: string; endDate?: string }
            if (type.startDate) dates.push(type.startDate)
            if (type.endDate) dates.push(type.endDate)
          } catch {
            // skip
          }
        }),
      )
      if (dates.length > 0) {
        dates.sort()
        const ymd = (iso: string) => {
          const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
          return m ? `${m[1]}${m[2]}${m[3]}` : null
        }
        const from = ymd(dates[0]!)
        const to = ymd(dates[dates.length - 1]!)
        if (from && to) return { from, to }
      }
    }
  } catch {
    // fall through
  }
  return {
    from: `${seasonYear}0801`,
    to: `${seasonYear + 1}0731`,
  }
}

const seasonTypeIdsCache = new Map<string, number[]>()

/** ESPN season type ids (cups often put leaders on type 2+, not only type 1). */
async function listSeasonTypeIds(espnCode: string, year: number): Promise<number[]> {
  const key = `${espnCode}:${year}`
  const cached = seasonTypeIdsCache.get(key)
  if (cached) return cached

  try {
    const res = await fetch(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${year}/types`,
    )
    if (!res.ok) {
      seasonTypeIdsCache.set(key, [1])
      return [1]
    }
    const data = (await res.json()) as {
      items?: Array<{ $ref?: string }>
      count?: number
    }
    const ids: number[] = []
    for (const item of data.items ?? []) {
      const match = item.$ref?.match(/\/types\/(\d+)/)
      if (match) ids.push(Number(match[1]))
    }
    if (ids.length === 0 && typeof data.count === 'number' && data.count > 0) {
      for (let i = 1; i <= data.count; i += 1) ids.push(i)
    }
    const ordered = (ids.length > 0 ? ids : [1]).sort((a, b) => a - b)
    seasonTypeIdsCache.set(key, ordered)
    return ordered
  } catch {
    seasonTypeIdsCache.set(key, [1])
    return [1]
  }
}

/**
 * Load core leaders for a season, trying every season type.
 * Domestic cups (e.g. Carabao) often publish leaders on type 2+ while type 1 404s.
 */
async function fetchCoreLeadersForSeason(
  espnCode: string,
  year: number,
  limit: number,
): Promise<EspnCoreLeadersResponse | null> {
  const typeIds = await listSeasonTypeIds(espnCode, year)
  // Prefer type 1 when present, then the rest in order.
  const ordered = [...typeIds].sort((a, b) => {
    if (a === 1) return -1
    if (b === 1) return 1
    return a - b
  })

  for (const typeId of ordered) {
    try {
      const url = new URL(
        `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${year}/types/${typeId}/leaders`,
      )
      url.searchParams.set('limit', String(limit))
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as EspnCoreLeadersResponse
      if (data.categories?.length) return data
    } catch {
      // try next type
    }
  }
  return null
}

async function seasonHasLeaders(espnCode: string, year: number): Promise<boolean> {
  const data = await fetchCoreLeadersForSeason(espnCode, year, 1)
  return Boolean(data?.categories?.length)
}

/** All ESPN seasons for a league (newest first), with display labels. */
export async function fetchLeagueSeasons(leagueId: LeagueId): Promise<LeagueSeasonOption[]> {
  const cached = allSeasonsCache.get(leagueId)
  if (cached) return cached

  const league = getLeague(leagueId)
  const years = await listLeagueSeasonYears(league.espnCode)
  // Only real ESPN editions — do not invent empty future years.
  const options = await Promise.all(
    years.map(async (year) => {
      const labels = await fetchSeasonLabels(league.espnCode, year)
      return {
        year,
        label: labels.label,
        shortLabel: labels.shortLabel,
      } satisfies LeagueSeasonOption
    }),
  )
  const sorted = options.sort((a, b) => b.year - a.year)
  allSeasonsCache.set(leagueId, sorted)
  return sorted
}

/**
 * ESPN seasons for a league table picker (newest / current / upcoming first).
 * Chronological descending so the default selection is the current or upcoming season.
 */
export async function fetchLeagueStandingSeasons(
  leagueId: LeagueId,
): Promise<LeagueSeasonOption[]> {
  const cacheKey = `standings:${leagueId}`
  const cached = allSeasonsCache.get(cacheKey)
  if (cached) return cached

  const league = getLeague(leagueId)
  if (!league.hasStandings) return []

  const options = await fetchLeagueSeasons(leagueId)
  allSeasonsCache.set(cacheKey, options)
  return options
}

/**
 * Seasons for a league that have ESPN leaderboard data (newest first).
 * Used by Stat Leaders / Player stats season pickers.
 * Always includes the current and previous two seasons so cups whose leaders
 * live on a non-1 type (or are not published yet) still appear in the picker.
 */
export async function fetchLeagueLeaderSeasons(
  leagueId: LeagueId,
): Promise<LeagueSeasonOption[]> {
  const cached = leaderSeasonsCache.get(leagueId)
  if (cached) return cached

  const league = getLeague(leagueId)
  const years = await listLeagueSeasonYears(league.espnCode)
  if (years.length === 0) return []

  const withData: number[] = []
  const concurrency = 8
  for (let i = 0; i < years.length; i += concurrency) {
    const chunk = years.slice(i, i + concurrency)
    const checks = await Promise.all(
      chunk.map(async (year) => ((await seasonHasLeaders(league.espnCode, year)) ? year : null)),
    )
    for (const year of checks) {
      if (year != null) withData.push(year)
    }
  }

  const current = inferSoccerSeasonStartYear()
  const ensured = new Set<number>(withData)
  // Keep recent real ESPN years; only add current when ESPN already lists it.
  if (years.includes(current)) ensured.add(current)
  for (const year of years) {
    if (year >= current - 2) ensured.add(year)
  }

  const optionYears = [...ensured].sort((a, b) => b - a)

  const options = await Promise.all(
    optionYears.map(async (year) => {
      const labels = await fetchSeasonLabels(league.espnCode, year)
      return {
        year,
        label: labels.label,
        shortLabel: labels.shortLabel,
      } satisfies LeagueSeasonOption
    }),
  )

  leaderSeasonsCache.set(leagueId, options)
  return options
}

type EspnAthletePayload = {
  athlete?: {
    id?: string
    displayName?: string
    shortName?: string
    fullName?: string
    jersey?: string
    age?: number
    displayHeight?: string
    displayWeight?: string
    displayDOB?: string
    citizenship?: string
    displayBirthPlace?: string
    citizenshipCountry?: { abbreviation?: string }
    flag?: { href?: string; alt?: string }
    headshot?: { href?: string }
    position?: { displayName?: string; abbreviation?: string }
    team?: {
      id?: string
      displayName?: string
      shortDisplayName?: string
      slug?: string
      logos?: Array<{ href?: string }>
    }
    statsSummary?: {
      displayName?: string
      statistics?: Array<{
        name?: string
        displayName?: string
        displayValue?: string
      }>
    }
  }
}

type EspnBioPayload = {
  teamHistory?: Array<{
    id?: string
    displayName?: string
    logo?: string
    slug?: string
    seasons?: string
    isActive?: boolean
  }>
}

type EspnOverviewPayload = {
  statistics?: {
    displayNames?: string[]
    names?: string[]
    splits?: Array<{
      displayName?: string
      leagueSlug?: string
      stats?: string[]
    }>
  }
  gameLog?: {
    statistics?: Array<{
      names?: string[]
      events?: Array<{ eventId?: string; stats?: string[] }>
    }>
  }
}

type EspnAthleteStatsPayload = {
  filters?: Array<{
    name?: string
    value?: string
    options?: Array<{ value?: string; displayValue?: string }>
  }>
  leagues?: Record<
    string,
    {
      name?: string
      displayName?: string
      shortName?: string
      abbreviation?: string
    }
  >
  categories?: Array<{
    names?: string[]
    displayNames?: string[]
    statistics?: Array<{
      leagueSlug?: string
      stats?: string[]
      season?: {
        year?: number
        displayName?: string
        shortDisplayName?: string
        type?: { name?: string; slug?: string; id?: string }
      }
    }>
  }>
}

type EspnAthleteGameLogPayload = {
  names?: string[]
  seasonTypes?: Array<{
    categories?: Array<{
      events?: Array<{ eventId?: string; stats?: string[] }>
    }>
  }>
}

/** Season stats grid order (left→right, top→bottom). */
const SEASON_STAT_ORDER: Array<{ key: string; label: string }> = [
  { key: 'appearances', label: 'Appearances' },
  { key: 'starts', label: 'Starts' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'totalGoals', label: 'Goals' },
  { key: 'goalAssists', label: 'Assists' },
  { key: 'totalShots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on goal' },
  { key: 'saves', label: 'Saves' },
  { key: 'goalsConceded', label: 'Goals conceded' },
  { key: 'foulsCommitted', label: 'Fouls committed' },
  { key: 'foulsSuffered', label: 'Fouls suffered' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' },
]

/** Stats we intentionally omit from the season grid (and from leftover extras). */
const SEASON_STAT_HIDDEN = new Set(['offsides', 'OF'])

/** Map ESPN overview keys + athlete stats abbreviations onto our order keys. */
const SEASON_STAT_ALIASES: Record<string, string> = {
  totalGoals: 'totalGoals',
  G: 'totalGoals',
  goalAssists: 'goalAssists',
  A: 'goalAssists',
  starts: 'starts',
  STRT: 'starts',
  appearances: 'appearances',
  APP: 'appearances',
  gamesPlayed: 'appearances',
  minutes: 'minutes',
  MIN: 'minutes',
  playingTime: 'minutes',
  offsides: 'offsides',
  OF: 'offsides',
  totalShots: 'totalShots',
  SHOT: 'totalShots',
  shotsOnTarget: 'shotsOnTarget',
  SOG: 'shotsOnTarget',
  foulsCommitted: 'foulsCommitted',
  FC: 'foulsCommitted',
  foulsSuffered: 'foulsSuffered',
  FA: 'foulsSuffered',
  yellowCards: 'yellowCards',
  YC: 'yellowCards',
  redCards: 'redCards',
  RC: 'redCards',
  saves: 'saves',
  SV: 'saves',
  goalsConceded: 'goalsConceded',
  GC: 'goalsConceded',
}

function buildOrderedSeasonStatsFromArrays(
  names: string[],
  labels: string[],
  values: string[],
): PlayerSeasonStatLine[] {
  if (names.length === 0 || values.length === 0) return []

  const byKey = new Map<string, string>()
  names.forEach((name, index) => {
    if (!name) return
    const key = SEASON_STAT_ALIASES[name] || name
    if (SEASON_STAT_HIDDEN.has(name) || SEASON_STAT_HIDDEN.has(key)) return
    byKey.set(key, values[index] || '0')
  })

  const ordered: PlayerSeasonStatLine[] = []
  const used = new Set<string>()

  for (const { key, label } of SEASON_STAT_ORDER) {
    if (!byKey.has(key)) continue
    ordered.push({ label, value: byKey.get(key) || '0' })
    used.add(key)
  }

  names.forEach((name, index) => {
    if (!name) return
    const key = SEASON_STAT_ALIASES[name] || name
    if (SEASON_STAT_HIDDEN.has(name) || SEASON_STAT_HIDDEN.has(key)) return
    if (used.has(key)) return
    used.add(key)
    ordered.push({ label: labels[index] || name, value: values[index] || '0' })
  })

  return ordered
}

function parseSeasonStatNumber(raw: string | undefined): number {
  if (raw == null || raw === '') return 0
  const n = Number(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Sum numeric season-stat columns across competitions (aligned by alias key). */
function sumSeasonStatParts(
  parts: Array<{ names: string[]; labels: string[]; values: string[] }>,
): PlayerSeasonStatLine[] {
  const totals = new Map<string, number>()
  const labelByKey = new Map<string, string>()

  for (const part of parts) {
    part.names.forEach((name, index) => {
      if (!name) return
      const key = SEASON_STAT_ALIASES[name] || name
      if (SEASON_STAT_HIDDEN.has(name) || SEASON_STAT_HIDDEN.has(key)) return
      if (!labelByKey.has(key)) labelByKey.set(key, part.labels[index] || name)
      totals.set(key, (totals.get(key) || 0) + parseSeasonStatNumber(part.values[index]))
    })
  }

  if (totals.size === 0) return []

  const ordered: PlayerSeasonStatLine[] = []
  const used = new Set<string>()
  for (const { key, label } of SEASON_STAT_ORDER) {
    if (!totals.has(key)) continue
    const value = totals.get(key) || 0
    ordered.push({
      label,
      value: Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10),
    })
    used.add(key)
  }
  for (const [key, value] of totals) {
    if (used.has(key)) continue
    ordered.push({
      label: labelByKey.get(key) || key,
      value: Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10),
    })
  }
  return ordered
}

function buildOrderedSeasonStatsFromOverview(
  overview: EspnOverviewPayload,
  leagueSlug: string,
): PlayerSeasonStatLine[] {
  const names = overview.statistics?.names ?? []
  const labels = overview.statistics?.displayNames ?? []
  const splits = overview.statistics?.splits ?? []
  const preferred = splits.find((split) => split.leagueSlug === leagueSlug) || null
  // Exact league only — never fall back to a similarly named competition.
  if (!preferred?.stats?.length) return []
  return buildOrderedSeasonStatsFromArrays(names, labels, preferred.stats)
}

function buildOrderedSeasonStatsFromAthleteStats(
  payload: EspnAthleteStatsPayload,
  leagueSlug: string,
  appearances?: number | null,
  preferredYear?: number | null,
): { stats: PlayerSeasonStatLine[]; seasonLabel: string | null; seasonYear: number | null } {
  const category = payload.categories?.[0]
  const names = [...(category?.names ?? [])]
  const labels = [...(category?.displayNames ?? [])]
  const rows = category?.statistics ?? []
  const candidates = rows.filter((item) => item.leagueSlug === leagueSlug)

  const row =
    (preferredYear != null
      ? candidates.find((item) => item.season?.year === preferredYear)
      : null) ||
    candidates[0] ||
    null
  if (!row?.stats?.length || names.length === 0) {
    return { stats: [], seasonLabel: null, seasonYear: null }
  }

  const values = [...row.stats]
  if (
    appearances != null &&
    Number.isFinite(appearances) &&
    !names.some((name) => SEASON_STAT_ALIASES[name] === 'appearances' || name === 'appearances')
  ) {
    names.push('appearances')
    labels.push('Appearances')
    values.push(String(Math.round(appearances)))
  }

  return {
    stats: buildOrderedSeasonStatsFromArrays(names, labels, values),
    seasonLabel: row.season?.type?.name || (row.season?.year ? String(row.season.year) : null),
    seasonYear: typeof row.season?.year === 'number' ? row.season.year : null,
  }
}

async function fetchCoreSeasonAppearances(
  leagueSlug: string,
  seasonYear: number,
  playerId: string,
): Promise<number | null> {
  const url = `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(leagueSlug)}/seasons/${seasonYear}/types/1/athletes/${encodeURIComponent(playerId)}/statistics`
  const res = await fetch(url)
  if (!res.ok) return null
  const payload = (await res.json()) as EspnCoreStatSplit
  const categories = payload.splits?.categories
  if (!categories?.length) return null
  const value = readCoreStatValue(categories, 'appearances')
  return Number.isFinite(value) ? value : null
}

async function fetchAthleteStatsPayload(
  playerId: string,
  opts: { teamId?: string; leagueSlug?: string },
): Promise<EspnAthleteStatsPayload | null> {
  const url = new URL(
    `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${encodeURIComponent(playerId)}/stats`,
  )
  if (opts.teamId) url.searchParams.set('team', opts.teamId)
  if (opts.leagueSlug) url.searchParams.set('league', opts.leagueSlug)
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as EspnAthleteStatsPayload
  } catch {
    return null
  }
}

function seasonRowForYear(
  payload: EspnAthleteStatsPayload,
  year: number,
  leagueSlug?: string,
): { names: string[]; labels: string[]; values: string[]; leagueSlug?: string } | null {
  const category = payload.categories?.[0]
  const names = category?.names ?? []
  const labels = category?.displayNames ?? []
  const rows = category?.statistics ?? []
  const row =
    rows.find(
      (item) =>
        item.season?.year === year &&
        (!leagueSlug || item.leagueSlug === leagueSlug),
    ) || null
  if (!row?.stats?.length || names.length === 0) return null
  return {
    names: [...names],
    labels: [...labels],
    values: [...row.stats],
    leagueSlug: row.leagueSlug,
  }
}

async function sumAppearancesAcrossCodes(
  playerId: string,
  year: number,
  espnCodes: string[],
): Promise<number | null> {
  const apps = await mapPool(espnCodes, 4, async (code) =>
    fetchCoreSeasonAppearances(code, year, playerId),
  )
  const total = apps.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  return total > 0 ? total : null
}

/**
 * Club season totals across every competitive competition for a team stint
 * (league + cups + continental). Friendlies are skipped.
 */
async function fetchAthleteAllCompetitionsSeasonStats(
  playerId: string,
  teamId: string,
  preferredYear?: number,
  primaryEspnCode?: string,
): Promise<{
  stats: PlayerSeasonStatLine[]
  seasonLabel: string | null
  seasonYear: number | null
  previousStats: PlayerSeasonStatLine[]
  previousSeasonLabel: string | null
  availableYears: number[]
}> {
  const seed = await fetchAthleteStatsPayload(playerId, { teamId })
  if (!seed) {
    return {
      stats: [],
      seasonLabel: null,
      seasonYear: null,
      previousStats: [],
      previousSeasonLabel: null,
      availableYears: [],
    }
  }

  const leagueFilter = seed.filters?.find((filter) => filter.name === 'league')
  const filterCodes = (leagueFilter?.options ?? [])
    .map((option) => option.value)
    .filter((value): value is string => Boolean(value && isCompetitiveEspnCode(value)))

  const codes = [
    ...new Set([
      ...(primaryEspnCode ? [primaryEspnCode] : []),
      ...filterCodes,
      ...((seed.categories?.[0]?.statistics ?? [])
        .map((row) => row.leagueSlug)
        .filter((slug): slug is string => Boolean(slug && isCompetitiveEspnCode(slug)))),
    ]),
  ]

  const availableYears = [
    ...new Set(
      (seed.categories?.[0]?.statistics ?? [])
        .filter((row) => row.leagueSlug && isCompetitiveEspnCode(row.leagueSlug))
        .map((row) => row.season?.year)
        .filter((year): year is number => typeof year === 'number'),
    ),
  ].sort((a, b) => b - a)

  // Also collect years from each competition feed (seed may only include one slug).
  const perCodeYears = await mapPool(codes, 4, async (espnCode) => {
    const payload = await fetchAthleteStatsPayload(playerId, { teamId, leagueSlug: espnCode })
    if (!payload) return [] as number[]
    return (payload.categories?.[0]?.statistics ?? [])
      .map((row) => row.season?.year)
      .filter((year): year is number => typeof year === 'number')
  })
  const years = [...new Set([...availableYears, ...perCodeYears.flat()])].sort((a, b) => b - a)
  const seasonYear =
    (preferredYear != null && years.includes(preferredYear) ? preferredYear : null) ??
    years[0] ??
    null

  if (seasonYear == null || codes.length === 0) {
    return {
      stats: [],
      seasonLabel: null,
      seasonYear: null,
      previousStats: [],
      previousSeasonLabel: null,
      availableYears: years,
    }
  }

  const buildForYear = async (year: number) => {
    const parts = (
      await mapPool(codes, 4, async (espnCode) => {
        const payload = await fetchAthleteStatsPayload(playerId, { teamId, leagueSlug: espnCode })
        if (!payload) return null
        return seasonRowForYear(payload, year, espnCode)
      })
    ).filter((part): part is NonNullable<typeof part> => part != null)

    // Strip appearances from per-comp rows — core apps are summed once below.
    const summed = sumSeasonStatParts(
      parts.map((part) => {
        const keep = part.names.map((name, index) => ({ name, index })).filter(({ name }) => {
          const key = SEASON_STAT_ALIASES[name] || name
          return key !== 'appearances'
        })
        return {
          names: keep.map(({ name }) => name),
          labels: keep.map(({ index }) => part.labels[index] || part.names[index]),
          values: keep.map(({ index }) => part.values[index] || '0'),
        }
      }),
    )

    const apps = await sumAppearancesAcrossCodes(playerId, year, codes)
    if (apps != null && apps > 0) {
      const appearanceLine = { label: 'Appearances', value: String(Math.round(apps)) }
      const startsIdx = summed.findIndex((line) => /start/i.test(line.label))
      if (startsIdx >= 0) summed.splice(startsIdx, 0, appearanceLine)
      else summed.unshift(appearanceLine)
    }
    return summed
  }

  const stats = await buildForYear(seasonYear)
  const labels = primaryEspnCode
    ? await fetchSeasonLabels(primaryEspnCode, seasonYear)
    : { label: `${formatSeasonShortLabel(seasonYear)} season`, shortLabel: formatSeasonShortLabel(seasonYear) }

  let previousStats: PlayerSeasonStatLine[] = []
  let previousSeasonLabel: string | null = null
  const prevYear = seasonYear - 1
  if (years.includes(prevYear) || years.length > 0) {
    previousStats = await buildForYear(prevYear)
    if (previousStats.length > 0) {
      const prevLabels = primaryEspnCode
        ? await fetchSeasonLabels(primaryEspnCode, prevYear)
        : { shortLabel: formatSeasonShortLabel(prevYear) }
      previousSeasonLabel = `${prevLabels.shortLabel} · All competitions`
    }
  }

  return {
    stats,
    seasonLabel: `${labels.shortLabel} · All competitions`,
    seasonYear,
    previousStats,
    previousSeasonLabel,
    availableYears: years,
  }
}

async function fetchAthleteLeagueSeasonStats(
  playerId: string,
  leagueSlug: string,
  preferredYear?: number,
  teamId?: string,
): Promise<{
  stats: PlayerSeasonStatLine[]
  seasonLabel: string | null
  seasonYear: number | null
  previousStats: PlayerSeasonStatLine[]
  previousSeasonLabel: string | null
  availableYears: number[]
}> {
  // Club seasons default to all competitions for that team stint.
  if (teamId) {
    return fetchAthleteAllCompetitionsSeasonStats(
      playerId,
      teamId,
      preferredYear,
      leagueSlug,
    )
  }

  const payload = await fetchAthleteStatsPayload(playerId, { leagueSlug })
  if (!payload) {
    return {
      stats: [],
      seasonLabel: null,
      seasonYear: null,
      previousStats: [],
      previousSeasonLabel: null,
      availableYears: [],
    }
  }
  const category = payload.categories?.[0]
  const rows = category?.statistics ?? []
  const availableYears = [
    ...new Set(
      rows
        .filter((item) => item.leagueSlug === leagueSlug)
        .map((item) => item.season?.year)
        .filter((year): year is number => typeof year === 'number'),
    ),
  ].sort((a, b) => b - a)

  const preview = buildOrderedSeasonStatsFromAthleteStats(
    payload,
    leagueSlug,
    null,
    preferredYear,
  )
  let appearances: number | null = null
  if (preview.seasonYear != null) {
    appearances = await fetchCoreSeasonAppearances(leagueSlug, preview.seasonYear, playerId)
  }

  const full = buildOrderedSeasonStatsFromAthleteStats(
    payload,
    leagueSlug,
    appearances,
    preferredYear,
  )

  let previousStats: PlayerSeasonStatLine[] = []
  let previousSeasonLabel: string | null = null
  if (full.seasonYear != null) {
    const prevYear = full.seasonYear - 1
    const prevApps = await fetchCoreSeasonAppearances(leagueSlug, prevYear, playerId)
    const previous = buildOrderedSeasonStatsFromAthleteStats(
      payload,
      leagueSlug,
      prevApps,
      prevYear,
    )
    if (previous.stats.length > 0 && previous.seasonYear === prevYear) {
      previousStats = previous.stats
      previousSeasonLabel = previous.seasonLabel || String(prevYear)
    }
  }

  return {
    stats: full.stats,
    seasonLabel: full.seasonLabel,
    seasonYear: full.seasonYear,
    previousStats,
    previousSeasonLabel,
    availableYears,
  }
}

function isDomesticTableEspnCode(espnCode: string): boolean {
  const league = LEAGUES.find((item) => item.espnCode === espnCode)
  return Boolean(league && league.kind === 'domestic' && league.format === 'league')
}

/**
 * Collect club seasons across every team stint for the Season stats board.
 * One option per team/year — totals are loaded as all competitions.
 */
async function fetchAthleteCareerDomesticSeasonOptions(
  playerId: string,
  fallbackEspnCode: string,
): Promise<LeagueSeasonOption[]> {
  const seed = await fetchAthleteStatsPayload(playerId, {})
  let teamIds: string[] = []
  if (seed) {
    const teamFilter = seed.filters?.find((filter) => filter.name === 'team')
    teamIds = (teamFilter?.options ?? [])
      .map((option) => option.value)
      .filter((value): value is string => Boolean(value && /^\d+$/.test(value)))
  }

  // If filters are missing, still return the current-league years.
  if (teamIds.length === 0) {
    const bundle = await fetchAthleteLeagueSeasonStats(playerId, fallbackEspnCode)
    return Promise.all(
      bundle.availableYears.map(async (year) => {
        const labels = await fetchSeasonLabels(fallbackEspnCode, year)
        return {
          year,
          label: 'All competitions',
          shortLabel: labels.shortLabel,
          key: `${fallbackEspnCode}:all:${year}`,
          espnCode: fallbackEspnCode,
        } satisfies LeagueSeasonOption
      }),
    )
  }

  const perTeam = await mapPool(teamIds, 4, async (teamId) => {
    const payload = await fetchAthleteStatsPayload(playerId, { teamId })
    if (!payload) return [] as LeagueSeasonOption[]

    const leagueFilter = payload.filters?.find((filter) => filter.name === 'league')
    const competitiveCodes = (leagueFilter?.options ?? [])
      .map((option) => option.value)
      .filter((value): value is string => Boolean(value && isCompetitiveEspnCode(value)))

    const years = new Set<number>()
    const domesticCodeByYear = new Map<number, string>()

    for (const row of payload.categories?.[0]?.statistics ?? []) {
      const year = row.season?.year
      const espnCode = row.leagueSlug
      if (typeof year !== 'number' || !espnCode || !isCompetitiveEspnCode(espnCode)) continue
      years.add(year)
      if (isDomesticTableEspnCode(espnCode) && !domesticCodeByYear.has(year)) {
        domesticCodeByYear.set(year, espnCode)
      }
    }

    // Pull years from each competition feed so cup-only seasons aren't missed.
    await mapPool(competitiveCodes, 4, async (espnCode) => {
      const compPayload = await fetchAthleteStatsPayload(playerId, { teamId, leagueSlug: espnCode })
      for (const row of compPayload?.categories?.[0]?.statistics ?? []) {
        const year = row.season?.year
        if (typeof year !== 'number') continue
        years.add(year)
        if (isDomesticTableEspnCode(espnCode) && !domesticCodeByYear.has(year)) {
          domesticCodeByYear.set(year, espnCode)
        }
      }
      return true
    })

    return [...years].map((year) => {
      const espnCode = domesticCodeByYear.get(year) || competitiveCodes[0] || fallbackEspnCode
      return {
        year,
        label: 'All competitions',
        shortLabel: formatSeasonShortLabel(year),
        key: `${teamId}:all:${year}`,
        espnCode,
        teamId,
      } satisfies LeagueSeasonOption
    })
  })

  const flat = perTeam.flat()
  const seen = new Set<string>()
  const unique = flat.filter((option) => {
    const key = option.key ?? `${option.teamId}:${option.year}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  unique.sort(
    (a, b) =>
      b.year - a.year ||
      (a.espnCode === fallbackEspnCode ? -1 : 0) - (b.espnCode === fallbackEspnCode ? -1 : 0) ||
      (a.teamId || '').localeCompare(b.teamId || ''),
  )

  return Promise.all(
    unique.map(async (option) => {
      if (!option.espnCode) return option
      try {
        const labels = await fetchSeasonLabels(option.espnCode, option.year)
        return {
          ...option,
          shortLabel: labels.shortLabel,
          label: 'All competitions',
        }
      } catch {
        return option
      }
    }),
  )
}

/** Season years available for a player's season stats board (every club stint). */
export async function fetchPlayerSeasonOptions(
  leagueId: LeagueId,
  playerId: string,
): Promise<LeagueSeasonOption[]> {
  const league = getLeague(leagueId)
  return fetchAthleteCareerDomesticSeasonOptions(playerId, league.espnCode)
}

/** Reload a player's season stats (+ prior year compare) for a chosen season. */
export async function fetchPlayerSeasonStatsForYear(
  leagueId: LeagueId,
  playerId: string,
  seasonYear?: number,
  espnCode?: string,
  teamId?: string,
): Promise<{
  stats: PlayerSeasonStatLine[]
  seasonLabel: string | null
  seasonYear: number | null
  previousStats: PlayerSeasonStatLine[]
  previousSeasonLabel: string | null
}> {
  const league = getLeague(leagueId)
  const slug = espnCode || league.espnCode
  const bundle = await fetchAthleteLeagueSeasonStats(playerId, slug, seasonYear, teamId)
  return {
    stats: bundle.stats,
    seasonLabel: bundle.seasonLabel,
    seasonYear: bundle.seasonYear,
    previousStats: bundle.previousStats,
    previousSeasonLabel: bundle.previousSeasonLabel,
  }
}

function parseGameLogRatings(
  overview: EspnOverviewPayload,
  positionAbbrev?: string,
): PlayerRecentMatchRating[] {
  const block = overview.gameLog?.statistics?.[0]
  const names = block?.names ?? []
  const events = block?.events ?? []
  if (names.length === 0 || events.length === 0) return []

  const idx = (name: string) => names.indexOf(name)

  return events
    .map((event) => {
      const values = event.stats ?? []
      const app = values[idx('appearances')] || values[0] || ''
      const starter = /start/i.test(app)
      const appeared = starter || /sub/i.test(app) || app === '1'
      if (!appeared) return null

      const num = (name: string) => {
        const i = idx(name)
        if (i < 0) return 0
        const n = Number(values[i])
        return Number.isFinite(n) ? n : 0
      }

      const stats: MatchPlayerStats = {
        appearances: 1,
        starter,
        totalGoals: num('totalGoals'),
        goalAssists: num('goalAssists'),
        totalShots: num('totalShots'),
        shotsOnTarget: num('shotsOnTarget'),
        foulsCommitted: num('foulsCommitted'),
        foulsSuffered: num('foulsSuffered'),
        yellowCards: num('yellowCards'),
        redCards: num('redCards'),
        offsides: num('offsides'),
        ownGoals: 0,
        saves: num('saves'),
        goalsConceded: num('goalsConceded'),
        shotsFaced: num('shotsFaced'),
        chancesCreated:
          num('chancesCreated') || num('chanceCreated') || num('keyPasses') || num('keyPass'),
        successfulDribbles:
          num('successfulDribbles') ||
          num('dribblesWon') ||
          num('takeOnsWon') ||
          num('dribblesSuccessful'),
      }

      const minutesRaw =
        num('minutes') || num('minsPlayed') || num('minutesPlayed') || num('MIN')
      const minutesPlayed = minutesRaw > 0 ? minutesRaw : starter ? 90 : 45

      const breakdown = rateMatchPerformance(
        stats,
        positionGroupFromAbbrev(positionAbbrev),
        { minutesPlayed, live: false },
      )
      if (!breakdown || !event.eventId) return null

      const row: PlayerRecentMatchRating = {
        eventId: event.eventId,
        rating: breakdown.rating,
        goals: stats.totalGoals,
        assists: stats.goalAssists,
        starter,
        minutes: Math.round(breakdown.minutesUsed),
        performance100: breakdown.performance100,
        attack: breakdown.attack,
        creation: breakdown.creation,
        discipline: breakdown.discipline,
        goalkeeping: breakdown.goalkeeping,
        defending: breakdown.defending,
        notes: breakdown.notes,
      }
      return row
    })
    .filter((row): row is PlayerRecentMatchRating => row != null)
}

const EVENTLOG_FETCH_CONCURRENCY = 6
/** Rated matches to aim for on each infinite-scroll page. */
const RATINGS_BATCH_TARGET = 15
const EVENTLOG_PAGE_SIZE = 25

type EspnCoreEventLogItem = {
  played?: boolean
  teamId?: string | number
  event?: { $ref?: string }
  competition?: { $ref?: string }
  statistics?: { $ref?: string }
  lineupEntry?: { $ref?: string }
}

type EspnCoreEventLogPage = {
  $ref?: string
  events?: {
    count?: number
    pageIndex?: number
    pageCount?: number
    pageSize?: number
    items?: EspnCoreEventLogItem[]
  }
}

type EspnCoreStatSplit = {
  splits?: {
    categories?: Array<{
      stats?: Array<{ name?: string; value?: number; displayValue?: string }>
    }>
  }
}

type EspnCoreLineupEntry = {
  starter?: boolean
}

type EspnSiteSummary = {
  header?: {
    competitions?: Array<{
      date?: string
      competitors?: Array<{
        homeAway?: string
        score?: string | number | { value?: number; displayValue?: string }
        team?: {
          id?: string
          displayName?: string
          abbreviation?: string
          shortDisplayName?: string
        }
      }>
    }>
  }
}

type EspnCoreEvent = {
  date?: string
  name?: string
  shortName?: string
  competitions?: Array<{
    date?: string
    competitors?: Array<{
      id?: string
      homeAway?: string
      team?: { $ref?: string }
    }>
  }>
}

type EspnGamelogFilters = {
  filters?: Array<{
    name?: string
    value?: string
    options?: Array<{ value?: string; displayValue?: string }>
  }>
}

function httpsRef(ref: string): string {
  return ref.replace(/^http:\/\//i, 'https://')
}

function eventIdFromRef(ref: string | undefined): string | null {
  if (!ref) return null
  const match = ref.match(/\/events\/(\d+)/)
  return match?.[1] ?? null
}

function leagueFromEventRef(ref: string | undefined): string | null {
  if (!ref) return null
  const match = ref.match(/\/leagues\/([^/]+)\/events\//)
  return match?.[1] ?? null
}

function seasonFromEventlogRef(ref: string | undefined): number | null {
  if (!ref) return null
  const match = ref.match(/\/seasons\/(\d+)\//)
  if (!match?.[1]) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

function teamIdFromRef(ref: string | undefined): string | null {
  if (!ref) return null
  const match = ref.match(/\/teams\/(\d+)/)
  return match?.[1] ?? null
}

function readCoreStatValue(
  categories: NonNullable<NonNullable<EspnCoreStatSplit['splits']>['categories']>,
  name: string,
): number {
  for (const category of categories) {
    for (const stat of category.stats ?? []) {
      if (stat.name !== name) continue
      if (typeof stat.value === 'number' && Number.isFinite(stat.value)) return stat.value
      const n = Number(stat.displayValue)
      if (Number.isFinite(n)) return n
    }
  }
  return 0
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const slots: Array<R | null> = Array.from({ length: items.length }, () => null)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      slots[current] = await mapper(items[current])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () =>
    worker(),
  )
  await Promise.all(workers)
  return slots.filter((value): value is R => value != null)
}

async function listRatingSeasons(
  leagueEspnCode: string,
  playerId: string,
): Promise<number[]> {
  const url = new URL(
    `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${playerId}/gamelog`,
  )
  url.searchParams.set('league', leagueEspnCode)
  const res = await fetch(url)
  if (res.ok) {
    const data = (await res.json()) as EspnGamelogFilters
    const seasonFilter = data.filters?.find((f) => f.name === 'season')
    const years = (seasonFilter?.options ?? [])
      .map((opt) => Number(opt.value))
      .filter((year) => Number.isFinite(year))
      .sort((a, b) => b - a)
    if (years.length > 0) return years
  }

  const elog = await fetch(
    `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${leagueEspnCode}/athletes/${playerId}/eventlog?limit=1`,
  )
  if (!elog.ok) return []
  const payload = (await elog.json()) as EspnCoreEventLogPage
  const current = seasonFromEventlogRef(payload.$ref) ?? new Date().getUTCFullYear()
  return [current, current - 1, current - 2, current - 3, current - 4]
}

async function fetchEventLogPage(
  leagueEspnCode: string,
  seasonYear: number,
  playerId: string,
  pageIndex: number,
): Promise<{ items: EspnCoreEventLogItem[]; pageCount: number }> {
  const url = new URL(
    `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${leagueEspnCode}/seasons/${seasonYear}/athletes/${playerId}/eventlog`,
  )
  url.searchParams.set('limit', String(EVENTLOG_PAGE_SIZE))
  url.searchParams.set('page', String(pageIndex))
  const res = await fetch(url)
  if (!res.ok) return { items: [], pageCount: 0 }
  const data = (await res.json()) as EspnCoreEventLogPage
  return {
    items: data.events?.items ?? [],
    pageCount: Math.max(0, data.events?.pageCount ?? 0),
  }
}

function parseCompetitorScore(
  value: string | number | { value?: number; displayValue?: string } | undefined,
): number | null {
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

async function fetchMatchMeta(
  leagueEspnCode: string,
  eventId: string,
  playerTeamId: string | undefined,
): Promise<
  Pick<
    PlayerRecentMatchRating,
    | 'opponent'
    | 'opponentAbbrev'
    | 'opponentId'
    | 'date'
    | 'homeAway'
    | 'teamScore'
    | 'opponentScore'
  >
> {
  const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueEspnCode}/summary?event=${eventId}`
  try {
    const res = await fetch(summaryUrl)
    if (res.ok) {
      const data = (await res.json()) as EspnSiteSummary
      const competition = data.header?.competitions?.[0]
      const competitors = competition?.competitors ?? []
      const playerSide = playerTeamId
        ? competitors.find((c) => c.team?.id === playerTeamId)
        : undefined
      const opponentSide = playerTeamId
        ? competitors.find((c) => c.team?.id && c.team.id !== playerTeamId)
        : (competitors.find((c) => c.homeAway === 'away') ?? competitors[0])
      const homeAway =
        playerSide?.homeAway === 'home' || playerSide?.homeAway === 'away'
          ? playerSide.homeAway
          : undefined
      return {
        date: competition?.date,
        opponent:
          opponentSide?.team?.displayName ||
          opponentSide?.team?.shortDisplayName ||
          undefined,
        opponentAbbrev: opponentSide?.team?.abbreviation,
        opponentId: opponentSide?.team?.id,
        homeAway,
        teamScore: parseCompetitorScore(playerSide?.score),
        opponentScore: parseCompetitorScore(opponentSide?.score),
      }
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${leagueEspnCode}/events/${eventId}`,
    )
    if (!res.ok) return {}
    const event = (await res.json()) as EspnCoreEvent
    const competitors = event.competitions?.[0]?.competitors ?? []
    let homeAway: 'home' | 'away' | undefined
    let opponentToken: string | undefined
    let opponentId: string | undefined
    if (playerTeamId && event.shortName) {
      const parts = event.shortName.split(/\s*@\s*|\s+vs\.?\s+/i).map((p) => p.trim())
      const playerCompetitor = competitors.find(
        (c) => teamIdFromRef(c.team?.$ref) === playerTeamId || c.id === playerTeamId,
      )
      const opponentCompetitor = competitors.find(
        (c) => teamIdFromRef(c.team?.$ref) !== playerTeamId && c.id !== playerTeamId,
      )
      if (playerCompetitor?.homeAway === 'home' || playerCompetitor?.homeAway === 'away') {
        homeAway = playerCompetitor.homeAway
      }
      opponentId = teamIdFromRef(opponentCompetitor?.team?.$ref) || opponentCompetitor?.id
      if (parts.length === 2) {
        if (event.shortName.includes('@')) {
          opponentToken = homeAway === 'home' ? parts[0] : parts[1]
        } else {
          opponentToken = homeAway === 'home' ? parts[1] : parts[0]
        }
      }
    }
    return {
      date: event.date || event.competitions?.[0]?.date,
      opponent: opponentToken || event.name,
      opponentAbbrev: opponentToken,
      opponentId,
      homeAway,
    }
  } catch {
    return {}
  }
}

async function ratingFromEventLogItem(
  item: EspnCoreEventLogItem,
  positionAbbrev: string | undefined,
  fallbackLeague: string,
): Promise<PlayerRecentMatchRating | null> {
  if (item.played === false) return null
  const eventId = eventIdFromRef(item.event?.$ref)
  const statsRef = item.statistics?.$ref
  if (!eventId || !statsRef) return null

  const leagueEspnCode = leagueFromEventRef(item.event?.$ref) || fallbackLeague
  const playerTeamId = item.teamId != null ? String(item.teamId) : undefined
  const lineupRef = item.lineupEntry?.$ref

  const [statsRes, lineupRes, meta] = await Promise.all([
    fetch(httpsRef(statsRef)),
    lineupRef ? fetch(httpsRef(lineupRef)) : Promise.resolve(null),
    fetchMatchMeta(leagueEspnCode, eventId, playerTeamId),
  ])
  if (!statsRes.ok) return null

  const statsJson = (await statsRes.json()) as EspnCoreStatSplit
  const categories = statsJson.splits?.categories ?? []
  if (categories.length === 0) return null

  let starter = false
  if (lineupRes?.ok) {
    const lineupJson = (await lineupRes.json()) as EspnCoreLineupEntry
    starter = Boolean(lineupJson.starter)
  }

  const appearances = readCoreStatValue(categories, 'appearances')
  if (!starter && appearances <= 0) return null

  const stats: MatchPlayerStats = {
    appearances: Math.max(1, appearances || 1),
    starter,
    totalGoals: readCoreStatValue(categories, 'totalGoals'),
    goalAssists: readCoreStatValue(categories, 'goalAssists'),
    totalShots: readCoreStatValue(categories, 'totalShots'),
    shotsOnTarget: readCoreStatValue(categories, 'shotsOnTarget'),
    foulsCommitted: readCoreStatValue(categories, 'foulsCommitted'),
    foulsSuffered: readCoreStatValue(categories, 'foulsSuffered'),
    yellowCards: readCoreStatValue(categories, 'yellowCards'),
    redCards: readCoreStatValue(categories, 'redCards'),
    offsides: readCoreStatValue(categories, 'offsides'),
    ownGoals: readCoreStatValue(categories, 'ownGoals'),
    saves: readCoreStatValue(categories, 'saves'),
    goalsConceded: readCoreStatValue(categories, 'goalsConceded'),
    shotsFaced: readCoreStatValue(categories, 'shotsFaced'),
    chancesCreated:
      readCoreStatValue(categories, 'chancesCreated') ||
      readCoreStatValue(categories, 'chanceCreated') ||
      readCoreStatValue(categories, 'keyPasses'),
    successfulDribbles:
      readCoreStatValue(categories, 'successfulDribbles') ||
      readCoreStatValue(categories, 'dribblesWon') ||
      readCoreStatValue(categories, 'takeOnsWon'),
  }

  const minutesRaw =
    readCoreStatValue(categories, 'minutes') ||
    readCoreStatValue(categories, 'minsPlayed') ||
    readCoreStatValue(categories, 'minutesPlayed')
  const minutesPlayed = minutesRaw > 0 ? minutesRaw : starter ? 90 : 45

  const breakdown = rateMatchPerformance(stats, positionGroupFromAbbrev(positionAbbrev), {
    minutesPlayed,
    live: false,
  })
  if (!breakdown) return null

  return {
    eventId,
    rating: breakdown.rating,
    goals: stats.totalGoals,
    assists: stats.goalAssists,
    starter,
    minutes: Math.round(breakdown.minutesUsed),
    ...meta,
  }
}

function emptyRatingsCursor(): PlayerRatingsCursor {
  return { seasons: [], seasonIndex: 0, page: 0, pageCount: 0, done: true }
}

/** Newest match first; undated rows sort after dated ones, then by event id. */
export function sortRatingsNewestFirst(
  rows: PlayerRecentMatchRating[],
): PlayerRecentMatchRating[] {
  return rows.slice().sort((a, b) => {
    const ta = a.date ? Date.parse(a.date) : NaN
    const tb = b.date ? Date.parse(b.date) : NaN
    const aDated = Number.isFinite(ta)
    const bDated = Number.isFinite(tb)
    if (aDated && bDated && ta !== tb) return tb - ta
    if (aDated !== bDated) return aDated ? -1 : 1
    const ida = Number(a.eventId)
    const idb = Number(b.eventId)
    if (Number.isFinite(ida) && Number.isFinite(idb) && ida !== idb) return idb - ida
    return b.eventId.localeCompare(a.eventId)
  })
}

export async function createPlayerRatingsCursor(
  leagueEspnCode: string,
  playerId: string,
): Promise<PlayerRatingsCursor> {
  const seasons = await listRatingSeasons(leagueEspnCode, playerId)
  if (seasons.length === 0) return emptyRatingsCursor()
  return {
    seasons,
    seasonIndex: 0,
    // Discover pageCount for the newest season on the first batch fetch.
    page: 0,
    pageCount: 0,
    done: false,
  }
}

/**
 * Pull the next batch of rated appearances (across season pages) for infinite scroll.
 * Returns newest matches first so previous-ratings lists stay chronological.
 */
export async function fetchNextPlayerRatingsBatch(
  leagueEspnCode: string,
  playerId: string,
  positionAbbrev: string | undefined,
  cursor: PlayerRatingsCursor,
  excludeIds: Set<string> = new Set(),
): Promise<{ ratings: PlayerRecentMatchRating[]; cursor: PlayerRatingsCursor }> {
  if (cursor.done || cursor.seasons.length === 0) {
    return { ratings: [], cursor: { ...cursor, done: true } }
  }

  const ratings: PlayerRecentMatchRating[] = []
  let seasonIndex = cursor.seasonIndex
  let page = cursor.page
  let pageCount = cursor.pageCount
  const seen = new Set(excludeIds)

  while (ratings.length < RATINGS_BATCH_TARGET && seasonIndex < cursor.seasons.length) {
    const seasonYear = cursor.seasons[seasonIndex]!

    // ESPN pages are oldest→newest; start each season on the last page.
    if (page === 0) {
      const probe = await fetchEventLogPage(leagueEspnCode, seasonYear, playerId, 1)
      pageCount = probe.pageCount
      if (probe.items.length === 0 || pageCount === 0) {
        seasonIndex += 1
        page = 0
        pageCount = 0
        continue
      }
      page = pageCount
    }

    const result = await fetchEventLogPage(leagueEspnCode, seasonYear, playerId, page)
    pageCount = result.pageCount || pageCount

    if (result.items.length === 0 || pageCount === 0) {
      seasonIndex += 1
      page = 0
      pageCount = 0
      continue
    }

    // Newest within the page first (API order is chronological ascending).
    const played = result.items.filter((item) => item.played !== false).slice().reverse()
    const expanded = await mapPool(played, EVENTLOG_FETCH_CONCURRENCY, (item) =>
      ratingFromEventLogItem(item, positionAbbrev, leagueEspnCode),
    )

    let filledBatch = false
    for (const row of expanded) {
      if (seen.has(row.eventId)) continue
      seen.add(row.eventId)
      ratings.push(row)
      if (ratings.length >= RATINGS_BATCH_TARGET) {
        filledBatch = true
        break
      }
    }

    // Stay on this page when the batch filled mid-page; excludeIds skip already-seen rows next time.
    if (filledBatch) break

    if (page <= 1) {
      seasonIndex += 1
      page = 0
      pageCount = 0
    } else {
      page -= 1
    }
  }

  const done = seasonIndex >= cursor.seasons.length
  return {
    ratings: sortRatingsNewestFirst(ratings),
    cursor: {
      seasons: cursor.seasons,
      seasonIndex,
      page,
      pageCount,
      done,
    },
  }
}

async function enrichOverviewRatings(
  leagueEspnCode: string,
  rows: PlayerRecentMatchRating[],
  playerTeamId?: string,
): Promise<PlayerRecentMatchRating[]> {
  const enriched = await mapPool(rows, EVENTLOG_FETCH_CONCURRENCY, async (row) => {
    if (row.opponent && row.date) return row
    const meta = await fetchMatchMeta(leagueEspnCode, row.eventId, playerTeamId)
    return { ...row, ...meta }
  })
  return sortRatingsNewestFirst(enriched)
}

async function fetchExpandedRecentRatings(
  leagueEspnCode: string,
  playerId: string,
  positionAbbrev: string | undefined,
  fallback: PlayerRecentMatchRating[],
  playerTeamId?: string,
): Promise<{ ratings: PlayerRecentMatchRating[]; cursor: PlayerRatingsCursor }> {
  try {
    const cursor = await createPlayerRatingsCursor(leagueEspnCode, playerId)
    const first = await fetchNextPlayerRatingsBatch(
      leagueEspnCode,
      playerId,
      positionAbbrev,
      cursor,
    )
    if (first.ratings.length === 0) {
      const enriched = await enrichOverviewRatings(leagueEspnCode, fallback, playerTeamId)
      return { ratings: enriched, cursor: { ...cursor, done: true } }
    }
    return {
      ratings: first.ratings,
      cursor: first.cursor,
    }
  } catch {
    const enriched = await enrichOverviewRatings(leagueEspnCode, fallback, playerTeamId)
    return { ratings: enriched, cursor: emptyRatingsCursor() }
  }
}

function isNationalTeamHistoryEntry(stint: {
  logo?: string
  slug?: string
}): boolean {
  // ESPN country sides use /teamlogos/countries/; clubs use /teamlogos/soccer/.
  if (stint.logo?.includes('/teamlogos/countries/')) return true
  // Fallback: country slug like "arg" or women's "aut.w"
  if (stint.slug && /^[a-z]{3}(\.w)?$/i.test(stint.slug)) return true
  return false
}

function mapTeamHistoryStint(stint: {
  id?: string
  displayName?: string
  logo?: string
  seasons?: string
  isActive?: boolean
}): PlayerClubStint | null {
  if (!stint.displayName) return null
  return {
    teamId: stint.id || stint.displayName.toLowerCase().replace(/\s+/g, '-'),
    teamName: stint.displayName,
    logoUrl: stint.logo,
    seasons: stint.seasons || '',
    isActive: stint.isActive === true,
  }
}

function pickNationalSide(nationalHistory: PlayerClubStint[]): PlayerClubStint | null {
  if (nationalHistory.length === 0) return null
  return nationalHistory.find((stint) => stint.isActive) ?? nationalHistory[0]
}

function countryOfOrigin(athlete: NonNullable<EspnAthletePayload['athlete']>): string | null {
  if (athlete.citizenship?.trim()) return athlete.citizenship.trim()
  if (athlete.citizenshipCountry?.abbreviation?.trim()) {
    return athlete.citizenshipCountry.abbreviation.trim()
  }
  if (athlete.displayBirthPlace?.trim()) return athlete.displayBirthPlace.trim()
  return null
}

function readStatIndex(names: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const index = names.indexOf(alias)
    if (index >= 0) return index
  }
  return -1
}

function parseNumberStat(values: string[], index: number): number {
  if (index < 0) return 0
  const n = Number(values[index])
  return Number.isFinite(n) ? n : 0
}

async function averageRatingFromSeasonGameLog(
  playerId: string,
  leagueSlug: string,
  seasonYear: number,
  positionAbbrev?: string,
): Promise<number | null> {
  const url = new URL(
    `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${encodeURIComponent(playerId)}/gamelog`,
  )
  url.searchParams.set('league', leagueSlug)
  url.searchParams.set('season', String(seasonYear))
  const res = await fetch(url)
  if (!res.ok) return null
  const payload = (await res.json()) as EspnAthleteGameLogPayload
  const names = payload.names ?? []
  const events = payload.seasonTypes?.[0]?.categories?.[0]?.events ?? []
  if (names.length === 0 || events.length === 0) return null

  const ratings: number[] = []
  for (const event of events) {
    const values = event.stats ?? []
    if (!event.eventId || values.length === 0) continue
    const stats: MatchPlayerStats = {
      appearances: 1,
      starter: true,
      totalGoals: parseNumberStat(values, readStatIndex(names, ['totalGoals', 'G'])),
      goalAssists: parseNumberStat(values, readStatIndex(names, ['goalAssists', 'A'])),
      totalShots: parseNumberStat(values, readStatIndex(names, ['totalShots', 'SHOT'])),
      shotsOnTarget: parseNumberStat(values, readStatIndex(names, ['shotsOnTarget', 'SOG'])),
      foulsCommitted: parseNumberStat(values, readStatIndex(names, ['foulsCommitted', 'FC'])),
      foulsSuffered: parseNumberStat(values, readStatIndex(names, ['foulsSuffered', 'FA'])),
      yellowCards: parseNumberStat(values, readStatIndex(names, ['yellowCards', 'YC'])),
      redCards: parseNumberStat(values, readStatIndex(names, ['redCards', 'RC'])),
      offsides: parseNumberStat(values, readStatIndex(names, ['offsides', 'OF'])),
      ownGoals: 0,
      saves: parseNumberStat(values, readStatIndex(names, ['saves'])),
      goalsConceded: parseNumberStat(values, readStatIndex(names, ['goalsConceded'])),
      shotsFaced: parseNumberStat(values, readStatIndex(names, ['shotsFaced'])),
      chancesCreated: parseNumberStat(
        values,
        readStatIndex(names, ['chancesCreated', 'chanceCreated', 'keyPasses', 'keyPass']),
      ),
      successfulDribbles: parseNumberStat(
        values,
        readStatIndex(names, [
          'successfulDribbles',
          'dribblesWon',
          'takeOnsWon',
          'dribblesSuccessful',
        ]),
      ),
    }
    // Skip DNP / unused-sub shells — all-zero lines rate as a false 5.0.
    const touchedPitch =
      stats.totalGoals > 0 ||
      stats.goalAssists > 0 ||
      stats.totalShots > 0 ||
      stats.shotsOnTarget > 0 ||
      stats.foulsCommitted > 0 ||
      stats.foulsSuffered > 0 ||
      stats.yellowCards > 0 ||
      stats.redCards > 0 ||
      stats.offsides > 0 ||
      stats.saves > 0 ||
      stats.shotsFaced > 0 ||
      (stats.chancesCreated ?? 0) > 0 ||
      (stats.successfulDribbles ?? 0) > 0
    if (!touchedPitch) continue
    const breakdown = rateMatchPerformance(
      stats,
      positionGroupFromAbbrev(positionAbbrev),
      { minutesPlayed: 90, live: false },
    )
    if (breakdown) ratings.push(breakdown.rating)
  }

  return rateSeasonForm(ratings)
}

/**
 * Career by season: matches, goals, assists, and Brayden average rating (from gamelog).
 * Pass clubHistory for clubs, or nationalHistory for national-team lines.
 */
export async function fetchPlayerCareerSeasons(
  playerId: string,
  clubHistory: PlayerClubStint[],
  positionAbbrev?: string,
  options?: { national?: boolean },
): Promise<PlayerCareerSeason[]> {
  const clubs = clubHistory.filter((club) => /^\d+$/.test(club.teamId))
  if (clubs.length === 0) return []
  const national = options?.national === true

  const seasonRows = await mapPool(clubs, 3, async (club) => {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${encodeURIComponent(playerId)}/stats?team=${encodeURIComponent(club.teamId)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const payload = (await res.json()) as EspnAthleteStatsPayload
    const category = payload.categories?.[0]
    const names = category?.names ?? []
    const goalsIdx = readStatIndex(names, ['G', 'totalGoals'])
    const assistsIdx = readStatIndex(names, ['A', 'goalAssists'])
    const appsIdx = readStatIndex(names, ['APP', 'appearances', 'gamesPlayed'])
    const startsIdx = readStatIndex(names, ['STRT', 'starts'])
    const rows = category?.statistics ?? []
    const mapped: PlayerCareerSeason[] = []
    for (const row of rows) {
      const year = row.season?.year
      const leagueSlug = row.leagueSlug
      if (typeof year !== 'number' || !leagueSlug) continue
      const looksClub = leagueSlug.includes('.')
      // Club career prefers club league slugs; national career keeps everything for that team.
      if (!national && !looksClub) continue
      const values = row.stats ?? []
      const seasonLabel =
        row.season?.shortDisplayName ||
        row.season?.displayName ||
        row.season?.type?.name ||
        String(year)
      const leagueMeta = payload.leagues?.[leagueSlug]
      const leagueName =
        leagueMeta?.displayName ||
        leagueMeta?.name ||
        leagueMeta?.shortName ||
        LEAGUES.find((league) => league.espnCode === leagueSlug)?.name ||
        leagueSlug
      const appearances = parseNumberStat(values, appsIdx)
      const starts = parseNumberStat(values, startsIdx)
      mapped.push({
        id: `${club.teamId}-${leagueSlug}-${year}-${row.season?.type?.slug || row.season?.type?.id || 'szn'}`,
        seasonYear: year,
        seasonLabel,
        clubId: club.teamId,
        clubName: club.teamName,
        leagueSlug,
        leagueName,
        matchesPlayed: appsIdx >= 0 ? appearances : starts,
        goals: parseNumberStat(values, goalsIdx),
        assists: parseNumberStat(values, assistsIdx),
        averageRating: null,
      })
    }
    return mapped
  })

  const flat = seasonRows
    .flat()
    .sort(
      (a, b) =>
        b.seasonYear - a.seasonYear ||
        b.matchesPlayed - a.matchesPlayed ||
        a.clubName.localeCompare(b.clubName) ||
        a.leagueSlug.localeCompare(b.leagueSlug),
    )

  // One row per club/league/year — prefer the busiest sample (usually regular season).
  const seen = new Set<string>()
  const unique = flat.filter((row) => {
    const key = `${row.clubId}-${row.leagueSlug}-${row.seasonYear}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const RATING_SEASON_CAP = national ? 12 : 18
  const withExtras = await mapPool(unique.slice(0, RATING_SEASON_CAP), 3, async (row) => {
    const [averageRating, coreApps] = await Promise.all([
      averageRatingFromSeasonGameLog(
        playerId,
        row.leagueSlug,
        row.seasonYear,
        positionAbbrev,
      ),
      fetchCoreSeasonAppearances(row.leagueSlug, row.seasonYear, playerId),
    ])
    return {
      ...row,
      averageRating,
      matchesPlayed: coreApps ?? row.matchesPlayed,
    }
  })

  const ratedById = new Map(withExtras.map((row) => [row.id, row]))
  return unique.map((row) => ratedById.get(row.id) ?? row)
}

export async function fetchPlayerProfile(
  leagueId: LeagueId,
  playerId: string,
): Promise<{ profile: PlayerProfile; ratingsCursor: PlayerRatingsCursor }> {
  const athleteRes = await fetch(
    `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${playerId}`,
  )
  if (!athleteRes.ok) {
    throw new Error(`Could not load player profile (${athleteRes.status})`)
  }

  const athleteJson = (await athleteRes.json()) as EspnAthletePayload
  const athlete = athleteJson.athlete
  if (!athlete?.id) throw new Error('Player not found')

  // Club players opened from internationals/continentals must load domestic season stats.
  const needsDomesticRemap =
    isInternationalLeague(leagueId) || isContinentalLeague(leagueId)
  const fromTeam = needsDomesticRemap
    ? await resolveTeamDomesticLeagueId(athlete.team?.id, athlete.team?.slug)
    : null
  const fromSlug = leagueIdFromTeamSlug(athlete.team?.slug)
  const effectiveLeagueId = fromTeam || (fromSlug && needsDomesticRemap ? fromSlug : leagueId)
  const league = getLeague(effectiveLeagueId)

  const [bioRes, overviewRes, seasonStatsBundle] = await Promise.all([
    fetch(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${playerId}/bio`),
    fetch(
      `https://site.api.espn.com/apis/common/v3/sports/soccer/${league.espnCode}/athletes/${playerId}/overview`,
    ),
    fetchAthleteLeagueSeasonStats(
      playerId,
      league.espnCode,
      undefined,
      athlete.team?.id,
    ),
  ])

  const bioJson = bioRes.ok ? ((await bioRes.json()) as EspnBioPayload) : { teamHistory: [] }
  const overviewJson = overviewRes.ok
    ? ((await overviewRes.json()) as EspnOverviewPayload)
    : {}

  const name = athlete.displayName || athlete.fullName || ''
  const shortName = athlete.shortName || name
  const positionAbbrev = athlete.position?.abbreviation
  const overviewRatings = parseGameLogRatings(overviewJson, positionAbbrev)
  const expanded = await fetchExpandedRecentRatings(
    league.espnCode,
    playerId,
    positionAbbrev,
    overviewRatings,
    athlete.team?.id,
  )
  const recentRatings = expanded.ratings
  const averageRating = rateSeasonForm(recentRatings.map((row) => row.rating))

  // Prefer dedicated league season totals. Overview splits[0] is often a national-team
  // friendly window, not the full club season for this league.
  const seasonStats =
    seasonStatsBundle.stats.length > 0
      ? seasonStatsBundle.stats
      : buildOrderedSeasonStatsFromOverview(overviewJson, league.espnCode)
  const seasonStatsLabel =
    seasonStatsBundle.seasonLabel ||
    (seasonStats.length > 0 ? 'All competitions' : undefined)

  const clubHistory: PlayerClubStint[] = []
  const nationalHistory: PlayerClubStint[] = []
  for (const raw of bioJson.teamHistory ?? []) {
    const mapped = mapTeamHistoryStint(raw)
    if (!mapped) continue
    if (isNationalTeamHistoryEntry(raw)) nationalHistory.push(mapped)
    else clubHistory.push(mapped)
  }

  const nationalSide = pickNationalSide(nationalHistory)
  const origin = countryOfOrigin(athlete)
  const represents = nationalSide?.teamName || origin
  const representsNationalTeam = Boolean(nationalSide)
  const summaryYear = (() => {
    const label = athlete.statsSummary?.displayName || ''
    const range = label.match(/(20\d{2})\s*[-/]\s*(?:\d{2}|20\d{2})/)
    if (range) return Number(range[1])
    const single = label.match(/(20\d{2})/)
    return single ? Number(single[1]) : null
  })()
  const summaryStats = athlete.statsSummary?.statistics ?? []
  const summaryAllZero =
    summaryStats.length > 0 &&
    summaryStats.every((stat) => {
      const value = (stat.displayValue || '').trim()
      return value === '' || /^0+(\s*\(.*\))?$/.test(value)
    })
  const summaryMatchesSeason =
    seasonStatsBundle.seasonYear == null ||
    summaryYear == null ||
    summaryYear === seasonStatsBundle.seasonYear
  const seasonSummary =
    !summaryAllZero && summaryMatchesSeason
      ? summaryStats
          .filter((stat) => stat.displayName && stat.displayValue)
          .slice(0, 6)
          .map((stat) => ({
            label: stat.displayName!,
            value: stat.displayValue!,
          }))
      : []

  return {
    profile: {
      id: athlete.id,
      name,
      shortName,
      photoUrl: athlete.headshot?.href || playerHeadshotUrl(athlete.id),
      jersey: athlete.jersey,
      age: athlete.age,
      height: athlete.displayHeight,
      weight: athlete.displayWeight,
      dateOfBirth: athlete.displayDOB?.trim() || undefined,
      flagUrl: athlete.flag?.href,
      citizenship: athlete.citizenship || origin || undefined,
      represents,
      representsNationalTeam,
      position: athlete.position?.displayName,
      positionAbbrev,
      teamId: athlete.team?.id,
      teamName: athlete.team?.displayName || athlete.team?.shortDisplayName,
      teamLogoUrl: athlete.team?.logos?.[0]?.href,
      seasonSummary: seasonSummary.length > 0 ? seasonSummary : undefined,
      leagueId: effectiveLeagueId,
      seasonStats,
      seasonStatsLabel,
      seasonYear: seasonStatsBundle.seasonYear,
      availableSeasonYears: seasonStatsBundle.availableYears,
      previousSeasonStats: seasonStatsBundle.previousStats,
      previousSeasonStatsLabel: seasonStatsBundle.previousSeasonLabel || undefined,
      averageRating,
      recentRatings,
      clubHistory,
      nationalHistory,
      fetchedAt: Date.now(),
    },
    ratingsCursor: expanded.cursor,
  }
}
