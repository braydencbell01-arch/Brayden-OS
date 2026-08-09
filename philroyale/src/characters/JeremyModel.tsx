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

/** Jeremy — card art; front/back 3D suit troop with dual-gun fire overlay. */
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
      objectPos="50% 12%"
      gait="run"
      attack={anim === 'attack' && attackId === 'shoot' ? 'shoot' : 'none'}
      legColor="#2a2a32"
      shoeColor="#0a0a0c"
    />
  )
}
