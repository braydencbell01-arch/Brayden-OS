import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const PETE_CARD = `${import.meta.env.BASE_URL}characters/pete-card.png`
const PETE_TROOP = `${import.meta.env.BASE_URL}characters/pete-troop.png`
const PETE_BACK = `${import.meta.env.BASE_URL}characters/pete-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Pete — elderly white hair, glasses, navy suit; limps; Death Hug. */
export function PeteModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={PETE_CARD}
      troopSrc={PETE_TROOP}
      troopBackSrc={PETE_BACK}
      alt="Pete"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.3}
      objectPos="50% 14%"
      gait="limp"
      attack={anim === 'attack' && attackId === 'deathHug' ? 'hug' : 'none'}
      spriteLegs
      legColor="#1e2a4a"
      shoeColor="#3a2410"
    />
  )
}
