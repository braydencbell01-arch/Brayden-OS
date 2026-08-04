import {
  getLeague,
  inferSoccerSeasonStartYear,
  isFriendlyLeagueId,
  type LeagueId,
} from '../leagues'

export type SeasonTimelinePhase = {
  id: string
  label: string
}

const KNOCKOUT_DEEP: SeasonTimelinePhase[] = [
  { id: 'early', label: 'Early rounds' },
  { id: 'r32', label: 'Round of 32' },
  { id: 'r16', label: 'Round of 16' },
  { id: 'qf', label: 'Quarter-finals' },
  { id: 'sf', label: 'Semi-finals' },
  { id: 'final', label: 'Final' },
]

const KNOCKOUT_STANDARD: SeasonTimelinePhase[] = [
  { id: 'r32', label: 'Round of 32' },
  { id: 'r16', label: 'Round of 16' },
  { id: 'qf', label: 'Quarter-finals' },
  { id: 'sf', label: 'Semi-finals' },
  { id: 'final', label: 'Final' },
]

const KNOCKOUT_COMPACT: SeasonTimelinePhase[] = [
  { id: 'r16', label: 'Round of 16' },
  { id: 'qf', label: 'Quarter-finals' },
  { id: 'sf', label: 'Semi-finals' },
  { id: 'final', label: 'Final' },
]

const SUPERCUP: SeasonTimelinePhase[] = [{ id: 'final', label: 'Final' }]

