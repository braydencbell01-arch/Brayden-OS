import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/pete-spirit-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/pete-spirit-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/pete-spirit-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Pete Spirit — floating Pete head; Jump slam then pop. */
export function PeteSpiritModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Pete Spirit"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitSrc={TROOP}
      objectPos="50% 45%"
      gait="blitz"
      spriteLegs
      attack={anim === 'attack' && attackId === 'jump' ? 'jump' : 'none'}
      legColor="#4a5568"
      shoeColor="#2d3748"
    />
  )
}
