/** Phil Royale arena: 100 tiles wide × 150 tiles long. */
export const ARENA_COLS = 100
export const ARENA_ROWS = 150

/** River band near the midline. */
export const RIVER_ROWS = [74, 75] as const

/** Bridge columns — aligned with left/right dirt lanes (princess towers). */
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

/** Princess towers sit on the same lanes as the bridges. */
export const TOWERS: TowerSlot[] = [
  { id: 'enemy-king', side: 'enemy', kind: 'king', col: 46, row: 4, w: 8, h: 8 },
  { id: 'enemy-left', side: 'enemy', kind: 'princess', col: 20, row: 16, w: 6, h: 6 },
  { id: 'enemy-right', side: 'enemy', kind: 'princess', col: 74, row: 16, w: 6, h: 6 },
  { id: 'ally-king', side: 'ally', kind: 'king', col: 46, row: 138, w: 8, h: 8 },
  { id: 'ally-left', side: 'ally', kind: 'princess', col: 20, row: 128, w: 6, h: 6 },
  { id: 'ally-right', side: 'ally', kind: 'princess', col: 74, row: 128, w: 6, h: 6 },
]

export function isRiverTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return !BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

export function isBridgeTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

/** False for open river water — bridges and land are walkable. */
export function isWalkableTile(col: number, row: number): boolean {
  const c = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const r = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  return !isRiverTile(r, c)
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
