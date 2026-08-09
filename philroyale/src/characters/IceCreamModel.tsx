import type { CharacterAnim } from './PhilModel'
import { CARD_PORTRAIT_BG } from './cardArt'

const CARD = `${import.meta.env.BASE_URL}characters/ice-cream-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Spell card art — sundae portrait for the hand / collection. */
export function IceCreamModel({ portrait }: Props) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={portrait ? { background: CARD_PORTRAIT_BG } : undefined}
    >
      <img
        src={CARD}
        alt="Sundae"
        draggable={false}
        className="pointer-events-none h-full w-full object-contain"
        style={{
          objectPosition: portrait ? '50% 40%' : '50% 50%',
          filter: 'drop-shadow(0 2px 2px #0005)',
        }}
      />
    </div>
  )
}
