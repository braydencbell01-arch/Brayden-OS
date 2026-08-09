import type { AttackId, CharacterDef } from './characters'
import type { Side } from './arena'

export type UnitId = string

export type BattleUnit = {
  id: UnitId
  charId: string
  side: Side
  col: number
  row: number
  hp: number
  maxHp: number
  /** Card level 1–10; scales HP/damage +5% per level above 1. */
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
}

export type Projectile = {
  id: string
  kind: 'sundae' | 'hug' | 'slobber' | 'shoot' | 'dumbbell' | 'love' | 'arrow' | 'cannon'
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
}

/** Impact FX — sundae splat, slobber explode, bullet boom, or melee strike. */
export type SplatFx = {
  id: string
  col: number
  row: number
  bornAt: number
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
