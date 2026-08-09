import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const JEREMY_SRC = `${import.meta.env.BASE_URL}characters/jeremy-card.png`

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
      src={JEREMY_SRC}
      alt="Jeremy"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 12%"
      clipPath="inset(2% 10% 4% 10%)"
      gait="run"
      attack={anim === 'attack' && attackId === 'shoot' ? 'shoot' : 'none'}
    />
  )
}
