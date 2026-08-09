import type { AttackId } from '../characters'
import { PhotoTroop } from './PhotoTroop'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

const PHIL_CARD = `${import.meta.env.BASE_URL}characters/phil-card.png`
const PHIL_TROOP = `${import.meta.env.BASE_URL}characters/phil-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Phil — card promo art; separate 3D troop sprite on the field. */
export function PhilModel({ anim, facing, attackId, portrait }: Props) {
  const attack =
    anim === 'attack' && attackId === 'chickenWhip'
      ? 'whip'
      : anim === 'attack' && attackId === 'sundaeHuck'
        ? 'sundae'
        : 'none'
  return (
    <PhotoTroop
      cardSrc={PHIL_CARD}
      troopSrc={PHIL_TROOP}
      alt="Phil"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 18%"
      gait="jog"
      attack={attack}
    />
  )
}
