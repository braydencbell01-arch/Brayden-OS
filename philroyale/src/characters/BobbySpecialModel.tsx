import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/bobby-special-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/bobby-special-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Bobby Special — football spell (same art as the old Huck). */
export function BobbySpecialModel({ anim, facing, portrait }: Props) {
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
