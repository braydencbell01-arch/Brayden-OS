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

/** Single bocce ball — one red OR one green in a fixed circle (matched size). */
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
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      <motion.div
        className="absolute left-1/2 bottom-[4%] aspect-square w-[72%] -translate-x-1/2 overflow-hidden rounded-full"
        style={{
          filter: 'drop-shadow(1px 3px 4px rgba(0,0,0,0.45))',
        }}
        animate={
          rolling
            ? { y: [0, -2, 0], rotate: isRed ? [0, 360] : [0, -360] }
            : { y: 0, rotate: 0 }
        }
        transition={
          rolling
            ? {
                y: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 1.1, repeat: Infinity, ease: 'linear' },
              }
            : { duration: 0.2 }
        }
      >
        <img
          src={TROOP}
          alt=""
          draggable={false}
          aria-hidden
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            height: '220%',
            width: '220%',
            objectFit: 'cover',
            top: '50%',
            left: '50%',
            transform: isRed
              ? 'translate(-56%, -54%)'
              : 'translate(-44%, -54%) scale(1.28)',
            transformOrigin: 'center center',
          }}
        />
      </motion.div>
    </div>
  )
}
