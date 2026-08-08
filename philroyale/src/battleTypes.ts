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
  /** Next attack in the sundae ↔ whip cycle. */
  nextAttack: AttackKind
  /** ms timestamp when the unit may attack again. */
  nextAttackAt: number
  /** Brief VFX: 'sundae' | 'whip' | null */
  vfx: AttackKind | null
  vfxUntil: number
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
  /** tower id when targeting a tower */
  targetTowerId: string | null
  bornAt: number
  arriveAt: number
}

export type HandCard = {
  char: CharacterDef
  slot: number
}
