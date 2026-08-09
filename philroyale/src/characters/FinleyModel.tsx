import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const FINLEY_CARD = `${import.meta.env.BASE_URL}characters/finley-card.png`
const FINLEY_TROOP = `${import.meta.env.BASE_URL}characters/finley-troop.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/** Finley — card promo art; separate 3D dog troop on the field. */
export function FinleyModel({ anim, facing, portrait, enraged }: Props) {
  return (
    <PhotoTroop
      cardSrc={FINLEY_CARD}
      troopSrc={FINLEY_TROOP}
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
