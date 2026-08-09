import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'

type Props = {
  /** Full framed promo art for cards */
  cardSrc: string
  /** Same likeness for battlefield (cropped unit art) */
  unitSrc: string
  alt: string
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  /** object-position for card/portrait crop */
  objectPos?: string
  /** Rage purple filter (Finley) */
  enraged?: boolean
  /** Walk style */
  gait?: 'jog' | 'run' | 'dog'
  /** Attack flourish */
  attack?: 'whip' | 'sundae' | 'shoot' | 'bite' | 'none'
}

/**
 * Card + battlefield share the same 3D promo likeness (not flat cartoon stick figures).
 */
export function PhotoTroop({
  cardSrc,
  unitSrc,
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
  const duration = gait === 'dog' ? 0.36 : gait === 'jog' ? 0.45 : 0.5

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
        className="absolute bottom-0 left-1/2 h-[10%] w-[72%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000078 0%, transparent 72%)' }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-0"
        style={{
          // Slight billboard tilt so the promo still reads as a 3D troop, not a flat sticker.
          transform: 'perspective(420px) rotateX(8deg)',
          transformOrigin: '50% 100%',
        }}
        animate={
          attacking
            ? attack === 'whip'
              ? { rotate: [0, -10, -14, 16, 0], y: [0, -2, -3, 1, 0] }
              : attack === 'sundae'
                ? { y: [0, -4, -7, 0], rotate: [0, -4, 4, 0] }
                : attack === 'shoot'
                  ? { y: [0, -2, 0], rotate: [0, -3, 3, 0] }
                  : attack === 'bite'
                    ? { x: [0, 8, 12, 0], y: [0, -3, 1, 0] }
                    : { y: [0, -3, 0] }
            : walking
              ? gait === 'dog'
                ? { y: [0, -3, 0, -2, 0], rotate: [0, 3, 0, -3, 0], x: [0, 1, 0, -1, 0] }
                : { y: [0, -4, 0, -3, 0], rotate: [0, 2.5, 0, -2.5, 0] }
              : { y: [0, -1.5, 0] }
        }
        transition={
          attacking
            ? { duration: attack === 'whip' ? 0.75 : 0.4 }
            : walking
              ? { duration, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 1.35, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <img
          src={unitSrc}
          alt=""
          draggable={false}
          aria-hidden
          className="h-full w-full object-contain object-bottom drop-shadow-[1px_3px_5px_rgba(0,0,0,0.6)]"
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
