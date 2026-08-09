export type AttackId =
  | 'sundaeHuck'
  | 'chickenWhip'
  | 'deathHug'
  | 'slobber'
  | 'bite'
  | 'shoot'

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
  /** Shots in one burst (default 1). Gap uses burstGapSec; reload uses character attackDelaySec. */
  burstShots?: number
  /** Seconds between shots inside a burst. */
  burstGapSec?: number
  kind: 'sundae' | 'whip' | 'hug' | 'slobber' | 'bite' | 'shoot'
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

export type CharacterDef = {
  id: string
  name: string
  /** Letter shown on the placeholder square. */
  initial: string
  /** Pronoun shown on card profile, e.g. he / she / they. */
  pronoun: string
  rarity: Rarity
  elixir: number
  hp: number
  /** Blocks per second. */
  moveSpeed: number
  /** Seconds between successive attacks (or after a full burst). */
  attackDelaySec: number
  /** Attacks cycle in order. */
  attacks: AttackDef[]
  hue: number
  blurb: string
  /** Seconds after deploy before rage (Finley). */
  rageAfterSec?: number
  rageMoveMult?: number
  rageDamageMult?: number
}

export const PHIL: CharacterDef = {
  id: 'phil',
  name: 'Phil',
  initial: 'P',
  pronoun: 'he',
  rarity: 'legendary',
  elixir: 4,
  hp: 500,
  moveSpeed: 4,
  attackDelaySec: 1,
  hue: 210,
  blurb: 'Sundae Huck at range, then Chicken Whip up close.',
  attacks: [
    {
      id: 'sundaeHuck',
      name: 'Sundae Huck',
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
  pronoun: 'he',
  rarity: 'epic',
  elixir: 7,
  hp: 1000,
  moveSpeed: 1.5,
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

export const BEANS: CharacterDef = {
  id: 'beans',
  name: 'Beans',
  initial: 'B',
  pronoun: 'he',
  rarity: 'common',
  elixir: 2,
  hp: 150,
  moveSpeed: 7.5,
  attackDelaySec: 1.5,
  hue: 35,
  blurb: 'Cheap and fast. Slobber hits from far away — he stops to spit.',
  attacks: [
    {
      id: 'slobber',
      name: 'Slobber',
      range: 40,
      damage: 75,
      rootWhileAttacking: true,
      kind: 'slobber',
    },
  ],
}

export const FINLEY: CharacterDef = {
  id: 'finley',
  name: 'Finley',
  initial: 'F',
  pronoun: 'he',
  rarity: 'common',
  elixir: 3,
  hp: 150,
  moveSpeed: 7.5,
  attackDelaySec: 2,
  hue: 280,
  blurb: 'Dog bite up close. After 7s he rages purple — snarls, claws, double damage and speed.',
  rageAfterSec: 7,
  rageMoveMult: 2,
  rageDamageMult: 2,
  attacks: [
    {
      id: 'bite',
      name: 'Bite',
      range: 1,
      damage: 100,
      rootWhileAttacking: false,
      kind: 'bite',
    },
  ],
}

export const JEREMY: CharacterDef = {
  id: 'jeremy',
  name: 'Jeremy',
  initial: 'J',
  pronoun: 'he',
  rarity: 'rare',
  elixir: 5,
  hp: 500,
  moveSpeed: 5,
  attackDelaySec: 2.5,
  hue: 95,
  blurb: 'Shoot fires two 100-dmg shots 0.5s apart, then a 2.5s reload.',
  attacks: [
    {
      id: 'shoot',
      name: 'Shoot',
      range: 50,
      damage: 100,
      rootWhileAttacking: false,
      burstShots: 2,
      burstGapSec: 0.5,
      kind: 'shoot',
    },
  ],
}

export const CHARACTERS: CharacterDef[] = [PHIL, PETE, BEANS, FINLEY, JEREMY]

export const DECK_SIZE = 8

/** Default 8-card mix across the roster (duplicates allowed). */
export const DEFAULT_DECK = [
  PHIL.id,
  BEANS.id,
  FINLEY.id,
  JEREMY.id,
  PETE.id,
  BEANS.id,
  FINLEY.id,
  PHIL.id,
]

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id)
}
