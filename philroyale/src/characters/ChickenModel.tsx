import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/chicken-card.png`
const ARMY_CARD = `${import.meta.env.BASE_URL}characters/chicken-army-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/chicken-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/chicken-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
  army?: boolean
}

/** Fluttering chicken — same Whip as Hamburger Chicken. */
export function ChickenModel({ anim, facing, attackId, portrait, army }: Props) {
  const whip = anim === 'attack' && attackId === 'chickenWhip'
  return (
    <PhotoTroop
      cardSrc={army ? ARMY_CARD : CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt={army ? 'Chicken Army' : 'Chicken'}
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 42%"
      gait="flutter"
      spriteLegs
      attack={whip ? 'whip' : 'none'}
      legColor="#f0a030"
      shoeColor="#e07020"
    />
  )
}
