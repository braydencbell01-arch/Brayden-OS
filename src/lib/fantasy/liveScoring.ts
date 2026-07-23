import type { FantasyPlayer, FantasyPosition, ScoringPreset } from './types'
import { scoreStatLine, type MatchStatLine } from './scoring'

/**
 * Map ESPN-style box score fields onto fantasy MatchStatLine and score.
 * Used when we have match detail stats for a PL player during a GW.
 */
export function statLineFromBox(input: {
  minutes?: number
  goals?: number
  assists?: number
  cleanSheet?: boolean
  goalsConceded?: number
  saves?: number
  yellowCards?: number
  redCards?: number
  ownGoals?: number
  bonus?: number
}): MatchStatLine {
  return {
    minutes: Math.max(0, input.minutes ?? 0),
    goals: Math.max(0, input.goals ?? 0),
    assists: Math.max(0, input.assists ?? 0),
    cleanSheet: Boolean(input.cleanSheet),
    goalsConceded: Math.max(0, input.goalsConceded ?? 0),
    saves: Math.max(0, input.saves ?? 0),
    penaltySaves: 0,
    penaltyMisses: 0,
    yellowCards: Math.max(0, input.yellowCards ?? 0),
    redCards: Math.max(0, input.redCards ?? 0),
    ownGoals: Math.max(0, input.ownGoals ?? 0),
    bonus: Math.max(0, input.bonus ?? 0),
  }
}

export function scorePlayerFromBox(
  pos: FantasyPosition,
  box: Parameters<typeof statLineFromBox>[0],
  preset: ScoringPreset,
): number {
  return scoreStatLine(pos, statLineFromBox(box), preset)
}

/** Soft name match between FPL webName and ESPN display name. */
export function namesLikelyMatch(espnName: string, fpl: FantasyPlayer): boolean {
  const a = normalizeName(espnName)
  const web = normalizeName(fpl.webName)
  const full = normalizeName(`${fpl.firstName} ${fpl.secondName}`)
  const second = normalizeName(fpl.secondName)
  if (!a) return false
  if (a === web || a === full || a === second) return true
  if (a.includes(web) || web.includes(a)) return true
  if (second.length > 3 && a.includes(second)) return true
  return false
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findFplPlayerForEspnName(
  catalog: FantasyPlayer[],
  espnName: string,
  teamHint?: string,
): FantasyPlayer | null {
  const pool = teamHint
    ? catalog.filter(
        (p) =>
          normalizeName(p.teamShort) === normalizeName(teamHint) ||
          normalizeName(p.teamName).includes(normalizeName(teamHint)) ||
          normalizeName(teamHint).includes(normalizeName(p.teamShort)),
      )
    : catalog
  const search = pool.length > 0 ? pool : catalog
  return search.find((p) => namesLikelyMatch(espnName, p)) ?? null
}
