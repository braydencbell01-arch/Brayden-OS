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
  { id: 'enemy-king', side: 'enemy', kind: 'king', col: 48, row: 5, w: 5, h: 5 },
  { id: 'enemy-left', side: 'enemy', kind: 'princess', col: 22, row: 17, w: 3, h: 3 },
  { id: 'enemy-right', side: 'enemy', kind: 'princess', col: 76, row: 17, w: 3, h: 3 },
  { id: 'ally-king', side: 'ally', kind: 'king', col: 48, row: 135, w: 5, h: 5 },
  { id: 'ally-left', side: 'ally', kind: 'princess', col: 22, row: 125, w: 3, h: 3 },
  { id: 'ally-right', side: 'ally', kind: 'princess', col: 76, row: 125, w: 3, h: 3 },
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

export const RIVER_MIN = Math.min(...RIVER_ROWS)
export const RIVER_MAX = Math.max(...RIVER_ROWS)

/** How far past the river (enemy half) you may deploy after a princess falls. */
export const DEPLOY_PAST_RIVER = 30

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
  // Pick the bridge that yields the shortest overall path to the target.
  const mid = bestBridgeMidForPath(col, row, _targetCol, targetRow)
  if (!isOnBridgeLane(col)) {
    const dx = mid - col
    if (Math.abs(dx) > 0.15) return { dCol: Math.sign(dx), dRow: 0 }
  }
  const dy = Math.sign(targetRow - row) || (row > RIVER_MAX ? -1 : 1)
  const dx = Math.sign(mid - col) * 0.35
  const len = Math.hypot(dx, dy) || 1
  return { dCol: dx / len, dRow: dy / len }
}

function segmentHitsTower(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: TowerSlot,
): boolean {
  // Expand footprint slightly so units start detouring before they jam.
  const pad = 0.35
  const left = t.col - pad
  const right = t.col + t.w + pad
  const top = t.row - pad
  const bottom = t.row + t.h + pad
  // Liang-Barsky-ish: sample midpoints + endpoints for the short arena steps we care about.
  for (let i = 0; i <= 6; i++) {
    const p = i / 6
    const x = x0 + (x1 - x0) * p
    const y = y0 + (y1 - y0) * p
    if (x >= left && x <= right && y >= top && y <= bottom) return true
  }
  return false
}

/** Shortest corner waypoint around a tower toward a goal (Clash-style go-around). */
function towerDetourPoint(
  col: number,
  row: number,
  targetCol: number,
  targetRow: number,
  t: TowerSlot,
  bridgeBiasCol?: number,
): { col: number; row: number } {
  const pad = 1.6
  const corners = [
    { col: t.col - pad, row: t.row - pad },
    { col: t.col + t.w + pad, row: t.row - pad },
    { col: t.col - pad, row: t.row + t.h + pad },
    { col: t.col + t.w + pad, row: t.row + t.h + pad },
    { col: t.col - pad, row: t.row + t.h / 2 },
    { col: t.col + t.w + pad, row: t.row + t.h / 2 },
    { col: t.col + t.w / 2, row: t.row - pad },
    { col: t.col + t.w / 2, row: t.row + t.h + pad },
  ]
  let best = corners[0]!
  let bestCost = Infinity
  for (const c of corners) {
    const cc = Math.max(0, Math.min(ARENA_COLS - 1, c.col))
    const rr = Math.max(0, Math.min(ARENA_ROWS - 1, c.row))
    let cost =
      Math.hypot(cc - col, rr - row) + Math.hypot(targetCol - cc, targetRow - rr)
    if (bridgeBiasCol != null) {
      cost += Math.abs(cc - bridgeBiasCol) * 0.35
    }
    if (cost < bestCost) {
      bestCost = cost
      best = { col: cc, row: rr }
    }
  }
  return best
}

/**
 * Clash-style steering: bridge first when crossing the river; otherwise walk toward
 * the goal, detouring around any living tower that blocks the direct line (own or enemy).
 */
export function steerTowardGoal(
  col: number,
  row: number,
  targetCol: number,
  targetRow: number,
  liveTowerIds?: ReadonlySet<string>,
): { dCol: number; dRow: number } {
  const bridge = bridgeSteerDir(col, row, targetCol, targetRow)
  if (bridge) return bridge

  let aimCol = targetCol
  let aimRow = targetRow

  // If the straight path clips a tower, route via the cheapest corner.
  let blocker: TowerSlot | null = null
  let blockerDist = Infinity
  for (const t of TOWERS) {
    if (liveTowerIds && !liveTowerIds.has(t.id)) continue
    if (!segmentHitsTower(col + 0.5, row + 0.5, targetCol, targetRow, t)) continue
    const d = distToTowerEdge(col + 0.5, row + 0.5, t)
    if (d < blockerDist) {
      blockerDist = d
      blocker = t
    }
  }
  if (blocker) {
    const bridgeMid = nearestBridgeMidCol(col)
    const wp = towerDetourPoint(col + 0.5, row + 0.5, targetCol, targetRow, blocker, bridgeMid)
    aimCol = wp.col
    aimRow = wp.row
  }

  const dx = aimCol - (col + 0.5)
  const dy = aimRow - (row + 0.5)
  const len = Math.hypot(dx, dy) || 1
  return { dCol: dx / len, dRow: dy / len }
}

