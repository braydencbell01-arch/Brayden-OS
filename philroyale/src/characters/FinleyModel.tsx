import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const FINLEY_SRC = `${import.meta.env.BASE_URL}characters/finley-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/** Finley — same 3D dog likeness on card and battlefield (rage = purple). */
export function FinleyModel({ anim, facing, portrait, enraged }: Props) {
  return (
    <PhotoTroop
      src={FINLEY_SRC}
      alt="Finley"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 40%"
      clipPath="inset(4% 10% 8% 10%)"
      enraged={enraged}
      gait="dog"
      attack={anim === 'attack' ? 'bite' : 'none'}
    />
  )
}
