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
}

export type Projectile = {
  id: string
  kind: 'sundae' | 'hug' | 'slobber' | 'shoot' | 'arrow' | 'cannon'
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  damage: number
  targetId: UnitId | null
  targetTowerId: string | null
  bornAt: number
  arriveAt: number
}

/** Sundae Huck impact splat. */
export type SplatFx = {
  id: string
  col: number
  row: number
  bornAt: number
}

export type HandCard = {
  char: CharacterDef
  slot: number
}
