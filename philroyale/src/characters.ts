export type AttackKind = 'sundae' | 'whip'

export type CharacterDef = {
  id: string
  name: string
  elixir: number
  hp: number
  sundaeDamage: number
  sundaeRangeTiles: number
  whipDamage: number
  whipRangeTiles: number
  /** Seconds between attacks (sundae ↔ whip cycle). */
  attackDelaySec: number
  portrait: string
  whipAudio: string
  firstAttack: AttackKind
  role: 'troop'
  blurb: string
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

/** Only character for now — likeness from the reference photo. */
export const PHIL: CharacterDef = {
  id: 'phil',
  name: 'Phil',
  elixir: 7,
  hp: 2800,
  sundaeDamage: 320,
  sundaeRangeTiles: 10,
  whipDamage: 380,
  whipRangeTiles: 2.5,
  attackDelaySec: 1,
  portrait: asset('characters/phil.png'),
  whipAudio: asset('audio/phil-whip.mp3'),
  firstAttack: 'sundae',
  role: 'troop',
  blurb: 'Throws a full ice cream sundae (10 tiles), then cracks a whip up close.',
}

export const CHARACTERS: CharacterDef[] = [PHIL]

export const DECK_SIZE = 8

/** Battle deck is eight Phil cards until more characters are added. */
export const DEFAULT_DECK = Array.from({ length: DECK_SIZE }, () => PHIL.id)

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id)
}
