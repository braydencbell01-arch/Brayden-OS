/** Clash Royale–style arena: 18 tiles wide × 32 tiles long. */
export const ARENA_COLS = 18
export const ARENA_ROWS = 32

/** River occupies two center rows. */
export const RIVER_ROWS = [15, 16] as const

/** Bridge column spans (0-indexed, inclusive). */
export const BRIDGES = [
  { colStart: 2, colEnd: 5 },
  { colStart: 12, colEnd: 15 },
] as const

export type TowerKind = 'king' | 'princess'
export type Side = 'ally' | 'enemy'

export type TowerSlot = {
  id: string
  side: Side
  kind: TowerKind
  /** Center tile column / row for placement. */
  col: number
  row: number
  /** Footprint in tiles. */
  w: number
  h: number
}

/**
 * Tower layout mirrored like Clash Royale:
 * each side has a center King tower + left/right Princess towers.
 */
export const TOWERS: TowerSlot[] = [
  // Enemy (top) — king recessed, princesses forward like CR
  { id: 'enemy-king', side: 'enemy', kind: 'king', col: 7.5, row: 0.6, w: 3, h: 3.4 },
  { id: 'enemy-left', side: 'enemy', kind: 'princess', col: 2.2, row: 4.2, w: 2.4, h: 2.8 },
  { id: 'enemy-right', side: 'enemy', kind: 'princess', col: 13.4, row: 4.2, w: 2.4, h: 2.8 },
  // Ally (bottom)
  { id: 'ally-king', side: 'ally', kind: 'king', col: 7.5, row: 28, w: 3, h: 3.4 },
  { id: 'ally-left', side: 'ally', kind: 'princess', col: 2.2, row: 25, w: 2.4, h: 2.8 },
  { id: 'ally-right', side: 'ally', kind: 'princess', col: 13.4, row: 25, w: 2.4, h: 2.8 },
]

export function isRiverTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return !BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}

export function isBridgeTile(row: number, col: number): boolean {
  if (!(RIVER_ROWS as readonly number[]).includes(row)) return false
  return BRIDGES.some((b) => col >= b.colStart && col <= b.colEnd)
}
