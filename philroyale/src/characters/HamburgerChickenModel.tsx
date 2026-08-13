import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/hamburger-chicken-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/hamburger-chicken-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/hamburger-chicken-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Hamburger Chicken — penguin waddle; moving Whip; Ram horns into buildings. */
export function HamburgerChickenModel({ anim, facing, attackId, portrait }: Props) {
  const ram = anim === 'attack' && attackId === 'ram'
  const whip = anim === 'attack' && attackId === 'chickenWhip'
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Hamburger Chicken"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 18%"
      gait="waddle"
      spriteLegs
      attack={ram ? 'ram' : whip ? 'whip' : 'none'}
      legColor="#d48a3a"
      shoeColor="#5a2a10"
    />
  )
}
