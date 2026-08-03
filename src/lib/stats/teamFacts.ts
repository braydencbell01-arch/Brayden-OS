import { getLeague, type LeagueId } from '../leagues'
import type { StandingRow } from './types'
import { normalizeHexColor, pickEspnLogoUrl, safeAccentColor, teamLogoUrl } from './branding'
import { playoffWinnersLabel } from './divisionLabels'

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
  /** Individual trophy wins, newest first. */
  trophyWins?: TeamTrophyWin[]
  fetchedAt: number
}

export type TeamTrophyTitle = {
  competition: string
  seasons: string
}

/** One competition title won in a specific season/year. */
export type TeamTrophyWin = {
  competition: string
  season: string
  /** Sort key — end year of a cross-year season when available. */
  sortYear: number
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

function decodeWikiEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

function stripWikiHtml(raw: string): string {
  return decodeWikiEntities(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, '\n'),
  ).replace(/\n+/g, '\n')
}

function cellText(html: string): string {
  return decodeWikiEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\[\s*(?:note\s*)?\d+\s*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

import { soccerSeasonShortLabel } from '../leagues'

/** Club season window is always 1 Aug → 31 Jul. */
export function formatAugJulSeasonLabel(startYear: number): string {
  return soccerSeasonShortLabel(startYear)
}

/** Resolve a 2-digit end year against a known 4-digit start (1999/00 → 2000). */
function resolveSeasonEndYear(start: number, endRaw: string): number {
  if (endRaw.length >= 4) return Number(endRaw)
  const endTwo = Number(endRaw)
  if (!Number.isFinite(endTwo)) return start + 1
  let end = Math.floor(start / 100) * 100 + endTwo
  if (end <= start) end += 100
  return end
}

/**
 * Normalize any Wikipedia season token to an Aug–Jul season label.
 * A bare calendar year is treated as the season end year (final typically May/Jun).
 * Pre-2000 seasons keep a full start year (`1999/00`, `1889/90`).
 */
export function normalizeTrophySeason(season: string): { label: string; sortYear: number } {
  const cleaned = season.trim()

  // 1889–90, 1999–2000, 1999/00 — prefer 4-digit start so century is never lost.
  const range = cleaned.match(
    /\b((?:1[6-9]|20)\d{2})\s*[–/−/-]\s*((?:(?:1[6-9]|20)\d{2})|\d{2})\b/,
  )
  if (range) {
    const start = Number(range[1])
    const end = resolveSeasonEndYear(start, range[2]!)
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return { label: formatAugJulSeasonLabel(start), sortYear: end }
    }
  }

  // Ambiguous short forms: 99/00, 94–95, 20/21
  const short = cleaned.match(/\b(\d{2})\s*[–/−/-]\s*(\d{2})\b/)
  if (short) {
    const startTwo = Number(short[1])
    const endTwo = Number(short[2])
    // 99/00 → 1999; 70–99 → 19xx; else 20xx (modern seasons).
    const start =
      startTwo > endTwo ? 1900 + startTwo : startTwo >= 70 ? 1900 + startTwo : 2000 + startTwo
    return { label: formatAugJulSeasonLabel(start), sortYear: start + 1 }
  }

  const single = cleaned.match(/\b((?:1[6-9]|20)\d{2})\b/)
  if (single) {
    const endYear = Number(single[1])
    const startYear = endYear - 1
    return { label: formatAugJulSeasonLabel(startYear), sortYear: endYear }
  }

  return { label: cleaned, sortYear: 0 }
}

function extractSeasonTokens(raw: string): { label: string; sortYear: number }[] {
  return raw
    .split(',')
    .map((part) =>
      part
        .replace(/\[\s*[^\]]*\]/g, '')
        .replace(/\(\s*shared\s*\)/gi, '')
        .replace(/^(?:and\s+)/i, '')
        .replace(/[*†‡#]+/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((part) => /\d{4}/.test(part) || /\d{2}\s*[–/−/]\s*\d{2}/.test(part))
    .map((part) => normalizeTrophySeason(part))
    .filter((part) => part.sortYear > 0)
}

function cleanCompetitionName(raw: string): string {
  const cleaned = raw
    .replace(/\(\s*level\s*\d+\s*\)/gi, '')
    .replace(/\(\s*Tier\s*\d+\s*\)/gi, '')
    .replace(/\[\s*[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const parts = cleaned.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean)
  return parts[parts.length - 1] || cleaned
}

/**
 * True for youth / academy / reserve competitions that should not appear
 * on the senior club trophies list.
 */
export function isYouthOrReserveCompetition(name: string): boolean {
  const n = name.trim()
  if (!n) return true
  if (
    /\b(youth|academy|academies|reserves?|development|nextgen|next gen)\b/i.test(n)
  ) {
    return true
  }
  if (/\bunder[-\s]?(1[5-9]|2[0-3])\b/i.test(n)) return true
  if (/\bu[-\s]?(1[5-9]|2[0-3])\b/i.test(n)) return true
  if (
    /\b(fa youth cup|uefa youth league|premier league 2|\bpl2\b|professional development league|milk cup)\b/i.test(
      n,
    )
  ) {
    return true
  }
  // e.g. Middlesex Junior Cup — junior/age-group competitions
  if (/\bjunior\b/i.test(n)) return true
  return false
}

/** Drop youth/academy subsections that sometimes sit inside a club Honours block. */
function stripYouthHonoursSections(html: string): string {
  return html.replace(
    /<h[3-6]\b[^>]*>[\s\S]*?\b(youth|academy|academies|reserves?|under[-\s]?(?:1[5-9]|2[0-3])|u[-\s]?(?:1[5-9]|2[0-3]))\b[\s\S]*?<\/h[3-6]>[\s\S]*?(?=<h[2-6]\b|$)/gi,
    ' ',
  )
}

function finalizeTrophyWins(wins: TeamTrophyWin[]): TeamTrophyWin[] {
  const senior = wins
    .filter((win) => !isYouthOrReserveCompetition(win.competition))
    .map((win) => {
      const normalized = normalizeTrophySeason(win.season)
      return {
        ...win,
        season: normalized.label,
        sortYear: normalized.sortYear || win.sortYear,
      }
    })
  senior.sort(
    (a, b) =>
      b.sortYear - a.sortYear ||
      a.competition.localeCompare(b.competition) ||
      b.season.localeCompare(a.season),
  )
  const seen = new Set<string>()
  return senior.filter((win) => {
    const key = `${win.competition.toLowerCase()}|${win.season}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Parse Wikipedia "Honours" tables (Competition / Titles / Seasons).
 * Used by Arsenal, City, Barcelona, etc.
 */
export function parseWikipediaHonoursTable(html: string): TeamTrophyWin[] {
  const wins: TeamTrophyWin[] = []
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? []

  for (const table of tables) {
    const header = cellText(
      (table.match(/<tr[\s\S]*?<\/tr>/i)?.[0] || '').replace(/<\/?t[hd][^>]*>/gi, ' '),
    )
    if (!/competition/i.test(header) || !/season/i.test(header)) continue

    const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].slice(1)
    for (const row of rows) {
      const cells = [...row[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) =>
        cellText(match[1] || ''),
      )
      if (cells.length < 2) continue

      // Typical shapes:
      // [Type, Competition, Titles, Seasons] or [Competition, Titles, Seasons]
      let competition = ''
      let seasonsRaw = ''
      let typeLabel = ''
      if (cells.length >= 4 && /\d{4}/.test(cells[cells.length - 1] || '')) {
        typeLabel = cells[0] || ''
        competition = cells[cells.length - 3] || ''
        seasonsRaw = cells[cells.length - 1] || ''
      } else if (cells.length >= 3 && /\d{4}/.test(cells[cells.length - 1] || '')) {
        competition = cells[cells.length - 3] || cells[0] || ''
        seasonsRaw = cells[cells.length - 1] || ''
      } else if (cells.length === 2 && /\d{4}/.test(cells[1] || '')) {
        competition = cells[0] || ''
        seasonsRaw = cells[1] || ''
      } else {
        continue
      }

      if (typeLabel && isYouthOrReserveCompetition(typeLabel)) continue

      const name = cleanCompetitionName(competition)
      if (
        !name ||
        name.length < 3 ||
        isYouthOrReserveCompetition(name) ||
        /^(type|competition|titles?|seasons?|domestic|continental|worldwide|regional|national)$/i.test(
          name,
        )
      ) {
        continue
      }

      for (const season of extractSeasonTokens(seasonsRaw)) {
        wins.push({ competition: name, season: season.label, sortYear: season.sortYear })
      }
    }
  }

  return finalizeTrophyWins(wins)
}

function normalizeHonoursText(text: string): string {
  return text
    .replace(/\[\s*edit\s*\]/gi, ' ')
    .replace(/\[\d+\]/g, ' ')
    .replace(/&nbsp;/g, ' ')
    // Footnotes split across lines: "\n[\n2\n]"
    .replace(/\n\s*\[\s*\n\s*\d+\s*\n\s*\]\s*\n/g, '\n')
    // Competition aliases: "Second Division\n/\nChampionship\n(level 2)"
    .replace(/\n\s*\/\s*\n/g, ' / ')
    .replace(/\n\s*\(((?:level|tier)\s*\d+)\)\s*\n/gi, ' ($1)\n')
    // Attach seasons that wrap after the colon
    .replace(
      /(Champions?|Winners?|Play-?offs?\s*winners?|Runners-up|Promoted)\s*:\s*\n+/gi,
      '$1: ',
    )
    .replace(/(\d{4}(?:\s*[–/-]\s*\d{2,4})?)\s*\n\s*,\s*\n\s*/g, '$1, ')
    .replace(/,\s*\n\s*(?=\d{4})/g, ', ')
    .replace(/\n+/g, '\n')
}

/**
 * Parse Wikipedia honours prose into individual trophy wins (newest first).
 * Supports "Winners (n): years" and "Champions: 1934–35" styles.
 */
export function parseWikipediaHonoursText(text: string): TeamTrophyWin[] {
  const lines = normalizeHonoursText(text)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const wins: TeamTrophyWin[] = []
  let competition = ''

  const skipLine =
    /^(honou?rs?|league|cup|domestic|european|international|regional|wartime|main articles?|further information|source:|cite error|list of)\b/i
  const youthSection =
    /^(youth|academy|academies|reserves?|under[-\s]?(?:1[5-9]|2[0-3])|u[-\s]?(?:1[5-9]|2[0-3]))\b/i
  const winLine =
    /^(champions?|winners?|play-?offs?\s*winners?)\s*:\s*(.+)$/i
  const compactWin =
    /^([A-Z][A-Za-z0-9 .'/&-]{2,70}?)\s*:\s*winners?\s*\((\d+)\)\s*:\s*(.+)$/i

  let inYouthSection = false

  for (const line of lines) {
    if (skipLine.test(line)) continue
    if (/^[,.]$/.test(line) || /^and$/i.test(line)) continue

    if (youthSection.test(line)) {
      inYouthSection = true
      competition = ''
      continue
    }
    // Leaving a youth block when a normal competition heading appears is handled below.

    const compact = line.match(compactWin)
    if (compact) {
      if (inYouthSection) continue
      const name = cleanCompetitionName(compact[1] || '')
      if (
        name &&
        !/^(national|domestic|european|international|regional)\b/i.test(name) &&
        !isYouthOrReserveCompetition(name)
      ) {
        for (const season of extractSeasonTokens(compact[3] || '')) {
          wins.push({
            competition: name,
            season: season.label,
            sortYear: season.sortYear,
          })
        }
      }
      continue
    }

    const won = line.match(winLine)
    if (won && competition && !inYouthSection && !isYouthOrReserveCompetition(competition)) {
      const kind = won[1] || ''
      const isPlayoffWin = /play-?off/i.test(kind)
      // Play-off promotion is not a league title — label it like season pickers do.
      const title = isPlayoffWin ? playoffWinnersLabel(competition) : competition
      if (isYouthOrReserveCompetition(title)) continue
      for (const season of extractSeasonTokens(won[2] || '')) {
        wins.push({
          competition: title,
          season: season.label,
          sortYear: season.sortYear,
        })
      }
      continue
    }

    if (/^(runners-up|promoted)\s*:/i.test(line)) continue

    // Treat remaining short lines as competition headings.
    if (
      line.length >= 3 &&
      line.length <= 90 &&
      !/^\d/.test(line) &&
      !/^(champions?|winners?|play-off|runners-up|promoted)\b/i.test(line)
    ) {
      const name = cleanCompetitionName(line)
      if (isYouthOrReserveCompetition(name) || youthSection.test(name)) {
        inYouthSection = true
        competition = ''
        continue
      }
      inYouthSection = false
      competition = name
    }
  }

  // Also catch compact "Competition Winners (n): years" packed into one paragraph.
  if (wins.length === 0) {
    const cleaned = text
      .replace(/\[\s*edit\s*\]/gi, ' ')
      .replace(/\(\s*Tier\s*\d+\s*\)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    for (const match of cleaned.matchAll(
      /([A-Z][A-Za-z0-9 .'/&-]{2,60}?)\s*:\s*Winners?\s*\((\d+)\)\s*:\s*([0-9–,\s-]+?)(?=(?:[A-Z][A-Za-z0-9 .'/&-]{2,60}?\s*:\s*(?:Winners?|Runners-up))|$)/g,
    )) {
      const name = cleanCompetitionName(match[1] || '')
      if (
        !name ||
        isYouthOrReserveCompetition(name) ||
        /^(national|domestic|european|international|regional)\b/i.test(name)
      ) {
        continue
      }
      for (const season of extractSeasonTokens(match[3] || '')) {
        wins.push({ competition: name, season: season.label, sortYear: season.sortYear })
      }
    }
  }

  return finalizeTrophyWins(wins)
}

/** Prefer table parsing, then prose parsing. Senior-team titles only. */
export function parseWikipediaHonours(html: string): TeamTrophyWin[] {
  const seniorHtml = stripYouthHonoursSections(html)
  const fromTable = parseWikipediaHonoursTable(seniorHtml)
  if (fromTable.length > 0) return fromTable
  return parseWikipediaHonoursText(stripWikiHtml(seniorHtml))
}

/** Collapse wins back into competition → seasons rows for compact summaries. */
export function groupTrophyWins(wins: TeamTrophyWin[]): TeamTrophyTitle[] {
  const byComp = new Map<string, string[]>()
  for (const win of wins) {
    const seasons = byComp.get(win.competition) ?? []
    seasons.push(win.season)
    byComp.set(win.competition, seasons)
  }
  return [...byComp.entries()].map(([competition, seasons]) => ({
    competition,
    seasons: seasons.join(', '),
  }))
}

async function fetchWikipediaTrophies(teamName: string): Promise<{
  count: number | null
  source?: string
  trophies: TeamTrophyTitle[]
  trophyWins: TeamTrophyWin[]
}> {
  try {
    const preferred = await resolveWikipediaTitle(teamName)
    if (!preferred) return { count: null, trophies: [], trophyWins: [] }

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

    let trophyWins: TeamTrophyWin[] = []
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
          /honou?rs?|achievements|club honours/i.test(section.line.trim()),
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
            trophyWins = parseWikipediaHonours(textJson.parse?.text?.['*'] || '')
          }
        }
      }
    } catch {
      // keep extract count only
    }

    const trophies = groupTrophyWins(trophyWins)
    const count = trophyWins.length > 0 ? trophyWins.length : countFromExtract

    if (count == null && trophyWins.length === 0) {
      return { count: null, trophies: [], trophyWins: [] }
    }
    return {
      count: count ?? trophyWins.length,
      source: summary?.title || preferred,
      trophies,
      trophyWins,
    }
  } catch {
    return { count: null, trophies: [], trophyWins: [] }
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
    ? {
        count: null as number | null,
        source: undefined,
        trophies: [] as TeamTrophyTitle[],
        trophyWins: [] as TeamTrophyWin[],
      }
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
    trophyWins: wiki.trophyWins.length > 0 ? wiki.trophyWins : undefined,
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
