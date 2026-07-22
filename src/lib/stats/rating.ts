/**
 * Brayden Rating v0 — live-aware, time-averaged match rating.
 *
 * Scale: 0–10, clipped.
 *
 * Model:
 * - Every player who appears starts at base **5.0**
 * - Stats produce an “end-of-game” delta (e.g. a goal ≈ **+1.0** at 90′)
 * - During the match that delta is stretched by time:
 *     liveDelta = endGameDelta * (90 / minutesSoFar)
 *   So a 1st-minute goal spikes close to **10**, then as minutes and other
 *   stats accumulate the rating averages back toward a calmer final number.
 *
 * Season form = recency-weighted average of recent match ratings.
 */

export type PlayerPositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD' | 'UNK'

export type MatchPlayerStats = {
  appearances: number
  starter?: boolean
  totalGoals: number
  goalAssists: number
  totalShots: number
  shotsOnTarget: number
  foulsCommitted: number
  foulsSuffered: number
  yellowCards: number
  redCards: number
  offsides: number
  ownGoals: number
  saves: number
  goalsConceded: number
  shotsFaced: number
}

export type RateMatchOptions = {
  minutesPlayed?: number
  live?: boolean
}

export type RatingBreakdown = {
  rating: number
  base: number
  endGameDelta: number
  liveDelta: number
  minutesUsed: number
  timeFactor: number
  attack: number
  creation: number
  discipline: number
  goalkeeping: number
  defending: number
  notes: string[]
}

const CLIP_MIN = 1
const CLIP_MAX = 10
const FULL_TIME = 90
const MIN_MINUTES = 1

const W = {
  goal: 1.0,
  assist: 0.7,
  shotOnTarget: 0.12,
  shotOffTarget: 0.03,
  foulCommitted: -0.04,
  foulSuffered: 0.015,
  yellow: -0.25,
  red: -1.0,
  ownGoal: -0.9,
  offside: -0.02,
  save: 0.22,
  gkGoalConceded: -0.3,
  defGoalConceded: -0.1,
} as const

export function positionGroupFromAbbrev(abbrev: string | undefined | null): PlayerPositionGroup {
  const a = (abbrev || '').toUpperCase()
  if (!a) return 'UNK'
  if (a === 'G' || a === 'GK') return 'GK'
  if (
    a.startsWith('CB') ||
    a.startsWith('CD') ||
    a === 'LB' ||
    a === 'RB' ||
    a === 'LWB' ||
    a === 'RWB' ||
    a === 'FB' ||
    a === 'DF' ||
    a === 'D'
  ) {
    return 'DEF'
  }
  if (
    a.startsWith('CM') ||
    a.startsWith('DM') ||
    a.startsWith('AM') ||
    a === 'LM' ||
    a === 'RM' ||
    a === 'MF' ||
    a === 'M' ||
    a.includes('M')
  ) {
    if (a.startsWith('CF') || a === 'ST' || a === 'F' || a === 'FW' || a === 'SS') return 'FWD'
    return 'MID'
  }
  if (a.startsWith('CF') || a === 'ST' || a === 'F' || a === 'FW' || a === 'SS') return 'FWD'
  return 'UNK'
}

function clip(n: number): number {
  return Math.round(Math.min(CLIP_MAX, Math.max(CLIP_MIN, n)) * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveMinutes(options?: RateMatchOptions): number {
  const raw = options?.minutesPlayed
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.min(120, Math.max(MIN_MINUTES, raw))
  }
  return FULL_TIME
}

export function rateMatchPerformance(
  stats: MatchPlayerStats,
  position: PlayerPositionGroup,
  options?: RateMatchOptions,
): RatingBreakdown | null {
  if (!stats.appearances || stats.appearances <= 0) return null

  const notes: string[] = []
  const base = 5.0
  const minutesUsed = resolveMinutes(options)
  if (stats.starter === false) notes.push('Came off the bench')
  if (options?.live) notes.push(`Live @ ${Math.round(minutesUsed)}′`)

  let attack = 0
  const goalWeight =
    position === 'FWD' ? W.goal : position === 'MID' ? W.goal + 0.05 : W.goal + 0.1
  attack += stats.totalGoals * goalWeight
  attack += Math.min(stats.shotsOnTarget, 8) * W.shotOnTarget
  attack += Math.min(Math.max(stats.totalShots - stats.shotsOnTarget, 0), 8) * W.shotOffTarget
  if (stats.totalGoals > 0) notes.push(`${stats.totalGoals} goal(s)`)

  let creation = 0
  creation += stats.goalAssists * (position === 'MID' ? W.assist + 0.05 : W.assist)
  if (stats.goalAssists > 0) notes.push(`${stats.goalAssists} assist(s)`)

  let discipline = 0
  discipline += Math.min(stats.foulsCommitted, 8) * W.foulCommitted
  discipline += Math.min(stats.foulsSuffered, 8) * W.foulSuffered
  discipline += stats.yellowCards * W.yellow
  discipline += stats.redCards * W.red
  discipline += stats.ownGoals * W.ownGoal
  discipline += Math.min(stats.offsides, 5) * W.offside
  if (stats.redCards > 0) notes.push('Red card')

  let goalkeeping = 0
  if (position === 'GK') {
    goalkeeping += Math.min(stats.saves, 12) * W.save
    goalkeeping += stats.goalsConceded * W.gkGoalConceded
    if (stats.saves > 0) notes.push(`${stats.saves} save(s)`)
  }

  let defending = 0
  if (position === 'DEF') {
    defending += Math.min(stats.goalsConceded, 5) * W.defGoalConceded
  } else if (position === 'GK') {
    defending += Math.min(stats.goalsConceded, 5) * (W.defGoalConceded * 0.5)
  }

  if (position === 'GK') {
    attack *= 0.2
    creation *= 0.35
  } else {
    goalkeeping = 0
  }

  const endGameDelta = attack + creation + discipline + goalkeeping + defending
  const timeFactor = FULL_TIME / minutesUsed
  const liveDelta = endGameDelta * timeFactor
  const rating = clip(base + liveDelta)

  if (options?.live && minutesUsed < FULL_TIME) {
    notes.push(`Averaging toward ~${clip(base + endGameDelta)} by FT`)
  }

  return {
    rating,
    base,
    endGameDelta: round2(endGameDelta),
    liveDelta: round2(liveDelta),
    minutesUsed: round2(minutesUsed),
    timeFactor: round2(timeFactor),
    attack: round2(attack),
    creation: round2(creation),
    discipline: round2(discipline),
    goalkeeping: round2(goalkeeping),
    defending: round2(defending),
    notes,
  }
}

export function rateSeasonForm(matchRatings: number[], maxGames = 8): number | null {
  const recent = matchRatings.filter((n) => Number.isFinite(n)).slice(0, maxGames)
  if (recent.length === 0) return null

  let weightSum = 0
  let total = 0
  recent.forEach((rating, index) => {
    const weight = recent.length - index
    total += rating * weight
    weightSum += weight
  })
  return clip(total / weightSum)
}

export const RATING_ROADMAP = {
  v0: 'Time-averaged ESPN match stats; base 5.0; live spike then settle by FT',
  v1: 'True per-player minutes from feed (not just match clock)',
  v2: 'Blend xG/xA overperformance from FootyStats/Big Balls/API-Football',
  v3: 'Progressive actions + duel rates from FBref-style weekly enrichment',
} as const
