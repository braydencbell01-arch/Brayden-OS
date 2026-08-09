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
      style={{ background: portrait ? CARD_PORTRAIT_BG : undefined }}
    >
      {/* CSS sundae so the card never shows a white photo backdrop */}
      <div className="relative mb-[8%] h-[72%] w-[55%]">
        <div
          className="absolute bottom-0 left-1/2 h-[38%] w-[70%] -translate-x-1/2"
          style={{
            background: 'linear-gradient(180deg,#e8b86a,#9a6420)',
            clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)',
          }}
        />
        <div
          className="absolute bottom-[32%] left-1/2 h-[36%] w-[78%] -translate-x-1/2 rounded-[45%]"
          style={{ background: 'radial-gradient(circle at 35% 30%, #fff8e8, #f0d0a0 60%, #c9a06a)' }}
        />
        <div
          className="absolute bottom-[52%] left-1/2 h-[28%] w-[70%] -translate-x-1/2 rounded-[45%]"
          style={{ background: 'radial-gradient(circle at 40% 30%, #8b5a2b, #5a3010)' }}
        />
        <div
          className="absolute bottom-[68%] left-[42%] h-[14%] w-[16%] rounded-full"
          style={{ background: '#ff4d5a' }}
        />
        <img src={CARD} alt="" className="hidden" />
      </div>
    </div>
  )
}
