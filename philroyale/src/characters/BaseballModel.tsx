import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/baseball-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/baseball-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Baseball Huck spell — Clash-style baseball card art. */
export function BaseballModel({ anim, facing, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      alt="Baseball Huck"
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
