/** Shared battle / party mode helpers for Phil Royale. */

export type GameMode =
  | 'classic'
  | 'touchdown'
  | 'draft'
  | 'undraft'
  | 'infiniteElixir'

export const PARTY_MODES: GameMode[] = ['draft', 'undraft', 'infiniteElixir']

export function isPartyMode(mode: GameMode): boolean {
  return mode === 'draft' || mode === 'undraft' || mode === 'infiniteElixir'
}

/** Only classic + touchdown move the trophy ladder. */
export function earnsTrophies(mode: GameMode): boolean {
  return mode === 'classic' || mode === 'touchdown'
}

export function modeLabel(mode: GameMode): string {
  switch (mode) {
    case 'touchdown':
      return 'Touchdown'
    case 'draft':
      return 'Draft'
    case 'undraft':
      return 'Undraft'
    case 'infiniteElixir':
      return 'Infinite Elixir'
    default:
      return 'Classic'
  }
}

/** Base elixir regen before overtime / infinite multipliers. */
export const BASE_ELIXIR_PER_SEC = 0.35

/**
 * Display + sim multiplier for elixir regen.
 * Classic/touchdown/draft/undraft: x1 (x1.5 in OT)
 * Infinite elixir: x5 (x7.5 in OT)
 */
export function elixirMultiplier(mode: GameMode, overtime: boolean): number {
  if (mode === 'infiniteElixir') return overtime ? 7.5 : 5
  return overtime ? 1.5 : 1
}

export function formatElixirMult(mult: number): string {
  return `x${mult.toFixed(1)}`
}

export function regulationSeconds(mode: GameMode): number {
  return mode === 'touchdown' ? 150 : 180
}

export const OVERTIME_SECONDS = 60

export function parseGameMode(raw: unknown): GameMode {
  if (
    raw === 'touchdown' ||
    raw === 'draft' ||
    raw === 'undraft' ||
    raw === 'infiniteElixir'
  ) {
    return raw
  }
  return 'classic'
}
