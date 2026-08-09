import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const SHAY_CARD = `${import.meta.env.BASE_URL}characters/shay-card.png`
const SHAY_TROOP = `${import.meta.env.BASE_URL}characters/shay-troop.png`
const SHAY_BACK = `${import.meta.env.BASE_URL}characters/shay-troop-back.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Shay — older black border collie; Love heart attack. */
export function ShayModel({ anim, facing, portrait }: Props) {
  return (
    <PhotoTroop
      cardSrc={SHAY_CARD}
      troopSrc={SHAY_TROOP}
      troopBackSrc={SHAY_BACK}
      alt="Shay"
      anim={anim}
      facing={facing}
      portrait={portrait}
      objectPos="50% 42%"
      gait="dog"
      attack={anim === 'attack' ? 'love' : 'none'}
      spriteLegs
      legColor="#0a0a0c"
      shoeColor="#050508"
    />
  )
}
