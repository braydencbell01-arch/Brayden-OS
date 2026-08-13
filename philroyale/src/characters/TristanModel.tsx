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
      // Troop cutout on shared card blue — no photo studio plate / halo.
      portraitSrc={TROOP}
      objectPos="50% 8%"
      portraitFilter="brightness(1) saturate(1)"
      gait="run"
      spriteLegs
      attack={anim === 'attack' && attackId === 'cheeseAndCucumbers' ? 'sundae' : 'none'}
      legColor="#f0f0f4"
      shoeColor="#1a1a20"
    />
  )
}
