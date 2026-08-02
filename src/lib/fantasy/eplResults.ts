import type { SurvivalPickResult } from './types'

export type EplGameweekWindow = {
  from: string
  to: string
  matches: Array<{ home: number; away: number; kickoff?: string }>
}

export type EplGameweekCalendar = {
  source: string
  generatedAt: string
  seasonLabel?: string
  gameweeks: Record<string, EplGameweekWindow>
}

type EspnCompetitor = {
  homeAway?: string
  score?: string | number
  team?: {
    abbreviation?: string
    shortDisplayName?: string
    displayName?: string
    name?: string
  }
}

type EspnEvent = {
  competitions?: Array<{
    competitors?: EspnCompetitor[]
    status?: { type?: { name?: string; completed?: boolean; state?: string } }
  }>
  status?: { type?: { name?: string; completed?: boolean; state?: string } }
}

/** FPL short codes that differ from ESPN abbreviations. */
const FPL_SHORT_TO_ESPN: Record<string, string> = {
  MCI: 'MNC',
  MUN: 'MAN',
}

const ESPN_TO_FPL_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(FPL_SHORT_TO_ESPN).map(([fpl, espn]) => [espn, fpl]),
)

let calendarCache: EplGameweekCalendar | null = null
let calendarInflight: Promise<EplGameweekCalendar> | null = null

export async function loadEplGameweekCalendar(): Promise<EplGameweekCalendar> {
  if (calendarCache) return calendarCache
  if (calendarInflight) return calendarInflight
  calendarInflight = (async () => {
    const url = `${import.meta.env.BASE_URL}fantasy/epl-gameweeks.json`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Could not load EPL gameweek calendar')
    const data = (await res.json()) as EplGameweekCalendar
    calendarCache = data
    return data
  })().finally(() => {
    calendarInflight = null
  })
  return calendarInflight
}

export function playingTeamIdsForGw(calendar: EplGameweekCalendar, gw: number): Set<number> {
  const window = calendar.gameweeks[String(gw)]
  const ids = new Set<number>()
  for (const match of window?.matches ?? []) {
    ids.add(match.home)
    ids.add(match.away)
  }
  return ids
}

function parseScore(value: string | number | undefined): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function isFinished(status: EspnEvent['status'] | undefined): boolean {
  const type = status?.type
  if (!type) return false
  if (type.completed || type.state === 'post') return true
  const name = type.name ?? ''
  return (
    name.includes('FULL_TIME') ||
    name.includes('FINAL') ||
    name.includes('AFTER_') ||
    name.includes('SHOOTOUT_COMPLETE')
  )
}

function normalizeAbbrev(value: string | undefined): string {
  return (value ?? '').trim().toUpperCase()
}

function espnAbbrevToFplShort(abbrev: string): string {
  const key = normalizeAbbrev(abbrev)
  return ESPN_TO_FPL_SHORT[key] ?? key
}

/**
 * Fetch finished Premier League results for a GW date window and map to FPL team ids.
 */
export async function fetchSurvivalResultsForGw(
  gw: number,
  teams: Array<{ id: number; short: string; name: string }>,
  calendar?: EplGameweekCalendar,
): Promise<Record<number, SurvivalPickResult>> {
  const cal = calendar ?? (await loadEplGameweekCalendar())
  const window = cal.gameweeks[String(gw)]
  if (!window) throw new Error(`No calendar window for GW ${gw}`)

  const shortToId = new Map(teams.map((t) => [normalizeAbbrev(t.short), t.id]))
  const nameToId = new Map(
    teams.map((t) => [t.name.trim().toLowerCase(), t.id]),
  )

  const resolveTeamId = (comp: EspnCompetitor): number | null => {
    const abbr = espnAbbrevToFplShort(comp.team?.abbreviation ?? '')
    if (shortToId.has(abbr)) return shortToId.get(abbr)!
    const candidates = [
      comp.team?.shortDisplayName,
      comp.team?.displayName,
      comp.team?.name,
    ]
    for (const raw of candidates) {
      if (!raw) continue
      const hit = nameToId.get(raw.trim().toLowerCase())
      if (hit != null) return hit
      // Soft match: "Man City" vs "Manchester City"
      for (const [name, id] of nameToId) {
        if (name.includes(raw.toLowerCase()) || raw.toLowerCase().includes(name)) return id
      }
    }
    return null
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${window.from}-${window.to}&limit=100`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load EPL scores (${res.status})`)
  const data = (await res.json()) as { events?: EspnEvent[] }

  const results: Record<number, SurvivalPickResult> = {}
  for (const event of data.events ?? []) {
    const competition = event.competitions?.[0]
    const status = competition?.status ?? event.status
    if (!isFinished(status)) continue
    const competitors = competition?.competitors ?? []
    const home = competitors.find((c) => c.homeAway === 'home')
    const away = competitors.find((c) => c.homeAway === 'away')
    if (!home || !away) continue
    const homeId = resolveTeamId(home)
    const awayId = resolveTeamId(away)
    const homeScore = parseScore(home.score)
    const awayScore = parseScore(away.score)
    if (homeId == null || awayId == null || homeScore == null || awayScore == null) continue
    if (homeScore === awayScore) {
      results[homeId] = 'D'
      results[awayId] = 'D'
    } else if (homeScore > awayScore) {
      results[homeId] = 'W'
      results[awayId] = 'L'
    } else {
      results[homeId] = 'L'
      results[awayId] = 'W'
    }
  }

  // Clubs on the fixture list with no finished result yet → pending omitted;
  // applySurvivalGwResults treats missing as bye.
  const playing = playingTeamIdsForGw(cal, gw)
  for (const teamId of playing) {
    if (results[teamId] == null) {
      // Leave unset so scorer can decide bye vs wait.
    }
  }

  return results
}
