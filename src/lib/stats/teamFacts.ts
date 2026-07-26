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
  foundedYear?: number
  standingSummary?: string
  logoUrl?: string
  /** Team primary kit / brand color (#rrggbb). */
  primaryColor?: string
  /** Secondary / alt color (#rrggbb). */
  secondaryColor?: string
  isNational: boolean
  /** Historical senior trophy total from the club’s Wikipedia honours table. */
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
  intFormedYear?: string
  strLeague?: string
  strKeywords?: string
}

function parseFoundedYear(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const year = Number(raw)
  return Number.isFinite(year) && year > 1800 && year < 2100 ? year : undefined
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
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
    total += n
    hits += 1
  }
  if (hits === 0) return null
  return total
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

function parseWordNumber(phrase: string): number | null {
  const parts = phrase.toLowerCase().split(/[-\s]+/).filter(Boolean)
  if (parts.length === 0) return null
  let total = 0
  for (const part of parts) {
    const n = WORD_NUMBERS[part]
    if (n == null) return null
    total += n
  }
  return total > 0 ? total : null
}

/** Pull an explicit “N honours / trophies” claim from prose. */
export function estimateTrophyCountFromProse(text: string): number | null {
  if (!text.trim()) return null
  const digit = text.match(
    /\b(\d{1,3})\s+(?:major\s+)?(?:domestic[,\s]+european[,\s]+and\s+worldwide\s+)?(?:honours?|trophies)\b/i,
  )
  if (digit) {
    const n = Number(digit[1])
    if (Number.isFinite(n) && n > 0 && n <= 200) return n
  }
  const words = text.match(
    /\b((?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|ten|one|two|three|four|five|six|seven|eight|nine)\s+(?:major\s+)?(?:domestic[,\s]+european[,\s]+and\s+worldwide\s+)?(?:honours?|trophies)\b/i,
  )
  if (words) return parseWordNumber(words[1])
  return null
}

function parseTitleCountCell(cell: string): number | null {
  const match = cell.trim().match(/^(\d+)\b/)
  if (!match) return null
  const n = Number(match[1])
  if (!Number.isFinite(n) || n < 1 || n > 100) return null
  return n
}

/**
 * Sum senior trophies from a Wikipedia club Honours wikitable.
 * Skips regional / youth / reserve rows when a Type column is present.
 */
export function sumHonoursTableTrophyCount(html: string): number | null {
  const tables = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>[\s\S]*?<\/table>/gi)
  if (!tables || tables.length === 0) return null

  let bestTotal: number | null = null

  for (const table of tables) {
    const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)
    if (!rows || rows.length < 2) continue

    const headerCells = [...rows[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      stripHtml(m[1]).toLowerCase(),
    )
    const titlesIdx = headerCells.findIndex((cell) => cell.includes('title'))
    if (titlesIdx < 0) continue

    let currentType = ''
    let total = 0
    let hits = 0

    for (const row of rows.slice(1)) {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
        stripHtml(m[1]),
      )
      if (cells.length === 0) continue

      let titlesCell: string | undefined
      if (cells.length >= headerCells.length) {
        currentType = cells[0] || currentType
        titlesCell = cells[titlesIdx]
      } else {
        // Type column omitted via rowspan — titles shifts left by one.
        titlesCell = cells[Math.max(0, titlesIdx - 1)]
      }

      const type = currentType.toLowerCase()
      if (
        /\bregional\b/.test(type) ||
        /\byouth\b/.test(type) ||
        /\breserve\b/.test(type) ||
        /\bacademy\b/.test(type) ||
        /\bother\b/.test(type)
      ) {
        continue
      }

      if (!titlesCell) continue
      const count = parseTitleCountCell(titlesCell)
      if (count == null) continue
      total += count
      hits += 1
    }

    if (hits > 0 && (bestTotal == null || hits > 3)) {
      bestTotal = total
      // Prefer the first substantial honours table.
      if (hits >= 3) break
    }
  }

  return bestTotal
}

