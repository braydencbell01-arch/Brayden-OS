import type { AttackKind, CharacterDef } from './characters'
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
  nextAttack: AttackKind
  nextAttackAt: number
  vfx: AttackKind | null
  vfxUntil: number
  /** Facing angle in radians (for whip / walk). */
  facing: number
  /** While whipping, unit cannot move. */
  rootedUntil: number
}

export type Projectile = {
  id: string
  kind: 'sundae'
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

export type HandCard = {
  char: CharacterDef
  slot: number
}
