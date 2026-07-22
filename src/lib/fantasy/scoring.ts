import { getScoring, scoringBlurb } from './scoringPresets'
import type { FantasyPlayer, FantasyPosition, ScoringPreset } from './types'

/**
 * BrayStats H2H scoring v2 — closer to fantasy-football “every starter counts”
 * weekly matchups (tune freely later).
 */
export const SCORING = getScoring('classic')

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

export function scoreStatLine(
  pos: FantasyPosition,
  line: MatchStatLine,
  preset: ScoringPreset = 'classic',
): number {
  if (line.minutes <= 0) return 0

  const scoring = getScoring(preset)
  let pts = 0
  pts += line.minutes >= 60 ? scoring.appearance60Plus : scoring.appearanceUnder60
  pts += line.goals * scoring.goal[pos]
  pts += line.assists * scoring.assist

  if (line.cleanSheet && line.minutes >= 60) {
    pts += scoring.cleanSheet[pos]
  }

  if (pos === 'GKP' || pos === 'DEF') {
    pts += Math.floor(line.goalsConceded / 2) * scoring.goalsConcededPerTwo
  }

  if (pos === 'GKP') {
    pts += Math.floor(line.saves / 3) * scoring.savePerThree
    pts += line.penaltySaves * scoring.penaltySave
  }

  pts += line.penaltyMisses * scoring.penaltyMiss
  pts += line.yellowCards * scoring.yellow
  pts += line.redCards * scoring.red
  pts += line.ownGoals * scoring.ownGoal
  pts += Math.max(0, Math.min(scoring.bonusMax, line.bonus))

  return pts
}

/**
 * Project a single gameweek from player meta.
 * Blend official FPL expected points with form + PPG.
 */
export function projectWeekPoints(player: Pick<
  FantasyPlayer,
  'epNext' | 'epThis' | 'form' | 'ppg' | 'chance' | 'status' | 'weekProjection' | 'pos'
>, preset: ScoringPreset = 'classic'): number {
  if (typeof player.weekProjection === 'number' && player.weekProjection > 0) {
    return Math.round(player.weekProjection * getScoring(preset).projectionMultiplier[player.pos] * 100) / 100
  }
  const ep = player.epNext > 0 ? player.epNext : player.epThis
  let base = 0.4 * ep + 0.35 * player.form + 0.25 * player.ppg
  if (base <= 0) base = Math.max(player.ppg, player.form, 1.5)
  const chance = player.chance ?? (player.status === 'a' ? 100 : 50)
  const avail = Math.max(0, Math.min(1, chance / 100))
  const adjusted = base * (0.35 + 0.65 * avail) * getScoring(preset).projectionMultiplier[player.pos]
  return Math.round(adjusted * 100) / 100
}

/** Full-season rate projection used on the draft board ranking. */
export function projectSeasonPoints(
  player: Pick<FantasyPlayer, 'weekProjection' | 'seasonProjection' | 'ppg' | 'form' | 'epNext' | 'epThis' | 'chance' | 'status' | 'pos'>,
  seasonGws = 38,
  preset: ScoringPreset = 'classic',
): number {
  if (typeof player.seasonProjection === 'number' && player.seasonProjection > 0) {
    return Math.round(player.seasonProjection * getScoring(preset).projectionMultiplier[player.pos] * 10) / 10
  }
  return Math.round(projectWeekPoints(player, preset) * seasonGws * 10) / 10
}

export function projectRestOfSeason(
  player: Pick<FantasyPlayer, 'weekProjection' | 'restOfSeasonProjection' | 'ppg' | 'form' | 'epNext' | 'epThis' | 'chance' | 'status' | 'pos'>,
  remainingGws: number,
  preset: ScoringPreset = 'classic',
): number {
  if (typeof player.restOfSeasonProjection === 'number' && remainingGws <= 0) {
    return player.restOfSeasonProjection
  }
  if (typeof player.restOfSeasonProjection === 'number' && player.restOfSeasonProjection > 0) {
    return Math.round(player.restOfSeasonProjection * getScoring(preset).projectionMultiplier[player.pos] * 10) / 10
  }
  return Math.round(projectWeekPoints(player, preset) * Math.max(0, remainingGws) * 10) / 10
}

/** Fallback GW score when live match lines aren't available yet. */
export function estimateGwPoints(
  player: Pick<FantasyPlayer, 'eventPoints' | 'weekProjection' | 'epNext' | 'epThis' | 'form' | 'ppg' | 'chance' | 'status' | 'pos'>,
  preferOfficialEventPoints: boolean,
  preset: ScoringPreset = 'classic',
): number {
  if (preferOfficialEventPoints && typeof player.eventPoints === 'number') {
    return player.eventPoints
  }
  return projectWeekPoints(player, preset)
}

export { getScoring, scoringBlurb }

export const SCORING_BLURB = scoringBlurb('classic')
