import type { FantasyPlayer, FantasyPosition } from './types'
import { STARTER_MAX, STARTER_MIN } from './types'

export function countByPos(
  ids: number[],
  catalog: Map<number, FantasyPlayer>,
): Record<FantasyPosition, number> {
  const counts: Record<FantasyPosition, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 }
  for (const id of ids) {
    const pos = catalog.get(id)?.pos
    if (pos) counts[pos] += 1
  }
  return counts
}

export function validateStarters(
  starterIds: number[],
  roster: number[],
  starterSpots: number,
  catalog: Map<number, FantasyPlayer>,
): string | null {
  if (starterIds.length !== starterSpots) {
    return `Start exactly ${starterSpots} players`
  }
  if (new Set(starterIds).size !== starterIds.length) {
    return 'Duplicate starters'
  }
  if (starterIds.some((id) => !roster.includes(id))) {
    return 'Starters must be on your roster'
  }
  const counts = countByPos(starterIds, catalog)
  for (const pos of Object.keys(STARTER_MIN) as FantasyPosition[]) {
    if (counts[pos] < STARTER_MIN[pos]) {
      return `Need at least ${STARTER_MIN[pos]} ${pos} in your XI`
    }
    if (counts[pos] > STARTER_MAX[pos]) {
      return `At most ${STARTER_MAX[pos]} ${pos} in your XI`
    }
  }
  return null
}

/** Best legal XI from a roster by season projection (FF autopilot lineup). */
export function suggestStarters(
  roster: number[],
  starterSpots: number,
  catalog: Map<number, FantasyPlayer>,
): number[] {
  const players = roster
    .map((id) => catalog.get(id))
    .filter((p): p is FantasyPlayer => Boolean(p))
    .sort((a, b) => b.seasonProjection - a.seasonProjection)

  const chosen: number[] = []
  const counts: Record<FantasyPosition, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 }

  // Fill mins first
  for (const pos of Object.keys(STARTER_MIN) as FantasyPosition[]) {
    for (const p of players) {
      if (p.pos !== pos || chosen.includes(p.id)) continue
      if (counts[pos] >= STARTER_MIN[pos]) break
      chosen.push(p.id)
      counts[pos] += 1
    }
  }

  // Fill remaining with highest proj under max caps
  for (const p of players) {
    if (chosen.length >= starterSpots) break
    if (chosen.includes(p.id)) continue
    if (counts[p.pos] >= STARTER_MAX[p.pos]) continue
    chosen.push(p.id)
    counts[p.pos] += 1
  }

  return chosen.slice(0, starterSpots)
}

export function canAddPosition(
  roster: number[],
  pos: FantasyPosition,
  limits: Record<FantasyPosition, number>,
  catalog: Map<number, FantasyPlayer>,
): boolean {
  return countByPos(roster, catalog)[pos] < limits[pos]
}
