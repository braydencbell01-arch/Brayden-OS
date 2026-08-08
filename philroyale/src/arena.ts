/** Phil Royale arena: 100 tiles wide × 150 tiles long. */
export const ARENA_COLS = 100
export const ARENA_ROWS = 150

/** River band near the midline. */
export const RIVER_ROWS = [74, 75] as const

/** Bridge columns — aligned with left/right dirt lanes. */
export const BRIDGES = [
  { colStart: 18, colEnd: 28 },
  { colStart: 72, colEnd: 82 },
] as const

export type TowerKind = 'king' | 'princess'
export type Side = 'ally' | 'enemy'

export type TowerSlot = {
  id: string
  side: Side
  kind: TowerKind
  col: number
  row: number
  w: number
  h: number
}

/** King towers 5×5, princess towers 3×3. */
export const TOWERS: TowerSlot[] = [
  { id: 'enemy-king', side: 'enemy', kind: 'king', col: 48, row: 3, w: 5, h: 5 },
  { id: 'enemy-left', side: 'enemy', kind: 'princess', col: 22, row: 16, w: 3, h: 3 },
  { id: 'enemy-right', side: 'enemy', kind: 'princess', col: 76, row: 16, w: 3, h: 3 },
  { id: 'ally-king', side: 'ally', kind: 'king', col: 48, row: 142, w: 5, h: 5 },
  { id: 'ally-left', side: 'ally', kind: 'princess', col: 22, row: 131, w: 3, h: 3 },
  { id: 'ally-right', side: 'ally', kind: 'princess', col: 76, row: 131, w: 3, h: 3 },
]

export function isRiverTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return !BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

export function isBridgeTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

export function isInsideTower(col: number, row: number, t: TowerSlot): boolean {
  const c = Math.floor(col)
  const r = Math.floor(row)
  return c >= t.col && c < t.col + t.w && r >= t.row && r < t.row + t.h
}

/** Distance from a point to the nearest edge of a tower footprint (0 if inside). */
export function distToTowerEdge(col: number, row: number, t: TowerSlot): number {
  const closestCol = Math.max(t.col, Math.min(col, t.col + t.w))
  const closestRow = Math.max(t.row, Math.min(row, t.row + t.h))
  return Math.hypot(col - closestCol, row - closestRow)
}

/** Closest point on the tower footprint boundary/interior to a point. */
export function closestPointOnTower(
  col: number,
  row: number,
  t: TowerSlot,
): { col: number; row: number } {
  return {
    col: Math.max(t.col, Math.min(col, t.col + t.w)),
    row: Math.max(t.row, Math.min(row, t.row + t.h)),
  }
}

/**
 * Walkable land: not river water, and not inside a living tower footprint.
 * Pass liveTowerIds (towers with hp > 0); omit to block all tower footprints.
 */
export function isWalkableTile(
  col: number,
  row: number,
  liveTowerIds?: ReadonlySet<string>,
): boolean {
  const c = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const r = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  if (isRiverTile(r, c)) return false
  for (const t of TOWERS) {
    if (liveTowerIds && !liveTowerIds.has(t.id)) continue
    if (isInsideTower(c, r, t)) return false
  }
  return true
}

export function nearestBridgeMidCol(col: number): number {
  let bestMid = (BRIDGES[0].colStart + BRIDGES[0].colEnd) / 2
  let bestD = Infinity
  for (const b of BRIDGES) {
    const mid = (b.colStart + b.colEnd) / 2
    const d = Math.abs(mid - col)
    if (d < bestD) {
      bestD = d
      bestMid = mid
    }
  }
  return bestMid
}

const RIVER_MIN = Math.min(...RIVER_ROWS)
const RIVER_MAX = Math.max(...RIVER_ROWS)

export function isOnBridgeLane(col: number): boolean {
  return BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

/** True when a unit must cross the river (not via water) to reach a target row. */
export function needsRiverCrossing(fromRow: number, toRow: number): boolean {
  const fromNorth = fromRow < RIVER_MIN
  const fromSouth = fromRow > RIVER_MAX
  const toNorth = toRow < RIVER_MIN
  const toSouth = toRow > RIVER_MAX
  return (fromNorth && toSouth) || (fromSouth && toNorth)
}

/**
 * Preferred step when crossing the river: walk to a bridge lane first, never into water.
 * Returns a unit vector (or null if no special steering needed).
 */
export function bridgeSteerDir(
  col: number,
  row: number,
  _targetCol: number,
  targetRow: number,
): { dCol: number; dRow: number } | null {
  if (!needsRiverCrossing(row, targetRow)) return null
  const mid = nearestBridgeMidCol(col)
  if (!isOnBridgeLane(col)) {
    const dx = mid - col
    if (Math.abs(dx) > 0.15) return { dCol: Math.sign(dx), dRow: 0 }
  }
  // On / near bridge lane — advance vertically toward the far side, keep centered on bridge.
  const dy = Math.sign(targetRow - row) || (row > RIVER_MAX ? -1 : 1)
  const dx = Math.sign(mid - col) * 0.35
  const len = Math.hypot(dx, dy) || 1
  return { dCol: dx / len, dRow: dy / len }
}
