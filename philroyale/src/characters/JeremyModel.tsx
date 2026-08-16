import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const JEREMY_CARD = `${import.meta.env.BASE_URL}characters/jeremy-card.png`
const JEREMY_TROOP = `${import.meta.env.BASE_URL}characters/jeremy-troop.png`
const JEREMY_BACK = `${import.meta.env.BASE_URL}characters/jeremy-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Jeremy — dual-pistol suit crouch; Shoot fires those guns with muzzle flash. */
export function JeremyModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={JEREMY_CARD}
      troopSrc={JEREMY_TROOP}
      troopBackSrc={JEREMY_BACK}
      alt="Jeremy"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.3}
      objectPos="50% 14%"
      gait="run"
      attack={anim === 'attack' && attackId === 'shoot' ? 'shoot' : 'none'}
      spriteLegs={false}
      gunsInSprite
    />
  )
}
