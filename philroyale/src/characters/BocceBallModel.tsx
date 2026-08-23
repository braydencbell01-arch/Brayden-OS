import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'
import { CARD_PORTRAIT_BG } from './cardArt'

const CARD = `${import.meta.env.BASE_URL}characters/bocce-balls-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  /** 0 = green (left spawn), 1 = red (right spawn) from placer view. */
  spawnIdx?: number
}

function BallBody({ color }: { color: 'green' | 'red' }) {
  const fill = color === 'green' ? '#2e9a4a' : '#d62828'
  const shadow = color === 'green' ? '#145a28' : '#7a1010'
  const highlight = color === 'green' ? '#7dff9a' : '#ff8a8a'
  const iris = color === 'green' ? '#1b5e20' : '#8b0000'

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`ball-${color}`} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="55%" stopColor={fill} />
          <stop offset="100%" stopColor={shadow} />
        </radialGradient>
      </defs>
      <circle cx="32" cy="34" r="27" fill={`url(#ball-${color})`} />
      <path
        d="M12 34c6-10 14-16 20-16s14 6 20 16"
        fill="none"
        stroke="#ffffff55"
        strokeWidth="1.4"
      />
      <path
        d="M52 34c-6 10-14 16-20 16s-14-6-20-16"
        fill="none"
        stroke="#ffffff55"
        strokeWidth="1.4"
      />
      <ellipse cx="32" cy="34" rx="27" ry="27" fill="none" stroke="#ffffff33" strokeWidth="1" />
      <ellipse cx="24" cy="30" rx="5.5" ry="6.5" fill="#fff" />
      <ellipse cx="40" cy="30" rx="5.5" ry="6.5" fill="#fff" />
      <circle cx="25" cy="31" r="2.6" fill={iris} />
      <circle cx="41" cy="31" r="2.6" fill={iris} />
      <path d="M22 44c4 4 16 4 20 0" fill="none" stroke="#1a1410" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 42h16" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** Single bocce ball — solid green or red sphere (no shared troop crop). */
export function BocceBallModel({ anim, facing, portrait, spawnIdx = 0 }: Props) {
  const color: 'green' | 'red' = spawnIdx % 2 === 0 ? 'green' : 'red'
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
        className="absolute left-1/2 bottom-[2%] aspect-square w-[82%] -translate-x-1/2"
        style={{ filter: 'drop-shadow(1px 4px 5px rgba(0,0,0,0.45))' }}
        animate={
          rolling
            ? { y: [0, -2, 0], rotate: color === 'green' ? [0, 360] : [0, -360] }
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
        <BallBody color={color} />
      </motion.div>
    </div>
  )
}
