import {
  getLeague,
  inferSoccerSeasonStartYear,
  type LeagueId,
} from '../leagues'
import { teamLogoUrl } from './branding'

export type KnockoutTeam = {
  id: string
  name: string
  shortName: string
  logoUrl?: string
  /** Aggregate (two-leg) or single-match score when available. */
  score: number | null
  winner?: boolean
}

export type KnockoutLeg = {
  eventId: string
  date: string
  leg: number | null
  legLabel?: string
  completed: boolean
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
}

export type KnockoutTie = {
  id: string
  /** Stable key for bracket pairing (sorted team ids). */
  pairKey: string
  teams: [KnockoutTeam, KnockoutTeam]
  legs: KnockoutLeg[]
  completed: boolean
  note?: string
  /** True when scores are series aggregates across legs. */
  isAggregate: boolean
}

export type KnockoutRound = {
  typeId: number
  name: string
  /** Short pill label (e.g. "Quarter-final"). */
  shortName: string
  hasLegs: boolean
  startDate: string
  endDate: string
  /** Date range label for the column header. */
  dateLabel: string
  ties: KnockoutTie[]
}

export type KnockoutBracket = {
  leagueId: LeagueId
  seasonYear: number
  rounds: KnockoutRound[]
  fetchedAt: number
}

type EspnSeasonType = {
  id?: string | number
  name?: string
  abbreviation?: string
  hasStandings?: boolean
  hasLegs?: boolean
  startDate?: string
  endDate?: string
}

type EspnScoreboardEvent = {
  id?: string
  date?: string
  name?: string
  competitions?: Array<{
    date?: string
    status?: { type?: { completed?: boolean; name?: string } }
    leg?: { value?: number; displayValue?: string }
    series?: {
      title?: string
      completed?: boolean
      totalCompetitions?: number
      competitors?: Array<{
        id?: string
        winner?: boolean
        aggregateScore?: number | string
      }>
    }
    notes?: Array<{ headline?: string }>
    altGameNote?: string
    competitors?: Array<{
      homeAway?: string
      score?: string | number
      winner?: boolean
      team?: {
        id?: string
        displayName?: string
        shortDisplayName?: string
        abbreviation?: string
        logo?: string
      }
    }>
  }>
}

function toHttps(ref: string): string {
  return ref.replace(/^http:\/\//i, 'https://')
}

function ymdFromIso(iso: string | undefined): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return `${m[1]}${m[2]}${m[3]}`
}

function parseScore(raw: string | number | undefined | null): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

function formatRoundShortName(name: string): string {
  const n = name.trim()
  if (/knockout\s*round\s*playoff/i.test(n)) return 'Playoffs'
  if (/round\s*of\s*16|last\s*16|1\/8/i.test(n)) return 'Round of 16'
  if (/round\s*of\s*32|last\s*32|1\/16/i.test(n)) return 'Round of 32'
  if (/quarter/i.test(n)) return 'Quarter-final'
  if (/semi/i.test(n)) return 'Semi-final'
  if (/^final$/i.test(n) || /\bfinal\b/i.test(n)) return 'Final'
  if (/first\s*round/i.test(n)) return '1st Round'
  if (/second\s*round/i.test(n)) return '2nd Round'
  if (/third\s*round/i.test(n)) return '3rd Round'
  if (/fourth\s*round/i.test(n)) return '4th Round'
  if (/fifth\s*round/i.test(n)) return '5th Round'
  if (/sixth\s*round/i.test(n)) return '6th Round'
  return n
}

function formatDateLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''

  const endAdj = new Date(end.getTime() - 12 * 60 * 60 * 1000)
  const endUse = endAdj > start ? endAdj : end
  const fmt = (d: Date) =>
    d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  if (
    start.getUTCFullYear() === endUse.getUTCFullYear() &&
    start.getUTCMonth() === endUse.getUTCMonth()
  ) {
    if (start.getUTCDate() === endUse.getUTCDate()) return fmt(start)
    return `${fmt(start)}–${endUse.getUTCDate()}`
  }
  return `${fmt(start)} – ${fmt(endUse)}`
}

