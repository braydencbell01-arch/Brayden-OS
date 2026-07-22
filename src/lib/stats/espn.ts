import { getLeague, type LeagueId } from '../leagues'
import {
  positionGroupFromAbbrev,
  rateMatchPerformance,
  rateSeasonForm,
  type MatchPlayerStats,
} from './rating'
import type {
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

export function playerPhotoUrl(playerId: string, jerseyUrl?: string): string {
  if (jerseyUrl) return jerseyUrl
  return `https://a.espncdn.com/i/headshots/soccer/players/full/${playerId}.png`
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
            photoUrl: playerPhotoUrl(id, jerseyUrl),
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

export async function fetchLeagueStandings(leagueId: LeagueId): Promise<StandingRow[]> {
  const league = getLeague(leagueId)
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${league.espnCode}/standings`
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
        note: entry.note?.description,
      }
    })
    .sort((a, b) => a.rank - b.rank || b.points - a.points)
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
    seasons?: string
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

  const seasonStats: PlayerSeasonStatLine[] = []
  const split = overviewJson.statistics?.splits?.[0]
  const labels = overviewJson.statistics?.displayNames ?? []
  if (split?.stats && labels.length > 0) {
    split.stats.forEach((value, index) => {
      if (!labels[index]) return
      seasonStats.push({ label: labels[index], value: value || '0' })
    })
  }

  const clubHistory = (bioJson.teamHistory ?? []).flatMap((stint) => {
    if (!stint.displayName) return []
    const row: PlayerClubStint = {
      teamId: stint.id || stint.displayName.toLowerCase().replace(/\s+/g, '-'),
      teamName: stint.displayName,
      logoUrl: stint.logo,
      seasons: stint.seasons || '—',
    }
    return [row]
  })

  return {
    id: athlete.id,
    name,
    shortName,
    photoUrl: playerPhotoUrl(athlete.id),
    jersey: athlete.jersey,
    age: athlete.age,
    height: athlete.displayHeight,
    weight: athlete.displayWeight,
    citizenship: athlete.citizenship,
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
    fetchedAt: Date.now(),
  }
}
