import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/chicken-barrel-card.png`
const TROOP = `${import.meta.env.BASE_URL}characters/chicken-barrel-troop.png`
const BACK = `${import.meta.env.BASE_URL}characters/chicken-barrel-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/**
 * Chicken Barrel — toy-3D chicken peeking from a wooden keg (card + battlefield).
 */
export function ChickenBarrelModel({ anim, facing, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={CARD}
      troopSrc={TROOP}
      troopBackSrc={BACK}
      alt="Chicken Barrel"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 48%"
      gait="stiff"
      attack="none"
      spriteLegs={false}
    />
  )
}
