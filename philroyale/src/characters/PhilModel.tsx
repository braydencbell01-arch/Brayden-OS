import type { AttackId } from '../characters'
import { PhotoTroop } from './PhotoTroop'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

const PHIL_SRC = `${import.meta.env.BASE_URL}characters/phil-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Phil — same promo 3D likeness on card and battlefield. */
export function PhilModel({ anim, facing, attackId, portrait }: Props) {
  const attack =
    anim === 'attack' && attackId === 'chickenWhip'
      ? 'whip'
      : anim === 'attack' && attackId === 'sundaeHuck'
        ? 'sundae'
        : 'none'
  return (
    <PhotoTroop
      src={PHIL_SRC}
      alt="Phil"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 18%"
      clipPath="inset(1% 8% 3% 8%)"
      gait="jog"
      attack={attack}
    />
  )
}
