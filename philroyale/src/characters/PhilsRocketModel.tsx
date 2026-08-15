import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/phils-rocket-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/phils-rocket-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Phil's Rocket spell — same rocket as the car attack. */
export function PhilsRocketModel({ anim, facing, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      alt="Phil's Rocket"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 50%"
      gait="stiff"
      attack="none"
      spriteLegs={false}
    />
  )
}
