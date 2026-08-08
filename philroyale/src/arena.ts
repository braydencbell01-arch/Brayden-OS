/** Phil Royale arena: 100 tiles wide × 150 tiles long. */
export const ARENA_COLS = 100
export const ARENA_ROWS = 150

/** River band near the midline. */
export const RIVER_ROWS = [74, 75] as const

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

export const TOWERS: TowerSlot[] = [
  { id: 'enemy-king', side: 'enemy', kind: 'king', col: 46, row: 4, w: 8, h: 8 },
  { id: 'enemy-left', side: 'enemy', kind: 'princess', col: 16, row: 16, w: 6, h: 6 },
  { id: 'enemy-right', side: 'enemy', kind: 'princess', col: 78, row: 16, w: 6, h: 6 },
  { id: 'ally-king', side: 'ally', kind: 'king', col: 46, row: 138, w: 8, h: 8 },
  { id: 'ally-left', side: 'ally', kind: 'princess', col: 16, row: 128, w: 6, h: 6 },
  { id: 'ally-right', side: 'ally', kind: 'princess', col: 78, row: 128, w: 6, h: 6 },
]

export function isRiverTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return !BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

export function isBridgeTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}
