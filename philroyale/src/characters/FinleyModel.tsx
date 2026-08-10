import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const FINLEY_CARD = `${import.meta.env.BASE_URL}characters/finley-card.png`
const FINLEY_TROOP = `${import.meta.env.BASE_URL}characters/finley-troop.png`
const FINLEY_BACK = `${import.meta.env.BASE_URL}characters/finley-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/** Finley — black-and-white border collie; bite + running legs. */
export function FinleyModel({ anim, facing, portrait, enraged }: Props) {
  return (
    <PhotoTroop
      cardSrc={FINLEY_CARD}
      troopSrc={FINLEY_TROOP}
      troopBackSrc={FINLEY_BACK}
      alt="Finley"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitFilter={portrait ? 'brightness(1.12) contrast(1.05)' : undefined}
      objectPos="50% 100%"
      enraged={enraged}
      gait="dog"
      attack={anim === 'attack' ? 'bite' : 'none'}
      spriteLegs
      legColor="#0a0a0c"
      shoeColor="#050508"
    />
  )
}
