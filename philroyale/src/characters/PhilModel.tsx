import { useId } from 'react'
import { motion } from 'framer-motion'
import type { AttackId } from '../characters'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

const PHIL_CARD = `${import.meta.env.BASE_URL}characters/phil-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Phil — CR toy-3D coach on battlefield; card PNG in portrait mode. */
export function PhilModel({ anim, facing, attackId, portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const whipAttack = attacking && attackId === 'chickenWhip'
  const sundaeAttack = attacking && attackId === 'sundaeHuck'

  if (portrait) {
    return (
      <img
        src={PHIL_CARD}
        alt="Phil"
        className="h-full w-full object-cover"
        style={{ objectPosition: '50% 18%' }}
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
        className="absolute bottom-0 left-1/2 h-[10%] w-[68%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000070 0%, transparent 72%)' }}
        aria-hidden
      />

      <motion.svg
        viewBox="0 0 80 118"
        className="absolute inset-0 h-full w-full drop-shadow-[1px_3px_4px_rgba(0,0,0,0.5)]"
        animate={
          walking
            ? { y: [0, -3.5, 0, -2.5, 0], rotate: [0, 2.5, 0, -2.5, 0] }
            : whipAttack
              ? { y: [0, -2, -4, 1, 0], rotate: [0, -6, -10, 14, 0] }
              : sundaeAttack
                ? { y: [0, -4, -7, 0], rotate: [0, -4, 4, 0] }
                : attacking
                  ? { y: [0, -3, 0] }
                  : { y: [0, -1.2, 0] }
        }
        transition={
          walking
            ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
            : whipAttack
              ? { duration: 0.75 }
              : attacking
                ? { duration: 0.4 }
                : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8b888" />
            <stop offset="100%" stopColor="#b87848" />
          </linearGradient>
          <linearGradient id={`${uid}-navy`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a4a7a" />
            <stop offset="100%" stopColor="#142a48" />
          </linearGradient>
          <linearGradient id={`${uid}-tan`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8a878" />
            <stop offset="100%" stopColor="#8a6840" />
          </linearGradient>
          <linearGradient id={`${uid}-blue`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a8ad0" />
            <stop offset="100%" stopColor="#1a4a88" />
          </linearGradient>
        </defs>

        {/* Duffel bag (behind) */}
        <g transform="translate(8 52)">
          <rect x="0" y="0" width="14" height="22" rx="3" fill={`url(#${uid}-blue)`} stroke="#0a2848" strokeWidth="0.6" />
          <path d="M4 0 Q7 -4 10 0" fill="none" stroke="#1a4a88" strokeWidth="2" />
        </g>

        {/* Legs — tan cargo shorts */}
        <motion.g
          animate={walking ? { rotate: [20, -26, 20] } : { rotate: 4 }}
          transition={walking ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '32px 78px' }}
        >
          <path d="M27 72 Q29 90 28 102 L35 102 Q36 88 34 72 Z" fill={`url(#${uid}-tan)`} />
          <rect x="26" y="74" width="8" height="3" rx="1" fill="#6a5030" opacity="0.5" />
          <ellipse cx="31" cy="104" rx="7" ry="3.2" fill="#3a6ab8" />
          <ellipse cx="31" cy="103" rx="5" ry="2" fill="#5a8ad8" />
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [-26, 20, -26] } : { rotate: -4 }}
          transition={walking ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '44px 78px' }}
        >
          <path d="M39 72 Q41 90 40 102 L47 102 Q48 88 46 72 Z" fill={`url(#${uid}-tan)`} />
          <rect x="38" y="74" width="8" height="3" rx="1" fill="#6a5030" opacity="0.5" />
          <ellipse cx="43" cy="104" rx="7" ry="3.2" fill="#3a6ab8" />
          <ellipse cx="43" cy="103" rx="5" ry="2" fill="#5a8ad8" />
        </motion.g>

        {/* Shorts */}
        <path d="M24 66 L52 66 L54 84 Q40 88 22 84 Z" fill={`url(#${uid}-tan)`} stroke="#6a5030" strokeWidth="0.5" />

        {/* Navy tee torso */}
        <path d="M24 40 L52 40 L54 68 L22 68 Z" fill={`url(#${uid}-navy)`} stroke="#0a1a30" strokeWidth="0.6" />

        {/* Left arm — holds whistle or whip */}
        <motion.g
          animate={
            whipAttack
              ? { rotate: [-8, -70, -85, 20, -8] }
              : sundaeAttack
                ? { rotate: [-10, -55, 15, -10] }
                : walking
                  ? { rotate: [-35, 38, -35] }
                  : { rotate: [-8, 5, -8] }
          }
          transition={
            whipAttack
              ? { duration: 0.75 }
              : walking
                ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '24px 44px' }}
        >
          <path d="M22 42 Q12 54 10 68 L22 68 Q20 52 26 44 Z" fill={`url(#${uid}-skin)`} />
          <path d="M20 40 L30 40 L28 52 L18 52 Z" fill={`url(#${uid}-navy)`} />
          {/* Whistle */}
          {!whipAttack && !sundaeAttack ? (
            <g transform="translate(6 62)">
              <circle cx="4" cy="4" r="3" fill="#f5d76e" stroke="#8a7030" strokeWidth="0.5" />
              <rect x="7" y="2" width="5" height="2" rx="0.5" fill="#c8a040" />
            </g>
          ) : null}
          {/* Chicken whip */}
          {whipAttack ? (
            <g transform="translate(2 58)">
              <path d="M0 0 Q-8 -12 -18 -8 Q-22 4 -10 8" fill="none" stroke="#8a5030" strokeWidth="2.5" strokeLinecap="round" />
              <ellipse cx="-14" cy="-6" rx="5" ry="4" fill="#f5d040" stroke="#8a6020" strokeWidth="0.5" />
            </g>
          ) : null}
        </motion.g>

        {/* Right arm — sundae throw */}
        <motion.g
          animate={
            sundaeAttack
              ? { rotate: [10, -60, 30, 10] }
              : walking
                ? { rotate: [38, -32, 38] }
                : whipAttack
                  ? { rotate: [6, 20, 6] }
                  : { rotate: [6, -4, 6] }
          }
          transition={
            sundaeAttack
              ? { duration: 0.4 }
              : walking
                ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '52px 44px' }}
        >
          <path d="M48 42 Q62 52 60 68 L50 68 Q50 52 46 44 Z" fill={`url(#${uid}-skin)`} />
          <path d="M48 40 L58 40 L60 52 L50 52 Z" fill={`url(#${uid}-navy)`} />
          {sundaeAttack ? (
            <g transform="translate(54 48)">
              <ellipse cx="0" cy="0" rx="5" ry="6" fill="#f8e8d0" stroke="#c8a878" strokeWidth="0.5" />
              <ellipse cx="0" cy="-4" rx="4" ry="3" fill="#e84040" />
              <ellipse cx="2" cy="-6" rx="2" ry="2" fill="#f5d040" />
            </g>
          ) : null}
        </motion.g>

        {/* Head */}
        <g transform="translate(38 28)">
          <ellipse cx="0" cy="6" rx="13" ry="14" fill={`url(#${uid}-skin)`} stroke="#a86838" strokeWidth="0.8" />
          {/* Navy cap */}
          <path d="M-13 0 Q-6 -14 0 -15 Q8 -14 13 0 L13 4 Q0 2 -13 4 Z" fill={`url(#${uid}-navy)`} />
          <path d="M10 2 H18" stroke={`url(#${uid}-navy)`} strokeWidth="3" strokeLinecap="round" />
          {/* Yellow aviators */}
          <ellipse cx="-5" cy="4" rx="5" ry="3.5" fill="#f5d040" stroke="#8a7020" strokeWidth="0.6" />
          <ellipse cx="5" cy="4" rx="5" ry="3.5" fill="#f5d040" stroke="#8a7020" strokeWidth="0.6" />
          <rect x="-1" y="2" width="2" height="2" fill="#8a7020" />
          <path d="M-4 11 Q0 14 4 11" fill="none" stroke="#8a4030" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </motion.svg>
    </div>
  )
}
