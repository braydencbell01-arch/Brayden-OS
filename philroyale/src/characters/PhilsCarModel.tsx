import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/phils-car-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/phils-car-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/phils-car-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Phil's Car — stationary grey SUV; rotates to face lock target; Phil's Rocket. */
export function PhilsCarModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Phil's Car"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.1}
      objectPos="50% 70%"
      gait="stiff"
      attack={anim === 'attack' && attackId === 'philsRocket' ? 'shoot' : 'none'}
      spriteLegs={false}
    />
  )
}