function formatDayCluster(dates: Date[]): string {
  if (dates.length === 0) return ''
  dates.sort((a, b) => a.getTime() - b.getTime())
  const first = dates[0]
  const last = dates[dates.length - 1]
  const month = first.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  if (
    first.getUTCFullYear() === last.getUTCFullYear() &&
    first.getUTCMonth() === last.getUTCMonth()
  ) {
    if (first.getUTCDate() === last.getUTCDate()) return `${month} ${first.getUTCDate()}`
    return `${month} ${first.getUTCDate()}–${last.getUTCDate()}`
  }
  const lastMonth = last.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${month} ${first.getUTCDate()} – ${lastMonth} ${last.getUTCDate()}`
}

/** Prefer live leg dates: "Apr 7–8 | Apr 14–15" for two-legged rounds. */
function roundDateLabelFromTies(ties: KnockoutTie[], fallback: string): string {
  const byLeg = new Map<number, Date[]>()
  for (const tie of ties) {
    for (const leg of tie.legs) {
      if (!leg.date) continue
      const d = new Date(leg.date)
      if (Number.isNaN(d.getTime())) continue
      const key = leg.leg ?? 1
      const list = byLeg.get(key) ?? []
      list.push(d)
      byLeg.set(key, list)
    }
  }
  if (byLeg.size === 0) return fallback
  const parts = [...byLeg.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, dates]) => formatDayCluster(dates))
    .filter(Boolean)
  return parts.join(' | ') || fallback
}

function isKnockoutSeasonType(type: EspnSeasonType): boolean {
  if (type.hasStandings) return false
  const name = `${type.name || ''} ${type.abbreviation || ''}`
  if (type.hasLegs) return true
  return /final|semi|quarter|round|knockout|playoff|play-off|last\s*\d+|1\/\d+/i.test(
    name,
  )
}

async function fetchSeasonTypes(
  espnCode: string,
  seasonYear: number,
): Promise<EspnSeasonType[]> {
  const listRes = await fetch(
    `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${seasonYear}/types`,
  )
  if (!listRes.ok) return []
  const list = (await listRes.json()) as { items?: Array<{ $ref?: string }> }
  const types: EspnSeasonType[] = []
  await Promise.all(
    (list.items ?? []).map(async (item) => {
      if (!item.$ref) return
      try {
        const res = await fetch(toHttps(item.$ref))
        if (!res.ok) return
        const data = (await res.json()) as EspnSeasonType
        types.push(data)
      } catch {
        // skip
      }
    }),
  )
  return types.sort((a, b) => Number(a.id) - Number(b.id))
}

async function fetchScoreboardEvents(
  espnCode: string,
  fromYmd: string,
  toYmd: string,
): Promise<EspnScoreboardEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard?dates=${fromYmd}-${toYmd}&limit=400`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as { events?: EspnScoreboardEvent[] }
  return data.events ?? []
}

