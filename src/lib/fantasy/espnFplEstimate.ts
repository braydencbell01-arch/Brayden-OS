import type { FantasyPosition } from './types'
import { scoreStatLine, type MatchStatLine } from './scoring'
import type { PlayerPositionGroup } from '../stats/rating'

/** Map Brayden / ESPN position groups onto FPL buckets. */
export function fantasyPosFromGroup(group: PlayerPositionGroup): FantasyPosition {
  if (group === 'GK') return 'GKP'
  if (group === 'DEF') return 'DEF'
  if (group === 'MID') return 'MID'
  if (group === 'FWD') return 'FWD'
  return 'MID'
}

export type EspnFplEstimateInput = {
  positionGroup: PlayerPositionGroup
  appeared: boolean
  starter: boolean
  live: boolean
  /** Match clock proxy when exact minutes are unavailable. */
  elapsedMinutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  ownGoals: number
  saves: number
  goalsConceded: number
  /** Goals scored against this player's team (match score). */
  teamGoalsAgainst: number | null
}

/**
 * Estimate classic FPL points for one match from ESPN roster stats.
 * Bonus BPS and pen save/miss are omitted (not in ESPN match lines) — treat as est.
 */
export function estimateFplPointsFromEspn(input: EspnFplEstimateInput): number | null {
  if (!input.appeared) return null

  const minutes = input.live
    ? Math.max(1, Math.min(120, input.elapsedMinutes || 1))
    : input.starter
      ? 90
      : 45

  const cleanSheet =
    input.teamGoalsAgainst != null
      ? input.teamGoalsAgainst === 0
      : input.goalsConceded === 0 && (input.positionGroup === 'GK' || input.positionGroup === 'DEF')

  const line: MatchStatLine = {
    minutes,
    goals: input.goals,
    assists: input.assists,
    cleanSheet,
    goalsConceded:
      input.positionGroup === 'GK' || input.positionGroup === 'DEF'
        ? input.teamGoalsAgainst ?? input.goalsConceded
        : 0,
    saves: input.saves,
    penaltySaves: 0,
    penaltyMisses: 0,
    yellowCards: input.yellowCards,
    redCards: input.redCards,
    ownGoals: input.ownGoals,
    bonus: 0,
  }

  return scoreStatLine(fantasyPosFromGroup(input.positionGroup), line, 'classic')
}
