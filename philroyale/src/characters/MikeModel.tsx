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

/** Jacobson — muscular gym look; card arms-crossed; troop carries dumbbells. */
export function MikeModel({ anim, facing, attackId, portrait }: Props) {
  const throwing = anim === 'attack' && attackId === 'dumbbellHuck'
  return (
    <PhotoTroop
      cardSrc={MIKE_CARD}
      troopSrc={MIKE_TROOP}
      troopBackSrc={MIKE_BACK}
      alt="Jacobson"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.22}
      objectPos="50% 14%"
      gait="stiff"
      carry="none"
      spriteLegs={false}
      attack={throwing ? 'dumbbell' : 'none'}
    />
  )
}
