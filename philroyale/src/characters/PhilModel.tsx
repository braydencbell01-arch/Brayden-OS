import { useId } from 'react'
import { motion } from 'framer-motion'
import type { AttackId } from '../characters'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

const PHIL_CARD_SRC = `${import.meta.env.BASE_URL}characters/phil-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/**
 * Phil — Clash Royale–style animated coach unit (matches promo likeness):
 * blue cap, amber glasses, navy tee, khaki shorts, blue bag, whistle.
 * Card uses the promo picture; battlefield is a bobbing 2.5D troop, not a card.
 */
export function PhilModel({ anim, facing, attackId, portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const whip = attacking && attackId === 'chickenWhip'
  const sundae = attacking && attackId === 'sundaeHuck'

  if (portrait) {
    return (
      <img
        src={PHIL_CARD_SRC}
        alt="Phil"
        className="h-full w-full object-cover object-[50%_22%]"
        draggable={false}
      />
    )
  }

  const gait = walking ? 0.42 : 1.25

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      <div
        className="absolute bottom-0 left-1/2 h-[10%] w-[70%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000070 0%, transparent 72%)' }}
        aria-hidden
      />

      <motion.svg
        viewBox="0 0 80 118"
        className="absolute inset-0 h-full w-full drop-shadow-[1px_3px_4px_rgba(0,0,0,0.55)]"
        animate={
          walking
            ? { y: [0, -5, 0, -4, 0], rotate: [0, 3, 0, -3, 0] }
            : whip
              ? { rotate: [0, -10, -14, 18, 0], y: [0, -2, -3, 1, 0] }
              : sundae
                ? { y: [0, -4, -7, 0], rotate: [0, -5, 4, 0] }
                : { y: [0, -2, 0] }
        }
        transition={
          walking
            ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
            : whip
              ? { duration: 0.78, times: [0, 0.32, 0.52, 0.7, 1] }
              : sundae
                ? { duration: 0.4 }
                : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0c8a0" />
            <stop offset="100%" stopColor="#c88858" />
          </linearGradient>
          <linearGradient id={`${uid}-tee`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a5a9a" />
            <stop offset="100%" stopColor="#1a2a58" />
          </linearGradient>
          <linearGradient id={`${uid}-shorts`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4b888" />
            <stop offset="100%" stopColor="#8a6a38" />
          </linearGradient>
          <linearGradient id={`${uid}-bag`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4aa0ff" />
            <stop offset="55%" stopColor="#1a5ad0" />
            <stop offset="100%" stopColor="#0a2a78" />
          </linearGradient>
          <linearGradient id={`${uid}-cap`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4a78" />
            <stop offset="100%" stopColor="#121828" />
          </linearGradient>
        </defs>

        {/* Blue gear bag — CR bob while jogging */}
        <motion.g
          animate={
            walking
              ? { rotate: [-10, 12, -10], y: [0, 3, 0] }
              : sundae
                ? { rotate: [-6, -20, -4] }
                : { rotate: [-5, -2, -5] }
          }
          transition={
            walking
              ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
              : sundae
                ? { duration: 0.4 }
                : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '54px 50px' }}
        >
          <ellipse cx="60" cy="64" rx="12" ry="19" fill={`url(#${uid}-bag)`} stroke="#0a2870" strokeWidth="1.2" />
          <ellipse cx="60" cy="48" rx="10" ry="5.5" fill="#5ab0ff" />
          <ellipse cx="60" cy="80" rx="10" ry="4.5" fill="#0a2870" />
          <path d="M50 46 Q40 54 42 72" fill="none" stroke="#1a1a20" strokeWidth="2.6" strokeLinecap="round" />
        </motion.g>

        {/* Legs — over-animated CR troop jog */}
        <motion.g
          animate={walking ? { rotate: [28, -34, 28] } : { rotate: 8 }}
          transition={walking ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '32px 78px' }}
        >
          <path d="M27 74 Q29 90 28 100 L35 100 Q36 88 34 74 Z" fill={`url(#${uid}-shorts)`} />
          <path d="M28 96 L34 96 L35 105 L27 105 Z" fill="#5a4030" />
          <ellipse cx="31" cy="106" rx="7.5" ry="3.2" fill="#3a2818" />
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [-34, 28, -34] } : { rotate: -8 }}
          transition={walking ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '44px 78px' }}
        >
          <path d="M39 74 Q41 90 40 100 L47 100 Q48 88 46 74 Z" fill={`url(#${uid}-shorts)`} />
          <path d="M40 96 L46 96 L47 105 L39 105 Z" fill="#5a4030" />
          <ellipse cx="43" cy="106" rx="7.5" ry="3.2" fill="#3a2818" />
        </motion.g>

        <path
          d="M24 68 L52 68 L54 86 Q40 90 22 86 Z"
          fill={`url(#${uid}-shorts)`}
          stroke="#6a5028"
          strokeWidth="0.8"
        />
        <rect x="46" y="74" width="8" height="9" rx="1.5" fill="#b09060" stroke="#6a5028" strokeWidth="0.6" />

        <path
          d="M24 40 L52 40 L54 70 L22 70 Z"
          fill={`url(#${uid}-tee)`}
          stroke="#0a1838"
          strokeWidth="0.9"
        />
        <path d="M24 40 L20 52 L26 54 Z" fill={`url(#${uid}-tee)`} />
        <path d="M52 40 L58 52 L50 54 Z" fill={`url(#${uid}-tee)`} />

        {/* Whistle */}
        <circle cx="40" cy="56" r="3.2" fill="#f5d76e" stroke="#c9a227" strokeWidth="0.7" />
        <circle cx="40" cy="56" r="1.2" fill="#8a6a12" />
        <path d="M40 42 V52" stroke="#3a6ab0" strokeWidth="1.4" />

        {/* Arms */}
        <motion.g
          animate={
            whip
              ? { rotate: [-20, -75, -95, 60, 8] }
              : sundae
                ? { rotate: [-10, -55, -20, 8] }
                : walking
                  ? { rotate: [-42, 44, -42] }
                  : { rotate: [-14, 8, -14] }
          }
          transition={
            whip
              ? { duration: 0.78, times: [0, 0.3, 0.5, 0.68, 1] }
              : sundae
                ? { duration: 0.4 }
                : walking
                  ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '26px 44px' }}
        >
          <path d="M22 42 Q14 52 16 64 L24 65 Q25 52 28 44 Z" fill={`url(#${uid}-skin)`} />
          <path d="M20 42 L28 42 L26 52 L18 52 Z" fill={`url(#${uid}-tee)`} />
          {whip ? (
            <g>
              <path
                d="M16 64 Q4 72 2 88 Q10 78 14 68"
                fill="none"
                stroke="#c9a06a"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path d="M2 88 Q0 96 8 100" fill="none" stroke="#8a6a3a" strokeWidth="1.8" strokeLinecap="round" />
              <motion.circle
                cx="8"
                cy="100"
                r="2.2"
                fill="#fff6c8"
                animate={{ opacity: [0, 0, 1, 0], scale: [0.4, 0.4, 2, 0.4] }}
                transition={{ duration: 0.78, times: [0, 0.55, 0.7, 1] }}
              />
            </g>
          ) : null}
          {sundae ? (
            <g transform="translate(6 62)">
              <ellipse cx="6" cy="10" rx="5" ry="2.2" fill="#fff6e8" stroke="#c9a227" strokeWidth="0.5" />
              <path d="M2 10 L3 4 H9 L10 10 Z" fill="#fff6e8" stroke="#c9a227" strokeWidth="0.5" />
              <ellipse cx="6" cy="4" rx="3.5" ry="2.5" fill="#fffaf0" />
              <circle cx="6" cy="1.5" r="1.8" fill="#d62828" />
            </g>
          ) : null}
        </motion.g>

        <motion.g
          animate={
            walking
              ? { rotate: [44, -40, 44] }
              : sundae
                ? { rotate: [20, 58, 25] }
                : whip
                  ? { rotate: [8, 18, 5] }
                  : { rotate: [10, -6, 10] }
          }
          transition={
            walking
              ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
              : sundae
                ? { duration: 0.4 }
                : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '50px 44px' }}
        >
          <path d="M48 42 Q60 50 58 64 L50 65 Q49 52 46 44 Z" fill={`url(#${uid}-skin)`} />
          <path d="M48 42 L56 42 L58 52 L50 52 Z" fill={`url(#${uid}-tee)`} />
          {/* Pointing finger (idle/coach vibe) */}
          {!walking && !attacking ? (
            <path d="M58 62 L66 58" stroke={`url(#${uid}-skin)`} strokeWidth="3" strokeLinecap="round" />
          ) : null}
        </motion.g>

        {/* Head — likeness: cap + amber glasses + shout */}
        <g transform="translate(38 30)">
          <ellipse cx="0" cy="4" rx="12.5" ry="14" fill={`url(#${uid}-skin)`} stroke="#a86838" strokeWidth="0.8" />
          <path d="M-13 -2 Q-8 -16 0 -17 Q10 -16 13 -2 L13 2 Q0 0 -13 2 Z" fill={`url(#${uid}-cap)`} />
          <ellipse cx="0" cy="-2" rx="13.5" ry="4" fill="#1a2438" />
          <path d="M10 -1 H18" stroke="#1a2438" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M-12 0 Q-14 6 -11 10" fill="none" stroke="#c8c0b0" strokeWidth="2.2" />
          <path d="M12 0 Q14 6 11 10" fill="none" stroke="#c8c0b0" strokeWidth="2.2" />
          <rect x="-10" y="0" width="9" height="7" rx="1.4" fill="#e8a040" stroke="#1a1a20" strokeWidth="1.3" opacity="0.9" />
          <rect x="1" y="0" width="9" height="7" rx="1.4" fill="#e8a040" stroke="#1a1a20" strokeWidth="1.3" opacity="0.9" />
          <rect x="-1.2" y="2.2" width="2.4" height="1.6" fill="#1a1a20" />
          <path d="M-10 2 H-13.5" stroke="#1a1a20" strokeWidth="1.2" />
          <path d="M10 2 H13.5" stroke="#1a1a20" strokeWidth="1.2" />
          <ellipse cx="0" cy="12" rx="4.2" ry="3.4" fill="#5a2030" />
          <path d="M0 5 L-1.5 9 L1.5 9 Z" fill="#d4a070" />
        </g>
      </motion.svg>
    </div>
  )
}
