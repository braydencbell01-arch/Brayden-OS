import { getLeague, type LeagueId } from '../leagues'
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
  MatchDetailStats,
  MatchLineupPlayer,
  MatchLineupSide,
  MatchMoment,
  PlayerClubStint,
  PlayerProfile,
  PlayerRecentMatchRating,
  PlayerSeasonStatLine,
  StandingRow,
  TeamMatchStatLine,
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
    standings?: { entries?: EspnStandingEntry[] }
  }>
}

function statMap(stats: EspnStat[] | undefined): Map<string, string> {
  const map = new Map<string, string>()
  for (const stat of stats ?? []) {
    if (!stat.name) continue
    map.set(stat.name, stat.displayValue ?? '—')
  }
  return map
}

function formatPossession(value: string): string {
  if (!value || value === '—') return value || '—'
  return value.includes('%') ? value : `${value}%`
}

function buildStatLines(home: Map<string, string>, away: Map<string, string>): TeamMatchStatLine[] {
  return STAT_KEYS.map(({ key, label }) => {
    const homeRaw = home.get(key) ?? '—'
    const awayRaw = away.get(key) ?? '—'
    return {
      key,
      label,
      home: key === 'possessionPct' ? formatPossession(homeRaw) : homeRaw,
      away: key === 'possessionPct' ? formatPossession(awayRaw) : awayRaw,
    }
  }).filter((line) => !(line.home === '—' && line.away === '—'))
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
  }
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
      const teamName = side.team?.displayName || side.team?.shortDisplayName || 'Team'
      const homeAway: 'home' | 'away' = side.homeAway === 'away' ? 'away' : 'home'
      const players = (side.roster ?? []).flatMap((entry) => {
          const id = entry.athlete?.id
          if (!id) return []
          const name = entry.athlete?.displayName || 'Unknown'
          const shortName = entry.athlete?.shortName || name
          const positionAbbrev = entry.position?.abbreviation || '—'
          const jerseyUrl = entry.athlete?.jerseyImages?.[0]?.href
          const stats = toMatchPlayerStats(entry)
          const appeared = stats.appearances > 0 || Boolean(entry.starter) || Boolean(entry.active)
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
        bench: players.filter((player) => !player.starter && player.rating != null),
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
}

type EspnSiteLeader = {
  displayValue?: string
  shortDisplayValue?: string
  value?: number
  athlete?: EspnSiteLeaderAthlete
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
  const url = new URL(
    `https://site.api.espn.com/apis/v2/sports/soccer/${league.espnCode}/standings`,
  )
  if (season != null) url.searchParams.set('season', String(season))
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Could not load ${league.name} table (${res.status})`)
  }

  const data = (await res.json()) as EspnStandingsResponse
  const entries = data.children?.[0]?.standings?.entries ?? []

  return entries
    .map((entry, index) => {
      const teamName = entry.team?.displayName || 'Unknown'
      return {
        rank: readStat(entry, 'rank') || index + 1,
        teamId: entry.team?.id || teamName.toLowerCase().replace(/\s+/g, '-'),
        team: teamName,
        shortName: entry.team?.shortDisplayName || entry.team?.displayName || '—',
        played: readStat(entry, 'gamesPlayed'),
        won: readStat(entry, 'wins'),
        drawn: readStat(entry, 'ties'),
        lost: readStat(entry, 'losses'),
        goalDiff: readStat(entry, 'pointDifferential'),
        points: readStat(entry, 'points'),
        goalsFor: readStat(entry, 'pointsFor'),
        goalsAgainst: readStat(entry, 'pointsAgainst'),
        note: entry.note?.description,
      }
    })
    .sort((a, b) => a.rank - b.rank || b.points - a.points)
}

export async function fetchLeagueStandings(leagueId: LeagueId): Promise<StandingRow[]> {
  return fetchStandingsForSeason(leagueId)
}

function teamLeadersFromStandings(rows: StandingRow[], limit: number): LeaderCategory[] {
  const played = rows.filter((row) => row.played > 0)
  if (played.length === 0) return []

  const byPoints = [...played].sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff)
  const byGoals = [...played].sort((a, b) => b.goalsFor - a.goalsFor || b.goalDiff - a.goalDiff)
  const byDiff = [...played].sort((a, b) => b.goalDiff - a.goalDiff || b.points - a.points)

  const toEntries = (list: StandingRow[], valueOf: (row: StandingRow) => number): LeaderEntry[] =>
    list.slice(0, limit).map((row, index) => ({
      rank: index + 1,
      id: row.teamId,
      name: row.team,
      shortName: row.shortName,
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
        const nameText = athlete?.displayName || 'Unknown'
        return {
          rank: index + 1,
          id: athlete?.id || `${name}-${index}`,
          name: nameText,
          shortName: athlete?.shortName || nameText,
          value: typeof leader.value === 'number' ? leader.value : Number(leader.value) || 0,
          displayValue: leader.shortDisplayValue || leader.displayValue || String(leader.value ?? '—'),
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
): Promise<LeagueLeaders> {
  const league = getLeague(leagueId)
  const nowYear = new Date().getUTCFullYear()
  const yearsToTry = [nowYear, nowYear - 1, nowYear - 2]

  let season = nowYear
  let seasonLabel = String(nowYear)
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
    throw new Error(`No ${league.name} stats leaders available yet`)
  }

  return {
    leagueId,
    season,
    seasonLabel,
    categories: [...playerCategories, ...teamCategories],
    fetchedAt: Date.now(),
  }
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
    splits?: Array<{ displayName?: string; stats?: string[] }>
  }
  gameLog?: {
    statistics?: Array<{
      names?: string[]
      events?: Array<{ eventId?: string; stats?: string[] }>
    }>
  }
}

/** Season stats grid order (left→right, top→bottom). */
const SEASON_STAT_ORDER: Array<{ key: string; label: string }> = [
  { key: 'totalGoals', label: 'Goals' },
  { key: 'goalAssists', label: 'Assists' },
  { key: 'starts', label: 'Starts' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'totalShots', label: 'Shots' },
  { key: 'shotsOnTarget', label: 'Shots on goal' },
  { key: 'foulsCommitted', label: 'Fouls committed' },
  { key: 'foulsSuffered', label: 'Fouls suffered' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' },
]

function buildOrderedSeasonStats(overview: EspnOverviewPayload): PlayerSeasonStatLine[] {
  const names = overview.statistics?.names ?? []
  const labels = overview.statistics?.displayNames ?? []
  const values = overview.statistics?.splits?.[0]?.stats ?? []
  if (names.length === 0 || values.length === 0) return []

  const byKey = new Map<string, { label: string; value: string }>()
  names.forEach((name, index) => {
    if (!name) return
    byKey.set(name, {
      label: labels[index] || name,
      value: values[index] || '0',
    })
  })

  const ordered: PlayerSeasonStatLine[] = []
  const used = new Set<string>()

  for (const { key, label } of SEASON_STAT_ORDER) {
    const found = byKey.get(key)
    if (!found) continue
    ordered.push({ label, value: found.value })
    used.add(key)
  }

  // Keep any extra ESPN stats after the preferred grid (stable API order).
  names.forEach((name) => {
    if (!name || used.has(name)) return
    const found = byKey.get(name)
    if (!found) return
    ordered.push({ label: found.label, value: found.value })
  })

  return ordered
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
      }

      const breakdown = rateMatchPerformance(
        stats,
        positionGroupFromAbbrev(positionAbbrev),
        { minutesPlayed: 90, live: false },
      )
      if (!breakdown || !event.eventId) return null

      return {
        eventId: event.eventId,
        rating: breakdown.rating,
        goals: stats.totalGoals,
        assists: stats.goalAssists,
        starter,
      } satisfies PlayerRecentMatchRating
    })
    .filter((row): row is PlayerRecentMatchRating => row != null)
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
    seasons: stint.seasons || '—',
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

export async function fetchPlayerProfile(
  leagueId: LeagueId,
  playerId: string,
): Promise<PlayerProfile> {
  const league = getLeague(leagueId)
  const [athleteRes, bioRes, overviewRes] = await Promise.all([
    fetch(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${playerId}`),
    fetch(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${playerId}/bio`),
    fetch(
      `https://site.api.espn.com/apis/common/v3/sports/soccer/${league.espnCode}/athletes/${playerId}/overview`,
    ),
  ])

  if (!athleteRes.ok) {
    throw new Error(`Could not load player profile (${athleteRes.status})`)
  }

  const athleteJson = (await athleteRes.json()) as EspnAthletePayload
  const bioJson = bioRes.ok ? ((await bioRes.json()) as EspnBioPayload) : { teamHistory: [] }
  const overviewJson = overviewRes.ok
    ? ((await overviewRes.json()) as EspnOverviewPayload)
    : {}

  const athlete = athleteJson.athlete
  if (!athlete?.id) throw new Error('Player not found')

  const name = athlete.displayName || athlete.fullName || 'Unknown'
  const shortName = athlete.shortName || name
  const positionAbbrev = athlete.position?.abbreviation
  const recentRatings = parseGameLogRatings(overviewJson, positionAbbrev)
  const averageRating = rateSeasonForm(recentRatings.map((row) => row.rating))
  const seasonStats = buildOrderedSeasonStats(overviewJson)

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
    leagueId,
    seasonStats,
    averageRating,
    recentRatings,
    clubHistory,
    nationalHistory,
    fetchedAt: Date.now(),
  }
}
