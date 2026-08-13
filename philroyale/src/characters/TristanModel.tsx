import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/tristan-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/tristan-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/tristan-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Tristan — Arsenal kit; stops to lob cheese or cucumbers. */
export function TristanModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Tristan"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 18%"
      gait="run"
      spriteLegs
      attack={anim === 'attack' && attackId === 'cheeseAndCucumbers' ? 'sundae' : 'none'}
      legColor="#1a1a20"
      shoeColor="#0a0a0c"
    />
  )
}
