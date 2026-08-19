import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'
import { CARD_PORTRAIT_BG } from './cardArt'

const TROOP = `${import.meta.env.BASE_URL}characters/bocce-balls-troop.png`
const CARD = `${import.meta.env.BASE_URL}characters/bocce-balls-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  /** 0 = red ball (left spawn), 1 = green ball (right spawn). */
  spawnIdx?: number
}

/** Single bocce ball — one red OR one green, not the paired troop art. */
export function BocceBallModel({ anim, facing, portrait, spawnIdx = 0 }: Props) {
  const isRed = spawnIdx % 2 === 0
  const flip = Math.cos(facing) < 0 ? -1 : 1
  const rolling = anim === 'walk' || anim === 'attack'

  if (portrait) {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background: CARD_PORTRAIT_BG }}>
        <img src={CARD} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full overflow-visible"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      <motion.div
        className="absolute inset-0 overflow-hidden"
        animate={rolling ? { y: [0, -3, 0], rotate: [0, isRed ? 18 : -18, 0] } : { y: 0, rotate: 0 }}
        transition={
          rolling ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }
        }
        style={{ transformOrigin: '50% 85%' }}
      >
        <img
          src={TROOP}
          alt=""
          draggable={false}
          aria-hidden
          className="absolute bottom-0 h-[118%] max-w-none object-cover"
          style={{
            width: '210%',
            left: isRed ? '0%' : 'auto',
            right: isRed ? 'auto' : '0%',
            objectPosition: isRed ? '18% 58%' : '78% 58%',
            filter: 'drop-shadow(1px 3px 4px rgba(0,0,0,0.45))',
          }}
        />
      </motion.div>
    </div>
  )
}
