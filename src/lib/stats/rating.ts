/**
 * Brayden Rating — performance % mapped straight onto 0–10.
 *
 * Core rule:
 *   rating = performance100 / 10
 * so a **26/100** performance is **2.6**, an **83/100** is **8.3**, etc.
 *
 * `performance100` is a 0–100 quality score for the match:
 * - Neutral floor for anyone who appeared: **50** (→ 5.0)
 * - Actions push that score up or down on a **wide** scale so good/bad
 *   games actually separate (not clustered around 6–7)
 * - Live matches use the same math on stats so far (no artificial spike-to-10)
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
  /** Final Brayden Rating (0–10) = performance100 / 10 */
  rating: number
  /** Match performance out of 100 — rating is this ÷ 10 */
  performance100: number
  /** Neutral floor before actions (50) */
  base: number
  /** Net action points on the 0–100 scale */
  contribution: number
  minutesUsed: number
  attack: number
  creation: number
  discipline: number
  goalkeeping: number
  defending: number
  notes: string[]
  /** @deprecated kept for older call sites — same as contribution */
  endGameDelta: number
  /** @deprecated always 1 under the linear model */
  liveDelta: number
  /** @deprecated always 1 under the linear model */
  timeFactor: number
}

const CLIP_MIN = 0
const CLIP_MAX = 10
const PERF_MIN = 0
const PERF_MAX = 100
const NEUTRAL = 50
const FULL_TIME = 90
const MIN_MINUTES = 1

/**
 * Weights are on the **0–100 performance** scale.
 * Divide by 10 to see the rating swing (goal ≈ +1.8 rating).
 */
const W = {
  goal: 18,
  assist: 12,
  shotOnTarget: 3.2,
  shotOffTarget: 0.9,
  foulCommitted: -2,
  foulSuffered: 0.9,
  yellow: -5,
  red: -35,
  ownGoal: -25,
  offside: -1.5,
  save: 4.5,
  gkGoalConceded: -12,
  defGoalConceded: -5,
} as const

export function positionGroupFromAbbrev(abbrev: string | undefined | null): PlayerPositionGroup {
  const a = (abbrev || '').toUpperCase()
  if (!a) return 'UNK'
  if (a === 'G' || a === 'GK') return 'GK'
  // Midfield before CD* so CDM is not treated as a centre-back.
  if (
    a === 'CDM' ||
    a === 'RDM' ||
    a === 'LDM' ||
    a.startsWith('CM') ||
    a.startsWith('DM') ||
    a.startsWith('AM') ||
    a === 'LM' ||
    a === 'RM' ||
    a === 'MF' ||
    a === 'M'
  ) {
    return 'MID'
  }
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
    a.startsWith('CF') ||
    a === 'ST' ||
    a === 'F' ||
    a === 'FW' ||
    a === 'SS' ||
    a === 'LW' ||
    a === 'RW' ||
    a === 'WF' ||
    a === 'LWF' ||
    a === 'RWF' ||
    a === 'LCF' ||
    a === 'RCF'
  ) {
    return 'FWD'
  }
  if (a.includes('M')) return 'MID'
  if (a.includes('F') || a.includes('W')) return 'FWD'
  return 'UNK'
}

function clipRating(n: number): number {
  return Math.round(Math.min(CLIP_MAX, Math.max(CLIP_MIN, n)) * 10) / 10
}

function clipPerformance(n: number): number {
  return Math.round(Math.min(PERF_MAX, Math.max(PERF_MIN, n)) * 10) / 10
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

/** Convert 0–100 performance → 0–10 rating (26 → 2.6). */
export function ratingFromPerformance100(performance100: number): number {
  return clipRating(performance100 / 10)
}

export function rateMatchPerformance(
  stats: MatchPlayerStats,
  position: PlayerPositionGroup,
  options?: RateMatchOptions,
): RatingBreakdown | null {
  if (!stats.appearances || stats.appearances <= 0) return null

  const notes: string[] = []
  const base = NEUTRAL
  const minutesUsed = resolveMinutes(options)
  if (stats.starter === false) notes.push('Came off the bench')
  if (options?.live) notes.push(`Live @ ${Math.round(minutesUsed)}′`)

  let attack = 0
  const goalWeight =
    position === 'FWD' ? W.goal : position === 'MID' ? W.goal + 1 : W.goal + 2
  attack += stats.totalGoals * goalWeight
  attack += Math.min(stats.shotsOnTarget, 10) * W.shotOnTarget
  attack += Math.min(Math.max(stats.totalShots - stats.shotsOnTarget, 0), 10) * W.shotOffTarget
  if (stats.totalGoals > 0) notes.push(`${stats.totalGoals} goal(s)`)

  let creation = 0
  creation += stats.goalAssists * (position === 'MID' ? W.assist + 1 : W.assist)
  if (stats.goalAssists > 0) notes.push(`${stats.goalAssists} assist(s)`)

  let discipline = 0
  discipline += Math.min(stats.foulsCommitted, 8) * W.foulCommitted
  discipline += Math.min(stats.foulsSuffered, 8) * W.foulSuffered
  discipline += stats.yellowCards * W.yellow
  discipline += stats.redCards * W.red
  discipline += stats.ownGoals * W.ownGoal
  discipline += Math.min(stats.offsides, 5) * W.offside
  if (stats.redCards > 0) notes.push('Red card')
  if (stats.ownGoals > 0) notes.push('Own goal')

  let goalkeeping = 0
  if (position === 'GK') {
    goalkeeping += Math.min(stats.saves, 14) * W.save
    goalkeeping += stats.goalsConceded * W.gkGoalConceded
    if (stats.saves > 0) notes.push(`${stats.saves} save(s)`)
  }

  let defending = 0
  if (position === 'DEF') {
    defending += Math.min(stats.goalsConceded, 5) * W.defGoalConceded
  }
  // Keepers already take gkGoalConceded in goalkeeping — do not double-count.

  if (position === 'GK') {
    attack *= 0.2
    creation *= 0.35
  } else {
    goalkeeping = 0
  }

  const contribution = attack + creation + discipline + goalkeeping + defending
  const performance100 = clipPerformance(base + contribution)
  const rating = ratingFromPerformance100(performance100)

  notes.push(`Performance ${performance100.toFixed(0)}/100 → ${rating.toFixed(1)}`)

  return {
    rating,
    performance100,
    base,
    contribution: round2(contribution),
    minutesUsed: round2(minutesUsed),
    attack: round2(attack),
    creation: round2(creation),
    discipline: round2(discipline),
    goalkeeping: round2(goalkeeping),
    defending: round2(defending),
    notes,
    endGameDelta: round2(contribution),
    liveDelta: round2(contribution),
    timeFactor: 1,
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
  return clipRating(total / weightSum)
}

export const RATING_ROADMAP = {
  v0: 'Linear 0–100 performance → rating/10 (26/100 = 2.6); wide action weights',
  v1: 'True per-player minutes from feed (not just match clock)',
  v2: 'Blend xG/xA overperformance from FootyStats/Big Balls/API-Football',
  v3: 'Progressive actions + duel rates from FBref-style weekly enrichment',
} as const
