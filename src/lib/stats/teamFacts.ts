import { getLeague, type LeagueId } from '../leagues'
import type { StandingRow } from './types'

export type TeamClubFacts = {
  teamId: string
  leagueId: LeagueId
  name: string
  shortName?: string
  nickname?: string
  /** Competition the profile is opened under. */
  leagueName: string
  /** Country of the league (clubs) or nation (national teams). */
  country: string
  city?: string
  stadium?: string
  foundedYear?: number
  standingSummary?: string
  isNational: boolean
  /** Best-effort major trophy total from public encyclopedic sources. */
  trophyCount?: number
  trophySource?: string
  fetchedAt: number
}

type EspnSiteTeamPayload = {
  team?: {
    id?: string
    displayName?: string
    shortDisplayName?: string
    abbreviation?: string
    nickname?: string
    location?: string
    standingSummary?: string
    defaultLeague?: { name?: string; shortName?: string }
  }
}

type EspnCoreTeamPayload = {
  isNational?: boolean
  location?: string
  nickname?: string
  venue?: {
    fullName?: string
    address?: { city?: string; country?: string }
  }
  form?: string
}

type SportsDbTeam = {
  idTeam?: string
  strTeam?: string
  strCountry?: string
  strStadium?: string
  strStadiumLocation?: string
  intFormedYear?: string
  strLeague?: string
  strKeywords?: string
}

function parseFoundedYear(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const year = Number(raw)
  return Number.isFinite(year) && year > 1800 && year < 2100 ? year : undefined
}

/** Sum titled counts from a Wikipedia-style extract (“14 league titles, 14 FA Cups…”). */
export function estimateTrophyCountFromText(extract: string): number | null {
  if (!extract.trim()) return null
  const pattern =
    /(\d+)\s+([A-Za-z][A-Za-z0-9 .,'’-]{0,48}?(?:titles?|cups?|shields?|troph(?:y|ies)|championships?|supercups?))/gi
  let total = 0
  let hits = 0
  for (const match of extract.matchAll(pattern)) {
    const n = Number(match[1])
    if (!Number.isFinite(n) || n <= 0 || n > 100) continue
    // Skip tiny/non-trophy noise like "1 league" without titles word already required
    total += n
    hits += 1
  }
  if (hits === 0) return null
  return total
}

async function fetchWikipediaTrophyCount(teamName: string): Promise<{
  count: number | null
  source?: string
}> {
  try {
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php')
    searchUrl.searchParams.set('action', 'opensearch')
    searchUrl.searchParams.set('search', teamName)
    searchUrl.searchParams.set('limit', '6')
    searchUrl.searchParams.set('namespace', '0')
    searchUrl.searchParams.set('format', 'json')
    searchUrl.searchParams.set('origin', '*')
    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) return { count: null }
    const searchJson = (await searchRes.json()) as [string, string[], string[], string[]]
    const titles = searchJson[1] ?? []
    const preferred =
      titles.find((title) => /F\.?C\.?$|C\.?F\.?$|S\.?C\.?$|A\.?C\.?$/i.test(title)) ||
      titles.find((title) => /football|soccer|club/i.test(title)) ||
      titles[0]
    if (!preferred) return { count: null }

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      preferred.replace(/ /g, '_'),
    )}`
    const summaryRes = await fetch(summaryUrl, {
      headers: { Accept: 'application/json' },
    })
    if (!summaryRes.ok) return { count: null }
    const summary = (await summaryRes.json()) as { extract?: string; title?: string }
    const count = estimateTrophyCountFromText(summary.extract || '')
    if (count == null) return { count: null }
    return { count, source: summary.title || preferred }
  } catch {
    return { count: null }
  }
}

async function fetchSportsDbFacts(teamName: string): Promise<{
  country?: string
  stadium?: string
  city?: string
  foundedYear?: number
  nickname?: string
}> {
  try {
    const url = new URL('https://www.thesportsdb.com/api/v1/json/3/searchteams.php')
    url.searchParams.set('t', teamName)
    const res = await fetch(url)
    if (!res.ok) return {}
    const data = (await res.json()) as { teams?: SportsDbTeam[] | null }
    const team = data.teams?.[0]
    if (!team) return {}
    const nickname = team.strKeywords?.split(',')[0]?.trim() || undefined
    return {
      country: team.strCountry || undefined,
      stadium: team.strStadium || undefined,
      city: team.strStadiumLocation || undefined,
      foundedYear: parseFoundedYear(team.intFormedYear),
      nickname,
    }
  } catch {
    return {}
  }
}

/**
 * Descriptive club/national-team facts for the team profile identity box.
 * Combines ESPN clubhouse + venue, TheSportsDB, and Wikipedia trophy estimates.
 */
export async function fetchTeamClubFacts(
  leagueId: LeagueId,
  teamId: string,
  fallbackName: string,
): Promise<TeamClubFacts> {
  const league = getLeague(leagueId)
  const [siteRes, coreRes] = await Promise.all([
    fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/teams/${encodeURIComponent(teamId)}`,
    ),
    fetch(`https://sports.core.api.espn.com/v2/sports/soccer/teams/${encodeURIComponent(teamId)}`),
  ])

  const siteJson = siteRes.ok ? ((await siteRes.json()) as EspnSiteTeamPayload) : {}
  const coreJson = coreRes.ok ? ((await coreRes.json()) as EspnCoreTeamPayload) : {}
  const siteTeam = siteJson.team

  const name = siteTeam?.displayName || fallbackName
  const isNational = Boolean(coreJson.isNational) || league.kind === 'international'

  const sportsDb = await fetchSportsDbFacts(name)
  const wiki = isNational
    ? { count: null as number | null, source: undefined }
    : await fetchWikipediaTrophyCount(name)

  const country =
    coreJson.venue?.address?.country ||
    sportsDb.country ||
    (isNational ? siteTeam?.location || league.country : league.country)

  return {
    teamId,
    leagueId,
    name,
    shortName: siteTeam?.abbreviation || siteTeam?.shortDisplayName,
    nickname: siteTeam?.nickname || coreJson.nickname || sportsDb.nickname,
    leagueName: siteTeam?.defaultLeague?.name || league.name,
    country,
    city: coreJson.venue?.address?.city || sportsDb.city,
    stadium: coreJson.venue?.fullName || sportsDb.stadium,
    foundedYear: sportsDb.foundedYear,
    standingSummary: siteTeam?.standingSummary,
    isNational,
    trophyCount: wiki.count ?? undefined,
    trophySource: wiki.source,
    fetchedAt: Date.now(),
  }
}

export function seasonSnapshotFacts(standing: StandingRow | null): Array<[string, string]> {
  if (!standing) return []
  return [
    ['Table place', `#${standing.rank}${standing.group ? ` · ${standing.group}` : ''}`],
    ['Points', String(standing.points)],
    ['Goals for', String(standing.goalsFor)],
    ['Goals against', String(standing.goalsAgainst)],
    [
      'Goal difference',
      standing.goalDiff > 0 ? `+${standing.goalDiff}` : String(standing.goalDiff),
    ],
    ['Record', `${standing.won}W-${standing.drawn}D-${standing.lost}L`],
    ['Played', String(standing.played)],
  ]
}
