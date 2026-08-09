import { useId } from 'react'
import { motion } from 'framer-motion'
import type { AttackId } from '../characters'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  /** Card portrait — close-up bust (last reference photo framing). */
  portrait?: boolean
}

/**
 * Phil — stylized CR-style old man from photo refs:
 * thin build, thinning hair, sunglasses, light-blue checkered shirt, jeans.
 * Over-animated jog; Sundae Huck chuck; Chicken Whip wind-up crack.
 */
export function PhilModel({ anim, facing, attackId, portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const whip = attacking && attackId === 'chickenWhip'
  const sundae = attacking && attackId === 'sundaeHuck'

  if (portrait) {
    return <PhilCardPortrait uid={uid} />
  }

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      <div
        className="absolute bottom-0 left-1/2 h-[11%] w-[72%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000070 0%, transparent 72%)' }}
        aria-hidden
      />

      <motion.svg
        viewBox="0 0 72 110"
        className="absolute inset-0 h-full w-full drop-shadow-[1px_3px_3px_rgba(0,0,0,0.5)]"
        animate={
          walking
            ? { y: [0, -3, 0, -2.5, 0], rotate: [0, 2, 0, -2, 0] }
            : whip
              ? { rotate: [0, -6, -10, 14, 0] }
              : sundae
                ? { y: [0, -2, -5, 0] }
                : { y: [0, -1, 0] }
        }
        transition={
          walking
            ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
            : whip
              ? { duration: 0.75, times: [0, 0.35, 0.55, 0.72, 1] }
              : sundae
                ? { duration: 0.4 }
                : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <PhilDefs uid={uid} />

        {/* Slight forward hunch group */}
        <g transform="translate(0 2) rotate(-3 36 55)">
          {/* Legs — exaggerated jog */}
          <motion.g
            animate={walking ? { rotate: [22, -28, 22] } : { rotate: 4 }}
            transition={walking ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' } : undefined}
            style={{ transformOrigin: '30px 72px' }}
          >
            <path d="M26 68 Q28 82 27 92 L33 92 Q34 80 32 68 Z" fill={`url(#${uid}-jeans)`} />
            <ellipse cx="30" cy="94" rx="7" ry="3.2" fill="#3a3a40" />
            <ellipse cx="30" cy="93.5" rx="5.5" ry="1.6" fill="#e8e8ec" />
          </motion.g>
          <motion.g
            animate={walking ? { rotate: [-28, 22, -28] } : { rotate: -4 }}
            transition={walking ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' } : undefined}
            style={{ transformOrigin: '42px 72px' }}
          >
            <path d="M38 68 Q40 82 39 92 L45 92 Q46 80 44 68 Z" fill={`url(#${uid}-jeans)`} />
            <ellipse cx="42" cy="94" rx="7" ry="3.2" fill="#3a3a40" />
            <ellipse cx="42" cy="93.5" rx="5.5" ry="1.6" fill="#e8e8ec" />
          </motion.g>

          {/* Belt */}
          <rect x="24" y="66" width="24" height="4" rx="1" fill="#3a2418" />
          <rect x="33" y="66.5" width="5" height="3" rx="0.5" fill="#c0c4cc" />

          {/* Torso — blue checkered short-sleeve shirt */}
          <path
            d="M22 38 L50 38 L52 68 L20 68 Z"
            fill={`url(#${uid}-shirt)`}
            stroke="#6a8aaa"
            strokeWidth="0.8"
          />
          <rect x="22" y="38" width="28" height="30" fill={`url(#${uid}-check)`} opacity="0.55" />
          {/* Collar */}
          <path d="M28 38 L36 44 L44 38" fill="none" stroke="#8ab0c8" strokeWidth="1.6" />
          {/* Pocket */}
          <rect x="38" y="48" width="8" height="7" rx="1" fill="none" stroke="#7a9ab0" strokeWidth="0.9" />
          {/* Buttons */}
          {[42, 50, 58].map((y) => (
            <circle key={y} cx="36" cy={y} r="1" fill="#d8e8f0" />
          ))}

          {/* Arms */}
          <motion.g
            animate={
              whip
                ? { rotate: [-25, -70, -90, 55, 10] }
                : sundae
                  ? { rotate: [-15, -55, -25, 5] }
                  : walking
                    ? { rotate: [-35, 40, -35] }
                    : { rotate: [-8, 4, -8] }
            }
            transition={
              whip
                ? { duration: 0.75, times: [0, 0.3, 0.5, 0.68, 1] }
                : sundae
                  ? { duration: 0.4 }
                  : walking
                    ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 1.4, repeat: Infinity }
            }
            style={{ transformOrigin: '24px 42px' }}
          >
            <path d="M20 40 Q14 48 15 58 L22 59 Q23 48 26 42 Z" fill={`url(#${uid}-skin)`} />
            <path d="M18 40 L26 40 L24 48 L16 48 Z" fill={`url(#${uid}-shirt)`} />
            {whip ? (
              <g>
                <path
                  d="M16 58 Q6 64 4 78 Q10 70 14 62"
                  fill="none"
                  stroke="#c9a06a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M4 78 Q2 86 8 90"
                  fill="none"
                  stroke="#8a6a3a"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <motion.circle
                  cx="8"
                  cy="90"
                  r="2"
                  fill="#fff6c8"
                  animate={{ opacity: [0, 0, 1, 0], scale: [0.5, 0.5, 1.8, 0.5] }}
                  transition={{ duration: 0.75, times: [0, 0.55, 0.7, 1] }}
                />
              </g>
            ) : null}
            {sundae ? (
              <g transform="translate(8 56)">
                <ellipse cx="6" cy="10" rx="5" ry="2.2" fill="#fff6e8" stroke="#c9a227" strokeWidth="0.5" />
                <path d="M2 10 L3 4 H9 L10 10 Z" fill="#fff6e8" stroke="#c9a227" strokeWidth="0.5" />
                <ellipse cx="6" cy="4" rx="3.5" ry="2.5" fill="#fffaf0" />
                <circle cx="6" cy="1.5" r="1.8" fill="#d62828" />
                <path d="M7 1 Q10 -2 9 3" fill="none" stroke="#d62828" strokeWidth="0.8" />
              </g>
            ) : null}
          </motion.g>

          <motion.g
            animate={
              walking ? { rotate: [40, -35, 40] } : whip ? { rotate: [10, 20, 5] } : { rotate: [6, -4, 6] }
            }
            transition={
              walking
                ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.4, repeat: Infinity }
            }
            style={{ transformOrigin: '48px 42px' }}
          >
            <path d="M46 40 Q56 48 55 58 L48 59 Q47 48 44 42 Z" fill={`url(#${uid}-skin)`} />
            <path d="M46 40 L54 40 L56 48 L48 48 Z" fill={`url(#${uid}-shirt)`} />
          </motion.g>

          {/* Head — thin elderly face + sunglasses */}
          <g transform="translate(36 28)">
            <ellipse cx="0" cy="2" rx="11.5" ry="13.5" fill={`url(#${uid}-skin)`} stroke="#c99060" strokeWidth="0.7" />
            {/* Thinning hair */}
            <path
              d="M-10 -6 Q-6 -14 0 -15 Q6 -14 10 -6 Q4 -10 -2 -9 Q-8 -10 -10 -6"
              fill="#6a5a48"
            />
            <path d="M-9 -4 Q-4 -8 0 -7 Q5 -8 9 -4" fill="#8a7a68" opacity="0.7" />
            {/* Ears */}
            <ellipse cx="-11.5" cy="1" rx="2.4" ry="3.5" fill={`url(#${uid}-skin)`} />
            <ellipse cx="11.5" cy="1" rx="2.4" ry="3.5" fill={`url(#${uid}-skin)`} />
            {/* Sunglasses */}
            <rect x="-9" y="-2" width="8" height="6" rx="1.5" fill="#1a1a1e" stroke="#4a4a50" strokeWidth="0.7" />
            <rect x="1" y="-2" width="8" height="6" rx="1.5" fill="#1a1a1e" stroke="#4a4a50" strokeWidth="0.7" />
            <rect x="-1.2" y="0" width="2.4" height="1.4" fill="#3a3a40" />
            <path d="M-9 0 H-12.5" stroke="#3a3a40" strokeWidth="1" />
            <path d="M9 0 H12.5" stroke="#3a3a40" strokeWidth="1" />
            <rect x="-8" y="-1" width="3" height="2" rx="0.5" fill="#6a9acc" opacity="0.35" />
            <rect x="2" y="-1" width="3" height="2" rx="0.5" fill="#6a9acc" opacity="0.35" />
            {/* Nose / smile lines */}
            <path d="M0 2 L-1 6 L1 6 Z" fill="#d4a070" opacity="0.8" />
            <path d="M-5 8 Q0 11 5 8" fill="none" stroke="#b07040" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M-7 5 Q-5 7 -4 5" fill="none" stroke="#c99070" strokeWidth="0.6" opacity="0.7" />
            <path d="M7 5 Q5 7 4 5" fill="none" stroke="#c99070" strokeWidth="0.6" opacity="0.7" />
          </g>
        </g>
      </motion.svg>
    </div>
  )
}

/** Animated card art from the close-up reference (sunglasses + blue check shirt). */
function PhilCardPortrait({ uid }: { uid: string }) {
  return (
    <motion.svg
      viewBox="0 0 80 96"
      className="h-full w-full"
      animate={{ y: [0, -1.5, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <PhilDefs uid={uid} />
      {/* Soft backdrop */}
      <ellipse cx="40" cy="88" rx="28" ry="8" fill="#00000033" />
      {/* Shoulders / shirt */}
      <path
        d="M8 70 Q20 48 40 46 Q60 48 72 70 L72 96 L8 96 Z"
        fill={`url(#${uid}-shirt)`}
        stroke="#6a8aaa"
        strokeWidth="0.8"
      />
      <path
        d="M10 72 Q22 52 40 50 Q58 52 70 72 L70 96 L10 96 Z"
        fill={`url(#${uid}-check)`}
        opacity="0.5"
      />
      <path d="M30 50 L40 58 L50 50" fill="none" stroke="#8ab0c8" strokeWidth="2" />
      <rect x="46" y="60" width="12" height="10" rx="1.5" fill="none" stroke="#7a9ab0" strokeWidth="1.1" />

      {/* Head — last-photo framing, looking slightly aside */}
      <g transform="translate(42 34) rotate(-6)">
        <ellipse cx="0" cy="2" rx="18" ry="21" fill={`url(#${uid}-skin)`} stroke="#c99060" strokeWidth="0.9" />
        <path
          d="M-15 -8 Q-8 -22 2 -24 Q12 -22 16 -10 Q6 -16 -2 -14 Q-12 -16 -15 -8"
          fill="#6a5a48"
        />
        <path d="M-14 -5 Q-4 -12 4 -10 Q12 -12 15 -4" fill="#8a7a68" opacity="0.65" />
        <ellipse cx="-17" cy="2" rx="3.5" ry="5" fill={`url(#${uid}-skin)`} />
        <ellipse cx="17" cy="2" rx="3.5" ry="5" fill={`url(#${uid}-skin)`} />
        {/* Sunglasses */}
        <rect x="-14" y="-3" width="12" height="9" rx="2" fill="#1a1a1e" stroke="#5a5a60" strokeWidth="1" />
        <rect x="2" y="-3" width="12" height="9" rx="2" fill="#1a1a1e" stroke="#5a5a60" strokeWidth="1" />
        <rect x="-2" y="0.5" width="4" height="2" fill="#3a3a40" />
        <path d="M-14 1 H-19" stroke="#3a3a40" strokeWidth="1.3" />
        <path d="M14 1 H19" stroke="#3a3a40" strokeWidth="1.3" />
        <rect x="-12" y="-1" width="5" height="3" rx="0.6" fill="#7ab0e0" opacity="0.4" />
        <rect x="4" y="-1" width="5" height="3" rx="0.6" fill="#7ab0e0" opacity="0.4" />
        <path d="M-1 6 L-2 12 L2 12 Z" fill="#d4a070" />
        {/* Expressive open mouth / mid-sentence from last photo */}
        <ellipse cx="0" cy="16" rx="4.5" ry="3.2" fill="#5a3030" />
        <path d="M-3 15 Q0 14 3 15" fill="none" stroke="#e8b090" strokeWidth="0.8" />
        <path d="M-10 10 Q-7 14 -5 10" fill="none" stroke="#c99070" strokeWidth="0.9" opacity="0.8" />
        <path d="M10 10 Q7 14 5 10" fill="none" stroke="#c99070" strokeWidth="0.9" opacity="0.8" />
        {/* Forehead lines */}
        <path d="M-8 -10 H6" stroke="#c99070" strokeWidth="0.7" opacity="0.45" />
        <path d="M-7 -13 H5" stroke="#c99070" strokeWidth="0.6" opacity="0.35" />
      </g>
    </motion.svg>
  )
}

function PhilDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0c8a0" />
        <stop offset="100%" stopColor="#d4a070" />
      </linearGradient>
      <linearGradient id={`${uid}-shirt`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9ec8e0" />
        <stop offset="100%" stopColor="#5a8eb0" />
      </linearGradient>
      <pattern id={`${uid}-check`} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#b8d4e8" />
        <path d="M0 0 H4 M0 2 H4 M0 0 V4 M2 0 V4" stroke="#ffffff" strokeWidth="0.45" opacity="0.85" />
        <path d="M0 0 H4 M0 2 H4 M0 0 V4 M2 0 V4" stroke="#6a9ab8" strokeWidth="0.25" opacity="0.55" />
      </pattern>
      <linearGradient id={`${uid}-jeans`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5a7aab" />
        <stop offset="100%" stopColor="#2a4068" />
      </linearGradient>
    </defs>
  )
}
