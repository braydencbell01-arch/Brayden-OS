/** Phil Royale arena: 100 tiles wide × 150 tiles long. */
export const ARENA_COLS = 100
export const ARENA_ROWS = 150

/** Touchdown: place only in your third; score in the far end zone. */
export const TOUCHDOWN_ALLY_MIN_ROW = Math.floor((ARENA_ROWS * 2) / 3)
export const TOUCHDOWN_ENEMY_MAX_ROW = Math.floor(ARENA_ROWS / 3)
export const TOUCHDOWN_ZONE_ROWS = 12
export const TOUCHDOWN_WIN_SCORE = 3

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

/**
 * King 5×5 / princess 3×3 footprints aligned to ClashMap tower art (viewBox 360×640).
 * Front edges match the drawn base (enemy) / river face (ally) so melee stands in front
 * of what you see — not on the old pads that sat behind the sprites.
 */
export const TOWERS: TowerSlot[] = [
  { id: 'enemy-king', side: 'enemy', kind: 'king', col: 48, row: 17, w: 5, h: 5 },
  { id: 'enemy-left', side: 'enemy', kind: 'princess', col: 22, row: 31, w: 3, h: 3 },
  { id: 'enemy-right', side: 'enemy', kind: 'princess', col: 76, row: 31, w: 3, h: 3 },
  { id: 'ally-king', side: 'ally', kind: 'king', col: 48, row: 126, w: 5, h: 5 },
  { id: 'ally-left', side: 'ally', kind: 'princess', col: 22, row: 116, w: 3, h: 3 },
  { id: 'ally-right', side: 'ally', kind: 'princess', col: 76, row: 116, w: 3, h: 3 },
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

/**
 * Tower footprint in continuous space: tiles [col, col+w) × [row, row+h)
 * occupy the AABB [col, col+w] × [row, row+h] (far edges are the front/sides).
 */
function towerAabb(t: TowerSlot) {
  return {
    left: t.col,
    right: t.col + t.w,
    top: t.row,
    bottom: t.row + t.h,
  }
}

/** Distance from a point to the nearest edge of a tower footprint (0 if inside). */
export function distToTowerEdge(col: number, row: number, t: TowerSlot): number {
  const { left, right, top, bottom } = towerAabb(t)
  const closestCol = Math.max(left, Math.min(col, right))
  const closestRow = Math.max(top, Math.min(row, bottom))
  return Math.hypot(col - closestCol, row - closestRow)
}

/**
 * Distance from a unit tile to the tower's river-facing FRONT edge segment.
 * Short-range troops measure range to this face (what you see as the front),
 * not the back/far corner of the pad.
 */
export function distUnitTileToTower(col: number, row: number, t: TowerSlot): number {
  const { left, right, top, bottom } = towerAabb(t)
  const cx = col + 0.5
  const cy = row + 0.5
  const faceCol = Math.max(left, Math.min(right, cx))
  const frontRow = t.side === 'enemy' ? bottom : top
  return Math.hypot(cx - faceCol, cy - frontRow)
}

/** True when the unit is on the river-facing side of the tower (not tucked behind it). */
export function isOnTowerFrontSide(_col: number, row: number, t: TowerSlot): boolean {
  const { top, bottom } = towerAabb(t)
  const cy = row + 0.5
  // Must be past the front face (slight slop for corners) — never count the back half.
  if (t.side === 'enemy') return cy >= bottom - 0.25
  return cy <= top + 0.25
}

/** Closest point on the tower footprint boundary/interior to a point. */
export function closestPointOnTower(
  col: number,
  row: number,
  t: TowerSlot,
): { col: number; row: number } {
  const { left, right, top, bottom } = towerAabb(t)
  return {
    col: Math.max(left, Math.min(col, right)),
    row: Math.max(top, Math.min(row, bottom)),
  }
}

/**
 * Walk-to / stand-in-front point just OUTSIDE the tower's river-facing front.
 * Ally attacks enemy towers from the south face; enemy attacks ally towers from the north face.
 * Kept outside the footprint so pathing + eject never shove troops to the back.
 */
export function towerFrontEngagePoint(
  fromCol: number,
  _fromRow: number,
  t: TowerSlot,
): { col: number; row: number } {
  const { left, right, top, bottom } = towerAabb(t)
  const faceCol = Math.max(left + 0.35, Math.min(right - 0.35, fromCol))
  // Stand clearly south (enemy towers) / north (ally towers) of the front face.
  if (t.side === 'enemy') {
    return { col: faceCol, row: bottom + 1.15 }
  }
  return { col: faceCol, row: top - 2.0 }
}

/** Projectile aim point on the river-facing front face (visual impact). */
export function towerFrontAimPoint(t: TowerSlot): { col: number; row: number } {
  const { left, right, top, bottom } = towerAabb(t)
  return {
    col: (left + right) / 2,
    row: t.side === 'enemy' ? bottom - 0.15 : top + 0.15,
  }
}

/**
 * Walkable land: not river water, and not inside a living tower footprint.
 * Pass liveTowerIds (towers with hp > 0); omit to block all tower footprints.
 * When `forSide` is set, that side's own towers are passable (Clash Royale style) —
 * troops never get stuck behind their own king/princess pads.
 */
export function isWalkableTile(
  col: number,
  row: number,
  liveTowerIds?: ReadonlySet<string>,
  forSide?: Side,
): boolean {
  const c = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const r = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  if (isRiverTile(r, c)) return false
  for (const t of TOWERS) {
    if (forSide && t.side === forSide) continue
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
  // Front-face waypoints only — never route troops behind the tower.
  const frontRow = t.side === 'enemy' ? t.row + t.h + pad : t.row - pad
  const midFront = t.side === 'enemy' ? t.row + t.h + pad * 0.55 : t.row - pad * 0.55
  const corners = [
    { col: t.col - pad, row: frontRow },
    { col: t.col + t.w + pad, row: frontRow },
    { col: t.col + t.w / 2, row: frontRow },
    { col: t.col - pad, row: midFront },
    { col: t.col + t.w + pad, row: midFront },
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
    // Prefer the front face heavily.
    const onFront =
      t.side === 'enemy' ? rr >= t.row + t.h - 0.2 : rr <= t.row + 0.2
    if (!onFront) cost += 18
    const goingNorth = targetRow < row
    const goingSouth = targetRow > row
    if ((goingNorth && rr > row + 0.4) || (goingSouth && rr < row - 0.4)) {
      cost += 12
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
 * the goal, detouring around enemy towers only (own towers are passable).
 */
export function steerTowardGoal(
  col: number,
  row: number,
  targetCol: number,
  targetRow: number,
  liveTowerIds?: ReadonlySet<string>,
  forSide?: Side,
  /** Touchdown: ignore river bridges / tower detours — open field. */
  openField = false,
): { dCol: number; dRow: number } {
  if (!openField) {
    const bridge = bridgeSteerDir(col, row, targetCol, targetRow)
    if (bridge) return bridge
  }

  let aimCol = targetCol
  let aimRow = targetRow

  // If the straight path clips an enemy tower, route via the cheapest front-side corner.
  if (!openField) {
    let blocker: TowerSlot | null = null
    let blockerDist = Infinity
    for (const t of TOWERS) {
      if (forSide && t.side === forSide) continue
      if (liveTowerIds && !liveTowerIds.has(t.id)) continue
      const targetIsOnTower =
        targetCol >= t.col &&
        targetCol <= t.col + t.w &&
        targetRow >= t.row &&
        targetRow <= t.row + t.h
      const approachesFront =
        t.side === 'enemy' ? row + 0.5 >= t.row + t.h : row + 0.5 <= t.row
      if (targetIsOnTower && approachesFront) continue
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
  openField = false,
): number {
  if (openField || !needsRiverCrossing(fromRow, toRow)) {
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

/**
 * Touchdown mode: open football field (no river) — place only in your own third.
 * Towers are dead in this mode, so footprints never block.
 */
export function canDeployTouchdownAt(
  col: number,
  row: number,
  side: Side,
  _liveTowerIds?: ReadonlySet<string>,
): boolean {
  const c = Math.floor(col)
  const r = Math.floor(row)
  if (c < 0 || c >= ARENA_COLS || r < 0 || r >= ARENA_ROWS) return false
  // Open field — no river band in touchdown.
  if (side === 'ally') return r >= TOUCHDOWN_ALLY_MIN_ROW
  return r <= TOUCHDOWN_ENEMY_MAX_ROW
}

/** Walkable land for touchdown — full open field (ignore river + towers). */
export function isWalkableTouchdown(col: number, row: number): boolean {
  const c = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const r = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  return c >= 0 && r >= 0
}