/** Shortest bridge-aware path length to a point (straight-line if no river crossing). */
export function pathCostTo(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): number {
  if (!needsRiverCrossing(fromRow, toRow)) {
    return Math.hypot(toCol - fromCol, toRow - fromRow)
  }
  let best = Infinity
  for (const b of BRIDGES) {
    const mid = (b.colStart + b.colEnd) / 2
    const ownEdge = fromRow > RIVER_MAX ? RIVER_MAX : RIVER_MIN
    const farEdge = fromRow > RIVER_MAX ? RIVER_MIN : RIVER_MAX
    const cost =
      Math.hypot(mid - fromCol, ownEdge - fromRow) +
      Math.abs(farEdge - ownEdge) +
      Math.hypot(toCol - mid, toRow - farEdge)
    if (cost < best) best = cost
  }
  return best
}

function bestBridgeMidForPath(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): number {
  let bestMid = nearestBridgeMidCol(fromCol)
  let best = Infinity
  for (const b of BRIDGES) {
    const mid = (b.colStart + b.colEnd) / 2
    const ownEdge = fromRow > RIVER_MAX ? RIVER_MAX : RIVER_MIN
    const farEdge = fromRow > RIVER_MAX ? RIVER_MIN : RIVER_MAX
    const cost =
      Math.hypot(mid - fromCol, ownEdge - fromRow) +
      Math.abs(farEdge - ownEdge) +
      Math.hypot(toCol - mid, toRow - farEdge)
    if (cost < best) {
      best = cost
      bestMid = mid
    }
  }
  return bestMid
}

type TowerHpLite = { id: string; hp: number }

/**
 * Ally deploy zones (Clash Royale style):
 * - Own side of the river always (not on the river band).
 * - If enemy-left princess is dead: also up to 30 tiles past the river on the left half.
 * - If enemy-right is dead: same on the right half.
 * - If both princesses are dead: anywhere up to 30 tiles past the river.
 */
export function canDeployAllyAt(
  col: number,
  row: number,
  towers: TowerHpLite[],
  liveTowerIds?: ReadonlySet<string>,
): boolean {
  const c = Math.floor(col)
  const r = Math.floor(row)
  if (c < 0 || c >= ARENA_COLS || r < 0 || r >= ARENA_ROWS) return false
  if (r >= RIVER_MIN && r <= RIVER_MAX) return false
  if (!isWalkableTile(c, r, liveTowerIds)) return false

  if (r > RIVER_MAX) return true

  // Enemy half — only with a destroyed princess lane (or both).
  const past = RIVER_MIN - r
  if (past < 1 || past > DEPLOY_PAST_RIVER) return false

  const leftAlive = (towers.find((t) => t.id === 'enemy-left')?.hp ?? 0) > 0
  const rightAlive = (towers.find((t) => t.id === 'enemy-right')?.hp ?? 0) > 0
  if (!leftAlive && !rightAlive) return true
  const leftHalf = c < ARENA_COLS / 2
  if (!leftAlive && leftHalf) return true
  if (!rightAlive && !leftHalf) return true
  return false
}

export function canDeployEnemyAt(
  col: number,
  row: number,
  towers: TowerHpLite[],
  liveTowerIds?: ReadonlySet<string>,
): boolean {
  const c = Math.floor(col)
  const r = Math.floor(row)
  if (c < 0 || c >= ARENA_COLS || r < 0 || r >= ARENA_ROWS) return false
  if (r >= RIVER_MIN && r <= RIVER_MAX) return false
  if (!isWalkableTile(c, r, liveTowerIds)) return false

  if (r < RIVER_MIN) return true

  const past = r - RIVER_MAX
  if (past < 1 || past > DEPLOY_PAST_RIVER) return false

  const leftAlive = (towers.find((t) => t.id === 'ally-left')?.hp ?? 0) > 0
  const rightAlive = (towers.find((t) => t.id === 'ally-right')?.hp ?? 0) > 0
  if (!leftAlive && !rightAlive) return true
  const leftHalf = c < ARENA_COLS / 2
  if (!leftAlive && leftHalf) return true
  if (!rightAlive && !leftHalf) return true
  return false
}
