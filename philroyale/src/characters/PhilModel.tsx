import type { AttackId } from '../characters'
import { PhotoTroop } from './PhotoTroop'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

const PHIL_CARD = `${import.meta.env.BASE_URL}characters/phil-card.png`
const PHIL_TROOP = `${import.meta.env.BASE_URL}characters/phil-troop.png`
const PHIL_BACK = `${import.meta.env.BASE_URL}characters/phil-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Phil — coach crouch with backpack; sundae throw + whip overlays. */
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
      troopBackSrc={PHIL_BACK}
      alt="Phil"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.2}
      objectPos="50% 22%"
      gait="jog"
      attack={attack}
      spriteLegs={false}
    />
  )
}
