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

/** Tristan — grey tee + green sneakers; stops to lob cheese or cucumbers. */
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
      portraitScale={1.2}
      objectPos="50% 22%"
      portraitFilter="brightness(1) saturate(1.05)"
      gait="run"
      spriteLegs={false}
      attack={anim === 'attack' && attackId === 'cheeseAndCucumbers' ? 'sundae' : 'none'}
    />
  )
}
