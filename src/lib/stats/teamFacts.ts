import { getLeague, type LeagueId } from '../leagues'
import type { StandingRow } from './types'
import { normalizeHexColor, pickEspnLogoUrl, safeAccentColor, teamLogoUrl } from './branding'

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
  /** Seating capacity when known. */
  stadiumCapacity?: number
  /** Playing surface label (e.g. Grass). */
  stadiumSurface?: string
  /** Year the current stadium opened. */
  stadiumOpenedYear?: number
  foundedYear?: number
  standingSummary?: string
  logoUrl?: string
  /** Team primary kit / brand color (#rrggbb). */
  primaryColor?: string
  /** Secondary / alt color (#rrggbb). */
  secondaryColor?: string
  isNational: boolean
  /** Best-effort major trophy total from public encyclopedic sources. */
  trophyCount?: number
  trophySource?: string
  /** Parsed honour lines (e.g. "Serie A · 1969–70"). */
  trophies?: TeamTrophyTitle[]
  fetchedAt: number
}

export type TeamTrophyTitle = {
  competition: string
  seasons: string
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
    color?: string
    alternateColor?: string
    logos?: Array<{ href?: string; rel?: string[] }>
    defaultLeague?: { name?: string; shortName?: string }
  }
}

type EspnCoreTeamPayload = {
  isNational?: boolean
  location?: string
  nickname?: string
  color?: string
  alternateColor?: string
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
  intStadiumCapacity?: string | number
  strStadiumCapacity?: string
  strSurface?: string
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

async function resolveWikipediaTitle(teamName: string): Promise<string | null> {
  const searchUrl = new URL('https://en.wikipedia.org/w/api.php')
  searchUrl.searchParams.set('action', 'opensearch')
  searchUrl.searchParams.set('search', teamName)
  searchUrl.searchParams.set('limit', '6')
  searchUrl.searchParams.set('namespace', '0')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('origin', '*')
  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) return null
  const searchJson = (await searchRes.json()) as [string, string[], string[], string[]]
  const titles = searchJson[1] ?? []
  return (
    titles.find((title) => /F\.?C\.?$|C\.?F\.?$|S\.?C\.?$|A\.?C\.?$/i.test(title)) ||
    titles.find((title) => /football|soccer|club|calcio/i.test(title)) ||
    titles[0] ||
    null
  )
}

function stripWikiHtml(raw: string): string {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n+/g, '\n')
}

/** Parse "Serie A … Winners (1): 1969–70" style honour blocks into title rows. */
export function parseWikipediaHonoursText(text: string): TeamTrophyTitle[] {
  const cleaned = text
    .replace(/\[\s*edit\s*\]/gi, ' ')
    .replace(/\(\s*Tier\s*\d+\s*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return []

  const titles: TeamTrophyTitle[] = []
  const winnerBlocks =
    cleaned.matchAll(
      /([A-Z][A-Za-z0-9 .'/&-]{2,60}?)\s*:\s*Winners?\s*\((\d+)\)\s*:\s*([0-9–,\s-]+?)(?=(?:[A-Z][A-Za-z0-9 .'/&-]{2,60}?\s*:\s*(?:Winners?|Runners-up))|$)/g,
    )

  for (const match of winnerBlocks) {
    const competition = match[1]?.trim()
    const seasons = match[3]?.replace(/\s+/g, ' ').replace(/,\s*$/, '').trim()
    if (!competition || !seasons) continue
    if (/^(national|domestic|european|international|regional)\b/i.test(competition)) continue
    titles.push({ competition, seasons })
  }

  return titles.slice(0, 12)
}

async function fetchWikipediaTrophies(teamName: string): Promise<{
  count: number | null
  source?: string
  trophies: TeamTrophyTitle[]
}> {
  try {
    const preferred = await resolveWikipediaTitle(teamName)
    if (!preferred) return { count: null, trophies: [] }

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      preferred.replace(/ /g, '_'),
    )}`
    const summaryRes = await fetch(summaryUrl, {
      headers: { Accept: 'application/json' },
    })
    const summary = summaryRes.ok
      ? ((await summaryRes.json()) as { extract?: string; title?: string })
      : null
    const countFromExtract = estimateTrophyCountFromText(summary?.extract || '')

    let trophies: TeamTrophyTitle[] = []
    try {
      const sectionsUrl = new URL('https://en.wikipedia.org/w/api.php')
      sectionsUrl.searchParams.set('action', 'parse')
      sectionsUrl.searchParams.set('page', preferred)
      sectionsUrl.searchParams.set('prop', 'sections')
      sectionsUrl.searchParams.set('format', 'json')
      sectionsUrl.searchParams.set('origin', '*')
      const sectionsRes = await fetch(sectionsUrl)
      if (sectionsRes.ok) {
        const sectionsJson = (await sectionsRes.json()) as {
          parse?: { sections?: Array<{ index: string; line: string }> }
        }
        const honour = (sectionsJson.parse?.sections ?? []).find((section) =>
          /^honou?rs?$/i.test(section.line.trim()),
        )
        if (honour) {
          const textUrl = new URL('https://en.wikipedia.org/w/api.php')
          textUrl.searchParams.set('action', 'parse')
          textUrl.searchParams.set('page', preferred)
          textUrl.searchParams.set('prop', 'text')
          textUrl.searchParams.set('section', honour.index)
          textUrl.searchParams.set('format', 'json')
          textUrl.searchParams.set('origin', '*')
          const textRes = await fetch(textUrl)
          if (textRes.ok) {
            const textJson = (await textRes.json()) as {
              parse?: { text?: { ['*']?: string } }
            }
            trophies = parseWikipediaHonoursText(
              stripWikiHtml(textJson.parse?.text?.['*'] || ''),
            )
          }
        }
      }
    } catch {
      // keep extract count only
    }

    const count =
      trophies.length > 0
        ? trophies.reduce((sum, row) => {
            const years = row.seasons.split(',').map((part) => part.trim()).filter(Boolean)
            return sum + Math.max(1, years.length)
          }, 0)
        : countFromExtract

    if (count == null && trophies.length === 0) return { count: null, trophies: [] }
    return {
      count: count ?? trophies.length,
      source: summary?.title || preferred,
      trophies,
    }
  } catch {
    return { count: null, trophies: [] }
  }
}

function parseCapacity(raw: string | number | undefined): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d]/g, ''))
  return Number.isFinite(n) && n > 500 && n < 300_000 ? n : undefined
}

async function fetchStadiumMeta(stadiumName: string): Promise<{
  openedYear?: number
  surface?: string
  capacity?: number
}> {
  try {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      stadiumName.replace(/ /g, '_'),
    )}`
    const res = await fetch(summaryUrl, { headers: { Accept: 'application/json' } })
    if (!res.ok) return {}
    const json = (await res.json()) as { extract?: string }
    const extract = json.extract || ''
    const opened = extract.match(
      /(?:opened|inaugurated|completed)\s+(?:on\s+)?(?:\d{1,2}\s+\w+\s+)?(\d{4})/i,
    )
    const openedYear = opened ? Number(opened[1]) : undefined
    const surfaceMatch = extract.match(
      /\b(grass|hybrid grass|artificial turf|artificial|astroturf|fieldturf)\b/i,
    )
    let surface: string | undefined
    if (surfaceMatch) {
      const raw = surfaceMatch[1].toLowerCase()
      surface = raw.includes('artificial') || raw.includes('turf') ? 'Artificial' : 'Grass'
    }
    const capacityMatch = extract.match(/capacity of ([\d,]+)/i)
    return {
      openedYear:
        openedYear && openedYear > 1850 && openedYear < 2100 ? openedYear : undefined,
      surface,
      capacity: parseCapacity(capacityMatch?.[1]),
    }
  } catch {
    return {}
  }
}

