import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'

type Props = {
  /** Card portrait art */
  cardSrc: string
  /** Battlefield 3D troop sprite (not the card) */
  troopSrc: string
  alt: string
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  objectPos?: string
  enraged?: boolean
  gait?: 'jog' | 'run' | 'dog'
  attack?: 'whip' | 'sundae' | 'shoot' | 'bite' | 'none'
}

/**
 * Cards use promo art; battlefield uses a separate 3D troop sprite with CR-like motion.
 */
export function PhotoTroop({
  cardSrc,
  troopSrc,
  alt,
  anim,
  facing,
  portrait,
  objectPos = '50% 20%',
  enraged,
  gait = 'run',
  attack = 'none',
}: Props) {
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const duration = gait === 'dog' ? 0.32 : gait === 'jog' ? 0.42 : 0.48

  if (portrait) {
    return (
      <img
        src={cardSrc}
        alt={alt}
        className="h-full w-full object-cover"
        style={{ objectPosition: objectPos }}
        draggable={false}
      />
    )
  }

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      <div
        className="absolute bottom-0 left-1/2 h-[12%] w-[70%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000070 0%, transparent 72%)' }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 100%' }}
        animate={
          attacking
            ? attack === 'whip'
              ? { rotate: [0, -12, -16, 18, 0], y: [0, -3, -5, 2, 0], scaleY: [1, 1.02, 0.96, 1.04, 1] }
              : attack === 'sundae'
                ? { y: [0, -6, -10, 0], rotate: [0, -6, 8, 0], scaleY: [1, 0.95, 1.05, 1] }
                : attack === 'shoot'
                  ? { y: [0, -3, 0], rotate: [0, -4, 4, 0], x: [0, 2, 0] }
                  : attack === 'bite'
                    ? { x: [0, 10, 14, 0], y: [0, -4, 1, 0], rotate: [0, -3, 6, 0] }
                    : { y: [0, -4, 0] }
            : walking
              ? {
                  y: [0, -5, 0, -4, 0],
                  rotate: [0, 4, 0, -4, 0],
                  scaleY: [1, 0.96, 1, 0.97, 1],
                  scaleX: [1, 1.02, 1, 1.02, 1],
                }
              : { y: [0, -2, 0], scaleY: [1, 1.015, 1] }
        }
        transition={
          attacking
            ? { duration: attack === 'whip' ? 0.75 : 0.38 }
            : walking
              ? { duration, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 1.25, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <img
          src={troopSrc}
          alt=""
          draggable={false}
          aria-hidden
          className="h-full w-full object-contain object-bottom drop-shadow-[1px_3px_5px_rgba(0,0,0,0.55)]"
          style={{
            filter: enraged
              ? 'hue-rotate(265deg) saturate(1.55) brightness(1.08) contrast(1.1)'
              : undefined,
          }}
        />
        {enraged ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 45%, #a040ff55 0%, transparent 62%)',
              mixBlendMode: 'screen',
            }}
            aria-hidden
          />
        ) : null}
      </motion.div>
    </div>
  )
}
