import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/coach-graf-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/coach-graf-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/coach-graf-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Coach Graf — clipboard under left arm; Knuckle Sandwich punch with free arm. */
export function CoachGrafModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Coach Graf"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.2}
      objectPos="50% 22%"
      gait="sprint"
      attack={
        anim === 'attack' && attackId === 'knuckleSandwich' ? 'uppercut' : 'none'
      }
      spriteLegs
    />
  )
}
