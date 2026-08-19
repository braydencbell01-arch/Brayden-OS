import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

type Props = {
  cardSrc: string
  alt: string
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  gait?: 'jog' | 'run' | 'dog' | 'limp' | 'sprint' | 'blitz' | 'stiff' | 'waddle' | 'flutter'
  roll?: boolean
  objectPos?: string
  portraitScale?: number
  troopScale?: number
  spriteLegs?: boolean
}

/** Full-bleed photo card used for both portrait and battlefield. */
export function PhotoCardModel({
  cardSrc,
  alt,
  anim,
  facing,
  portrait,
  gait = 'stiff',
  roll,
  objectPos = '50% 48%',
  portraitScale = 1.08,
  troopScale = 1.05,
  spriteLegs = true,
}: Props) {
  if (portrait) {
    return (
      <PhotoTroop
        cardSrc={cardSrc}
        troopSrc={cardSrc}
        alt={alt}
        anim={anim}
        facing={facing}
        portrait
        portraitScale={portraitScale}
        troopScale={troopScale}
        objectPos={objectPos}
        gait={gait}
        attack="none"
        spriteLegs={spriteLegs}
      />
    )
  }

  if (!roll) {
    const flip = Math.cos(facing) < 0 ? -1 : 1
    const moving = anim === 'walk' || anim === 'attack'
    return (
      <div
        className="relative h-full w-full overflow-visible"
        style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
      >
        <motion.img
          src={cardSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-contain drop-shadow-[1px_3px_4px_rgba(0,0,0,0.5)]"
          style={{ background: 'none' }}
          animate={
            moving
              ? { translateY: [0, -2, 0], scale: [1, 1.03, 1] }
              : { translateY: 0, scale: 1 }
          }
          transition={
            moving
              ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
          draggable={false}
        />
      </div>
    )
  }

  const flip = Math.cos(facing) < 0 ? -1 : 1
  const moving = anim === 'walk' || anim === 'attack'
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      <motion.img
        src={cardSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover drop-shadow-[1px_3px_4px_rgba(0,0,0,0.5)]"
        style={{
          objectPosition: objectPos,
          // Card-art PNGs include a visible border/square background; zoom so
          // only the character stays in-frame like other sprites.
          transform: 'scale(1.26)',
          transformOrigin: '50% 50%',
        }}
        animate={moving ? { y: [0, -2, 0] } : { y: 0 }}
        transition={moving ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        draggable={false}
      />
    </div>
  )
}
