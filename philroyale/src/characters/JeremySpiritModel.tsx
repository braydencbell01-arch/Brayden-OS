import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/jeremy-spirit-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/jeremy-spirit-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/jeremy-spirit-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Jeremy Spirit — floating Jeremy head; Jump slam then pop. */
export function JeremySpiritModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Jeremy Spirit"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitSrc={TROOP}
      objectPos="50% 45%"
      gait="blitz"
      spriteLegs
      attack={anim === 'attack' && attackId === 'jump' ? 'jump' : 'none'}
      legColor="#1a2a44"
      shoeColor="#0e1628"
    />
  )
}
