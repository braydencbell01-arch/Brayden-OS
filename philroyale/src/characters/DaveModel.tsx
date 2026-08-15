import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/dave-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/dave-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/dave-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Dave — building basher; slow-motion Uppercut. */
export function DaveModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="D"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 12%"
      gait="stiff"
      spriteLegs
      attack={anim === 'attack' && attackId === 'uppercut' ? 'uppercut' : 'none'}
      legColor="#2a3a58"
      shoeColor="#1a1a20"
    />
  )
}
