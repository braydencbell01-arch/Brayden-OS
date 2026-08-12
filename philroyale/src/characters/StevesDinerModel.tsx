import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/steves-diner-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/steves-diner-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/steves-diner-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Ricky's Diner — stationary building; Pancake Huck lob. */
export function StevesDinerModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Ricky's Diner"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 85%"
      gait="stiff"
      attack={anim === 'attack' && attackId === 'pancakeHuck' ? 'sundae' : 'none'}
      spriteLegs={false}
    />
  )
}
