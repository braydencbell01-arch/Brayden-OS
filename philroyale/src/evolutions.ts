/** Cards that have an evolution (all others never evolve). */
export const EVO_CARD_IDS = [
  'iceCream',
  'berry',
  'susan',
  'phil',
  'evilPhil',
  'footballHuck',
  'dave',
  'gretchin',
  'chickenBarrel',
  'chicken',
  'shay',
  'bigMable',
] as const

export type EvoCardId = (typeof EVO_CARD_IDS)[number]

export function cardCanEvolve(charId: string | undefined | null): boolean {
  return !!charId && (EVO_CARD_IDS as readonly string[]).includes(charId)
}

/**
 * Plays that must land before the next copy is evolved.
 * 1–2 elixir: 3, 3–6 elixir: 2, 7+: 1.
 */
export function evoPlaysBeforeEvo(elixir: number): number {
  if (elixir <= 2) return 3
  if (elixir <= 6) return 2
  return 1
}

/** Full cycle length including the evolved play (normal plays + 1). */
export function evoCycleLength(elixir: number): number {
  return evoPlaysBeforeEvo(elixir) + 1
}

/** First two deck slots are the only places an evolution can fire. */
export function deckAllowsEvo(deckIds: string[] | undefined | null, charId: string): boolean {
  if (!deckIds || deckIds.length === 0) return false
  const i = deckIds.indexOf(charId)
  return i === 0 || i === 1
}

export function peekEvoPlay(
  charId: string,
  elixir: number,
  unlocked: boolean,
  deckIds: string[] | undefined | null,
  counts: Record<string, number>,
): boolean {
  if (!cardCanEvolve(charId) || !unlocked || !deckAllowsEvo(deckIds, charId)) return false
  const cycle = evoCycleLength(elixir)
  return ((counts[charId] ?? 0) + 1) % cycle === 0
}

export function consumeEvoPlay(
  charId: string,
  elixir: number,
  unlocked: boolean,
  deckIds: string[] | undefined | null,
  counts: Record<string, number>,
): boolean {
  if (!cardCanEvolve(charId) || !unlocked || !deckAllowsEvo(deckIds, charId)) return false
  const cycle = evoCycleLength(elixir)
  const n = (counts[charId] ?? 0) + 1
  const evolved = n % cycle === 0
  counts[charId] = evolved ? 0 : n
  return evolved
}
