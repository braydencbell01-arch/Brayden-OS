import { useId } from 'react'
import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
  /** Unit palette + silhouette knobs. */
  skin?: string
  shirt: string
  shirtDark: string
  pants: string
  pantsDark: string
  accent: string
  hair: string
  /** 'hulk' Pete, 'small' Beans, 'speedy' Finley, 'shooter' Jeremy */
  build: 'hulk' | 'small' | 'speedy' | 'shooter'
  hat?: 'none' | 'bandana' | 'cap' | 'visor'
  prop?: 'none' | 'gun' | 'drool' | 'fangs'
}

/**
 * Shared Clash Royale–style toy-3D humanoid for non-Phil units.
 * Bold gradients, chunky limbs, saturated colors — not letter blobs.
 */
export function CrUnitModel({
  anim,
  facing,
  portrait,
  enraged,
  skin = '#e8b888',
  shirt,
  shirtDark,
  pants,
  pantsDark,
  accent,
  hair,
  build,
  hat = 'none',
  prop = 'none',
}: Props) {
  const uid = useId().replace(/:/g, '')
  const flip = Math.cos(facing) < 0 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const scale = build === 'hulk' ? 1.08 : build === 'small' ? 0.82 : 1
  const shirtTop = enraged ? '#7a3ad0' : shirt
  const shirtBot = enraged ? '#3a1868' : shirtDark
  const vb = portrait ? '0 8 80 90' : '0 0 80 118'

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip}) scale(${scale})`, transformOrigin: '50% 100%' }}
    >
      {!portrait ? (
        <div
          className="absolute bottom-0 left-1/2 h-[10%] w-[68%] -translate-x-1/2 rounded-[50%]"
          style={{ background: 'radial-gradient(ellipse, #00000070 0%, transparent 72%)' }}
          aria-hidden
        />
      ) : null}

      <motion.svg
        viewBox={vb}
        className="absolute inset-0 h-full w-full drop-shadow-[1px_3px_4px_rgba(0,0,0,0.5)]"
        animate={
          walking
            ? { y: [0, -3.5, 0, -2.5, 0], rotate: [0, 2.5, 0, -2.5, 0] }
            : attacking
              ? { y: [0, -4, 0], rotate: [0, -4, 6, 0] }
              : { y: [0, -1.2, 0] }
        }
        transition={
          walking
            ? { duration: build === 'small' || build === 'speedy' ? 0.38 : 0.55, repeat: Infinity, ease: 'easeInOut' }
            : attacking
              ? { duration: 0.4 }
              : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skin} />
            <stop offset="100%" stopColor="#b87848" />
          </linearGradient>
          <linearGradient id={`${uid}-shirt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shirtTop} />
            <stop offset="100%" stopColor={shirtBot} />
          </linearGradient>
          <linearGradient id={`${uid}-pants`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pants} />
            <stop offset="100%" stopColor={pantsDark} />
          </linearGradient>
          <linearGradient id={`${uid}-accent`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor="#1a1a20" />
          </linearGradient>
        </defs>

        {/* Legs */}
        <motion.g
          animate={walking ? { rotate: [20, -26, 20] } : { rotate: 4 }}
          transition={walking ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '32px 78px' }}
        >
          <path d="M27 72 Q29 90 28 102 L35 102 Q36 88 34 72 Z" fill={`url(#${uid}-pants)`} />
          <ellipse cx="31" cy="104" rx="7" ry="3" fill="#2a2a30" />
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [-26, 20, -26] } : { rotate: -4 }}
          transition={walking ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ transformOrigin: '44px 78px' }}
        >
          <path d="M39 72 Q41 90 40 102 L47 102 Q48 88 46 72 Z" fill={`url(#${uid}-pants)`} />
          <ellipse cx="43" cy="104" rx="7" ry="3" fill="#2a2a30" />
        </motion.g>

        {/* Hips / pants */}
        <path
          d={`M${build === 'hulk' ? 20 : 24} 66 L${build === 'hulk' ? 56 : 52} 66 L${build === 'hulk' ? 58 : 54} 84 Q40 88 ${build === 'hulk' ? 18 : 22} 84 Z`}
          fill={`url(#${uid}-pants)`}
        />

        {/* Torso */}
        <path
          d={`M${build === 'hulk' ? 18 : 24} ${build === 'hulk' ? 36 : 40} L${build === 'hulk' ? 58 : 52} ${build === 'hulk' ? 36 : 40} L${build === 'hulk' ? 60 : 54} 68 L${build === 'hulk' ? 16 : 22} 68 Z`}
          fill={`url(#${uid}-shirt)`}
          stroke="#00000044"
          strokeWidth="0.8"
        />

        {/* Arms */}
        <motion.g
          animate={
            attacking
              ? { rotate: [-15, -55, 10] }
              : walking
                ? { rotate: [-35, 38, -35] }
                : { rotate: [-8, 5, -8] }
          }
          transition={
            attacking
              ? { duration: 0.4 }
              : walking
                ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.3, repeat: Infinity }
          }
          style={{ transformOrigin: '24px 44px' }}
        >
          <path
            d={`M${build === 'hulk' ? 16 : 22} 42 Q${build === 'hulk' ? 6 : 12} 54 ${build === 'hulk' ? 10 : 14} 68 L${build === 'hulk' ? 22 : 24} 68 Q${build === 'hulk' ? 20 : 24} 52 ${build === 'hulk' ? 26 : 28} 44 Z`}
            fill={`url(#${uid}-skin)`}
          />
          <path d="M20 40 L30 40 L28 52 L18 52 Z" fill={`url(#${uid}-shirt)`} />
          {prop === 'gun' ? (
            <g transform="translate(8 62)">
              <rect x="0" y="0" width="14" height="4" rx="1" fill={`url(#${uid}-accent)`} />
              <rect x="10" y="-2" width="8" height="3" rx="0.8" fill="#4a4a50" />
            </g>
          ) : null}
          {prop === 'drool' && attacking ? (
            <ellipse cx="12" cy="72" rx="4" ry="6" fill="#8bc34a" opacity="0.85" />
          ) : null}
        </motion.g>

        <motion.g
          animate={walking ? { rotate: [38, -32, 38] } : attacking ? { rotate: [10, 40, 10] } : { rotate: [6, -4, 6] }}
          transition={walking ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : { duration: 1.3, repeat: Infinity }}
          style={{ transformOrigin: '52px 44px' }}
        >
          <path d="M48 42 Q62 52 60 68 L50 68 Q50 52 46 44 Z" fill={`url(#${uid}-skin)`} />
          <path d="M48 40 L58 40 L60 52 L50 52 Z" fill={`url(#${uid}-shirt)`} />
        </motion.g>

        {/* Head */}
        <g transform={`translate(38 ${build === 'small' ? 34 : 30})`}>
          <ellipse
            cx="0"
            cy="4"
            rx={build === 'hulk' ? 15 : build === 'small' ? 11 : 13}
            ry={build === 'hulk' ? 16 : build === 'small' ? 12 : 14}
            fill={`url(#${uid}-skin)`}
            stroke="#a86838"
            strokeWidth="0.8"
          />
          {/* Hair */}
          <path
            d="M-12 -4 Q-4 -14 2 -15 Q10 -14 13 -4 Q4 -10 -2 -8 Q-10 -10 -12 -4"
            fill={hair}
          />
          {hat === 'cap' ? (
            <>
              <path d="M-12 -2 Q-6 -14 0 -15 Q8 -14 12 -2 L12 2 Q0 0 -12 2 Z" fill={accent} />
              <path d="M10 0 H17" stroke={accent} strokeWidth="3" strokeLinecap="round" />
            </>
          ) : null}
          {hat === 'bandana' ? (
            <path d="M-13 0 Q0 -6 13 0 L10 6 Q0 2 -10 6 Z" fill={accent} />
          ) : null}
          {hat === 'visor' ? (
            <path d="M-12 2 H14 V6 H-12 Z" fill={accent} opacity="0.9" />
          ) : null}
          {/* Eyes */}
          <ellipse cx="-4.5" cy="3" rx="2.2" ry="2.6" fill="#1a1a20" />
          <ellipse cx="4.5" cy="3" rx="2.2" ry="2.6" fill="#1a1a20" />
          <circle cx="-3.8" cy="2.2" r="0.7" fill="#fff" />
          <circle cx="5.2" cy="2.2" r="0.7" fill="#fff" />
          {prop === 'fangs' ? (
            <>
              <ellipse cx="0" cy="11" rx="4" ry="3" fill="#5a2030" />
              <path d="M-2 10 V14 M2 10 V14" stroke="#fff" strokeWidth="1.4" />
            </>
          ) : (
            <path d="M-4 11 Q0 14 4 11" fill="none" stroke="#8a4030" strokeWidth="1.3" strokeLinecap="round" />
          )}
          {enraged ? (
            <ellipse cx="0" cy="4" rx="16" ry="18" fill="#a040ff" opacity="0.18" />
          ) : null}
        </g>
      </motion.svg>
    </div>
  )
}