/** Static fallbacks when ESPN season types are missing. */
const TIMELINE_FALLBACKS: Partial<Record<LeagueId, SeasonTimelinePhase[]>> = {
  'fifa-world': [
    { id: 'group', label: 'Group stage' },
    { id: 'r32', label: 'Round of 32' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'uefa-euro': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'conmebol-america': [
    { id: 'group', label: 'Group stage' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'caf-nations': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'afc-asian-cup': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'concacaf-gold': [
    { id: 'group', label: 'Group stage' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'uefa-nations': [
    { id: 'league', label: 'League phase' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'relegation', label: 'Relegation play-offs' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'third', label: 'Third-place match' },
    { id: 'final', label: 'Final' },
  ],
  'fifa-worldq': [
    { id: 'groups', label: 'Qualifying groups' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'uefa-euro-qual': [
    { id: 'groups', label: 'Qualifying groups' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'uefa-champions': [
    { id: 'league', label: 'League phase' },
    { id: 'playoffs', label: 'Play-offs' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'uefa-europa': [
    { id: 'league', label: 'League phase' },
    { id: 'playoffs', label: 'Play-offs' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'uefa-conference': [
    { id: 'league', label: 'League phase' },
    { id: 'playoffs', label: 'Play-offs' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'conmebol-libertadores': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'conmebol-sudamericana': [
    { id: 'group', label: 'Group stage' },
    { id: 'playoffs', label: 'Play-offs' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'caf-champions': [
    { id: 'group', label: 'Group stage' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'afc-champions': [
    { id: 'league', label: 'League stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'afc-champions-two': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'concacaf-champions': [
    { id: 'rounds', label: 'Rounds' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'fifa-club-world-cup': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'uefa-champions-qual': [
    { id: 'rounds', label: 'Qualifying rounds' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'uefa-europa-qual': [
    { id: 'rounds', label: 'Qualifying rounds' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'uefa-conference-qual': [
    { id: 'rounds', label: 'Qualifying rounds' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'afc-champions-qual': [
    { id: 'rounds', label: 'Qualifying rounds' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  // Domestic cups
  'fa-cup': KNOCKOUT_DEEP,
  'efl-cup': KNOCKOUT_STANDARD,
  'community-shield': SUPERCUP,
  'efl-trophy': KNOCKOUT_COMPACT,
  'copa-del-rey': KNOCKOUT_DEEP,
  'spanish-supercopa': [
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'coppa-italia': KNOCKOUT_STANDARD,
  'italian-supercoppa': [
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'dfb-pokal': KNOCKOUT_DEEP,
  'german-supercup': SUPERCUP,
  'coupe-de-france': KNOCKOUT_DEEP,
  'trophee-des-champions': SUPERCUP,
  'coupe-de-la-ligue': KNOCKOUT_COMPACT,
  'copa-do-brasil': KNOCKOUT_DEEP,
  'brazilian-supercopa': SUPERCUP,
  'copa-mx': KNOCKOUT_COMPACT,
  'campeon-de-campeones': SUPERCUP,
  'us-open-cup': KNOCKOUT_DEEP,
  'copa-argentina': KNOCKOUT_DEEP,
  'argentine-supercopa': SUPERCUP,
  'trofeo-de-campeones': SUPERCUP,
  'knvb-beker': KNOCKOUT_STANDARD,
  'johan-cruyff-shield': SUPERCUP,
  'taca-de-portugal': KNOCKOUT_DEEP,
  'scottish-cup': KNOCKOUT_DEEP,
  'scottish-league-cup': KNOCKOUT_STANDARD,
  'scottish-challenge-cup': KNOCKOUT_COMPACT,
  'saudi-kings-cup': KNOCKOUT_STANDARD,
}

type EspnSeasonType = {
  id?: string | number
  name?: string
  abbreviation?: string
  hasStandings?: boolean
  hasLegs?: boolean
}

function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://')
}

function slugifyPhase(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/** Compact display labels for ESPN season-type names. */
export function seasonTypeTimelineLabel(type: EspnSeasonType): string | null {
  const raw = `${type.name || ''} ${type.abbreviation || ''}`.trim()
  if (!raw) return null
  const n = raw.toLowerCase()

  if (/friendly|regular season|^rs\b/i.test(n) && !/group|league phase|league stage/i.test(n)) {
    return null
  }
  if (/group stage|groups?\b/i.test(n) && !/qualif/i.test(n)) return 'Group stage'
  if (/league phase|league stage/i.test(n)) return 'League phase'
  if (/relegation/i.test(n) && /play.?off/i.test(n)) return 'Relegation play-offs'
  if (/promotion/i.test(n) && /play.?off/i.test(n)) return 'Promotion play-offs'
  if (/play.?off/i.test(n) && !/relegation|promotion|final/i.test(n)) return 'Play-offs'
  if (/round of 32|1\/16|last\s*32/i.test(n)) return 'Round of 32'
  if (/round of 16|1\/8|last\s*16/i.test(n)) return 'Round of 16'
  if (/quarter/i.test(n)) return 'Quarter-finals'
  if (/semi/i.test(n)) return 'Semi-finals'
  if (/3rd|third.?place|bronze/i.test(n)) return 'Third-place match'
  if (/^finals?\b| final$/i.test(n) || /\bfinals?\b/i.test(n)) {
    // Avoid collapsing "Finals tournament" into a single Final when semis exist separately.
    if (/finals\b/i.test(n) && !/^final\b/i.test(n.trim()) && /tournament|stage|phase/i.test(n)) {
      return 'Finals'
    }
    return 'Final'
  }
  if (/qualif/i.test(n)) return type.name || 'Qualifying'
  if (/early|preliminary|first round|second round|third round|fourth round|fifth round/i.test(n)) {
    return type.name || raw
  }
  // Keep other named knockout rounds (e.g. "Round of 64").
  if (type.hasLegs || /round|knockout|final/i.test(n)) return type.name || raw
  if (type.hasStandings) return type.name || 'League phase'
  return type.name || raw
}

async function fetchSeasonTypes(
  espnCode: string,
  seasonYear: number,
): Promise<EspnSeasonType[]> {
  try {
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
          types.push((await res.json()) as EspnSeasonType)
        } catch {
          // skip
        }
      }),
    )
    return types.sort((a, b) => Number(a.id) - Number(b.id))
  } catch {
    return []
  }
}

function phasesFromSeasonTypes(types: EspnSeasonType[]): SeasonTimelinePhase[] {
  const phases: SeasonTimelinePhase[] = []
  const seen = new Set<string>()
  for (const type of types) {
    const label = seasonTypeTimelineLabel(type)
    if (!label) continue
    const id = slugifyPhase(label)
    if (seen.has(id)) continue
    seen.add(id)
    phases.push({ id, label })
  }
  return phases
}

const timelineCache = new Map<string, SeasonTimelinePhase[] | null>()

/**
 * Competition phase strip for cups / internationals / continentals.
 * Prefers live ESPN season types so semi-finals and similar rounds are not skipped.
 */
export async function fetchLeagueSeasonTimeline(
  leagueId: LeagueId,
  seasonYear = inferSoccerSeasonStartYear(),
): Promise<SeasonTimelinePhase[] | null> {
  if (isFriendlyLeagueId(leagueId)) return null
  const cacheKey = `${leagueId}:${seasonYear}`
  if (timelineCache.has(cacheKey)) return timelineCache.get(cacheKey) ?? null

  const league = getLeague(leagueId)
  const fallback = TIMELINE_FALLBACKS[leagueId] ?? null

  // Pure domestic leagues have no tournament-phase strip.
  if (league.kind === 'domestic' && league.format === 'league') {
    timelineCache.set(cacheKey, null)
    return null
  }

  let phases = phasesFromSeasonTypes(await fetchSeasonTypes(league.espnCode, seasonYear))
  // If current season types are sparse (pre-announcement), try previous year.
  if (phases.length < 2) {
    const prev = phasesFromSeasonTypes(await fetchSeasonTypes(league.espnCode, seasonYear - 1))
    if (prev.length > phases.length) phases = prev
  }

  // If ESPN collapsed or omitted key knockout steps, prefer the curated fallback
  // when it is clearly more complete (e.g. includes Semi-finals).
  if (
    fallback &&
    (phases.length === 0 ||
      (fallback.some((p) => p.id === 'sf') && !phases.some((p) => p.id === 'sf' || /semi/i.test(p.label))))
  ) {
    phases = fallback
  } else if (phases.length === 0 && fallback) {
    phases = fallback
  }

  const result = phases.length > 0 ? phases : fallback
  timelineCache.set(cacheKey, result)
  return result
}

export function staticLeagueSeasonTimeline(leagueId: LeagueId): SeasonTimelinePhase[] | null {
  return TIMELINE_FALLBACKS[leagueId] ?? null
}
