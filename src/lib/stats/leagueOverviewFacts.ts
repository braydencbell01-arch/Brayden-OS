import { getLeague, inferSoccerSeasonStartYear, type LeagueId } from '../leagues'
import { fetchLeagueStandings } from './espn'

export type LeagueChampion = {
  teamId: string
  name: string
  shortName: string
}

export type LeagueOverviewFacts = {
  foundedYear: number | null
  seasonMatchCount: number | null
  champion: LeagueChampion | null
  seasonYear: number
  previousSeasonYear: number
}

/** Best-effort founding years for competitions we surface in BrayStats. */
const LEAGUE_FOUNDED_YEAR: Partial<Record<LeagueId, number>> = {
  'premier-league': 1992,
  'fa-cup': 1871,
  'efl-cup': 1960,
  'community-shield': 1908,
  'efl-trophy': 1983,
  'la-liga': 1929,
  'copa-del-rey': 1903,
  'spanish-supercopa': 1982,
  'serie-a': 1898,
  'coppa-italia': 1922,
  'italian-supercoppa': 1988,
  'bundesliga': 1963,
  'dfb-pokal': 1935,
  'german-supercup': 1987,
  'ligue-1': 1932,
  'coupe-de-france': 1917,
  'trophee-des-champions': 1955,
  'coupe-de-la-ligue': 1994,
  'uefa-champions': 1955,
  'uefa-europa': 1971,
  'uefa-conference': 2021,
  'uefa-champions-qual': 1955,
  'uefa-europa-qual': 1971,
  'uefa-conference-qual': 2021,
  'conmebol-libertadores': 1960,
  'conmebol-sudamericana': 2002,
  'caf-champions': 1964,
  'afc-champions': 1967,
  'afc-champions-two': 2004,
  'afc-champions-qual': 1967,
  'concacaf-champions': 1962,
  'fifa-club-world-cup': 2000,
  'fifa-intercontinental': 2024,
  'uefa-super-cup': 1972,
  'fifa-world': 1930,
  'uefa-nations': 2018,
  'uefa-euro': 1960,
  'uefa-euro-qual': 1960,
  'fifa-worldq': 1930,
  'conmebol-america': 1916,
  'caf-nations': 1957,
  'afc-asian-cup': 1956,
  'concacaf-gold': 1991,
  brasileirao: 1959,
  'copa-do-brasil': 1989,
  'brazilian-supercopa': 1990,
  'liga-mx': 1943,
  'copa-mx': 1943,
  'campeon-de-campeones': 1942,
  mls: 1996,
  'us-open-cup': 1914,
  'liga-profesional': 1891,
  'copa-argentina': 1969,
  'argentine-supercopa': 2012,
  'trofeo-de-campeones': 2012,
  eredivisie: 1956,
  'knvb-beker': 1898,
  'johan-cruyff-shield': 1949,
  'primeira-liga': 1934,
  'taca-de-portugal': 1938,
  'belgian-pro-league': 1895,
  'turkish-super-lig': 1959,
  'austrian-bundesliga': 1974,
  'swiss-super-league': 1897,
  'scottish-premiership': 2013,
  'scottish-championship': 2013,
  'scottish-cup': 1873,
  'scottish-league-cup': 1946,
  'scottish-challenge-cup': 1990,
  superliga: 1991,
  allsvenskan: 1924,
  eliteserien: 1937,
  'j1-league': 1992,
  'chinese-super-league': 2004,
  'saudi-pro-league': 1976,
  'saudi-kings-cup': 1956,
  'a-league': 2004,
  'eng-championship': 2004,
  'eng-league-one': 2004,
  'eng-league-two': 2004,
  'eng-national-league': 1979,
  'esp-segunda': 1929,
  'ita-serie-b': 1929,
  'ger-2-bundesliga': 1974,
  'fra-ligue-2': 1933,
  'czech-first-league': 1993,
  'cyprus-first-division': 1934,
}

export function leagueFoundedYear(leagueId: LeagueId): number | null {
  return LEAGUE_FOUNDED_YEAR[leagueId] ?? null
}

