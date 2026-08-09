import { useId } from 'react'
import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'

const FINLEY_CARD_SRC = `${import.meta.env.BASE_URL}characters/finley-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/**
 * Finley — animated black dog troop (not a card sprite).
 * Dog gait + swaying gold chain; rage = purple snarl/claws; attack = bite lunge.
 */
export function FinleyModel({ anim, facing, portrait, enraged }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const run = walking || (enraged && !attacking)
  const fur = enraged ? '#7a3ad0' : '#1a1a22'
  const furLite = enraged ? '#a060f0' : '#3a3a42'
  const gait = enraged ? 0.28 : 0.38

  if (portrait) {
    return (
      <img
        src={FINLEY_CARD_SRC}
        alt="Finley"
        className="h-full w-full object-cover object-[50%_35%]"
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
        className="absolute bottom-0 left-1/2 h-[10%] w-[78%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000078 0%, transparent 72%)' }}
        aria-hidden
      />

      <motion.svg
        viewBox="0 0 90 70"
        className="absolute inset-0 h-full w-full drop-shadow-[1px_3px_4px_rgba(0,0,0,0.55)]"
        animate={
          attacking
            ? { x: [0, 10, 14, 0], y: [0, -4, 1, 0], rotate: [0, -8, 6, 0] }
            : run
              ? { y: [0, -4, 0, -3, 0], rotate: [0, 3, 0, -3, 0] }
              : { y: [0, -1.5, 0] }
        }
        transition={
          attacking
            ? { duration: 0.36, times: [0, 0.25, 0.55, 1] }
            : run
              ? { duration: gait, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-fur`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={furLite} />
            <stop offset="100%" stopColor={fur} />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe08a" />
            <stop offset="100%" stopColor="#a87818" />
          </linearGradient>
        </defs>

        {/* Tail */}
        <motion.path
          d="M18 38 Q8 28 10 18"
          fill="none"
          stroke={fur}
          strokeWidth="5"
          strokeLinecap="round"
          animate={run ? { rotate: [-18, 22, -18] } : { rotate: [-6, 6, -6] }}
          transition={{ duration: gait, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '18px 38px' }}
        />

        {/* Body */}
        <ellipse cx="42" cy="40" rx="22" ry="14" fill={`url(#${uid}-fur)`} />
        <ellipse cx="42" cy="42" rx="16" ry="10" fill={furLite} opacity="0.35" />

        {/* Legs — dog trot */}
        <motion.g
          animate={run ? { rotate: [22, -28, 22] } : { rotate: 4 }}
          transition={run ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '30px 48px' }}
        >
          <path d="M28 46 L26 62 L32 62 L33 46 Z" fill={fur} />
          <ellipse cx="29" cy="63" rx="4" ry="2" fill="#0a0a0c" />
        </motion.g>
        <motion.g
          animate={run ? { rotate: [-28, 22, -28] } : { rotate: -4 }}
          transition={run ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '38px 48px' }}
        >
          <path d="M36 46 L34 62 L40 62 L41 46 Z" fill={fur} />
          <ellipse cx="37" cy="63" rx="4" ry="2" fill="#0a0a0c" />
        </motion.g>
        <motion.g
          animate={run ? { rotate: [-24, 26, -24] } : { rotate: 2 }}
          transition={run ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '50px 48px' }}
        >
          <path d="M48 46 L46 62 L52 62 L53 46 Z" fill={fur} />
          <ellipse cx="49" cy="63" rx="4" ry="2" fill="#0a0a0c" />
        </motion.g>
        <motion.g
          animate={run ? { rotate: [26, -24, 26] } : { rotate: -2 }}
          transition={run ? { duration: gait, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '58px 48px' }}
        >
          <path d="M56 46 L54 62 L60 62 L61 46 Z" fill={fur} />
          <ellipse cx="57" cy="63" rx="4" ry="2" fill="#0a0a0c" />
        </motion.g>

        {/* Head */}
        <motion.g
          animate={attacking ? { x: [0, 8, 10, 0], rotate: [0, -10, 5, 0] } : undefined}
          transition={attacking ? { duration: 0.36 } : undefined}
        >
          <ellipse cx="64" cy="30" rx="14" ry="12" fill={`url(#${uid}-fur)`} />
          <ellipse cx="72" cy="28" rx="6" ry="4.5" fill={fur} />
          {/* Ears */}
          <ellipse cx="54" cy="22" rx="5" ry="8" fill={fur} transform="rotate(-20 54 22)" />
          <ellipse cx="70" cy="20" rx="5" ry="8" fill={fur} transform="rotate(15 70 20)" />
          {/* Eyes */}
          <ellipse cx="62" cy="28" rx="2.2" ry="2.6" fill={enraged ? '#ff4060' : '#5a3018'} />
          <ellipse cx="70" cy="28" rx="2.2" ry="2.6" fill={enraged ? '#ff4060' : '#5a3018'} />
          <circle cx="62.5" cy="27.2" r="0.7" fill="#fff" />
          <circle cx="70.5" cy="27.2" r="0.7" fill="#fff" />
          <ellipse cx="74" cy="32" rx="2.2" ry="1.6" fill="#1a1a1e" />
          {/* Mouth / snarl */}
          {enraged || attacking ? (
            <>
              <path d="M66 36 Q72 40 76 34" fill="#5a2030" />
              <path d="M68 36 V40 M72 36 V40" stroke="#fff" strokeWidth="1.3" />
            </>
          ) : (
            <path d="M66 35 Q72 38 76 34" fill="none" stroke="#3a2030" strokeWidth="1.2" />
          )}
        </motion.g>

        {/* Gold chain sway */}
        <motion.g
          animate={run ? { rotate: [-14, 16, -14], y: [0, 2, 0] } : { rotate: [-4, 4, -4] }}
          transition={{ duration: gait, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '52px 34px' }}
        >
          {[48, 52, 56, 60, 64].map((x, i) => (
            <ellipse
              key={i}
              cx={x}
              cy={34 + (i % 2) * 1.5}
              rx="3.6"
              ry="2.8"
              fill={`url(#${uid}-gold)`}
              stroke="#8a6010"
              strokeWidth="0.7"
            />
          ))}
        </motion.g>

        {/* Rage claws */}
        {enraged && !attacking ? (
          <motion.g
            animate={{ x: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.26, repeat: Infinity }}
          >
            <path d="M76 44 Q80 38 82 46" fill="none" stroke="#e8b0ff" strokeWidth="1.8" />
            <path d="M78 46 Q83 40 85 48" fill="none" stroke="#e8b0ff" strokeWidth="1.8" />
            <path d="M80 48 Q85 42 87 50" fill="none" stroke="#e8b0ff" strokeWidth="1.8" />
          </motion.g>
        ) : null}

        {enraged ? (
          <ellipse cx="45" cy="36" rx="34" ry="24" fill="#a040ff" opacity="0.12" />
        ) : null}
      </motion.svg>
    </div>
  )
}
