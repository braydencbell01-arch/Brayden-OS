import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const SCOTT_CARD = `${import.meta.env.BASE_URL}characters/scott-card.png`
const SCOTT_TROOP = `${import.meta.env.BASE_URL}characters/scott-troop.png`
const SCOTT_BACK = `${import.meta.env.BASE_URL}characters/scott-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Scott — navy suit Cash Gun; sprite gun matches battlefield bills. */
export function ScottModel({ anim, facing, attackId, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={SCOTT_CARD}
      troopSrc={SCOTT_TROOP}
      troopBackSrc={SCOTT_BACK}
      alt="Scott"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 14%"
      gait="jog"
      attack={anim === 'attack' && attackId === 'cashGun' ? 'shoot' : 'none'}
      spriteLegs={false}
      gunsInSprite
    />
  )
}
