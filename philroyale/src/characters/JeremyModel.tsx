import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const JEREMY_CARD = `${import.meta.env.BASE_URL}characters/jeremy-card.png`
const JEREMY_TROOP = `${import.meta.env.BASE_URL}characters/jeremy-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Jeremy — card promo art; separate 3D suit troop on the field. */
export function JeremyModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={JEREMY_CARD}
      troopSrc={JEREMY_TROOP}
      alt="Jeremy"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 12%"
      gait="run"
      attack={anim === 'attack' && attackId === 'shoot' ? 'shoot' : 'none'}
    />
  )
}
