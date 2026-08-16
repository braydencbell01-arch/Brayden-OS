import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/phil-spirit-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/phil-spirit-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/phil-spirit-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Phil Spirit — floating Phil head; Jump slam then pop. */
export function PhilSpiritModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Phil Spirit"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 42%"
      gait="blitz"
      spriteLegs
      attack={anim === 'attack' && attackId === 'jump' ? 'jump' : 'none'}
      legColor="#1a3a6e"
      shoeColor="#1a3a6e"
    />
  )
}
