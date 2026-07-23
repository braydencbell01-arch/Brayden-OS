import type { FantasyLeague, FantasyMember, FantasyPlayer, FantasyPosition } from './types'
import {
  FLEX_POSITIONS,
  MAX_IR_SLOTS,
  POSITION_LIMITS,
  STARTER_FLEX_SLOTS,
  STARTER_MAX,
  STARTER_MIN,
} from './types'

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
  if (counts.GKP !== STARTER_MIN.GKP) {
    return 'Start exactly 1 GKP'
  }
  if (counts.DEF < STARTER_MIN.DEF || counts.DEF > STARTER_MAX.DEF) {
    return `Start ${STARTER_MIN.DEF}-${STARTER_MAX.DEF} DEF`
  }
  if (!findFlexPosition(counts)) {
    return 'Start 2-4 MID, 1-2 FWD, plus exactly one MID/FWD FLEX'
  }
  return null
}

export type StarterSuggestion = {
  starterIds: number[]
  flexPlayerId: number | null
  reasons: string[]
}

function projection(p: FantasyPlayer): number {
  return p.weekProjection || p.seasonProjection / 38 || p.ppg || p.form || 0
}

function sortByProjection(players: FantasyPlayer[]): FantasyPlayer[] {
  return [...players].sort(
    (a, b) =>
      projection(b) - projection(a) ||
      b.seasonProjection - a.seasonProjection ||
      a.webName.localeCompare(b.webName),
  )
}

function findFlexPosition(counts: Record<FantasyPosition, number>): FantasyPosition | null {
  for (const flexPos of FLEX_POSITIONS) {
    const nonFlexMid = counts.MID - (flexPos === 'MID' ? STARTER_FLEX_SLOTS : 0)
    const nonFlexFwd = counts.FWD - (flexPos === 'FWD' ? STARTER_FLEX_SLOTS : 0)
    if (
      nonFlexMid >= STARTER_MIN.MID &&
      nonFlexMid <= STARTER_MAX.MID &&
      nonFlexFwd >= STARTER_MIN.FWD &&
      nonFlexFwd <= STARTER_MAX.FWD
    ) {
      return flexPos
    }
  }
  return null
}

function lowestProjectedFlex(starters: FantasyPlayer[], flexPos: FantasyPosition | null): FantasyPlayer | null {
  const pool = starters.filter((p) => (flexPos ? p.pos === flexPos : FLEX_POSITIONS.includes(p.pos)))
  return sortByProjection(pool).at(-1) ?? null
}

function takeTop(players: FantasyPlayer[], pos: FantasyPosition, count: number): FantasyPlayer[] | null {
  const picked = sortByProjection(players.filter((p) => p.pos === pos)).slice(0, count)
  return picked.length === count ? picked : null
}

/** Best legal XI from a roster by week projection with an explicit MID/FWD flex. */
export function suggestStartersDetailed(
  roster: number[],
  starterSpots: number,
  catalog: Map<number, FantasyPlayer>,
): StarterSuggestion {
  const players = roster
    .map((id) => catalog.get(id))
    .filter((p): p is FantasyPlayer => Boolean(p))

  let best: { starters: FantasyPlayer[]; score: number; flexPos: FantasyPosition | null } | null = null
  for (let def = STARTER_MIN.DEF; def <= STARTER_MAX.DEF; def++) {
    for (let mid = STARTER_MIN.MID; mid <= STARTER_MAX.MID + STARTER_FLEX_SLOTS; mid++) {
      for (let fwd = STARTER_MIN.FWD; fwd <= STARTER_MAX.FWD + STARTER_FLEX_SLOTS; fwd++) {
        const counts: Record<FantasyPosition, number> = { GKP: 1, DEF: def, MID: mid, FWD: fwd }
        if (1 + def + mid + fwd !== starterSpots) continue
        const flexPos = findFlexPosition(counts)
        if (!flexPos) continue

        const gkps = takeTop(players, 'GKP', 1)
        const defs = takeTop(players, 'DEF', def)
        const mids = takeTop(players, 'MID', mid)
        const fwds = takeTop(players, 'FWD', fwd)
        if (!gkps || !defs || !mids || !fwds) continue

        const starters = [...gkps, ...defs, ...mids, ...fwds]
        const score = starters.reduce((sum, p) => sum + projection(p), 0)
        if (!best || score > best.score) {
          best = { starters, score, flexPos }
        }
      }
    }
  }

  if (!best) {
    return { starterIds: players.slice(0, starterSpots).map((p) => p.id), flexPlayerId: null, reasons: [] }
  }

  const flexPlayer = lowestProjectedFlex(best.starters, best.flexPos)
  const starterIds = best.starters.map((p) => p.id)
  const starterSet = new Set(starterIds)
  const reasons: string[] = []

  for (const starter of sortByProjection(best.starters)) {
    const bench = sortByProjection(
      players.filter(
        (p) =>
          !starterSet.has(p.id) &&
          (p.pos === starter.pos ||
            (FLEX_POSITIONS.includes(p.pos) && FLEX_POSITIONS.includes(starter.pos))),
      ),
    )[0]
    if (bench && projection(starter) > projection(bench)) {
      reasons.push(
        `Started ${starter.webName} over ${bench.webName} - higher week projection`,
      )
    }
    if (reasons.length >= 3) break
  }

  return { starterIds, flexPlayerId: flexPlayer?.id ?? null, reasons }
}

