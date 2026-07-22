import { getLeague, type LeagueId } from '../leagues'
import type {
  LeaderCategory,
  LeaderEntry,
  LeagueLeaders,
  MatchDetailStats,
  MatchMoment,
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

type EspnStat = { name?: string; displayValue?: string; label?: string }
type EspnBoxTeam = {
  homeAway?: string
  statistics?: EspnStat[]
  team?: { displayName?: string }
}

type EspnKeyEvent = {
  id?: string
  text?: string
  scoringPlay?: boolean
  clock?: { displayValue?: string }
  type?: { text?: string; type?: string }
}

type EspnSummary = {
  boxscore?: { teams?: EspnBoxTeam[] }
  keyEvents?: EspnKeyEvent[]
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

  return {
    matchId,
    espnEventId,
    leagueId,
    fetchedAt: Date.now(),
    lines: buildStatLines(statMap(home?.statistics), statMap(away?.statistics)),
    moments: buildMoments(data.keyEvents),
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

function teamLeadersFromStandings(
  rows: StandingRow[],
  limit: number,
): LeaderCategory[] {
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
