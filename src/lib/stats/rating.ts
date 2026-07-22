/**
 * Brayden Rating v0 — position-aware match rating from ESPN-available stats.
 *
 * Scale: roughly 0–10 (Sofascore-like), clipped.
 * Base starts at 5.0 for every player who appears; contributions add/subtract from there.
 * Designed so we can ship ratings NOW from match roster stats, then upgrade
 * weights when xG / minutes / progressive actions arrive from richer feeds.
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
  /** Goalkeeper / defensive */
  saves: number
  goalsConceded: number
  shotsFaced: number
}

export type RatingBreakdown = {
  rating: number
  base: number
  attack: number
  creation: number
  discipline: number
  goalkeeping: number
  defending: number
  notes: string[]
}

const CLIP_MIN = 1
const CLIP_MAX = 10

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
    // keep MID before FWD checks for AM-* already handled
    if (a.startsWith('CF') || a === 'ST' || a === 'F' || a === 'FW' || a === 'SS') return 'FWD'
    return 'MID'
  }
  if (a.startsWith('CF') || a === 'ST' || a === 'F' || a === 'FW' || a === 'SS') return 'FWD'
  return 'UNK'
}

function clip(n: number): number {
  return Math.round(Math.min(CLIP_MAX, Math.max(CLIP_MIN, n)) * 10) / 10
}

/**
 * Single-match Brayden Rating from ESPN roster stats.
 * Returns null if the player did not appear.
 */
export function rateMatchPerformance(
  stats: MatchPlayerStats,
  position: PlayerPositionGroup,
): RatingBreakdown | null {
  if (!stats.appearances || stats.appearances <= 0) return null

  const notes: string[] = []
  const base = 5.0
  if (stats.starter === false) notes.push('Came off the bench')

  // Attack finishing
  let attack = 0
  attack += stats.totalGoals * (position === 'FWD' ? 1.15 : position === 'MID' ? 1.25 : 1.35)
  attack += Math.min(stats.shotsOnTarget, 6) * 0.18
  attack += Math.min(Math.max(stats.totalShots - stats.shotsOnTarget, 0), 6) * 0.04
  if (stats.totalGoals > 0) notes.push(`${stats.totalGoals} goal(s)`)

  // Creation
  let creation = 0
  creation += stats.goalAssists * (position === 'MID' ? 0.95 : 0.85)
  if (stats.goalAssists > 0) notes.push(`${stats.goalAssists} assist(s)`)

  // Discipline / waste
  let discipline = 0
  discipline -= stats.yellowCards * 0.3
  discipline -= stats.redCards * 1.2
  discipline -= Math.min(stats.foulsCommitted, 6) * 0.05
  discipline += Math.min(stats.foulsSuffered, 6) * 0.02
  discipline -= stats.ownGoals * 1.0
  discipline -= Math.min(stats.offsides, 4) * 0.03
  if (stats.redCards > 0) notes.push('Red card')

  // Goalkeeping
  let goalkeeping = 0
  if (position === 'GK') {
    goalkeeping += Math.min(stats.saves, 10) * 0.28
    goalkeeping -= stats.goalsConceded * 0.35
    if (stats.saves > 0) notes.push(`${stats.saves} save(s)`)
  }

  // Defending proxy (no tackles/interceptions on ESPN player line yet)
  let defending = 0
  if (position === 'DEF' || position === 'GK') {
    // Light team-goal penalty for defenders when they played
    defending -= Math.min(stats.goalsConceded, 5) * 0.12
  }

  // Position emphasis: mute attack for GK, mute GK for outfield
  if (position === 'GK') {
    attack *= 0.25
    creation *= 0.4
  } else {
    goalkeeping = 0
  }

  const raw = base + attack + creation + discipline + goalkeeping + defending
  const rating = clip(raw)

  return {
    rating,
    base,
    attack: round2(attack),
    creation: round2(creation),
    discipline: round2(discipline),
    goalkeeping: round2(goalkeeping),
    defending: round2(defending),
    notes,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Season / form rating from recent match ratings.
 * Newer matches weigh more (linear decay).
 */
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

/**
 * Roadmap for rating v1 / v2 once richer feeds land.
 */
export const RATING_ROADMAP = {
  v0: 'ESPN match roster stats only (this module)',
  v1: 'Add minutes played + normalize per 90; include pass leaders when available',
  v2: 'Blend xG/xA overperformance from FootyStats/Big Balls/API-Football',
  v3: 'Progressive actions + duel rates from FBref-style weekly enrichment',
} as const
