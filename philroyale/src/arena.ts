/** Clash Royale–style arena: 18 tiles wide × 32 tiles long. */
export const ARENA_COLS = 18
export const ARENA_ROWS = 32

export const RIVER_ROWS = [15, 16] as const

export const BRIDGES = [
  { colStart: 3, colEnd: 5 },
  { colStart: 12, colEnd: 14 },
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

/** Positions aligned to ClashMap SVG towers. */
export const TOWERS: TowerSlot[] = [
  { id: 'enemy-king', side: 'enemy', kind: 'king', col: 7.5, row: 1.2, w: 3, h: 3 },
  { id: 'enemy-left', side: 'enemy', kind: 'princess', col: 2.5, row: 5.2, w: 2.4, h: 2.6 },
  { id: 'enemy-right', side: 'enemy', kind: 'princess', col: 13.1, row: 5.2, w: 2.4, h: 2.6 },
  { id: 'ally-king', side: 'ally', kind: 'king', col: 7.5, row: 27.8, w: 3, h: 3 },
  { id: 'ally-left', side: 'ally', kind: 'princess', col: 2.5, row: 24.2, w: 2.4, h: 2.6 },
  { id: 'ally-right', side: 'ally', kind: 'princess', col: 13.1, row: 24.2, w: 2.4, h: 2.6 },
]

export function isRiverTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return !BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

export function isBridgeTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}
