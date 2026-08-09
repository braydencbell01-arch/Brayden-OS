import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const DAN_CARD = `${import.meta.env.BASE_URL}characters/dan-card.png`
const DAN_TROOP = `${import.meta.env.BASE_URL}characters/dan-troop.png`
const DAN_BACK = `${import.meta.env.BASE_URL}characters/dan-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/** Pete — walking human shield; no attack. */
export function DanModel({ anim, facing, portrait, enraged }: Props) {
  return (
    <PhotoTroop
      cardSrc={DAN_CARD}
      troopSrc={DAN_TROOP}
      troopBackSrc={DAN_BACK}
      alt="Pete"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 12%"
      gait="jog"
      attack="none"
      enraged={enraged}
      legColor="#2a2a36"
      shoeColor="#0a0a0c"
    />
  )
}
