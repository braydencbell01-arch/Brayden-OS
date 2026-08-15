import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const LYNNE_CARD = `${import.meta.env.BASE_URL}characters/lynne-card.png`
const LYNNE_TROOP = `${import.meta.env.BASE_URL}characters/lynne-troop.png`
const LYNNE_BACK = `${import.meta.env.BASE_URL}characters/lynne-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Lynne — athletic light-blue kit; blitz gait; stops to rapid Head Butt. */
export function LynneModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={LYNNE_CARD}
      troopSrc={LYNNE_TROOP}
      troopBackSrc={LYNNE_BACK}
      alt="Lynne"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 14%"
      portraitFilter="brightness(1) saturate(1.05)"
      gait="blitz"
      spriteLegs={false}
      attack={anim === 'attack' && attackId === 'headButt' ? 'headbutt' : 'none'}
    />
  )
}
