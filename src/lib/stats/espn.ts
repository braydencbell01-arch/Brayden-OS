import {
  getLeague,
  internationalLeagues,
  isContinentalLeague,
  isInternationalLeague,
  LEAGUES,
  type LeagueId,
} from '../leagues'
import { leagueIdFromTeamSlug } from '../search'
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
  scoringPlay?: boolean
  clock?: { displayValue?: string }
  type?: { text?: string; type?: string }
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
  return 'other'
}

function buildMoments(events: EspnKeyEvent[] | undefined): MatchMoment[] {
  return (events ?? [])
    .filter((event) => {
      const kind = classifyMoment(event)
      return kind === 'goal' || kind === 'card'
    })
    .slice(0, 12)
    .map((event, index) => ({
      id: event.id || `moment-${index}`,
      clock: event.clock?.displayValue || '',
      text: event.text || event.type?.text || 'Event',
      kind: classifyMoment(event),
    }))
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
          const breakdown = rateMatchPerformance(
            ratingStats,
            positionGroupFromAbbrev(positionAbbrev),
            {
              minutesPlayed: live ? elapsedMinutes : 90,
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

      return {
        teamId,
        teamName,
        homeAway,
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

  return rows.sort((a, b) => {
    const groupCmp = (a.group || '').localeCompare(b.group || '')
    if (groupCmp !== 0) return groupCmp
    return a.rank - b.rank || b.points - a.points
  })
}

export async function fetchLeagueStandings(
  leagueId: LeagueId,
  seasonYear?: number,
): Promise<StandingRow[]> {
  return fetchStandingsForSeason(leagueId, seasonYear)
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

/** Full squad, grouped by position (GK → DEF → MID → FWD). */
export async function fetchTeamRoster(
  leagueId: LeagueId,
  teamId: string,
  seasonYear?: number,
): Promise<TeamRoster> {
  const league = getLeague(leagueId)
  const nowYear = new Date().getUTCFullYear()
  const yearsToTry =
    seasonYear != null
      ? ([seasonYear] as const)
      : ([nowYear, nowYear - 1, nowYear - 2, null] as const)
  const codesToTry = [
    league.espnCode,
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
): LeaderCategory[] {
  const wanted = [
    { name: 'goalsLeaders', label: 'Top scorers' },
    { name: 'assistsLeaders', label: 'Top assists' },
  ]

  return wanted
    .map(({ name, label }) => {
      const block = stats?.find((item) => item.name === name)
      const leaders = (block?.leaders ?? []).slice(0, limit).map((leader, index) => {
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
    const players = playerLeadersFromSiteStats(data.stats, limit)
    if (players.length === 0) continue

    season = data.season?.year ?? year
    seasonLabel = data.season?.displayName || `${year} season`
    playerCategories = players

    try {
      const standings = await fetchStandingsForSeason(leagueId, year)
      teamCategories = teamLeadersFromStandings(standings, limit)
    } catch {
      teamCategories = []
    }
    break
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
  const perCategoryCap = Math.max(1, Math.min(limit, 10))

  let payload: EspnCoreLeadersResponse | null = null
  let season = seasonYear ?? nowYear

  for (const year of yearsToTry) {
    const url = new URL(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${league.espnCode}/seasons/${year}/types/1/leaders`,
    )
    url.searchParams.set('limit', '50')
    const res = await fetch(url)
    if (!res.ok) continue
    const data = (await res.json()) as EspnCoreLeadersResponse
    if (!data.categories?.length) continue
    payload = data
    season = year
    break
  }

  if (!payload?.categories?.length) {
    throw new Error(
      seasonYear != null
        ? `No ${league.name} player stats for that season`
        : `No ${league.name} player stats available yet`,
    )
  }

  const byName = new Map(
    payload.categories
      .filter((category) => category.name)
      .map((category) => [category.name as string, category]),
  )

  const selected = PLAYER_STAT_CATEGORY_ORDER.map((name) => byName.get(name)).filter(
    (category): category is NonNullable<typeof category> => Boolean(category?.leaders?.[0]),
  )

  const athleteRefs = new Map<string, string>()
  const teamRefs = new Map<string, string>()
  for (const category of selected) {
    for (const leader of (category.leaders ?? []).slice(0, perCategoryCap)) {
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

  const boards: LeaguePlayerStatBoard[] = selected.map((category) => {
    const leaders = (category.leaders ?? [])
      .slice(0, perCategoryCap)
      .map((leader, index) => toEntry(category.name, leader, index + 1))
    return {
      categoryId: category.name || 'stat',
      label: category.displayName || category.shortDisplayName || category.name || 'Stat',
      leaders,
    }
  })

  const rows: LeaguePlayerStatTop[] = boards
    .filter((board) => board.leaders[0])
    .map((board) => ({
      categoryId: board.categoryId,
      label: board.label,
      player: board.leaders[0]!,
    }))

  if (rows.length === 0) {
    throw new Error(`No ${league.name} player stats available yet`)
  }

  return {
    leagueId,
    season,
    seasonLabel: `${season} season`,
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
export async function fetchTeamStatLeaders(
  leagueId: LeagueId,
  teamId: string,
  limit = 3,
  seasonYear?: number,
): Promise<TeamStatLeaders> {
  const league = getLeague(leagueId)
  const perCategoryCap = Math.max(1, Math.min(limit, 8))

  let payload: EspnCoreLeadersResponse | null = null
  let season = seasonYear ?? new Date().getUTCFullYear()
  let seasonMeta: { label: string; shortLabel: string } | null = null

  const yearsToTry =
    seasonYear != null
      ? [seasonYear]
      : [
          new Date().getUTCFullYear(),
          new Date().getUTCFullYear() - 1,
          new Date().getUTCFullYear() - 2,
          new Date().getUTCFullYear() - 3,
        ]

  for (const year of yearsToTry) {
    const url = new URL(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${league.espnCode}/seasons/${year}/types/1/leaders`,
    )
    url.searchParams.set('limit', '200')
    const res = await fetch(url)
    if (!res.ok) continue
    const data = (await res.json()) as EspnCoreLeadersResponse
    if (!data.categories?.length) continue
    payload = data
    season = year
    seasonMeta = await fetchSeasonLabels(league.espnCode, year)
    break
  }

  if (!payload?.categories?.length) {
    throw new Error(
      seasonYear != null
        ? `No ${league.name} player stats for that season`
        : `No ${league.name} player stats available yet`,
    )
  }

  if (!seasonMeta) {
    seasonMeta = await fetchSeasonLabels(league.espnCode, season)
  }

  const byName = new Map(
    payload.categories
      .filter((category) => category.name)
      .map((category) => [category.name as string, category]),
  )

  const selected = PLAYER_STAT_CATEGORY_ORDER.map((name) => byName.get(name)).filter(
    (category): category is NonNullable<typeof category> => Boolean(category?.leaders?.length),
  )

  const teamLeadersByCategory = selected
    .map((category) => {
      const forTeam = (category.leaders ?? [])
        .filter((leader) => idFromCoreRef(leader.team?.$ref, 'teams') === teamId)
        .filter((leader) => {
          const value = typeof leader.value === 'number' ? leader.value : Number(leader.value) || 0
          return value > 0
        })
        .slice(0, perCategoryCap)
      return { category, leaders: forTeam }
    })
    .filter((entry) => entry.leaders.length > 0)

  if (teamLeadersByCategory.length === 0) {
    throw new Error(`No stat leaders available for this club in ${seasonMeta.shortLabel}`)
  }

  const athleteRefs = new Map<string, string>()
  for (const { leaders } of teamLeadersByCategory) {
    for (const leader of leaders) {
      const athleteId = idFromCoreRef(leader.athlete?.$ref, 'athletes')
      if (athleteId && leader.athlete?.$ref) athleteRefs.set(athleteId, leader.athlete.$ref)
    }
  }

  const athletes = await Promise.all(
    [...athleteRefs.entries()].map(async ([id, ref]) => [id, await fetchCoreNamed(ref)] as const),
  )
  const athleteById = new Map(athletes)

  const categories: LeaderCategory[] = teamLeadersByCategory.map(({ category, leaders }) => ({
    id: category.name || 'stat',
    label: category.displayName || category.shortDisplayName || category.name || 'Stat',
    kind: 'player' as const,
    leaders: leaders.map((leader, index) => {
      const athleteId = idFromCoreRef(leader.athlete?.$ref, 'athletes') || `${category.name}-${index}`
      const athlete = athleteId ? athleteById.get(athleteId) : null
      const name = athlete?.displayName || ''
      const value = typeof leader.value === 'number' ? leader.value : Number(leader.value) || 0
      return {
        rank: index + 1,
        id: athleteId,
        name,
        shortName: athlete?.shortName || athlete?.shortDisplayName || name,
        jersey: athlete?.jersey,
        teamId,
        value,
        displayValue: String(value),
      }
    }),
  }))

  return {
    leagueId,
    teamId,
    season,
    seasonLabel: seasonMeta.label,
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
}

const leaderSeasonsCache = new Map<string, LeagueSeasonOption[]>()
const allSeasonsCache = new Map<string, LeagueSeasonOption[]>()

/** Compact season chip: "2025-26" → "25/26"; calendar years stay as "2025". */
export function formatSeasonShortLabel(year: number, abbreviation?: string): string {
  const abbr = (abbreviation || '').trim()
  const cross = abbr.match(/^(\d{4})-(\d{2})$/)
  if (cross) {
    return `${cross[1]!.slice(2)}/${cross[2]}`
  }
  const crossSlash = abbr.match(/^(\d{4})\/(\d{2})$/)
  if (crossSlash) {
    return `${crossSlash[1]!.slice(2)}/${crossSlash[2]}`
  }
  return String(year)
}

async function fetchSeasonLabels(
  espnCode: string,
  year: number,
): Promise<{ label: string; shortLabel: string }> {
  try {
    const res = await fetch(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${espnCode}/seasons/${year}`,
    )
    if (res.ok) {
      const detail = (await res.json()) as EspnSeasonDetail
      const shortLabel = formatSeasonShortLabel(year, detail.abbreviation)
      return {
        label: detail.displayName || detail.abbreviation || `${shortLabel} season`,
        shortLabel,
      }
    }
  } catch {
    // fall through
  }
  return { label: `${year} season`, shortLabel: String(year) }
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

async function seasonHasLeaders(espnCode: string, year: number): Promise<boolean> {
  try {
    const url = new URL(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${espnCode}/seasons/${year}/types/1/leaders`,
    )
    url.searchParams.set('limit', '1')
    const res = await fetch(url)
    if (!res.ok) return false
    const data = (await res.json()) as EspnCoreLeadersResponse
    return Boolean(data.categories?.length)
  } catch {
    return false
  }
}

async function seasonHasStandings(espnCode: string, year: number): Promise<boolean> {
  try {
    const url = new URL(
      `https://site.api.espn.com/apis/v2/sports/soccer/${espnCode}/standings`,
    )
    url.searchParams.set('season', String(year))
    const res = await fetch(url)
    if (!res.ok) return false
    const data = (await res.json()) as EspnStandingsResponse
    const entries = (data.children ?? []).flatMap((child) => child.standings?.entries ?? [])
    if (entries.length === 0) return false
    return entries.some((entry) => readStat(entry, 'gamesPlayed') > 0)
  } catch {
    return false
  }
}

/** All ESPN seasons for a league (newest first), with display labels. */
export async function fetchLeagueSeasons(leagueId: LeagueId): Promise<LeagueSeasonOption[]> {
  const cached = allSeasonsCache.get(leagueId)
  if (cached) return cached

  const league = getLeague(leagueId)
  const years = await listLeagueSeasonYears(league.espnCode)
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
  allSeasonsCache.set(leagueId, options)
  return options
}

/**
 * Seasons with a real league table (at least one club has played a match).
 * Empty/preseason shells are listed after seasons that have games, so the
 * default picker selection is the newest completed/in-progress table.
 */
export async function fetchLeagueStandingSeasons(
  leagueId: LeagueId,
): Promise<LeagueSeasonOption[]> {
  const cacheKey = `standings:${leagueId}`
  const cached = allSeasonsCache.get(cacheKey)
  if (cached) return cached

  const league = getLeague(leagueId)
  if (!league.hasStandings) return []

  const years = await listLeagueSeasonYears(league.espnCode)
  if (years.length === 0) return []

  const withData: number[] = []
  const concurrency = 8
  for (let i = 0; i < years.length; i += concurrency) {
    const chunk = years.slice(i, i + concurrency)
    const checks = await Promise.all(
      chunk.map(async (year) => ((await seasonHasStandings(league.espnCode, year)) ? year : null)),
    )
    for (const year of checks) {
      if (year != null) withData.push(year)
    }
  }

  const withDataSet = new Set(withData)
  const orderedYears = [
    ...withData,
    ...years.filter((year) => !withDataSet.has(year)),
  ]

  const options = await Promise.all(
    orderedYears.map(async (year) => {
      const labels = await fetchSeasonLabels(league.espnCode, year)
      return {
        year,
        label: labels.label,
        shortLabel: labels.shortLabel,
      } satisfies LeagueSeasonOption
    }),
  )
  allSeasonsCache.set(cacheKey, options)
  return options
}

/**
 * Seasons for a league that have ESPN leaderboard data (newest first).
 * Used by Stat Leaders / Player stats season pickers.
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

  const options = await Promise.all(
    withData.map(async (year) => {
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
    citizenship?: string
    displayBirthPlace?: string
    citizenshipCountry?: { abbreviation?: string }
    headshot?: { href?: string }
    position?: { displayName?: string; abbreviation?: string }
    team?: {
      id?: string
      displayName?: string
      shortDisplayName?: string
      slug?: string
      logos?: Array<{ href?: string }>
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
  { key: 'totalGoals', label: 'Goals' },
  { key: 'goalAssists', label: 'Assists' },
  { key: 'starts', label: 'Starts' },
  { key: 'appearances', label: 'Appearances' },
  { key: 'totalShots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on goal' },
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

function buildOrderedSeasonStatsFromOverview(
  overview: EspnOverviewPayload,
  leagueSlug: string,
): PlayerSeasonStatLine[] {
  const names = overview.statistics?.names ?? []
  const labels = overview.statistics?.displayNames ?? []
  const splits = overview.statistics?.splits ?? []
  const preferred =
    splits.find((split) => split.leagueSlug === leagueSlug) ||
    splits.find((split) => (split.displayName || '').toLowerCase().includes('premier')) ||
    null
  // Do not fall back to splits[0] — that is often a national-team friendly, not club season.
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
  const leagueRows = rows.filter((item) => item.leagueSlug === leagueSlug)
  const candidates =
    leagueRows.length > 0
      ? leagueRows
      : rows.filter((item) => item.leagueSlug && item.leagueSlug.includes('.'))

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

async function fetchAthleteLeagueSeasonStats(
  playerId: string,
  leagueSlug: string,
  preferredYear?: number,
): Promise<{
  stats: PlayerSeasonStatLine[]
  seasonLabel: string | null
  seasonYear: number | null
  previousStats: PlayerSeasonStatLine[]
  previousSeasonLabel: string | null
  availableYears: number[]
}> {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${playerId}/stats?league=${encodeURIComponent(leagueSlug)}`
  const res = await fetch(url)
  if (!res.ok) {
    return {
      stats: [],
      seasonLabel: null,
      seasonYear: null,
      previousStats: [],
      previousSeasonLabel: null,
      availableYears: [],
    }
  }
  const payload = (await res.json()) as EspnAthleteStatsPayload
  const category = payload.categories?.[0]
  const rows = category?.statistics ?? []
  const availableYears = [
    ...new Set(
      rows
        .filter((item) => item.leagueSlug === leagueSlug || item.leagueSlug?.includes('.'))
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

/** Season years available for a player's club-league season stats board. */
export async function fetchPlayerSeasonOptions(
  leagueId: LeagueId,
  playerId: string,
): Promise<LeagueSeasonOption[]> {
  const league = getLeague(leagueId)
  const bundle = await fetchAthleteLeagueSeasonStats(playerId, league.espnCode)
  return Promise.all(
    bundle.availableYears.map(async (year) => {
      const labels = await fetchSeasonLabels(league.espnCode, year)
      return {
        year,
        label: labels.label,
        shortLabel: labels.shortLabel,
      } satisfies LeagueSeasonOption
    }),
  )
}

/** Reload a player's season stats (+ prior year compare) for a chosen season. */
export async function fetchPlayerSeasonStatsForYear(
  leagueId: LeagueId,
  playerId: string,
  seasonYear?: number,
): Promise<{
  stats: PlayerSeasonStatLine[]
  seasonLabel: string | null
  seasonYear: number | null
  previousStats: PlayerSeasonStatLine[]
  previousSeasonLabel: string | null
}> {
  const league = getLeague(leagueId)
  const bundle = await fetchAthleteLeagueSeasonStats(playerId, league.espnCode, seasonYear)
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
  return { seasons: [], seasonIndex: 0, page: 1, pageCount: 0, done: true }
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
    page: 1,
    pageCount: 1,
    done: false,
  }
}

/**
 * Pull the next batch of rated appearances (across season pages) for infinite scroll.
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
    const result = await fetchEventLogPage(leagueEspnCode, seasonYear, playerId, page)
    pageCount = result.pageCount

    if (result.items.length === 0 || pageCount === 0) {
      seasonIndex += 1
      page = 1
      pageCount = 1
      continue
    }

    const played = result.items.filter((item) => item.played !== false)
    const expanded = await mapPool(played, EVENTLOG_FETCH_CONCURRENCY, (item) =>
      ratingFromEventLogItem(item, positionAbbrev, leagueEspnCode),
    )

    for (const row of expanded) {
      if (seen.has(row.eventId)) continue
      seen.add(row.eventId)
      ratings.push(row)
      if (ratings.length >= RATINGS_BATCH_TARGET) break
    }

    if (page >= pageCount) {
      seasonIndex += 1
      page = 1
      pageCount = 1
    } else {
      page += 1
    }
  }

  const done = seasonIndex >= cursor.seasons.length
  return {
    ratings,
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
  return mapPool(rows, EVENTLOG_FETCH_CONCURRENCY, async (row) => {
    if (row.opponent && row.date) return row
    const meta = await fetchMatchMeta(leagueEspnCode, row.eventId, playerTeamId)
    return { ...row, ...meta }
  })
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
  const fromSlug = leagueIdFromTeamSlug(athlete.team?.slug)
  const effectiveLeagueId =
    fromSlug && (isInternationalLeague(leagueId) || isContinentalLeague(leagueId))
      ? fromSlug
      : leagueId
  const league = getLeague(effectiveLeagueId)

  const [bioRes, overviewRes, seasonStatsBundle] = await Promise.all([
    fetch(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${playerId}/bio`),
    fetch(
      `https://site.api.espn.com/apis/common/v3/sports/soccer/${league.espnCode}/athletes/${playerId}/overview`,
    ),
    fetchAthleteLeagueSeasonStats(playerId, league.espnCode),
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
    (seasonStats.length > 0 ? `${league.name} season` : undefined)

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
      citizenship: athlete.citizenship || origin || undefined,
      represents,
      representsNationalTeam,
      position: athlete.position?.displayName,
      positionAbbrev,
      teamId: athlete.team?.id,
      teamName: athlete.team?.displayName || athlete.team?.shortDisplayName,
      teamLogoUrl: athlete.team?.logos?.[0]?.href,
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