function buildTieFromEvents(
  events: EspnScoreboardEvent[],
  roundName: string,
): KnockoutTie | null {
  if (events.length === 0) return null

  const sorted = events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const legs: KnockoutLeg[] = []
  const teamMap = new Map<string, KnockoutTeam>()

  for (const event of sorted) {
    const comp = event.competitions?.[0]
    if (!comp) continue
    const competitors = comp.competitors ?? []
    const home = competitors.find((c) => c.homeAway === 'home') || competitors[0]
    const away = competitors.find((c) => c.homeAway === 'away') || competitors[1]
    if (!home?.team?.id || !away?.team?.id) continue

    for (const side of [home, away]) {
      const id = side.team?.id
      if (!id) continue
      const existing = teamMap.get(id)
      if (!existing) {
        teamMap.set(id, {
          id,
          name: side.team?.displayName || side.team?.shortDisplayName || '',
          shortName:
            side.team?.shortDisplayName ||
            side.team?.abbreviation ||
            side.team?.displayName ||
            '',
          logoUrl: side.team?.logo || teamLogoUrl(id),
          score: null,
        })
      }
    }

    legs.push({
      eventId: event.id || `${home.team.id}-${away.team.id}-${event.date}`,
      date: event.date || comp.date || '',
      leg: comp.leg?.value ?? (legs.length + 1),
      legLabel: comp.leg?.displayValue,
      completed: Boolean(comp.status?.type?.completed),
      homeId: home.team.id,
      awayId: away.team.id,
      homeScore: parseScore(home.score),
      awayScore: parseScore(away.score),
    })
  }

  const teams = [...teamMap.values()]
  if (teams.length < 2) return null
  const teamA = teams[0]
  const teamB = teams[1]
  const pairKey = [teamA.id, teamB.id].sort().join('-')

  // Prefer series aggregate from the latest leg that has it.
  let isAggregate = false
  let note: string | undefined
  let completed = false

  for (const event of sorted.slice().reverse()) {
    const comp = event.competitions?.[0]
    if (!comp) continue
    note = note || comp.notes?.[0]?.headline || comp.altGameNote || undefined
    const series = comp.series
    if (series?.competitors?.some((c) => c.aggregateScore != null && c.aggregateScore !== '')) {
      isAggregate = true
      completed = Boolean(series.completed)
      for (const sc of series.competitors) {
        if (!sc.id) continue
        const team = teamMap.get(sc.id)
        if (!team) continue
        team.score = parseScore(sc.aggregateScore)
        team.winner = sc.winner
      }
      break
    }
  }

  if (!isAggregate) {
    // Single-leg or incomplete series: use latest completed match scores,
    // or sum legs when both (all) legs are done.
    const allDone = legs.length > 0 && legs.every((leg) => leg.completed)
    if (allDone && legs.length > 1) {
      isAggregate = true
      completed = true
      for (const team of [teamA, teamB]) {
        let total = 0
        for (const leg of legs) {
          if (leg.homeId === team.id && leg.homeScore != null) total += leg.homeScore
          if (leg.awayId === team.id && leg.awayScore != null) total += leg.awayScore
        }
        team.score = total
      }
      const a = teamA.score ?? 0
      const b = teamB.score ?? 0
      if (a !== b) {
        teamA.winner = a > b
        teamB.winner = b > a
      }
    } else {
      const latest = [...legs].reverse().find((leg) => leg.completed) || legs[legs.length - 1]
      if (latest) {
        completed = latest.completed
        const home = teamMap.get(latest.homeId)
        const away = teamMap.get(latest.awayId)
        if (home) home.score = latest.homeScore
        if (away) away.score = latest.awayScore
        if (latest.completed && home && away && home.score != null && away.score != null) {
          if (home.score !== away.score) {
            home.winner = home.score > away.score
            away.winner = away.score > home.score
          }
        }
      }
    }
  }

  // Winner flags from scoreboard competitors when still missing.
  for (const event of sorted.slice().reverse()) {
    for (const side of event.competitions?.[0]?.competitors ?? []) {
      if (!side.team?.id || side.winner == null) continue
      const team = teamMap.get(side.team.id)
      if (team && team.winner == null) team.winner = side.winner
    }
  }

  return {
    id: `${roundName}:${pairKey}`,
    pairKey,
    teams: [teamA, teamB],
    legs,
    completed,
    note,
    isAggregate: isAggregate || legs.length > 1,
  }
}

