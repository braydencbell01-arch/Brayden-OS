import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/faggol-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/faggol-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/faggol-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
  enraged?: boolean
}

/** Faggol — tiny short-temper; crouch-poop-turn-throw. */
export function FaggolModel({ anim, facing, attackId, portrait, enraged }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      // Battlefield + card use cutouts — no hard studio box plate.
      portraitSrc={TROOP}
      alt="Faggol"
      anim={anim}
      facing={facing}
      portrait={portrait}
      enraged={enraged}
      objectPos="50% 18%"
      portraitFilter="brightness(1.04) saturate(1.06)"
      gait="sprint"
      spriteLegs
      attack={anim === 'attack' && attackId === 'shortTemper' ? 'poop' : 'none'}
      legColor="#c8b090"
      shoeColor="#f0f0f4"
    />
  )
}
