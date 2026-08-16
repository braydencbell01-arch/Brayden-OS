import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/dog-hut-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/dog-hut-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/dog-hut-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Clash-style 3D dog kennel — same portrait treatment as troop cards. */
export function DogHutModel({ anim, facing, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Dog Hut"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.1}
      objectPos="50% 90%"
      gait="stiff"
      attack="none"
      spriteLegs={false}
    />
  )
}
