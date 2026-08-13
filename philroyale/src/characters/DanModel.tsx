import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const DAN_CARD = `${import.meta.env.BASE_URL}characters/dan-card.png`
const DAN_TROOP = `${import.meta.env.BASE_URL}characters/dan-troop.png`
const DAN_BACK = `${import.meta.env.BASE_URL}characters/dan-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
  enraged?: boolean
}

/** Chuck — human shield; Suplex throws troops behind him. */
export function DanModel({ anim, facing, attackId, portrait, enraged }: Props) {
  const suplex = anim === 'attack' && attackId === 'suplex'
  return (
    <PhotoTroop
      cardSrc={DAN_CARD}
      troopSrc={DAN_TROOP}
      troopBackSrc={DAN_BACK}
      alt="Chuck"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 12%"
      gait="jog"
      attack={suplex ? 'hug' : 'none'}
      enraged={enraged}
      spriteLegs
      legColor="#2a2a36"
      shoeColor="#0a0a0c"
    />
  )
}
