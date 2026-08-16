import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/ice-cream-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/ice-cream-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Sundae spell — Clash-style 3D dessert card art. */
export function IceCreamModel({ anim, facing, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      alt="Sundae"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.1}
      objectPos="50% 55%"
      gait="stiff"
      attack="none"
      spriteLegs={false}
    />
  )
}
