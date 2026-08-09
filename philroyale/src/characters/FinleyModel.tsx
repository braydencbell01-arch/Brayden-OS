import { useId } from 'react'
import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'

const FINLEY_CARD = `${import.meta.env.BASE_URL}characters/finley-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/** Finley — CR toy-3D shaggy dog on battlefield; card PNG in portrait mode. */
export function FinleyModel({ anim, facing, portrait, enraged }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'

  if (portrait) {
    return (
      <img
        src={FINLEY_CARD}
        alt="Finley"
        className="h-full w-full object-cover"
        style={{ objectPosition: '50% 40%' }}
        draggable={false}
      />
    )
  }

  const bodyColor = enraged ? '#3a1868' : '#1a1a22'
  const bodyDark = enraged ? '#1a0830' : '#0a0a10'
  const furHighlight = enraged ? '#6a30a8' : '#3a3a48'

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip}) scale(0.92)`, transformOrigin: '50% 100%' }}
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
          attacking
            ? { x: [0, 8, 12, 0], y: [0, -3, 1, 0], rotate: [0, 4, -2, 0] }
            : walking
              ? { y: [0, -3, 0, -2, 0], rotate: [0, 3, 0, -3, 0], x: [0, 1, 0, -1, 0] }
              : { y: [0, -1, 0] }
        }
        transition={
          attacking
            ? { duration: 0.4 }
            : walking
              ? { duration: 0.36, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-fur`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={furHighlight} />
            <stop offset="100%" stopColor={bodyDark} />
          </linearGradient>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bodyColor} />
            <stop offset="100%" stopColor={bodyDark} />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f5d76e" />
            <stop offset="50%" stopColor="#e8b040" />
            <stop offset="100%" stopColor="#c89030" />
          </linearGradient>
        </defs>

        {enraged ? (
          <ellipse cx="40" cy="55" rx="28" ry="32" fill="#a040ff" opacity="0.15" />
        ) : null}

        {/* Tail */}
        <motion.g
          animate={walking ? { rotate: [15, -20, 15] } : { rotate: [8, -8, 8] }}
          transition={{ duration: walking ? 0.36 : 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '58px 60px' }}
        >
          <path d="M58 58 Q72 48 74 62 Q70 72 58 66 Z" fill={`url(#${uid}-fur)`} />
        </motion.g>

        {/* Back legs */}
        <motion.g
          animate={walking ? { rotate: [18, -22, 18] } : { rotate: 6 }}
          transition={walking ? { duration: 0.36, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '30px 82px' }}
        >
          <path d="M26 76 Q24 94 26 104 L32 104 Q34 90 32 76 Z" fill={`url(#${uid}-body)`} />
          <ellipse cx="29" cy="105" rx="5" ry="2.5" fill="#1a1a22" />
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [-22, 18, -22] } : { rotate: -6 }}
          transition={walking ? { duration: 0.36, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '42px 82px' }}
        >
          <path d="M38 76 Q36 94 38 104 L44 104 Q46 90 44 76 Z" fill={`url(#${uid}-body)`} />
          <ellipse cx="41" cy="105" rx="5" ry="2.5" fill="#1a1a22" />
        </motion.g>

        {/* Body */}
        <ellipse cx="40" cy="68" rx="22" ry="18" fill={`url(#${uid}-body)`} stroke="#0a0a10" strokeWidth="0.6" />
        {/* Shaggy fur tufts */}
        <path d="M20 62 Q18 56 22 52 Q26 48 24 58" fill={`url(#${uid}-fur)`} />
        <path d="M56 62 Q58 56 54 52 Q50 48 52 58" fill={`url(#${uid}-fur)`} />
        <path d="M30 74 Q28 70 32 68 Q36 66 34 76" fill={`url(#${uid}-fur)`} />
        <path d="M50 74 Q52 70 48 68 Q44 66 46 76" fill={`url(#${uid}-fur)`} />

        {/* Gold chain */}
        <path
          d="M26 58 Q40 72 54 58"
          fill="none"
          stroke={`url(#${uid}-gold)`}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="40" cy="66" r="3" fill="#f5d76e" stroke="#c89030" strokeWidth="0.5" />

        {/* Front legs */}
        <motion.g
          animate={walking ? { rotate: [-20, 24, -20] } : attacking ? { rotate: [-10, 20, -10] } : { rotate: -4 }}
          transition={walking || attacking ? { duration: 0.36, repeat: attacking ? 0 : Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '28px 72px' }}
        >
          <path d="M24 68 Q20 82 22 96 L28 96 Q30 82 28 68 Z" fill={`url(#${uid}-body)`} />
          {enraged && attacking ? (
            <path d="M20 94 L16 88 M20 94 L24 88" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          ) : null}
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [24, -20, 24] } : attacking ? { rotate: [10, -20, 10] } : { rotate: 4 }}
          transition={walking || attacking ? { duration: 0.36, repeat: attacking ? 0 : Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '48px 72px' }}
        >
          <path d="M44 68 Q48 82 46 96 L52 96 Q50 82 48 68 Z" fill={`url(#${uid}-body)`} />
          {enraged && attacking ? (
            <path d="M52 94 L56 88 M52 94 L48 88" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          ) : null}
        </motion.g>

        {/* Head */}
        <motion.g
          animate={attacking ? { rotate: [0, 12, 18, 0] } : walking ? { rotate: [0, 4, 0, -4, 0] } : { rotate: [0, 2, 0] }}
          transition={
            attacking
              ? { duration: 0.4 }
              : walking
                ? { duration: 0.36, repeat: Infinity }
                : { duration: 1.2, repeat: Infinity }
          }
          style={{ transformOrigin: '40px 48px' }}
        >
          <ellipse cx="40" cy="44" rx="16" ry="14" fill={`url(#${uid}-body)`} stroke="#0a0a10" strokeWidth="0.6" />
          {/* Shaggy head fur */}
          <path d="M24 40 Q22 28 28 24 Q34 20 40 22 Q46 20 52 24 Q58 28 56 40" fill={`url(#${uid}-fur)`} />
          <path d="M26 36 Q24 30 30 28" fill={`url(#${uid}-fur)`} />
          <path d="M54 36 Q56 30 50 28" fill={`url(#${uid}-fur)`} />
          {/* Ears */}
          <ellipse cx="26" cy="36" rx="5" ry="7" fill={bodyDark} />
          <ellipse cx="54" cy="36" rx="5" ry="7" fill={bodyDark} />
          {/* Eyes */}
          <ellipse cx="34" cy="42" rx="3" ry="3.5" fill={enraged ? '#e040ff' : '#f5f5f8'} />
          <ellipse cx="46" cy="42" rx="3" ry="3.5" fill={enraged ? '#e040ff' : '#f5f5f8'} />
          <circle cx="34.5" cy="41.5" r="1.5" fill="#1a1a22" />
          <circle cx="46.5" cy="41.5" r="1.5" fill="#1a1a22" />
          {/* Snout */}
          <ellipse cx="40" cy="50" rx="7" ry="5" fill="#2a2a32" />
          <ellipse cx="40" cy="48" rx="5" ry="3" fill="#3a3a42" />
          {/* Nose */}
          <ellipse cx="40" cy="46" rx="3" ry="2" fill="#1a1a22" />
          {/* Mouth / snarl */}
          {enraged || attacking ? (
            <>
              <path d="M34 52 Q40 58 46 52" fill="#5a1030" />
              <path d="M36 52 V56 M40 53 V57 M44 52 V56" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            <path d="M34 52 Q40 55 46 52" fill="none" stroke="#8a4030" strokeWidth="1" strokeLinecap="round" />
          )}
        </motion.g>
      </motion.svg>
    </div>
  )
}