/** Best legal XI from a roster by week projection (FF autopilot lineup). */
export function suggestStarters(
  roster: number[],
  starterSpots: number,
  catalog: Map<number, FantasyPlayer>,
): number[] {
  return suggestStartersDetailed(roster, starterSpots, catalog).starterIds
}

/** Keep a legal XI after roster changes; refill from bench when incomplete. */
export function ensureLegalStarters(
  starters: number[],
  roster: number[],
  starterSpots: number,
  catalog: Map<number, FantasyPlayer>,
): number[] {
  const kept = starters.filter((id) => roster.includes(id))
  if (validateStarters(kept, roster, starterSpots, catalog) === null) return kept
  return suggestStarters(roster, starterSpots, catalog)
}

export function canAddPosition(
  roster: number[],
  pos: FantasyPosition,
  limits: Record<FantasyPosition, number>,
  catalog: Map<number, FantasyPlayer>,
): boolean {
  return countByPos(roster, catalog)[pos] < limits[pos]
}

/** Active roster + IR — IR players must stay owned while stashed. */
export function ownedPlayerIds(
  members: Array<{ roster: number[]; ir?: number[] }>,
): Set<number> {
  const ids = new Set<number>()
  for (const member of members) {
    for (const id of member.roster) ids.add(id)
    for (const id of member.ir ?? []) ids.add(id)
  }
  return ids
}

export function moveToIr(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const player = catalog.get(playerId)
  if (player?.status === 'a') {
    throw new Error('Only injured, suspended, doubtful, or unavailable players can move to IR')
  }
  if (!league.members.some((m) => m.id === memberId)) throw new Error('Manager not found')

  const members = league.members.map((m) => {
    if (m.id !== memberId) return m
    if (!m.roster.includes(playerId)) throw new Error('Player is not on your roster')
    const ir = m.ir ?? []
    if (ir.includes(playerId)) return m
    if (ir.length >= MAX_IR_SLOTS) throw new Error(`IR is limited to ${MAX_IR_SLOTS} players`)
    return {
      ...m,
      roster: m.roster.filter((id) => id !== playerId),
      starters: m.starters.filter((id) => id !== playerId),
      ir: [...ir, playerId],
    }
  })

  return { ...league, members, updatedAt: Date.now() }
}

export function activateFromIr(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const player = catalog.get(playerId)
  if (!player) throw new Error('Unknown player')
  if (!league.members.some((m) => m.id === memberId)) throw new Error('Manager not found')

  const members: FantasyMember[] = league.members.map((m) => {
    if (m.id !== memberId) return m
    const ir = m.ir ?? []
    if (!ir.includes(playerId)) throw new Error('Player is not on IR')
    if (m.roster.length >= league.rosterSpots) throw new Error('Roster full - drop a player first')
    if (!canAddPosition(m.roster, player.pos, POSITION_LIMITS, catalog)) {
      throw new Error(`Max ${POSITION_LIMITS[player.pos]} ${player.pos} on roster`)
    }
    return {
      ...m,
      roster: [...m.roster, playerId],
      ir: ir.filter((id) => id !== playerId),
    }
  })

  return { ...league, members, updatedAt: Date.now() }
}
