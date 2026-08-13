import type { AttackId, CharacterDef } from './characters'
import type { Side } from './arena'

export type UnitId = string

/** Big Mable Launch — troop flies then takes damage on landing. */
export type LaunchFlight = {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  bornAt: number
  arriveAt: number
  landDamage: number
  /** Spirit Jump — splash (and optional pop) when the leap lands. */
  leapHit?: {
    damage: number
    splashRadius: number
    diesOnLand: boolean
    ownerSide: Side
    aimCol: number
    aimRow: number
  }
}

export type BattleUnit = {
  id: UnitId
  charId: string
  side: Side
  col: number
  row: number
  hp: number
  maxHp: number
  /** Card level 1–15; scales HP/damage +5% per level above 1. */
  level: number
  /** Index into character.attacks */
  attackIndex: number
  /** Shot index within the current burst (0-based). */
  burstShot: number
  nextAttackAt: number
  vfx: AttackId | null
  vfxUntil: number
  facing: number
  rootedUntil: number
  spawnedAt: number
  enraged: boolean
  /** Walk anim while recently relocated. */
  movingUntil: number
  /**
   * Clash-style lock: keep attacking this target until it dies or leaves range.
   * `unit:<id>` or `tower:<id>`.
   */
  lockKey: string | null
  /** Building spawn timer (performance.now ms). */
  nextSpawnAt?: number
  /** In-flight Launch knockback; damage applies on land. */
  launch?: LaunchFlight | null
  /** Ram (once-per-target) keys already hit: `unit:id` / `tower:id`. */
  hitOnceKeys?: string[]
}

export type Projectile = {
  id: string
  kind:
    | 'sundae'
    | 'hug'
    | 'slobber'
    | 'shoot'
    | 'dumbbell'
    | 'love'
    | 'arrow'
    | 'cannon'
    | 'iceCream'
    | 'football'
    | 'baseball'
    | 'cash'
    | 'rocket'
    | 'witchcraft'
    | 'pancake'
    | 'barrel'
    | 'cheese'
    | 'cucumber'
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  damage: number
  targetId: UnitId | null
  targetTowerId: string | null
  bornAt: number
  arriveAt: number
  /** Attacker side — used for splash so allies are never hit. */
  ownerSide?: Side
  /** Splash radius in blocks around the impact point. */
  splashRadius?: number
  /** When set with splashRadius, AoE uses this instead of `damage` (primary still uses `damage`). */
  splashDamage?: number
  /** Spell spawn-on-land (Chicken Barrel). */
  spawnAsId?: string
  spawnCount?: number
  spawnLevel?: number
}

/** Impact FX — sundae splat, slobber explode, bullet boom, or melee strike. */
export type SplatFx = {
  id: string
  col: number
  row: number
  bornAt: number
  /** When set, draw an AoE ring centered on the impact (blocks). */
  radius?: number
  kind:
    | 'sundae'
    | 'slobber'
    | 'boom'
    | 'dumbbell'
    | 'love'
    | 'melee'
    | 'whip'
    | 'bite'
    | 'kick'
    | 'hug'
    | 'iceCream'
    | 'football'
    | 'baseball'
    | 'cash'
    | 'rocket'
    | 'witchcraft'
    | 'uppercut'
    | 'jump'
    | 'pancake'
    | 'barrel'
    | 'cheese'
    | 'cucumber'
}

/** Dan death heart — any troop can pick up for Finley-style rage. */
export type RageHeart = {
  id: string
  col: number
  row: number
  bornAt: number
}

export type HandCard = {
  char: CharacterDef
  slot: number
}
