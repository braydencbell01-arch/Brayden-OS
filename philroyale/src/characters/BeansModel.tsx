import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const BEANS_CARD = `${import.meta.env.BASE_URL}characters/beans-card.png`
const BEANS_TROOP = `${import.meta.env.BASE_URL}characters/beans-troop.png`
const BEANS_BACK = `${import.meta.env.BASE_URL}characters/beans-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Beans — yellow dog, tongue always out; dog run; slobber spit. */
export function BeansModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={BEANS_CARD}
      troopSrc={BEANS_TROOP}
      troopBackSrc={BEANS_BACK}
      alt="Beans"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 100%"
      gait="dog"
      attack={anim === 'attack' && attackId === 'slobber' ? 'slobber' : 'none'}
      spriteLegs
      legColor="#c9a227"
      shoeColor="#8a6a12"
    />
  )
}
