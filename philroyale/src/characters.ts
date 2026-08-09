export type AttackId =
  | 'sundaeHuck'
  | 'chickenWhip'
  | 'deathHug'
  | 'slobber'
  | 'bite'
  | 'shoot'
  | 'flyingKick'
  | 'dumbbellHuck'
  | 'headButt'

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
  kind: 'sundae' | 'whip' | 'hug' | 'slobber' | 'bite' | 'shoot' | 'kick' | 'dumbbell' | 'headbutt'
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
  /** Display height, e.g. 6'3". */
  height: string
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
  height: "5'7\"",
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
      range: 15,
      damage: 100,
      rootWhileAttacking: false,
      kind: 'sundae',
    },
    {
      id: 'chickenWhip',
      name: 'Chicken Whip',
      range: 5,
      damage: 150,
      rootWhileAttacking: true,
      kind: 'whip',
    },
  ],
}

export const KATHIE: CharacterDef = {
  id: 'kathie',
  name: 'Kathie',
  initial: 'K',
  pronoun: 'she',
  height: "5'2\"",
  rarity: 'rare',
  elixir: 4,
  hp: 500,
  moveSpeed: 3,
  attackDelaySec: 1,
  hue: 200,
  blurb: 'Stops to Chicken Whip — same crack as Phil, 1s cooldown.',
  attacks: [
    {
      id: 'chickenWhip',
      name: 'Chicken Whip',
      range: 5,
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
  height: "5'8\"",
  rarity: 'epic',
  elixir: 7,
  hp: 1000,
  moveSpeed: 1.5,
  attackDelaySec: 3,
  hue: 25,
  blurb: 'Very old — limps into range, then Death Hug: giant arms yank foes in close.',
  attacks: [
    {
      id: 'deathHug',
      name: 'Death Hug',
      range: 5,
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
  height: "1'3\"",
  rarity: 'common',
  elixir: 2,
  hp: 150,
  moveSpeed: 7.5,
  attackDelaySec: 1.5,
  hue: 35,
  blurb: 'Yellow dog, tongue always out. Spits a slow slobber that explodes on impact.',
  attacks: [
    {
      id: 'slobber',
      name: 'Slobber',
      range: 20,
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
  height: "2'2\"",
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
  height: "6'3\"",
  rarity: 'rare',
  elixir: 5,
  hp: 500,
  moveSpeed: 5,
  attackDelaySec: 2.5,
  hue: 220,
  blurb: 'Tallest on the field. Dual pistols — two fast shots 0.5s apart, then a 2.5s reload.',
  attacks: [
    {
      id: 'shoot',
      name: 'Shoot',
      range: 25,
      damage: 100,
      rootWhileAttacking: true,
      burstShots: 2,
      burstGapSec: 0.5,
      kind: 'shoot',
    },
  ],
}

export const TODD: CharacterDef = {
  id: 'todd',
  name: 'Todd',
  initial: 'T',
  pronoun: 'he',
  height: "5'7\"",
  rarity: 'rare',
  elixir: 6,
  hp: 750,
  moveSpeed: 5,
  attackDelaySec: 2,
  hue: 0,
  blurb: 'Sprints in, then jumps into a Flying Kick — 200 damage up close.',
  attacks: [
    {
      id: 'flyingKick',
      name: 'Flying Kick',
      range: 3,
      damage: 200,
      rootWhileAttacking: true,
      kind: 'kick',
    },
  ],
}

export const MIKE: CharacterDef = {
  id: 'mike',
  name: 'Mike',
  initial: 'M',
  pronoun: 'he',
  height: "6'0\"",
  rarity: 'epic',
  elixir: 3,
  hp: 650,
  moveSpeed: 7,
  attackDelaySec: 5,
  hue: 30,
  blurb: 'Stiff curls on the move — then an overhead Dumbbell Huck for 200.',
  attacks: [
    {
      id: 'dumbbellHuck',
      name: 'Dumbbell Huck',
      range: 20,
      damage: 200,
      rootWhileAttacking: false,
      kind: 'dumbbell',
    },
  ],
}

export const LYNNE: CharacterDef = {
  id: 'lynne',
  name: 'Lynne',
  initial: 'L',
  pronoun: 'she',
  height: "5'5\"",
  rarity: 'common',
  elixir: 4,
  hp: 325,
  moveSpeed: 12,
  attackDelaySec: 0.5,
  hue: 200,
  blurb: 'Blazes in at 12, then Head Butts for 125 every half-second.',
  attacks: [
    {
      id: 'headButt',
      name: 'Head Butt',
      range: 1,
      damage: 125,
      rootWhileAttacking: true,
      kind: 'headbutt',
    },
  ],
}

export const CHARACTERS: CharacterDef[] = [
  PHIL,
  KATHIE,
  TODD,
  MIKE,
  LYNNE,
  PETE,
  BEANS,
  FINLEY,
  JEREMY,
]

export const DECK_SIZE = 8

/** Default 8-card mix across the roster (duplicates allowed). */
export const DEFAULT_DECK = [
  PHIL.id,
  KATHIE.id,
  TODD.id,
  MIKE.id,
  LYNNE.id,
  JEREMY.id,
  PETE.id,
  BEANS.id,
]

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id)
}
