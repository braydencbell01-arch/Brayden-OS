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
      // Card art already on shared blue — avoid glitchy troop cutout on portraits.
      objectPos="50% 12%"
      portraitFilter="brightness(1) saturate(1.05)"
      gait="run"
      spriteLegs
      attack={anim === 'attack' && attackId === 'cheeseAndCucumbers' ? 'sundae' : 'none'}
      legColor="#1a3a7a"
      shoeColor="#0a0a0c"
    />
  )
}
