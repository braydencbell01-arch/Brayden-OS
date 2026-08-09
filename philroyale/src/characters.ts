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
  | 'love'

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
  /** If set, hit every opponent within this many blocks of the impact point. */
  splashRadius?: number
  kind:
    | 'sundae'
    | 'whip'
    | 'hug'
    | 'slobber'
    | 'bite'
    | 'shoot'
    | 'kick'
    | 'dumbbell'
    | 'headbutt'
    | 'love'
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

export type CardKind = 'troop' | 'building' | 'spell'

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
  /** Clash-style card role. Default troop. */
  cardKind?: CardKind
  /** Seconds after deploy before rage (Finley). */
  rageAfterSec?: number
  rageMoveMult?: number
  rageDamageMult?: number
  /** On death, drop a heart that grants Finley-style rage (Dan). */
  dropsRageHeart?: boolean
  /** Building: spawn these troop ids on a timer (and often on death). */
  spawnPool?: string[]
  /** Building: seconds between spawns (first spawn is on place). */
  spawnEverySec?: number
  /** Building: also spawn one from the pool when the building dies. */
  spawnOnDeath?: boolean
  /** Spell: damage dealt to enemies in radius. */
  spellDamage?: number
  /** Spell: radius in blocks (hits anything within this distance). */
  spellRadius?: number
}

