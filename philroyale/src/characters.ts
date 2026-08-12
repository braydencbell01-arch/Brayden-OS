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
  | 'cashGun'
  | 'philsRocket'
  | 'witchcraft'
  | 'uppercut'
  | 'jump'
  | 'pancakeHuck'
  | 'launch'

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
  /** Push unit targets this many tiles away from the attacker (towers/buildings never move). */
  knockbackTiles?: number
  /** Shots in one burst (default 1). Gap uses burstGapSec; reload uses character attackDelaySec. */
  burstShots?: number
  /** Seconds between shots inside a burst. */
  burstGapSec?: number
  /** If set, hit every opponent within this many blocks of the impact point. */
  splashRadius?: number
  /** Splash damage when different from primary hit (e.g. Cash Gun). */
  splashDamage?: number
  /** Projectile flight time in ms (overrides kind defaults). */
  projectileMs?: number
  /** After this attack resolves, the attacker dies (Clash-style spirits). */
  diesOnAttack?: boolean
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
    | 'cash'
    | 'rocket'
    | 'witchcraft'
    | 'uppercut'
    | 'jump'
    | 'pancake'
    | 'launch'
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
  /** Building: HP lost per second while standing (default 25). */
  hpDecayPerSec?: number
  /** Building: also spawn one from the pool when the building dies. */
  spawnOnDeath?: boolean
  /** Building: seconds after place before first attack (X-Bow-style warmup). */
  deployDelaySec?: number
  /** Spell: damage dealt to enemies in radius. */
  spellDamage?: number
  /** Spell: radius in blocks (hits anything within this distance). */
  spellRadius?: number
  /** Spell: flight time from cast to impact (ms). */
  spellTravelMs?: number
  /** Only lock / damage enemy buildings and towers (never troops). */
  targetsBuildingsOnly?: boolean
  /** Never sticky-lock — always retarget the nearest opponent. */
  noLock?: boolean
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
  moveSpeed: 5,
  attackDelaySec: 1,
  hue: 210,
  blurb: 'Sundae Huck from range, then Chicken Whip up close.',
  attacks: [
    {
      id: 'sundaeHuck',
      name: 'Sundae Huck',
      range: 20,
      damage: 235,
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
  elixir: 3,
  hp: 1000,
  moveSpeed: 3,
  attackDelaySec: 1,
  hue: 200,
  blurb: 'Grandma energy — stops to Chicken Whip, same crack as Phil.',
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
  elixir: 5,
  hp: 3750,
  moveSpeed: 4,
  attackDelaySec: 0,
  hue: 220,
  blurb: 'Human shield — no attack. On death, drops a purple rage heart.',
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
  blurb: 'Apricot miniature poodle, tongue always out. Spits a slow slobber that explodes on impact.',
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
  blurb: 'Border collie bite up close. After a while he rages purple until death — snarls, claws, and hits harder and faster.',
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
  blurb: 'Border collie × black lab mix. Stops and sends a slow Love heart.',
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
  blurb: 'Tallest on the field. Dual pistols — two fast shots, then a reload.',
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
  attackDelaySec: 1.5,
  hue: 0,
  blurb: 'Sprints in, then Flying Kick with splash.',
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
  name: 'Michael',
  initial: 'M',
  pronoun: 'he',
  height: "6'0\"",
  rarity: 'epic',
  elixir: 3,
  hp: 1300,
  moveSpeed: 7,
  attackDelaySec: 5.5,
  hue: 30,
  blurb: 'Stiff curls on the move — then an overhead Dumbbell Huck.',
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
  blurb: 'Blazes across the field, then Head Butts in rapid succession.',
  attacks: [
    {
      id: 'headButt',
      name: 'Head Butt',
      range: 2,
      damage: 215,
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
  blurb: 'Very old with white hair — limps into range, then Death Hug: giant arms yank foes in close.',
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
  elixir: 7,
  hp: 1250,
  moveSpeed: 0,
  attackDelaySec: 0,
  hue: 25,
  cardKind: 'building',
  blurb: 'Building — drops a random dog on place, on a timer, and when it falls.',
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
  elixir: 2,
  hp: 0,
  moveSpeed: 0,
  attackDelaySec: 0,
  hue: 330,
  cardKind: 'spell',
  blurb: 'Spell — throw a sundae anywhere. Splats a creamy blast where it lands.',
  spellDamage: 325,
  spellRadius: 10,
  spellTravelMs: 2000,
  attacks: [],
}

/** Baseball lob — turf splash where it lands. */
export const FOOTBALL_HUCK: CharacterDef = {
  id: 'footballHuck',
  name: 'Baseball Huck',
  initial: 'Bb',
  pronoun: 'it',
  height: "1'0\"",
  rarity: 'rare',
  elixir: 3,
  hp: 0,
  moveSpeed: 0,
  attackDelaySec: 0,
  hue: 30,
  cardKind: 'spell',
  blurb: 'Spell — huck a baseball. Turf blast where it lands.',
  spellDamage: 470,
  spellRadius: 15,
  spellTravelMs: 4000,
  attacks: [],
}

/** Epic football nuke — same look as the old Huck, bigger blast, faster drop. */
export const BOBBY_SPECIAL: CharacterDef = {
  id: 'bobbySpecial',
  name: 'Bobby Special',
  initial: 'BS',
  pronoun: 'it',
  height: "1'0\"",
  rarity: 'epic',
  elixir: 5,
  hp: 0,
  moveSpeed: 0,
  attackDelaySec: 0,
  hue: 25,
  cardKind: 'spell',
  blurb: "Spell — Bobby's football special. Double splash, hits harder, lands in a second.",
  spellDamage: 615,
  spellRadius: 30,
  spellTravelMs: 1000,
  attacks: [],
}

/** Skinny rich guy — Cash Gun money launcher. */
export const SCOTT: CharacterDef = {
  id: 'scott',
  name: 'Scott',
  initial: 'Sc',
  pronoun: 'he',
  height: "5'11\"",
  rarity: 'rare',
  elixir: 4,
  hp: 450,
  moveSpeed: 7,
  attackDelaySec: 2.5,
  hue: 210,
  blurb:
    'Cash Gun — stops and launches cash. Direct hit, then the wad explodes.',
  attacks: [
    {
      id: 'cashGun',
      name: 'Cash Gun',
      range: 29,
      damage: 335,
      rootWhileAttacking: true,
      splashRadius: 5,
      splashDamage: 200,
      kind: 'cash',
    },
  ],
}

/** Legendary grey SUV — stationary turret; Phil's Rocket. */
export const PHILS_CAR: CharacterDef = {
  id: 'philsCar',
  name: "Phil's Car",
  initial: 'SUV',
  pronoun: 'it',
  height: "5'0\"",
  rarity: 'legendary',
  elixir: 4,
  hp: 1850,
  moveSpeed: 0,
  attackDelaySec: 8,
  hue: 210,
  cardKind: 'building',
  deployDelaySec: 3,
  blurb:
    "Building — grey SUV that warms up 3s, then turns to face foes and fires Phil's Rocket. Locks until dead or out of range.",
  attacks: [
    {
      id: 'philsRocket',
      name: "Phil's Rocket",
      range: 80,
      damage: 150,
      rootWhileAttacking: true,
      projectileMs: 5000,
      kind: 'rocket',
    },
  ],
}

/** Rare diner turret — Pancake Huck splash lob. */
export const STEVES_DINER: CharacterDef = {
  id: 'stevesDiner',
  name: "Ricky's Diner",
  initial: 'RD',
  pronoun: 'it',
  height: "4'6\"",
  rarity: 'common',
  elixir: 2,
  hp: 485,
  moveSpeed: 0,
  attackDelaySec: 2.25,
  hue: 25,
  cardKind: 'building',
  hpDecayPerSec: 12,
  blurb:
    'Building — roadside diner that locks on and hucks pancake stacks. Splash where they land.',
  attacks: [
    {
      id: 'pancakeHuck',
      name: 'Pancake Huck',
      range: 22,
      damage: 215,
      rootWhileAttacking: true,
      splashRadius: 6.5,
      projectileMs: 850,
      kind: 'pancake',
    },
  ],
}

/** Skinny old witch — purple wand spell while moving. */
export const GRETCHIN: CharacterDef = {
  id: 'gretchin',
  name: 'Gretchin',
  initial: 'G',
  pronoun: 'she',
  height: "5'8\"",
  rarity: 'epic',
  elixir: 3,
  hp: 590,
  moveSpeed: 7,
  attackDelaySec: 1.75,
  hue: 280,
  blurb: 'Old evil witch with a magic wand. Witchcraft fires a purple spell while she keeps moving.',
  attacks: [
    {
      id: 'witchcraft',
      name: 'Witchcraft',
      range: 48,
      damage: 95,
      rootWhileAttacking: false,
      kind: 'witchcraft',
    },
  ],
}

/** Building basher — Uppercut only hits buildings and towers. */
export const DAVE: CharacterDef = {
  id: 'dave',
  name: 'Dave',
  initial: 'D',
  pronoun: 'he',
  height: "5'11\"",
  rarity: 'common',
  elixir: 8,
  hp: 5000,
  moveSpeed: 3,
  attackDelaySec: 1.5,
  hue: 200,
  blurb:
    'Building basher — Uppercut only hits buildings and towers. Stops to punch in slow motion.',
  targetsBuildingsOnly: true,
  attacks: [
    {
      id: 'uppercut',
      name: 'Uppercut',
      range: 3,
      damage: 550,
      rootWhileAttacking: true,
      kind: 'uppercut',
    },
  ],
}

/** Clash-style spirit — Phil's floating head jumps in and pops. */
export const PHIL_SPIRIT: CharacterDef = {
  id: 'philSpirit',
  name: 'Phil Spirit',
  initial: 'Ps',
  pronoun: 'he',
  height: "1'0\"",
  rarity: 'legendary',
  elixir: 1,
  hp: 125,
  moveSpeed: 15,
  attackDelaySec: 1,
  hue: 210,
  blurb:
    "Phil's floating head — jumps onto foes and Jump-slams, then pops. Splash where he lands.",
  attacks: [
    {
      id: 'jump',
      name: 'Jump',
      range: 10,
      damage: 250,
      rootWhileAttacking: true,
      splashRadius: 5,
      diesOnAttack: true,
      kind: 'jump',
    },
  ],
}

/** Pete's floating head — Phil Spirit kit, +100 Jump damage, −2 move speed. */
export const PETE_SPIRIT: CharacterDef = {
  id: 'peteSpirit',
  name: 'Pete Spirit',
  initial: 'Pe',
  pronoun: 'he',
  height: "1'0\"",
  rarity: 'epic',
  elixir: 1,
  hp: 125,
  moveSpeed: 10,
  attackDelaySec: 1,
  hue: 25,
  blurb:
    "Pete's floating head — jumps onto foes like Phil Spirit, hits harder, a touch slower.",
  attacks: [
    {
      id: 'jump',
      name: 'Jump',
      range: 10,
      damage: 350,
      rootWhileAttacking: true,
      splashRadius: 5,
      diesOnAttack: true,
      kind: 'jump',
    },
  ],
}

/** Jeremy's floating head — spirit Jump slam; splash diameter 20. */
export const JEREMY_SPIRIT: CharacterDef = {
  id: 'jeremySpirit',
  name: 'Jeremy Spirit',
  initial: 'Js',
  pronoun: 'he',
  height: "1'0\"",
  rarity: 'rare',
  elixir: 1,
  hp: 125,
  moveSpeed: 12,
  attackDelaySec: 1,
  hue: 220,
  blurb:
    "Jeremy's floating head — jumps onto foes and Jump-slams, then pops. Wide splash where he lands.",
  attacks: [
    {
      id: 'jump',
      name: 'Jump',
      range: 10,
      damage: 185,
      rootWhileAttacking: true,
      splashRadius: 10,
      diesOnAttack: true,
      kind: 'jump',
    },
  ],
}

/** Dark twin of Phil — stronger, faster, purple mist. */
export const EVIL_PHIL: CharacterDef = {
  id: 'evilPhil',
  name: 'Evil Phil',
  initial: 'EP',
  pronoun: 'he',
  height: "5'7\"",
  rarity: 'legendary',
  elixir: 5,
  hp: 1200,
  moveSpeed: 8,
  attackDelaySec: 1,
  hue: 280,
  blurb:
    'Phil gone wrong — black kit, evil grin, purple mist. Harder Sundae Huck and Chicken Whip.',
  attacks: [
    {
      id: 'sundaeHuck',
      name: 'Sundae Huck',
      range: 20,
      damage: 300,
      rootWhileAttacking: false,
      kind: 'sundae',
    },
    {
      id: 'chickenWhip',
      name: 'Chicken Whip',
      range: 5,
      damage: 425,
      rootWhileAttacking: true,
      kind: 'whip',
    },
  ],
}

/** Common inflatable tow-tube — slides, Launch knockback, never sticky-locks. */
export const BIG_MABLE: CharacterDef = {
  id: 'bigMable',
  name: 'Big Mable',
  initial: 'BM',
  pronoun: 'it',
  height: "4'6\"",
  rarity: 'common',
  elixir: 6,
  hp: 2925,
  moveSpeed: 1,
  attackDelaySec: 0.5,
  hue: 28,
  noLock: true,
  blurb:
    'Common tube — slides to the nearest foe (no lock). Launch flings troops; they take the hit when they land. Towers take damage only.',
  attacks: [
    {
      id: 'launch',
      name: 'Launch',
      range: 5,
      damage: 600,
      rootWhileAttacking: true,
      knockbackTiles: 25,
      kind: 'launch',
    },
  ],
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
  SCOTT,
  GRETCHIN,
  DAVE,
  PHIL_SPIRIT,
  PETE_SPIRIT,
  JEREMY_SPIRIT,
  EVIL_PHIL,
  DOG_HUT,
  PHILS_CAR,
  STEVES_DINER,
  ICE_CREAM,
  FOOTBALL_HUCK,
  BOBBY_SPECIAL,
  BIG_MABLE,
]

export const DECK_SIZE = 8

/** Default 8-card mix from starter unlocks. */
export const DEFAULT_DECK = [
  KATHIE.id,
  TODD.id,
  MIKE.id,
  DOG_HUT.id,
  ICE_CREAM.id,
  BEANS.id,
  LYNNE.id,
  JEREMY.id,
]

/** Fisher–Yates shuffle (in place). */
export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = arr[i]!
    arr[i] = arr[j]!
    arr[j] = a
  }
  return arr
}

/**
 * Fresh random CPU deck: shuffle the full roster, take `size` (default 8).
 * Pool = every card in CHARACTERS (currently 23). Max one of each.
 */
export function randomBotDeck(size = DECK_SIZE): string[] {
  const pool = CHARACTERS.map((c) => c.id)
  if (pool.length === 0) return []
  const n = Math.min(Math.max(1, size), pool.length)
  return shuffleInPlace(pool).slice(0, n)
}

/** Enforce max-one-of-each; if short, fill from remaining roster at random. */
export function uniqueDeckFrom(ids: string[], size = DECK_SIZE): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (!getCharacter(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= size) return out
  }
  const fillers = shuffleInPlace(
    CHARACTERS.map((c) => c.id).filter((id) => !seen.has(id)),
  )
  for (const id of fillers) {
    out.push(id)
    if (out.length >= size) break
  }
  return out
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
    // Pets — readable, a touch larger on the field
    return Math.min(0.98, Math.max(0.88, 0.86 + inches * 0.004))
  }
  // Adults: Kathie ~0.93 … Phil 1.0 … Mike ~1.09 … Dan ~1.13 … Jeremy ~1.14
  return Math.min(1.22, Math.max(0.95, 1 + (inches - ref) * 0.018))
}
