import { useId } from 'react'
import { motion } from 'framer-motion'
import type { AttackId } from '../characters'
import type { CharacterAnim } from './PhilModel'

const JEREMY_CARD = `${import.meta.env.BASE_URL}characters/jeremy-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  attackId?: AttackId | null
  portrait?: boolean
}

/** Jeremy — CR toy-3D tall suit guy on battlefield; card PNG in portrait mode. */
export function JeremyModel({ anim, facing, attackId, portrait }: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack' && attackId === 'shoot'
  const idle = anim === 'idle'

  if (portrait) {
    return (
      <img
        src={JEREMY_CARD}
        alt="Jeremy"
        className="h-full w-full object-cover"
        style={{ objectPosition: '50% 12%' }}
        draggable={false}
      />
    )
  }

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip}) scale(1.06)`, transformOrigin: '50% 100%' }}
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
            ? { y: [0, -4, 0, -3, 0], rotate: [0, 2.5, 0, -2.5, 0] }
            : attacking
              ? { y: [0, -2, 0], rotate: [0, -3, 3, 0] }
              : { y: [0, -1.2, 0] }
        }
        transition={
          walking
            ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
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
          <linearGradient id={`${uid}-suit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a4a52" />
            <stop offset="100%" stopColor="#2a2a30" />
          </linearGradient>
          <linearGradient id={`${uid}-pants`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3a42" />
            <stop offset="100%" stopColor="#1a1a22" />
          </linearGradient>
        </defs>

        {/* Legs — tall proportions */}
        <motion.g
          animate={walking ? { rotate: [22, -28, 22] } : { rotate: 3 }}
          transition={walking ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '32px 82px' }}
        >
          <path d="M28 74 Q26 94 28 108 L34 108 Q36 94 34 74 Z" fill={`url(#${uid}-pants)`} />
          <ellipse cx="31" cy="109" rx="6" ry="2.5" fill="#1a1a22" />
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [-28, 22, -28] } : { rotate: -3 }}
          transition={walking ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '44px 82px' }}
        >
          <path d="M40 74 Q42 94 40 108 L46 108 Q48 94 46 74 Z" fill={`url(#${uid}-pants)`} />
          <ellipse cx="43" cy="109" rx="6" ry="2.5" fill="#1a1a22" />
        </motion.g>

        {/* Suit jacket / torso */}
        <path d="M22 34 L54 34 L56 72 L20 72 Z" fill={`url(#${uid}-suit)`} stroke="#1a1a22" strokeWidth="0.6" />
        {/* White shirt */}
        <path d="M32 34 L44 34 L42 58 L34 58 Z" fill="#f5f5f8" />
        {/* Pink tie */}
        <path d="M38 34 L40 34 L41 58 L37 58 Z" fill="#e87090" />
        <path d="M37 34 Q38 30 39 34" fill="#e87090" />

        {/* Left arm — uncrosses when walking */}
        <motion.g
          animate={
            attacking
              ? { rotate: [-55, -75, -20, -55] }
              : walking
                ? { rotate: [-40, 35, -40] }
                : idle
                  ? { rotate: [-22] }
                  : { rotate: [-8, 5, -8] }
          }
          transition={
            attacking
              ? { duration: 0.4 }
              : walking
                ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                : idle
                  ? undefined
                  : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '22px 38px' }}
        >
          <path d="M18 36 Q8 48 6 66 L18 66 Q20 50 22 38 Z" fill={`url(#${uid}-suit)`} />
          <path d="M16 64 Q10 66 8 72 L14 74 Q16 68 18 64 Z" fill={`url(#${uid}-skin)`} />
          {attacking ? (
            <g transform="translate(2 58)">
              <rect x="0" y="0" width="14" height="4" rx="1" fill="#2a2a32" />
              <rect x="10" y="-2" width="8" height="3" rx="0.8" fill="#4a4a50" />
            </g>
          ) : null}
        </motion.g>

        {/* Right arm — crossed when idle, swings when walking */}
        <motion.g
          animate={
            attacking
              ? { rotate: [18, 35, 18] }
              : walking
                ? { rotate: [35, -30, 35] }
                : idle
                  ? { rotate: [18] }
                  : { rotate: [8, -4, 8] }
          }
          transition={
            attacking
              ? { duration: 0.4 }
              : walking
                ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                : idle
                  ? undefined
                  : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '54px 38px' }}
        >
          <path d="M50 36 Q62 46 60 66 L50 66 Q50 50 48 38 Z" fill={`url(#${uid}-suit)`} />
          <path d="M52 64 Q58 66 60 72 L54 74 Q52 68 50 64 Z" fill={`url(#${uid}-skin)`} />
        </motion.g>

        {/* Head — salt-pepper hair */}
        <g transform="translate(38 22)">
          <ellipse cx="0" cy="6" rx="12" ry="13" fill={`url(#${uid}-skin)`} stroke="#a86838" strokeWidth="0.8" />
          {/* Salt-pepper hair */}
          <path d="M-11 -2 Q-4 -14 0 -15 Q6 -14 11 -2 Q8 -10 0 -10 Q-8 -10 -11 -2" fill="#6a6a72" />
          <path d="M-10 -4 Q-2 -12 4 -10 Q2 -8 -4 -6 Q-8 -8 -10 -4" fill="#c8c8d0" opacity="0.7" />
          {/* Eyes */}
          <ellipse cx="-4" cy="4" rx="2" ry="2.5" fill="#1a1a20" />
          <ellipse cx="4" cy="4" rx="2" ry="2.5" fill="#1a1a20" />
          <circle cx="-3.5" cy="3.5" r="0.6" fill="#fff" />
          <circle cx="4.5" cy="3.5" r="0.6" fill="#fff" />
          <path d="M-3 12 Q0 14 3 12" fill="none" stroke="#8a4030" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </motion.svg>
    </div>
  )
}
