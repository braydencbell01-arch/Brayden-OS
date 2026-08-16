import { useId } from 'react'
import { motion } from 'framer-motion'
import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'
import { PhotoTroop } from './PhotoTroop'

const CARD = `${import.meta.env.BASE_URL}characters/big-mable-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/**
 * Big Mable — Clash-style toy-3D inflatable tow tube (orange couch + hazard / check wings).
 * Portrait uses full-bleed water card art; battlefield stays the SVG troop.
 */
export function BigMableModel({ anim, facing, attackId, portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < 0 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack' && attackId === 'launch'

  if (portrait) {
    return (
      <PhotoTroop
        cardSrc={CARD}
        troopSrc={CARD}
        alt="Big Mable"
        anim={anim}
        facing={facing}
        portrait
        objectPos="50% 48%"
        gait="stiff"
        attack="none"
        spriteLegs={false}
      />
    )
  }

  const vb = '0 0 120 92'

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      <div
        className="absolute bottom-0 left-1/2 h-[12%] w-[78%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000075 0%, transparent 72%)' }}
        aria-hidden
      />

      <motion.svg
        viewBox={vb}
        className="absolute inset-0 h-full w-full drop-shadow-[1px_3px_4px_rgba(0,0,0,0.55)]"
        animate={
          attacking
            ? { y: [0, -6, 2, 0], rotate: [0, -8, 10, 0], scaleY: [1, 1.08, 0.92, 1] }
            : walking
              ? { y: [0, -2.5, 0, -1.5, 0], rotate: [0, 1.5, 0, -1.5, 0] }
              : { y: [0, -1.2, 0] }
        }
        transition={
          attacking
            ? { duration: 0.42, ease: 'easeOut' }
            : walking
              ? { duration: 0.72, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-orange`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8a2a" />
            <stop offset="55%" stopColor="#f05a00" />
            <stop offset="100%" stopColor="#c43800" />
          </linearGradient>
          <linearGradient id={`${uid}-orangeSide`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d94800" />
            <stop offset="50%" stopColor="#ff7a18" />
            <stop offset="100%" stopColor="#d94800" />
          </linearGradient>
          <pattern id={`${uid}-hazard`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <rect width="10" height="10" fill="#1a1a1a" />
            <rect width="5" height="10" fill="#ffe14a" />
          </pattern>
          <pattern id={`${uid}-check`} patternUnits="userSpaceOnUse" width="8" height="8">
            <rect width="8" height="8" fill="#f5f5f5" />
            <rect width="4" height="4" fill="#1a1a1a" />
            <rect x="4" y="4" width="4" height="4" fill="#1a1a1a" />
          </pattern>
        </defs>

        <ellipse cx="60" cy="72" rx="48" ry="14" fill={`url(#${uid}-orange)`} stroke="#1a1208" strokeWidth="2.2" />
        <ellipse cx="60" cy="68" rx="44" ry="11" fill={`url(#${uid}-orangeSide)`} opacity="0.95" />
        <ellipse cx="60" cy="66" rx="36" ry="7.5" fill="#ff9a40" opacity="0.55" />

        <path
          d="M18 68 Q60 58 102 68 Q60 78 18 68 Z"
          fill="#c41e1e"
          stroke="#1a1208"
          strokeWidth="1.4"
          opacity="0.95"
        />
        <text
          x="60"
          y="70.5"
          textAnchor="middle"
          fontFamily="Arial Black, Impact, sans-serif"
          fontSize="7.2"
          fontWeight="900"
          fill="#ffe14a"
          stroke="#1a1a1a"
          strokeWidth="0.7"
          paintOrder="stroke"
        >
          BIG MABLE
        </text>

        <ellipse cx="60" cy="78" rx="5" ry="2.4" fill="#ffe14a" stroke="#1a1208" strokeWidth="1.1" />
        <rect x="57.5" y="74.5" width="5" height="4" rx="1" fill="#ffd000" stroke="#1a1208" strokeWidth="0.8" />

        <path
          d="M22 66 Q24 28 36 22 Q60 14 84 22 Q96 28 98 66 Q60 58 22 66 Z"
          fill={`url(#${uid}-orange)`}
          stroke="#1a1208"
          strokeWidth="2.2"
        />
        <path
          d="M30 62 Q36 30 60 24 Q84 30 90 62 Q60 54 30 62 Z"
          fill="#ff9a40"
          opacity="0.35"
        />

        <path
          d="M20 64 Q14 42 28 34 Q36 40 38 62 Z"
          fill={`url(#${uid}-hazard)`}
          stroke="#1a1208"
          strokeWidth="1.6"
        />
        <path
          d="M100 64 Q106 42 92 34 Q84 40 82 62 Z"
          fill={`url(#${uid}-check)`}
          stroke="#1a1208"
          strokeWidth="1.6"
        />

        <path
          d="M36 24 Q60 16 84 24 Q60 28 36 24 Z"
          fill={`url(#${uid}-check)`}
          stroke="#1a1208"
          strokeWidth="1.2"
        />

        <rect x="40" y="54" width="14" height="9" rx="2" fill="#1a1a1a" opacity="0.55" />
        <rect x="66" y="54" width="14" height="9" rx="2" fill="#1a1a1a" opacity="0.55" />

        {[38, 60, 82].map((x) => (
          <g key={x}>
            <rect x={x - 3} y="30" width="6" height="3.5" rx="1.2" fill="#c41e1e" stroke="#1a1208" strokeWidth="0.8" />
            <rect x={x - 1.2} y="28" width="2.4" height="5" rx="0.8" fill="#8a1010" />
          </g>
        ))}

        <circle cx="60" cy="40" r="7" fill="#ffe14a" stroke="#1a1208" strokeWidth="1.3" />
        <circle cx="57.2" cy="38.2" r="1.1" fill="#1a1a1a" />
        <circle cx="62.8" cy="38.2" r="1.1" fill="#1a1a1a" />
        <path d="M56.5 42.2 Q60 45 63.5 42.2" fill="none" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />

        {walking ? (
          <>
            <ellipse cx="28" cy="80" rx="6" ry="2.2" fill="#ffffff55" />
            <ellipse cx="18" cy="78" rx="4" ry="1.6" fill="#ffffff40" />
          </>
        ) : null}
      </motion.svg>
    </div>
  )
}