async function listSeasonTypeIds(
  espnCode: string,
  seasonYear: number,
): Promise<number[]> {
  try {
    const res = await fetch(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${seasonYear}/types`,
    )
    if (!res.ok) return [1]
    const data = (await res.json()) as {
      items?: Array<{ $ref?: string }>
      count?: number
    }
    const ids: number[] = []
    for (const item of data.items ?? []) {
      const match = item.$ref?.match(/\/types\/(\d+)/)
      if (match) ids.push(Number(match[1]))
    }
    if (ids.length > 0) return ids
    const count = data.count
    if (typeof count === 'number' && count > 0) {
      return Array.from({ length: count }, (_, i) => i + 1)
    }
  } catch {
    // fall through
  }
  return [1]
}

/**
 * Full-season fixture count for Aug 1 – Jul 31 (ESPN season year = August start).
 * Sums every season type so cups/knockouts are included even when later rounds
 * are not yet played.
 */
export async function fetchLeagueSeasonMatchCount(
  leagueId: LeagueId,
  seasonYear = inferSoccerSeasonStartYear(),
): Promise<number | null> {
  const league = getLeague(leagueId)
  const typeIds = await listSeasonTypeIds(league.espnCode, seasonYear)
  let total = 0
  let any = false

  await Promise.all(
    typeIds.map(async (typeId) => {
      try {
        const res = await fetch(
          `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(league.espnCode)}/seasons/${seasonYear}/types/${typeId}/events?limit=1`,
        )
        if (!res.ok) return
        const data = (await res.json()) as { count?: number }
        if (typeof data.count === 'number' && Number.isFinite(data.count)) {
          total += data.count
          any = true
        }
      } catch {
        // ignore type failures
      }
    }),
  )

  return any ? total : null
}

async function championFromStandings(
  leagueId: LeagueId,
  seasonYear: number,
): Promise<LeagueChampion | null> {
  try {
    const rows = await fetchLeagueStandings(leagueId, seasonYear)
    const top = rows.find((row) => row.rank === 1) || rows[0]
    if (!top?.teamId || !top.team) return null
    // Multi-group tables (e.g. Nations League) — only trust a single group.
    const groups = new Set(rows.map((row) => row.group || ''))
    if (groups.size > 1) return null
    return {
      teamId: top.teamId,
      name: top.team,
      shortName: top.shortName || top.team,
    }
  } catch {
    return null
  }
}

async function championFromSeasonFinal(
  leagueId: LeagueId,
  seasonYear: number,
): Promise<LeagueChampion | null> {
  const league = getLeague(leagueId)
  const from = `${seasonYear}0801`
  const to = `${seasonYear + 1}0731`
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/scoreboard?dates=${from}-${to}&limit=400`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      events?: Array<{
        date?: string
        competitions?: Array<{
          status?: { type?: { completed?: boolean } }
          competitors?: Array<{
            winner?: boolean
            score?: string
            team?: {
              id?: string
              displayName?: string
              shortDisplayName?: string
            }
          }>
        }>
      }>
    }

    const completed = (data.events ?? [])
      .filter((event) => event.competitions?.[0]?.status?.type?.completed)
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    for (const event of completed) {
      const competitors = event.competitions?.[0]?.competitors ?? []
      const winner = competitors.find((c) => c.winner)
      if (!winner?.team?.id) continue
      return {
        teamId: winner.team.id,
        name: winner.team.displayName || winner.team.shortDisplayName || '',
        shortName:
          winner.team.shortDisplayName || winner.team.displayName || '',
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Last season's winner: table top for league formats, otherwise the final
 * completed match of the previous Aug–Jul season.
 */
export async function fetchLeagueChampion(
  leagueId: LeagueId,
  currentSeasonYear = inferSoccerSeasonStartYear(),
): Promise<LeagueChampion | null> {
  const league = getLeague(leagueId)
  const previous = currentSeasonYear - 1

  if (league.hasStandings && league.format === 'league') {
    const fromTable = await championFromStandings(leagueId, previous)
    if (fromTable) return fromTable
  }

  return championFromSeasonFinal(leagueId, previous)
}

export async function fetchLeagueOverviewFacts(
  leagueId: LeagueId,
  seasonYear = inferSoccerSeasonStartYear(),
): Promise<LeagueOverviewFacts> {
  const previousSeasonYear = seasonYear - 1
  const [seasonMatchCount, champion] = await Promise.all([
    fetchLeagueSeasonMatchCount(leagueId, seasonYear),
    fetchLeagueChampion(leagueId, seasonYear),
  ])

  return {
    foundedYear: leagueFoundedYear(leagueId),
    seasonMatchCount,
    champion,
    seasonYear,
    previousSeasonYear,
  }
}
