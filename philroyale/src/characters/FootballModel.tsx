import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/football-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/football-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Huck / Bobby Special spell — Clash-style 3D football card art. */
export function FootballModel({ anim, facing, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      alt="Bobby Special"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.1}
      objectPos="50% 50%"
      gait="stiff"
      attack="none"
      spriteLegs={false}
    />
  )
}