function groupEventsIntoTies(
  events: EspnScoreboardEvent[],
  roundName: string,
): KnockoutTie[] {
  const buckets = new Map<string, EspnScoreboardEvent[]>()

  for (const event of events) {
    const comp = event.competitions?.[0]
    const ids = (comp?.competitors ?? [])
      .map((c) => c.team?.id)
      .filter((id): id is string => Boolean(id))
      .sort()
    if (ids.length < 2) continue
    const key = ids.join('-')
    const list = buckets.get(key) ?? []
    list.push(event)
    buckets.set(key, list)
  }

  const ties: KnockoutTie[] = []
  for (const list of buckets.values()) {
    const tie = buildTieFromEvents(list, roundName)
    if (tie) ties.push(tie)
  }

  // Chronological by first leg.
  ties.sort((a, b) => (a.legs[0]?.date || '').localeCompare(b.legs[0]?.date || ''))
  return ties
}

/**
 * Reorder earlier-round ties so winners line up with the next round's slots
 * (FotMob-style tree). Unmatched ties stay at the end.
 */
function alignRoundsForBracket(rounds: KnockoutRound[]): KnockoutRound[] {
  if (rounds.length < 2) return rounds
  const aligned = rounds.map((round) => ({
    ...round,
    ties: round.ties.slice(),
  }))

  for (let i = aligned.length - 1; i > 0; i -= 1) {
    const later = aligned[i]
    const earlier = aligned[i - 1]
    if (later.ties.length === 0 || earlier.ties.length === 0) continue

    const used = new Set<string>()
    const ordered: KnockoutTie[] = []

    for (const laterTie of later.ties) {
      const teamIds = new Set(laterTie.teams.map((t) => t.id))
      const feeders = earlier.ties.filter((tie) => {
        if (used.has(tie.id)) return false
        return tie.teams.some((t) => teamIds.has(t.id))
      })
      // Prefer exact two feeders; otherwise take whatever matched.
      for (const feeder of feeders) {
        used.add(feeder.id)
        ordered.push(feeder)
      }
    }

    for (const tie of earlier.ties) {
      if (!used.has(tie.id)) ordered.push(tie)
    }
    earlier.ties = ordered
  }

  return aligned
}

function placeholderTeam(suffix: string): KnockoutTeam {
  return {
    id: `tbd-${suffix}`,
    name: 'TBD',
    shortName: 'TBD',
    score: null,
  }
}

function makePlaceholderTie(
  roundName: string,
  index: number,
  hasLegs: boolean,
): KnockoutTie {
  return {
    id: `${roundName}:tbd:${index}`,
    pairKey: `tbd-${index}`,
    teams: [placeholderTeam(`${index}-a`), placeholderTeam(`${index}-b`)],
    legs: [],
    completed: false,
    isAggregate: hasLegs,
  }
}

/** Expected number of ties when ESPN has not created events yet. */
function expectedTiesFromName(name: string, shortName: string): number | null {
  const n = `${name} ${shortName}`
  if (/^final$/i.test(shortName) || /\bfinal\b/i.test(n)) return 1
  if (/semi/i.test(n)) return 2
  if (/quarter/i.test(n)) return 4
  if (/round of 16|last 16|1\/8/i.test(n)) return 8
  if (/round of 32|last 32|1\/16/i.test(n)) return 16
  if (/round of 64|last 64/i.test(n)) return 32
  if (/knockout\s*round\s*playoff|play-?offs?/i.test(n)) return 8
  return null
}

async function fetchSeasonTypeEventCount(
  espnCode: string,
  seasonYear: number,
  typeId: number,
): Promise<number> {
  try {
    const res = await fetch(
      `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(espnCode)}/seasons/${seasonYear}/types/${typeId}/events?limit=1`,
    )
    if (!res.ok) return 0
    const data = (await res.json()) as { count?: number }
    return typeof data.count === 'number' && Number.isFinite(data.count) ? data.count : 0
  } catch {
    return 0
  }
}

function padTiesWithPlaceholders(
  ties: KnockoutTie[],
  expected: number,
  roundName: string,
  hasLegs: boolean,
): KnockoutTie[] {
  if (expected <= ties.length) return ties
  const padded = ties.slice()
  while (padded.length < expected) {
    padded.push(makePlaceholderTie(roundName, padded.length, hasLegs))
  }
  return padded
}

