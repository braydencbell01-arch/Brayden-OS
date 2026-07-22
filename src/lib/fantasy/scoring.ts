import type { FantasyPlayer, FantasyPosition } from './types'

/**
 * BrayStats FPL scoring algorithm v1
 * (Commissioner can intervene later — keep weights centralized here.)
 */
export const SCORING = {
  appearanceUnder60: 1,
  appearance60Plus: 2,
  goal: { GKP: 6, DEF: 6, MID: 5, FWD: 4 } as Record<FantasyPosition, number>,
  assist: 3,
  cleanSheet: { GKP: 4, DEF: 4, MID: 1, FWD: 0 } as Record<FantasyPosition, number>,
  goalsConcededPerTwo: -1, // GKP/DEF only
  savePerThree: 1,
  penaltySave: 5,
  penaltyMiss: -2,
  yellow: -1,
  red: -3,
  ownGoal: -2,
  bonusMax: 3,
} as const

export type MatchStatLine = {
  minutes: number
  goals: number
  assists: number
  cleanSheet: boolean
  goalsConceded: number
  saves: number
  penaltySaves: number
  penaltyMisses: number
  yellowCards: number
  redCards: number
  ownGoals: number
  bonus: number
}

export function scoreStatLine(pos: FantasyPosition, line: MatchStatLine): number {
  if (line.minutes <= 0) return 0

  let pts = 0
  pts += line.minutes >= 60 ? SCORING.appearance60Plus : SCORING.appearanceUnder60
  pts += line.goals * SCORING.goal[pos]
  pts += line.assists * SCORING.assist

  if (line.cleanSheet && line.minutes >= 60) {
    pts += SCORING.cleanSheet[pos]
  }

  if (pos === 'GKP' || pos === 'DEF') {
    pts += Math.floor(line.goalsConceded / 2) * SCORING.goalsConcededPerTwo
  }

  if (pos === 'GKP') {
    pts += Math.floor(line.saves / 3) * SCORING.savePerThree
    pts += line.penaltySaves * SCORING.penaltySave
  }

  pts += line.penaltyMisses * SCORING.penaltyMiss
  pts += line.yellowCards * SCORING.yellow
  pts += line.redCards * SCORING.red
  pts += line.ownGoals * SCORING.ownGoal
  pts += Math.max(0, Math.min(SCORING.bonusMax, line.bonus))

  return pts
}

/**
 * Project a single gameweek from player meta.
 * Blend official FPL expected points with form + PPG.
 */
export function projectWeekPoints(player: Pick<
  FantasyPlayer,
  'epNext' | 'epThis' | 'form' | 'ppg' | 'chance' | 'status' | 'weekProjection'
>): number {
  if (typeof player.weekProjection === 'number' && player.weekProjection > 0) {
    return player.weekProjection
  }
  const ep = player.epNext > 0 ? player.epNext : player.epThis
  let base = 0.4 * ep + 0.35 * player.form + 0.25 * player.ppg
  if (base <= 0) base = Math.max(player.ppg, player.form, 1.5)
  const chance = player.chance ?? (player.status === 'a' ? 100 : 50)
  const avail = Math.max(0, Math.min(1, chance / 100))
  return Math.round((base * (0.35 + 0.65 * avail)) * 100) / 100
}

/** Full-season rate projection used on the draft board ranking. */
export function projectSeasonPoints(
  player: Pick<FantasyPlayer, 'weekProjection' | 'seasonProjection' | 'ppg' | 'form' | 'epNext' | 'epThis' | 'chance' | 'status'>,
  seasonGws = 38,
): number {
  if (typeof player.seasonProjection === 'number' && player.seasonProjection > 0) {
    return player.seasonProjection
  }
  return Math.round(projectWeekPoints(player) * seasonGws * 10) / 10
}

export function projectRestOfSeason(
  player: Pick<FantasyPlayer, 'weekProjection' | 'restOfSeasonProjection' | 'ppg' | 'form' | 'epNext' | 'epThis' | 'chance' | 'status'>,
  remainingGws: number,
): number {
  if (typeof player.restOfSeasonProjection === 'number' && remainingGws <= 0) {
    return player.restOfSeasonProjection
  }
  if (typeof player.restOfSeasonProjection === 'number' && player.restOfSeasonProjection > 0) {
    return player.restOfSeasonProjection
  }
  return Math.round(projectWeekPoints(player) * Math.max(0, remainingGws) * 10) / 10
}

/** Fallback GW score when live match lines aren't available yet. */
export function estimateGwPoints(
  player: Pick<FantasyPlayer, 'eventPoints' | 'weekProjection' | 'epNext' | 'epThis' | 'form' | 'ppg' | 'chance' | 'status'>,
  preferOfficialEventPoints: boolean,
): number {
  if (preferOfficialEventPoints && typeof player.eventPoints === 'number') {
    return player.eventPoints
  }
  return projectWeekPoints(player)
}

export const SCORING_BLURB = [
  'Appearance: 1 (<60′) / 2 (60′+)',
  'Goals: GKP/DEF 6 · MID 5 · FWD 4',
  'Assist: 3',
  'CS (60′+): GKP/DEF 4 · MID 1',
  'GC: −1 / 2 (GKP/DEF)',
  'Saves: 1 / 3 · Pen save 5 · Pen miss −2',
  'Cards: Y −1 · R −3 · OG −2 · Bonus up to 3',
].join(' · ')
