import { getLeague, inferSoccerSeasonStartYear, type LeagueId } from '../leagues'
import { fetchEspnSeasonScoreboardWindow, fetchLeagueEditionYears, fetchLeagueStandings } from './espn'

export type LeagueChampion = {
  teamId: string
  name: string
  shortName: string
}

export type LeagueMostTitles = LeagueChampion & {
  titles: number
  lastWonSeason: number
}

export type LeagueOverviewFacts = {
  foundedYear: number | null
  seasonMatchCount: number | null
  champion: LeagueChampion | null
  mostTitles: LeagueMostTitles | null
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
  'uefa-nations-a': 2018,
  'uefa-nations-b': 2018,
  'uefa-nations-c': 2018,
  'uefa-nations-d': 2018,
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

/**
 * Full-season match totals that are not a plain double round-robin
 * (or that we want pinned so mid-season ESPN calendars cannot shrink them).
 */
const SEASON_MATCH_TOTAL: Partial<Record<LeagueId, number>> = {
  'premier-league': 380,
  'la-liga': 380,
  'serie-a': 380,
  bundesliga: 306,
  'ligue-1': 306,
  eredivisie: 306,
  'primeira-liga': 306,
  'eng-championship': 552,
  'eng-league-one': 552,
  'eng-league-two': 552,
  'esp-segunda': 462,
  'ita-serie-b': 380,
  'ger-2-bundesliga': 306,
  'fra-ligue-2': 306,
  'scottish-premiership': 228,
  'scottish-championship': 180,
  mls: 510,
  brasileirao: 380,
  'liga-mx': 153,
  'liga-profesional': 240,
  'belgian-pro-league': 240,
  'turkish-super-lig': 306,
  'austrian-bundesliga': 132,
  'swiss-super-league': 180,
  superliga: 192,
  allsvenskan: 240,
  eliteserien: 240,
  'j1-league': 380,
  'saudi-pro-league': 306,
  'a-league': 182,
  'community-shield': 1,
  'spanish-supercopa': 3,
  'italian-supercoppa': 1,
  'german-supercup': 1,
  'trophee-des-champions': 1,
  'uefa-super-cup': 1,
  'johan-cruyff-shield': 1,
  'brazilian-supercopa': 1,
  'argentine-supercopa': 1,
  'campeon-de-campeones': 1,
  'fifa-intercontinental': 1,
}

/** Leagues that should not use n×(n−1) even if standings length is known. */
const NON_DOUBLE_ROUND_ROBIN = new Set<LeagueId>([
  'scottish-premiership',
  'scottish-championship',
  'mls',
  'liga-mx',
  'liga-profesional',
  'belgian-pro-league',
  'austrian-bundesliga',
  'swiss-super-league',
  'superliga',
  'a-league',
  'uefa-nations-a',
  'uefa-nations-b',
  'uefa-nations-c',
  'uefa-nations-d',
  'uefa-champions',
  'uefa-europa',
  'uefa-conference',
  'fifa-world',
  'uefa-euro',
  'conmebol-america',
  'caf-nations',
  'afc-asian-cup',
  'concacaf-gold',
  'fifa-worldq',
  'uefa-euro-qual',
])

const mostTitlesCache = new Map<string, LeagueMostTitles | null>()
const overviewFactsCache = new Map<string, LeagueOverviewFacts>()

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
 * How many matches a full season of this competition contains — not how many
 * are currently scheduled, played, or remaining on ESPN's live calendar.
 */
export async function fetchLeagueSeasonMatchCount(
  leagueId: LeagueId,
  seasonYear = inferSoccerSeasonStartYear(),
): Promise<number | null> {
  const pinned = SEASON_MATCH_TOTAL[leagueId]
  if (pinned != null) return pinned

  const league = getLeague(leagueId)
  if (
    league.format === 'league' &&
    league.hasStandings &&
    !NON_DOUBLE_ROUND_ROBIN.has(leagueId)
  ) {
    try {
      const rows = await fetchLeagueStandings(leagueId, seasonYear)
      const n = rows.length
      if (n >= 2) return n * (n - 1)
    } catch {
      // fall through to ESPN calendar
    }
  }

  // Prefer the previous completed season calendar (usually fully published).
  const previous = await fetchEspnSeasonEventCount(leagueId, seasonYear - 1)
  if (previous != null && previous > 0) return previous
  return fetchEspnSeasonEventCount(leagueId, seasonYear)
}

async function fetchEspnSeasonEventCount(
  leagueId: LeagueId,
  seasonYear: number,
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
  const { from, to } = await fetchEspnSeasonScoreboardWindow(league.espnCode, seasonYear)
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/scoreboard?dates=${from}-${to}&limit=400`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      events?: Array<{
        date?: string
        name?: string
        shortName?: string
        competitions?: Array<{
          notes?: Array<{ text?: string; type?: string; headline?: string }>
          type?: { text?: string; abbreviation?: string }
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

    const isCupLike =
      league.format === 'cup' ||
      league.format === 'supercup' ||
      league.format === 'tournament'

    const looksLikeFinal = (event: (typeof completed)[number]): boolean => {
      const comp = event.competitions?.[0]
      const blob = [
        event.name,
        event.shortName,
        comp?.type?.text,
        comp?.type?.abbreviation,
        ...(comp?.notes ?? []).flatMap((note) => [note.text, note.type, note.headline]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!blob) return false
      if (/\b(semi|quarter|round of|1\/8|1\/4|1\/2|play-?off|group)\b/.test(blob)) {
        return false
      }
      return /\bfinal\b/.test(blob)
    }

    const pickWinner = (
      event: (typeof completed)[number],
    ): LeagueChampion | null => {
      const competitors = event.competitions?.[0]?.competitors ?? []
      const winner = competitors.find((c) => c.winner)
      if (!winner?.team?.id) return null
      return {
        teamId: winner.team.id,
        name: winner.team.displayName || winner.team.shortDisplayName || '',
        shortName:
          winner.team.shortDisplayName || winner.team.displayName || '',
      }
    }

    // Cups: prefer an explicit Final, then the chronologically last completed match.
    if (isCupLike) {
      const finalEvent = completed.find(looksLikeFinal)
      if (finalEvent) {
        const fromFinal = pickWinner(finalEvent)
        if (fromFinal) return fromFinal
      }
    }

    for (const event of completed) {
      const winner = pickWinner(event)
      if (winner) return winner
    }
  } catch {
    return null
  }
  return null
}

/**
 * Reigning champion: last completed table season for leagues, otherwise the
 * most recent ESPN edition final (summer tournaments included).
 */
export async function fetchLeagueChampion(
  leagueId: LeagueId,
  currentSeasonYear = inferSoccerSeasonStartYear(),
): Promise<LeagueChampion | null> {
  const league = getLeague(leagueId)
  const editions = await fetchLeagueEditionYears(leagueId)

  if (league.hasStandings && league.format === 'league') {
    const previous =
      editions.find((year) => year < currentSeasonYear) ?? currentSeasonYear - 1
    const fromTable = await championFromStandings(leagueId, previous)
    if (fromTable) return fromTable
    return championFromSeasonFinal(leagueId, previous)
  }

  // Cups / tournaments: walk newest ESPN editions until a final winner appears.
  const years = editions.length > 0 ? editions : [currentSeasonYear, currentSeasonYear - 1]
  for (const year of years) {
    const fromFinal = await championFromSeasonFinal(leagueId, year)
    if (fromFinal) return fromFinal
  }
  return null
}

async function championForSeason(
  leagueId: LeagueId,
  seasonYear: number,
): Promise<LeagueChampion | null> {
  const league = getLeague(leagueId)
  if (league.hasStandings && league.format === 'league') {
    const fromTable = await championFromStandings(leagueId, seasonYear)
    if (fromTable) return fromTable
  }
  return championFromSeasonFinal(leagueId, seasonYear)
}

/**
 * Curated all-time title leaders (ESPN team ids) when reconstructed
 * ESPN season tallies are incomplete. Ties already broken by most recent win
 * in the live tallier; these rows are authoritative counts.
 */
const CURATED_MOST_TITLES: Partial<
  Record<LeagueId, LeagueMostTitles>
> = {
  'premier-league': {
    teamId: '360',
    name: 'Manchester United',
    shortName: 'Man United',
    titles: 13,
    lastWonSeason: 2012,
  },
  'la-liga': {
    teamId: '86',
    name: 'Real Madrid',
    shortName: 'Real Madrid',
    titles: 36,
    lastWonSeason: 2023,
  },
  'serie-a': {
    teamId: '111',
    name: 'Juventus',
    shortName: 'Juventus',
    titles: 36,
    lastWonSeason: 2019,
  },
  bundesliga: {
    teamId: '132',
    name: 'Bayern Munich',
    shortName: 'Bayern',
    titles: 33,
    lastWonSeason: 2024,
  },
  'ligue-1': {
    teamId: '160',
    name: 'Paris Saint-Germain',
    shortName: 'PSG',
    titles: 12,
    lastWonSeason: 2024,
  },
  'uefa-champions': {
    teamId: '86',
    name: 'Real Madrid',
    shortName: 'Real Madrid',
    titles: 15,
    lastWonSeason: 2023,
  },
  'uefa-europa': {
    teamId: '243',
    name: 'Sevilla',
    shortName: 'Sevilla',
    titles: 7,
    lastWonSeason: 2022,
  },
  'fa-cup': {
    teamId: '359',
    name: 'Arsenal',
    shortName: 'Arsenal',
    titles: 14,
    lastWonSeason: 2019,
  },
  'efl-cup': {
    teamId: '364',
    name: 'Liverpool',
    shortName: 'Liverpool',
    titles: 10,
    lastWonSeason: 2023,
  },
  'copa-del-rey': {
    teamId: '83',
    name: 'Barcelona',
    shortName: 'Barcelona',
    titles: 31,
    lastWonSeason: 2024,
  },
  'dfb-pokal': {
    teamId: '132',
    name: 'Bayern Munich',
    shortName: 'Bayern',
    titles: 20,
    lastWonSeason: 2019,
  },
  'coppa-italia': {
    teamId: '111',
    name: 'Juventus',
    shortName: 'Juventus',
    titles: 15,
    lastWonSeason: 2023,
  },
  'coupe-de-france': {
    teamId: '160',
    name: 'Paris Saint-Germain',
    shortName: 'PSG',
    titles: 16,
    lastWonSeason: 2024,
  },
  eredivisie: {
    teamId: '139',
    name: 'Ajax',
    shortName: 'Ajax',
    titles: 36,
    lastWonSeason: 2021,
  },
  'scottish-premiership': {
    teamId: '256',
    name: 'Celtic',
    shortName: 'Celtic',
    titles: 10,
    lastWonSeason: 2024,
  },
  'primeira-liga': {
    teamId: '1929',
    name: 'Benfica',
    shortName: 'Benfica',
    titles: 38,
    lastWonSeason: 2022,
  },
  'fifa-world': {
    teamId: '205',
    name: 'Brazil',
    shortName: 'Brazil',
    titles: 5,
    lastWonSeason: 2002,
  },
  'uefa-euro': {
    teamId: '164',
    name: 'Spain',
    shortName: 'Spain',
    titles: 4,
    lastWonSeason: 2024,
  },
}

/**
 * Team with the most titles in this competition. Ties go to the most recent winner.
 */
export async function fetchLeagueMostTitles(
  leagueId: LeagueId,
  currentSeasonYear = inferSoccerSeasonStartYear(),
): Promise<LeagueMostTitles | null> {
  const cacheKey = `${leagueId}:${currentSeasonYear}`
  if (mostTitlesCache.has(cacheKey)) return mostTitlesCache.get(cacheKey) ?? null

  const curated = CURATED_MOST_TITLES[leagueId]
  if (curated) {
    mostTitlesCache.set(cacheKey, curated)
    return curated
  }

  const founded = leagueFoundedYear(leagueId) ?? currentSeasonYear - 30
  const earliest = Math.max(founded, currentSeasonYear - 55)
  const latest = currentSeasonYear - 1
  if (latest < earliest) {
    mostTitlesCache.set(cacheKey, null)
    return null
  }

  const years: number[] = []
  for (let year = latest; year >= earliest; year -= 1) years.push(year)

  const tallies = new Map<
    string,
    { champ: LeagueChampion; titles: number; lastWonSeason: number }
  >()

  const batchSize = 8
  for (let i = 0; i < years.length; i += batchSize) {
    const batch = years.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (year) => ({ year, champ: await championForSeason(leagueId, year) })),
    )
    for (const { year, champ } of results) {
      if (!champ?.teamId) continue
      const existing = tallies.get(champ.teamId)
      if (existing) {
        existing.titles += 1
        if (year > existing.lastWonSeason) {
          existing.lastWonSeason = year
          existing.champ = champ
        }
      } else {
        tallies.set(champ.teamId, {
          champ,
          titles: 1,
          lastWonSeason: year,
        })
      }
    }
  }

  let best: LeagueMostTitles | null = null
  for (const row of tallies.values()) {
    const candidate: LeagueMostTitles = {
      ...row.champ,
      titles: row.titles,
      lastWonSeason: row.lastWonSeason,
    }
    if (
      !best ||
      candidate.titles > best.titles ||
      (candidate.titles === best.titles &&
        candidate.lastWonSeason > best.lastWonSeason)
    ) {
      best = candidate
    }
  }

  mostTitlesCache.set(cacheKey, best)
  return best
}

export async function fetchLeagueOverviewFacts(
  leagueId: LeagueId,
  seasonYear?: number,
): Promise<LeagueOverviewFacts> {
  const editions = await fetchLeagueEditionYears(leagueId)
  const resolvedYear =
    seasonYear ??
    editions.find((year) => year === inferSoccerSeasonStartYear()) ??
    editions[0] ??
    inferSoccerSeasonStartYear()
  const cacheKey = `${leagueId}:${resolvedYear}`
  const cached = overviewFactsCache.get(cacheKey)
  if (cached) return cached

  const previousSeasonYear =
    editions.find((year) => year < resolvedYear) ?? resolvedYear - 1
  const [seasonMatchCount, champion, mostTitles] = await Promise.all([
    fetchLeagueSeasonMatchCount(leagueId, resolvedYear),
    fetchLeagueChampion(leagueId, resolvedYear),
    fetchLeagueMostTitles(leagueId, resolvedYear),
  ])

  const facts: LeagueOverviewFacts = {
    foundedYear: leagueFoundedYear(leagueId),
    seasonMatchCount,
    champion,
    mostTitles,
    seasonYear: resolvedYear,
    previousSeasonYear,
  }
  overviewFactsCache.set(cacheKey, facts)
  return facts
}
