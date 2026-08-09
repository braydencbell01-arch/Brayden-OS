import type { AttackId } from '../characters'
import { PhotoTroop } from './PhotoTroop'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

const PHIL_CARD = `${import.meta.env.BASE_URL}characters/phil-card.png`
const PHIL_UNIT = `${import.meta.env.BASE_URL}characters/phil-unit.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Phil — same 3D coach promo on card and battlefield. */
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
      unitSrc={PHIL_UNIT}
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