/**
 * Knockout rounds + ties for a competition season (Aug–Jul ESPN year).
 * Skips group/league-phase types that have standings.
 * Undrawn / future rounds are filled with TBD placeholder ties.
 */
export async function fetchLeagueKnockoutBracket(
  leagueId: LeagueId,
  seasonYear = inferSoccerSeasonStartYear(),
): Promise<KnockoutBracket> {
  const league = getLeague(leagueId)
  const types = await fetchSeasonTypes(league.espnCode, seasonYear)
  const knockoutTypes = types.filter(isKnockoutSeasonType)

  const rounds: KnockoutRound[] = await Promise.all(
    knockoutTypes.map(async (type) => {
      const typeId = Number(type.id)
      const name = type.name || type.abbreviation || `Round ${typeId}`
      const startDate = type.startDate || ''
      const endDate = type.endDate || ''
      const from = ymdFromIso(startDate)
      const to = ymdFromIso(endDate)
      const hasLegs = Boolean(type.hasLegs)
      const [events, eventCount] = await Promise.all([
        from && to
          ? fetchScoreboardEvents(league.espnCode, from, to)
          : Promise.resolve([] as EspnScoreboardEvent[]),
        Number.isFinite(typeId)
          ? fetchSeasonTypeEventCount(league.espnCode, seasonYear, typeId)
          : Promise.resolve(0),
      ])

      // Filter to events that belong to this round when series title is present.
      const filtered = events.filter((event) => {
        const title = event.competitions?.[0]?.series?.title
        if (!title) return true
        return (
          title.toLowerCase() === name.toLowerCase() ||
          formatRoundShortName(title) === formatRoundShortName(name)
        )
      })

      const ties = groupEventsIntoTies(filtered.length > 0 ? filtered : events, name)
      const shortName = formatRoundShortName(name)
      const fallbackLabel = formatDateLabel(startDate, endDate)

      let expected =
        eventCount > 0
          ? hasLegs
            ? Math.max(1, Math.ceil(eventCount / 2))
            : eventCount
          : expectedTiesFromName(name, shortName) ?? 0
      // Prefer real ties when ESPN under-reports count mid-update.
      expected = Math.max(expected, ties.length)

      return {
        typeId: Number.isFinite(typeId) ? typeId : 0,
        name,
        shortName,
        hasLegs,
        startDate,
        endDate,
        dateLabel: roundDateLabelFromTies(ties, fallbackLabel),
        ties: padTiesWithPlaceholders(ties, expected, name, hasLegs),
        _eventCount: eventCount,
      } as KnockoutRound & { _eventCount: number }
    }),
  )

  // Fill remaining empty rounds by walking backwards from the final
  // (Semi = 2× Final, Quarter = 2× Semi, …) when ESPN has no event shells yet.
  for (let i = rounds.length - 1; i >= 0; i -= 1) {
    const round = rounds[i] as KnockoutRound & { _eventCount?: number }
    const realTies = round.ties.filter((tie) => !tie.pairKey.startsWith('tbd-')).length
    const placeholderOnly = realTies === 0
    if (!placeholderOnly && round.ties.length > 0) continue

    const next = rounds[i + 1]
    let expected = round.ties.length
    if (expected === 0 && next) {
      expected = Math.max(1, next.ties.length * 2)
    }
    if (expected === 0) {
      expected = expectedTiesFromName(round.name, round.shortName) ?? 0
    }
    if (expected > round.ties.length) {
      round.ties = padTiesWithPlaceholders(
        round.ties.filter((tie) => !tie.pairKey.startsWith('tbd-')),
        expected,
        round.name,
        round.hasLegs,
      )
    }
  }

  const cleaned: KnockoutRound[] = rounds.map((round) => {
    const { _eventCount: _, ...rest } = round as KnockoutRound & { _eventCount?: number }
    return rest
  })

  return {
    leagueId,
    seasonYear,
    rounds: alignRoundsForBracket(cleaned),
    fetchedAt: Date.now(),
  }
}
