import { useId } from 'react'
import { motion } from 'framer-motion'
import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'

const JEREMY_CARD_SRC = `${import.meta.env.BASE_URL}characters/jeremy-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/**
 * Jeremy — tallest unit (6'3"): charcoal suit, pink tie, salt-and-pepper hair.
 * Normal person run; dual-pistol Shoot (one gun then the other).
 */
export function JeremyModel({ anim, facing, attackId, portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const shooting = anim === 'attack' && attackId === 'shoot'
  const gait = 0.48

  if (portrait) {
    return (
      <img
        src={JEREMY_CARD_SRC}
        alt="Jeremy"
        className="h-full w-full object-cover object-[50%_18%]"
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
        className="absolute bottom-0 left-1/2 h-[9%] w-[62%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000070 0%, transparent 72%)' }}
        aria-hidden
      />

      <motion.svg
        viewBox="0 0 72 128"
        className="absolute inset-0 h-full w-full drop-shadow-[1px_3px_4px_rgba(0,0,0,0.55)]"
        animate={
          walking
            ? { y: [0, -3, 0, -2.5, 0] }
            : shooting
              ? { y: [0, -1, 0], rotate: [0, -2, 2, 0] }
              : { y: [0, -1.2, 0] }
        }
        transition={
          walking
            ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
            : shooting
              ? { duration: 0.45 }
              : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0c8a0" />
            <stop offset="100%" stopColor="#c88858" />
          </linearGradient>
          <linearGradient id={`${uid}-suit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a5a66" />
            <stop offset="100%" stopColor="#2a2a32" />
          </linearGradient>
          <linearGradient id={`${uid}-shirt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d8d8e0" />
          </linearGradient>
        </defs>

        {/* Legs — normal run (not over-animated) */}
        <motion.g
          animate={walking ? { rotate: [14, -16, 14] } : { rotate: 3 }}
          transition={walking ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '30px 88px' }}
        >
          <path d="M26 78 Q28 98 27 112 L33 112 Q34 96 32 78 Z" fill={`url(#${uid}-suit)`} />
          <ellipse cx="30" cy="114" rx="6.5" ry="2.8" fill="#1a1a1e" />
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [-16, 14, -16] } : { rotate: -3 }}
          transition={walking ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '42px 88px' }}
        >
          <path d="M38 78 Q40 98 39 112 L45 112 Q46 96 44 78 Z" fill={`url(#${uid}-suit)`} />
          <ellipse cx="42" cy="114" rx="6.5" ry="2.8" fill="#1a1a1e" />
        </motion.g>

        {/* Jacket / torso — tall */}
        <path
          d="M22 36 L50 36 L54 82 L18 82 Z"
          fill={`url(#${uid}-suit)`}
          stroke="#1a1a22"
          strokeWidth="0.9"
        />
        <path d="M22 36 L18 50 L24 52 Z" fill={`url(#${uid}-suit)`} />
        <path d="M50 36 L56 50 L48 52 Z" fill={`url(#${uid}-suit)`} />
        {/* Shirt + pink tie */}
        <path d="M32 38 L40 38 L39 78 L33 78 Z" fill={`url(#${uid}-shirt)`} />
        <path d="M35 40 L37 40 L38 72 L34 72 Z" fill="#f0a0b8" stroke="#c07088" strokeWidth="0.5" />
        <path d="M33 38 L36 44 L39 38" fill="#f0a0b8" />

        {/* Arms */}
        <motion.g
          animate={
            shooting
              ? { rotate: [-8, -55, -40, -8] }
              : walking
                ? { rotate: [-22, 20, -22] }
                : { rotate: [-6, 4, -6] }
          }
          transition={
            shooting
              ? { duration: 0.45, times: [0, 0.25, 0.55, 1] }
              : walking
                ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.4, repeat: Infinity }
          }
          style={{ transformOrigin: '24px 42px' }}
        >
          <path d="M20 40 Q12 54 14 70 L22 71 Q23 54 26 42 Z" fill={`url(#${uid}-skin)`} />
          <path d="M18 40 L28 40 L26 56 L16 56 Z" fill={`url(#${uid}-suit)`} />
          {shooting ? (
            <g transform="translate(8 66)">
              <rect x="0" y="0" width="12" height="4" rx="1" fill="#2a2a30" stroke="#0a0a0c" />
              <rect x="10" y="-1" width="7" height="3" rx="0.6" fill="#4a4a50" />
              <motion.circle
                cx="17"
                cy="0.5"
                r="2"
                fill="#ffe08a"
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.6, 0.4] }}
                transition={{ duration: 0.45, times: [0, 0.28, 0.5] }}
              />
            </g>
          ) : null}
        </motion.g>

        <motion.g
          animate={
            shooting
              ? { rotate: [8, 50, 35, 8] }
              : walking
                ? { rotate: [20, -22, 20] }
                : { rotate: [6, -4, 6] }
          }
          transition={
            shooting
              ? { duration: 0.45, times: [0, 0.45, 0.75, 1] }
              : walking
                ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.4, repeat: Infinity }
          }
          style={{ transformOrigin: '48px 42px' }}
        >
          <path d="M46 40 Q58 54 56 70 L48 71 Q47 54 44 42 Z" fill={`url(#${uid}-skin)`} />
          <path d="M44 40 L54 40 L56 56 L46 56 Z" fill={`url(#${uid}-suit)`} />
          {shooting ? (
            <g transform="translate(52 66)">
              <rect x="0" y="0" width="12" height="4" rx="1" fill="#2a2a30" stroke="#0a0a0c" />
              <rect x="10" y="-1" width="7" height="3" rx="0.6" fill="#4a4a50" />
              <motion.circle
                cx="17"
                cy="0.5"
                r="2"
                fill="#ffe08a"
                animate={{ opacity: [0, 0, 1, 0], scale: [0.4, 0.4, 1.6, 0.4] }}
                transition={{ duration: 0.45, times: [0, 0.45, 0.65, 0.9] }}
              />
            </g>
          ) : null}
        </motion.g>

        {/* Head — salt-and-pepper, confident smile */}
        <g transform="translate(36 28)">
          <ellipse cx="0" cy="2" rx="12" ry="13.5" fill={`url(#${uid}-skin)`} stroke="#a86838" strokeWidth="0.8" />
          <path
            d="M-11 -4 Q-6 -14 0 -15 Q6 -14 11 -4 Q4 -10 -2 -9 Q-8 -10 -11 -4"
            fill="#6a6a70"
          />
          <path d="M-10 -2 Q-4 -8 0 -7 Q5 -8 10 -2" fill="#c8c8d0" opacity="0.55" />
          <ellipse cx="-11.5" cy="1" rx="2.2" ry="3.2" fill={`url(#${uid}-skin)`} />
          <ellipse cx="11.5" cy="1" rx="2.2" ry="3.2" fill={`url(#${uid}-skin)`} />
          <ellipse cx="-4" cy="1" rx="1.8" ry="2.2" fill="#1a1a20" />
          <ellipse cx="4" cy="1" rx="1.8" ry="2.2" fill="#1a1a20" />
          <circle cx="-3.4" cy="0.3" r="0.55" fill="#fff" />
          <circle cx="4.6" cy="0.3" r="0.55" fill="#fff" />
          <path d="M0 3 L-1.2 7 L1.2 7 Z" fill="#d4a070" />
          <path d="M-5 9 Q0 12 5 9" fill="none" stroke="#8a4030" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </motion.svg>
    </div>
  )
}
