import { motion } from 'framer-motion'
import type { AttackId } from '../characters'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

/** Clean CR Phil promo (the picture used for Phil). */
const PHIL_SRC = `${import.meta.env.BASE_URL}characters/phil-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  /** Card art — full Phil picture, no extra chrome in the image. */
  portrait?: boolean
}

/**
 * Phil uses the Clash Royale–style photo on the card and as the battlefield sprite.
 * Motion is over-animated so the jog reads frantic while moveSpeed stays slow.
 */
export function PhilModel({ anim, facing, attackId, portrait }: Props) {
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const whip = attacking && attackId === 'chickenWhip'
  const sundae = attacking && attackId === 'sundaeHuck'

  if (portrait) {
    return (
      <img
        src={PHIL_SRC}
        alt="Phil"
        className="h-full w-full object-cover object-[50%_20%]"
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
        className="absolute bottom-0 left-1/2 h-[9%] w-[72%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000078 0%, transparent 72%)' }}
        aria-hidden
      />

      <motion.div
        className="absolute inset-0"
        animate={
          walking
            ? { y: [0, -5, 0, -4, 0], rotate: [0, 3.5, 0, -3.5, 0], scale: [1, 1.03, 1, 1.02, 1] }
            : whip
              ? { rotate: [0, -10, -14, 18, 0], y: [0, -2, -4, 2, 0] }
              : sundae
                ? { y: [0, -4, -8, 0], rotate: [0, -4, 6, 0] }
                : { y: [0, -2, 0] }
        }
        transition={
          walking
            ? { duration: 0.48, repeat: Infinity, ease: 'easeInOut' }
            : whip
              ? { duration: 0.78, times: [0, 0.32, 0.52, 0.7, 1] }
              : sundae
                ? { duration: 0.42 }
                : { duration: 1.35, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <img
          src={PHIL_SRC}
          alt=""
          draggable={false}
          className="h-full w-full object-contain object-bottom drop-shadow-[1px_3px_4px_rgba(0,0,0,0.55)]"
          style={{
            // Crop sky/castle so the unit reads as Phil on the grass tile.
            clipPath: 'inset(2% 8% 4% 8%)',
          }}
          aria-hidden
        />
      </motion.div>

      {sundae ? (
        <motion.div
          className="absolute left-[8%] top-[38%] h-3 w-2.5"
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: [-4, -10, -16], y: [0, -6, -2] }}
          transition={{ duration: 0.42 }}
          aria-hidden
        >
          <div className="h-full w-full rounded-sm bg-[#fff6e8] shadow-sm" />
          <div className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#d62828]" />
        </motion.div>
      ) : null}

      {whip ? (
        <motion.div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          animate={{ opacity: [0, 0, 1, 0] }}
          transition={{ duration: 0.78, times: [0, 0.55, 0.7, 1] }}
        >
          <div
            className="absolute left-[10%] top-[55%] h-0.5 w-[55%] origin-left rounded-full bg-[#c9a06a]"
            style={{ transform: 'rotate(55deg)', boxShadow: '0 0 6px #fff6c888' }}
          />
        </motion.div>
      ) : null}
    </div>
  )
}
