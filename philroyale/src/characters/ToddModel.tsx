import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const TODD_CARD = `${import.meta.env.BASE_URL}characters/todd-card.png`
const TODD_TROOP = `${import.meta.env.BASE_URL}characters/todd-troop.png`
const TODD_BACK = `${import.meta.env.BASE_URL}characters/todd-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Todd — sprint gait; Flying Kick jump + strike. */
export function ToddModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={TODD_CARD}
      troopSrc={TODD_TROOP}
      troopBackSrc={TODD_BACK}
      alt="Todd"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 14%"
      gait="sprint"
      attack={anim === 'attack' && attackId === 'flyingKick' ? 'kick' : 'none'}
      legColor="#2a2a32"
      shoeColor="#0a0a0c"
    />
  )
}