async function fetchWikipediaJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Api-User-Agent': 'BraydenStats/1.0 (https://github.com/braydencbell01-arch/Brayden-OS)',
      },
    })
    if (!res.ok) return null
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

async function fetchWikipediaTrophyCount(teamName: string): Promise<{
  count: number | null
  source?: string
}> {
  const searchUrl = new URL('https://en.wikipedia.org/w/api.php')
  searchUrl.searchParams.set('action', 'opensearch')
  searchUrl.searchParams.set('search', teamName)
  searchUrl.searchParams.set('limit', '8')
  searchUrl.searchParams.set('namespace', '0')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('origin', '*')

  const searchJson = (await fetchWikipediaJson(searchUrl.toString())) as
    | [string, string[], string[], string[]]
    | null
  if (!searchJson) return { count: null }

  const titles = searchJson[1] ?? []
  const preferred =
    titles.find((title) => /F\.?C\.?$|C\.?F\.?$|S\.?C\.?$|A\.?C\.?$/i.test(title)) ||
    titles.find((title) => /football|soccer|club|munich|united|city/i.test(title)) ||
    titles[0]
  if (!preferred) return { count: null }

  const sectionsUrl = new URL('https://en.wikipedia.org/w/api.php')
  sectionsUrl.searchParams.set('action', 'parse')
  sectionsUrl.searchParams.set('page', preferred)
  sectionsUrl.searchParams.set('prop', 'sections')
  sectionsUrl.searchParams.set('format', 'json')
  sectionsUrl.searchParams.set('origin', '*')

  const sectionsJson = (await fetchWikipediaJson(sectionsUrl.toString())) as {
    parse?: { sections?: Array<{ index: string; line: string; toclevel: number }> }
  } | null

  const sections = sectionsJson?.parse?.sections ?? []
  const honoursSection =
    sections.find((section) => /^honours$/i.test(section.line) && section.toclevel === 1) ||
    sections.find((section) => /honours?/i.test(section.line) && section.toclevel === 1)

  let honoursHtml = ''
  if (honoursSection) {
    const sectionUrl = new URL('https://en.wikipedia.org/w/api.php')
    sectionUrl.searchParams.set('action', 'parse')
    sectionUrl.searchParams.set('page', preferred)
    sectionUrl.searchParams.set('prop', 'text')
    sectionUrl.searchParams.set('section', honoursSection.index)
    sectionUrl.searchParams.set('disableeditsection', '1')
    sectionUrl.searchParams.set('format', 'json')
    sectionUrl.searchParams.set('origin', '*')

    const sectionJson = (await fetchWikipediaJson(sectionUrl.toString())) as {
      parse?: { text?: { ['*']?: string } }
    } | null
    honoursHtml = sectionJson?.parse?.text?.['*'] || ''
  }

  const fromTable = honoursHtml ? sumHonoursTableTrophyCount(honoursHtml) : null
  if (fromTable != null) {
    return { count: fromTable, source: preferred }
  }

  const fromProse = honoursHtml ? estimateTrophyCountFromProse(stripHtml(honoursHtml)) : null
  if (fromProse != null) {
    return { count: fromProse, source: preferred }
  }

  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    preferred.replace(/ /g, '_'),
  )}`
  const summary = (await fetchWikipediaJson(summaryUrl)) as {
    extract?: string
    title?: string
  } | null
  const fromSummary = estimateTrophyCountFromText(summary?.extract || '')
  if (fromSummary == null) return { count: null }
  return { count: fromSummary, source: summary?.title || preferred }
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
 * Combines ESPN clubhouse + venue, TheSportsDB, and Wikipedia trophy totals.
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
    stadium: coreJson.venue?.fullName || sportsDb.stadium,
    foundedYear: sportsDb.foundedYear,
    standingSummary: siteTeam?.standingSummary,
    logoUrl,
    primaryColor: normalizeHexColor(primaryRaw) || undefined,
    secondaryColor: normalizeHexColor(secondaryRaw) || undefined,
    isNational,
    trophyCount: wiki.count ?? undefined,
    trophySource: wiki.source,
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