async function fetchSportsDbFacts(teamName: string): Promise<{
  country?: string
  stadium?: string
  city?: string
  foundedYear?: number
  nickname?: string
  stadiumCapacity?: number
  stadiumSurface?: string
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
      stadiumCapacity: parseCapacity(team.intStadiumCapacity ?? team.strStadiumCapacity),
      stadiumSurface: team.strSurface?.trim() || undefined,
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
    ? { count: null as number | null, source: undefined, trophies: [] as TeamTrophyTitle[] }
    : await fetchWikipediaTrophies(name)

  const country =
    coreJson.venue?.address?.country ||
    sportsDb.country ||
    (isNational ? siteTeam?.location || league.country : league.country)

  const stadium = coreJson.venue?.fullName || sportsDb.stadium
  const stadiumMeta =
    !isNational && stadium ? await fetchStadiumMeta(stadium) : {}

  const primaryRaw = siteTeam?.color || coreJson.color
  const secondaryRaw = siteTeam?.alternateColor || coreJson.alternateColor
  const logoFromApi = pickEspnLogoUrl(siteTeam?.logos, 'default')
  const logoUrl = logoFromApi || teamLogoUrl(teamId)

  return {
    teamId,
    leagueId,
    name,
    shortName: siteTeam?.abbreviation || siteTeam?.shortDisplayName,
    nickname: siteTeam?.nickname || coreJson.nickname || sportsDb.nickname,
    leagueName: siteTeam?.defaultLeague?.name || league.name,
    country,
    city: coreJson.venue?.address?.city || sportsDb.city,
    stadium,
    stadiumCapacity: sportsDb.stadiumCapacity ?? stadiumMeta.capacity,
    stadiumSurface: sportsDb.stadiumSurface || stadiumMeta.surface,
    stadiumOpenedYear: stadiumMeta.openedYear,
    foundedYear: sportsDb.foundedYear,
    standingSummary: siteTeam?.standingSummary,
    logoUrl,
    primaryColor: normalizeHexColor(primaryRaw) || undefined,
    secondaryColor: normalizeHexColor(secondaryRaw) || undefined,
    isNational,
    trophyCount: wiki.count ?? undefined,
    trophySource: wiki.source,
    trophies: wiki.trophies.length > 0 ? wiki.trophies : undefined,
    fetchedAt: Date.now(),
  }
}

/** Accent-safe primary for dark UI theming. */
export function teamAccentFromFacts(facts: TeamClubFacts | null | undefined): string | null {
  if (!facts?.primaryColor) return null
  return safeAccentColor(facts.primaryColor)
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
