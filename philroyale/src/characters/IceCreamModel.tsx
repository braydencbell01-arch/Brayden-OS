import type { CharacterAnim } from './PhilModel'

const CARD = `${import.meta.env.BASE_URL}characters/ice-cream-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
}

/** Spell card art — cone portrait for the hand / collection. */
export function IceCreamModel({ portrait }: Props) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <img
        src={CARD}
        alt="Ice Cream"
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
