import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const MIKE_CARD = `${import.meta.env.BASE_URL}characters/mike-card.png`
const MIKE_TROOP = `${import.meta.env.BASE_URL}characters/mike-troop.png`
const MIKE_BACK = `${import.meta.env.BASE_URL}characters/mike-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Michael — stiff gait; card/troop share overhead-dumbbell art (no extra prop overlay). */
export function MikeModel({ anim, facing, attackId, portrait }: Props) {
  const throwing = anim === 'attack' && attackId === 'dumbbellHuck'
  return (
    <PhotoTroop
      cardSrc={MIKE_CARD}
      troopSrc={MIKE_TROOP}
      troopBackSrc={MIKE_BACK}
      alt="Michael"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 12%"
      gait="stiff"
      carry="none"
      spriteLegs
      attack={throwing ? 'dumbbell' : 'none'}
      legColor="#3a3a42"
      shoeColor="#0a0a0c"
    />
  )
}