export const PHIL: CharacterDef = {
  id: 'phil',
  name: 'Phil',
  initial: 'P',
  pronoun: 'he',
  height: "5'7\"",
  rarity: 'legendary',
  elixir: 4,
  hp: 1000,
  moveSpeed: 4,
  attackDelaySec: 1,
  hue: 210,
  blurb: 'Sundae Huck at 20, then Chicken Whip up close.',
  attacks: [
    {
      id: 'sundaeHuck',
      name: 'Sundae Huck',
      range: 20,
      damage: 200,
      rootWhileAttacking: false,
      kind: 'sundae',
    },
    {
      id: 'chickenWhip',
      name: 'Chicken Whip',
      range: 5,
      damage: 325,
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
  hp: 1000,
  moveSpeed: 3,
  attackDelaySec: 1,
  hue: 200,
  blurb: 'Stops to Chicken Whip — same crack as Phil, 1s cooldown.',
  attacks: [
    {
      id: 'chickenWhip',
      name: 'Chicken Whip',
      range: 5,
      damage: 325,
      rootWhileAttacking: true,
      kind: 'whip',
    },
  ],
}

/** Chuck — human shield (kit swapped with Pete). */
export const PETE: CharacterDef = {
  id: 'pete',
  name: 'Chuck',
  initial: 'C',
  pronoun: 'he',
  height: "6'2\"",
  rarity: 'epic',
  elixir: 6,
  hp: 3250,
  moveSpeed: 4,
  attackDelaySec: 0,
  hue: 220,
  blurb: 'Human shield — no attack. On death, drops a purple rage heart for 3s.',
  attacks: [],
  dropsRageHeart: true,
}

export const BEANS: CharacterDef = {
  id: 'beans',
  name: 'Beans',
  initial: 'B',
  pronoun: 'he',
  height: "1'3\"",
  rarity: 'common',
  elixir: 2,
  hp: 300,
  moveSpeed: 7.5,
  attackDelaySec: 1.5,
  hue: 35,
  blurb: 'Yellow dog, tongue always out. Spits a slow slobber that explodes — 5-block splash.',
  attacks: [
    {
      id: 'slobber',
      name: 'Slobber',
      range: 20,
      damage: 150,
      rootWhileAttacking: true,
      splashRadius: 5,
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
  elixir: 2,
  hp: 300,
  moveSpeed: 7.5,
  attackDelaySec: 2,
  hue: 280,
  blurb: 'Dog bite up close. After 7s he rages purple until death — snarls, claws, double damage and speed.',
  rageAfterSec: 7,
  rageMoveMult: 2,
  rageDamageMult: 2,
  attacks: [
    {
      id: 'bite',
      name: 'Bite',
      range: 2,
      damage: 225,
      rootWhileAttacking: false,
      kind: 'bite',
    },
  ],
}

export const SHAY: CharacterDef = {
  id: 'shay',
  name: 'Shay',
  initial: 'S',
  pronoun: 'he',
  height: "2'0\"",
  rarity: 'common',
  elixir: 2,
  hp: 325,
  moveSpeed: 5.5,
  attackDelaySec: 1.75,
  hue: 40,
  blurb: 'Older, wiser black border collie. Stops and sends a slow Love heart — 125 damage at range 22.',
  attacks: [
    {
      id: 'love',
      name: 'Love',
      range: 22,
      damage: 125,
      rootWhileAttacking: true,
      kind: 'love',
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
  hp: 1000,
  moveSpeed: 5,
  attackDelaySec: 2.5,
  hue: 220,
  blurb: 'Tallest on the field. Dual pistols — two fast shots 0.5s apart, then a 2.5s reload.',
  attacks: [
    {
      id: 'shoot',
      name: 'Shoot',
      range: 25,
      damage: 200,
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
  hp: 1500,
  moveSpeed: 5,
  attackDelaySec: 2,
  hue: 0,
  blurb: 'Sprints in, then Flying Kick — 400 damage with 5-block splash.',
  attacks: [
    {
      id: 'flyingKick',
      name: 'Flying Kick',
      range: 3,
      damage: 400,
      rootWhileAttacking: true,
      splashRadius: 5,
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
  hp: 1300,
  moveSpeed: 7,
  attackDelaySec: 5,
  hue: 30,
  blurb: 'Stiff curls on the move — then an overhead Dumbbell Huck for 400.',
  attacks: [
    {
      id: 'dumbbellHuck',
      name: 'Dumbbell Huck',
      range: 20,
      damage: 400,
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
  elixir: 5,
  hp: 650,
  moveSpeed: 12,
  attackDelaySec: 0.5,
  hue: 200,
  blurb: 'Blazes in at 12, then Head Butts for 250 every half-second.',
  attacks: [
    {
      id: 'headButt',
      name: 'Head Butt',
      range: 2,
      damage: 250,
      rootWhileAttacking: true,
      kind: 'headbutt',
    },
  ],
}

/** Pete — Death Hug (kit swapped with Chuck; keeps 5 elixir). */
export const DAN: CharacterDef = {
  id: 'dan',
  name: 'Pete',
  initial: 'Pe',
  pronoun: 'he',
  height: "5'8\"",
  rarity: 'epic',
  elixir: 5,
  hp: 2000,
  moveSpeed: 1.5,
  attackDelaySec: 3,
  hue: 25,
  blurb: 'Very old — limps into range, then Death Hug: giant arms yank foes in close.',
  attacks: [
    {
      id: 'deathHug',
      name: 'Death Hug',
      range: 10,
      damage: 500,
      rootWhileAttacking: true,
      pullToRange: 1,
      kind: 'hug',
    },
  ],
}

/** Spawns Shay / Beans / Finley on place, every 10s, and on death. */
export const DOG_HUT: CharacterDef = {
  id: 'dogHut',
  name: 'Dog Hut',
  initial: 'H',
  pronoun: 'it',
  height: "4'0\"",
  rarity: 'rare',
  elixir: 6,
  hp: 1250,
  moveSpeed: 0,
  attackDelaySec: 0,
  hue: 25,
  cardKind: 'building',
  blurb: 'Building — drops a random dog on place, every 10s, and when it falls.',
  spawnPool: ['shay', 'beans', 'finley'],
  spawnEverySec: 10,
  spawnOnDeath: true,
  attacks: [],
}

/** First spell — sundae from your king, splat AoE. */
export const ICE_CREAM: CharacterDef = {
  id: 'iceCream',
  name: 'Sundae',
  initial: 'S',
  pronoun: 'it',
  height: "1'0\"",
  rarity: 'common',
  elixir: 3,
  hp: 0,
  moveSpeed: 0,
  attackDelaySec: 0,
  hue: 330,
  cardKind: 'spell',
  blurb: 'Spell — throw a sundae anywhere. 325 damage in a 10-block radius.',
  spellDamage: 325,
  spellRadius: 10,
  attacks: [],
}

export const CHARACTERS: CharacterDef[] = [
  PHIL,
  KATHIE,
  TODD,
  MIKE,
  LYNNE,
  DAN,
  PETE,
  BEANS,
  FINLEY,
  SHAY,
  JEREMY,
  DOG_HUT,
  ICE_CREAM,
]

export const DECK_SIZE = 8

/** Default 8-card mix across the roster (duplicates allowed). */
export const DEFAULT_DECK = [
  PHIL.id,
  KATHIE.id,
  TODD.id,
  MIKE.id,
  DOG_HUT.id,
  ICE_CREAM.id,
  BEANS.id,
  FINLEY.id,
]

/** Fresh random 8-card bot deck (unique cards, shuffled) for each solo match. */
export function randomBotDeck(): string[] {
  const pool = CHARACTERS.map((c) => c.id)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = pool[i]!
    pool[i] = pool[j]!
    pool[j] = a
  }
  return pool.slice(0, DECK_SIZE)
}

export function cardKindOf(c: CharacterDef): CardKind {
  return c.cardKind ?? 'troop'
}

export function cardKindLabel(c: CharacterDef): string {
  const kind = cardKindOf(c)
  return kind === 'building' ? '(building)' : kind === 'spell' ? '(spell)' : '(troop)'
}

export function isBuildingCard(c: CharacterDef | undefined): boolean {
  return c?.cardKind === 'building'
}

export function isSpellCard(c: CharacterDef | undefined): boolean {
  return c?.cardKind === 'spell'
}

export function pickSpawnFromPool(pool: string[] | undefined): string | null {
  if (!pool?.length) return null
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id)
}

/** Parse display height like 6'3" into total inches. */
export function heightToInches(height: string): number | null {
  const m = height.match(/(\d+)\s*'\s*(\d+)/)
  if (!m) return null
  return Number(m[1]) * 12 + Number(m[2])
}

/**
 * Soft battlefield size from height. Dogs stay readable (not tiny);
 * taller humans (Jeremy/Dan) read a bit bigger. Mid ~5'7" = 1.
 */
export function battlefieldScaleForHeight(height: string): number {
  const inches = heightToInches(height) ?? 67
  const ref = 67 // 5'7"
  if (inches < 40) {
    // Pets — slightly smaller only
    return Math.min(0.88, Math.max(0.78, 0.76 + inches * 0.004))
  }
  // Adults: Kathie ~0.93 … Phil 1.0 … Mike ~1.09 … Dan ~1.13 … Jeremy ~1.14
  return Math.min(1.16, Math.max(0.9, 1 + (inches - ref) * 0.018))
}
