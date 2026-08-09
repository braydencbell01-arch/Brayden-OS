import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const JEREMY_CARD = `${import.meta.env.BASE_URL}characters/jeremy-card.png`
const JEREMY_UNIT = `${import.meta.env.BASE_URL}characters/jeremy-unit.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Jeremy — same 3D suit likeness on card and battlefield; normal run + shoot. */
export function JeremyModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={JEREMY_CARD}
      unitSrc={JEREMY_UNIT}
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
