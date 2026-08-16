import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const KATHIE_CARD = `${import.meta.env.BASE_URL}characters/kathie-card.png`
const KATHIE_TROOP = `${import.meta.env.BASE_URL}characters/kathie-troop.png`
const KATHIE_BACK = `${import.meta.env.BASE_URL}characters/kathie-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Kathie — athletic crouch card (no weapons); jog + Chicken Whip. */
export function KathieModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={KATHIE_CARD}
      troopSrc={KATHIE_TROOP}
      troopBackSrc={KATHIE_BACK}
      alt="Kathie"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.3}
      objectPos="50% 18%"
      gait="jog"
      attack={anim === 'attack' && attackId === 'chickenWhip' ? 'whip' : 'none'}
      spriteLegs={false}
    />
  )
}
