import type { CharacterAnim } from './PhilModel'
import { CARD_PORTRAIT_BG } from './cardArt'

const HUT = `${import.meta.env.BASE_URL}characters/dog-hut-troop.png`
const HUT_CARD = `${import.meta.env.BASE_URL}characters/dog-hut-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Clash-style building — static hut art (no walk cycle). */
export function DogHutModel({ portrait }: Props) {
  const src = portrait ? HUT_CARD : HUT
  return (
    <div
      className="relative flex h-full w-full items-end justify-center overflow-hidden"
      style={portrait ? { background: CARD_PORTRAIT_BG } : undefined}
    >
      <img
        src={src}
        alt="Dog Hut"
        draggable={false}
        className="pointer-events-none h-full w-full object-contain"
        style={{
          objectPosition: portrait ? '50% 45%' : '50% 70%',
          filter: 'drop-shadow(0 2px 2px #0006)',
        }}
      />
    </div>
  )
}
