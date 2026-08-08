export type AttackId = 'sundaeThrow' | 'chickenWhip' | 'deathHug'

export type AttackDef = {
  id: AttackId
  name: string
  /** Block radius. */
  range: number
  damage: number
  /** If true, unit stops moving for the attack animation. */
  rootWhileAttacking: boolean
  /** Pull unit targets to this distance (tiles). Towers never move. */
  pullToRange?: number
  kind: 'sundae' | 'whip' | 'hug'
}

export type CharacterDef = {
  id: string
  name: string
  /** Letter shown on the placeholder square. */
  initial: string
  elixir: number
  hp: number
  /** Blocks per second. */
  moveSpeed: number
  /** Seconds between successive attacks. */
  attackDelaySec: number
  /** Attacks cycle in order. */
  attacks: AttackDef[]
  hue: number
  blurb: string
}

export const PHIL: CharacterDef = {
  id: 'phil',
  name: 'Phil',
  initial: 'P',
  elixir: 4,
  hp: 500,
  moveSpeed: 8,
  attackDelaySec: 1,
  hue: 210,
  blurb: 'Sundae Throw at range, then Chicken Whip up close.',
  attacks: [
    {
      id: 'sundaeThrow',
      name: 'Sundae Throw',
      range: 30,
      damage: 100,
      rootWhileAttacking: false,
      kind: 'sundae',
    },
    {
      id: 'chickenWhip',
      name: 'Chicken Whip',
      range: 10,
      damage: 150,
      rootWhileAttacking: true,
      kind: 'whip',
    },
  ],
}

export const PETE: CharacterDef = {
  id: 'pete',
  name: 'Pete',
  initial: 'Pe',
  elixir: 7,
  hp: 1000,
  moveSpeed: 3,
  attackDelaySec: 3,
  hue: 25,
  blurb: 'Death Hug pulls enemies in close for big damage.',
  attacks: [
    {
      id: 'deathHug',
      name: 'Death Hug',
      range: 10,
      damage: 250,
      rootWhileAttacking: true,
      pullToRange: 1,
      kind: 'hug',
    },
  ],
}

export const CHARACTERS: CharacterDef[] = [PHIL, PETE]

export const DECK_SIZE = 8

/** Fill an 8-card deck with Phil + Pete until more cards exist. */
export const DEFAULT_DECK = Array.from({ length: DECK_SIZE }, (_, i) =>
  i % 2 === 0 ? PHIL.id : PETE.id,
)

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id)
}
