import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/gretchin-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/gretchin-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/gretchin-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Gretchin — skinny old witch; Witchcraft purple wand bolt. */
export function GretchinModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Gretchin"
      anim={anim}
      facing={facing}
      portrait={portrait}
      portraitScale={1.2}
      objectPos="50% 22%"
      gait="limp"
      spriteLegs
      attack={anim === 'attack' && attackId === 'witchcraft' ? 'witchcraft' : 'none'}
      legColor="#4a4a58"
      shoeColor="#1a1020"
    />
  )
}
