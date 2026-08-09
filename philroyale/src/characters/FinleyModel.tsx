import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const FINLEY_CARD = `${import.meta.env.BASE_URL}characters/finley-card.png`
const FINLEY_UNIT = `${import.meta.env.BASE_URL}characters/finley-unit.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/** Finley — same 3D dog + chain likeness on card and battlefield (rage = purple). */
export function FinleyModel({ anim, facing, portrait, enraged }: Props) {
  return (
    <PhotoTroop
      cardSrc={FINLEY_CARD}
      unitSrc={FINLEY_UNIT}
      alt="Finley"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 40%"
      enraged={enraged}
      gait="dog"
      attack={anim === 'attack' ? 'bite' : 'none'}
    />
  )
}
