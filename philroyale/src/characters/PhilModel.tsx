import { motion } from 'framer-motion'
import type { AttackId } from '../characters'

export type CharacterAnim = 'idle' | 'walk' | 'attack'

type Props = {
  anim: CharacterAnim
  /** Radians; 0 = right, -PI/2 = up (toward enemy for ally). */
  facing: number
  attackId?: AttackId | null
  /** Card portrait (cropped, no shadow). */
  portrait?: boolean
}

/**
 * Stylized 2.5D Phil — CR-scale silhouette.
 * Placeholder art until real photo references are applied.
 */
export function PhilModel({ anim, facing, attackId, portrait }: Props) {
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const whip = attacking && attackId === 'chickenWhip'
  const sundae = attacking && attackId === 'sundaeThrow'

  return (
    <div
      className="relative h-full w-full"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      {!portrait ? (
        <div
          className="absolute bottom-0 left-1/2 h-[12%] w-[70%] -translate-x-1/2 rounded-[50%]"
          style={{ background: 'radial-gradient(ellipse, #00000066 0%, transparent 70%)' }}
          aria-hidden
        />
      ) : null}

      <motion.svg
        viewBox="0 0 64 96"
        className="absolute inset-0 h-full w-full drop-shadow-[1px_2px_2px_rgba(0,0,0,0.45)]"
        animate={
          walking
            ? { y: [0, -2, 0] }
            : whip
              ? { rotate: [0, -8, 12, 0] }
              : sundae
                ? { y: [0, -4, 0] }
                : { y: [0, -1.2, 0] }
        }
        transition={
          walking
            ? { duration: 0.35, repeat: Infinity, ease: 'easeInOut' }
            : attacking
              ? { duration: 0.35 }
              : { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
        }
        aria-hidden
      >
        <defs>
          <linearGradient id="philSkin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d0a8" />
            <stop offset="100%" stopColor="#e0a878" />
          </linearGradient>
          <linearGradient id="philShirt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5ab0ef" />
            <stop offset="100%" stopColor="#2a6fbf" />
          </linearGradient>
          <linearGradient id="philPants" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4a6a" />
            <stop offset="100%" stopColor="#1a2438" />
          </linearGradient>
        </defs>

        {/* Legs */}
        <motion.g
          animate={walking ? { rotate: [8, -8, 8] } : { rotate: 0 }}
          transition={walking ? { duration: 0.35, repeat: Infinity } : undefined}
          style={{ transformOrigin: '26px 62px' }}
        >
          <rect x="22" y="58" width="8" height="22" rx="3" fill="url(#philPants)" />
          <rect x="20" y="76" width="11" height="5" rx="2" fill="#2a1a10" />
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [-8, 8, -8] } : { rotate: 0 }}
          transition={walking ? { duration: 0.35, repeat: Infinity } : undefined}
          style={{ transformOrigin: '38px 62px' }}
        >
          <rect x="34" y="58" width="8" height="22" rx="3" fill="url(#philPants)" />
          <rect x="33" y="76" width="11" height="5" rx="2" fill="#2a1a10" />
        </motion.g>

        {/* Torso */}
        <rect x="18" y="34" width="28" height="28" rx="8" fill="url(#philShirt)" stroke="#1a4a8a" strokeWidth="1.2" />
        <ellipse cx="32" cy="40" rx="10" ry="4" fill="#ffffff33" />

        {/* Arms */}
        <motion.g
          animate={
            whip
              ? { rotate: [-20, 50, -10] }
              : sundae
                ? { rotate: [-30, -50, -20] }
                : walking
                  ? { rotate: [-12, 12, -12] }
                  : { rotate: 0 }
          }
          transition={attacking ? { duration: 0.35 } : walking ? { duration: 0.35, repeat: Infinity } : undefined}
          style={{ transformOrigin: '20px 40px' }}
        >
          <rect x="12" y="36" width="9" height="20" rx="4" fill="url(#philSkin)" />
          {whip ? (
            <path
              d="M10 54 Q4 62 8 72 Q14 66 12 58"
              fill="none"
              stroke="#f0d060"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ) : null}
          {sundae ? (
            <g transform="translate(6 50)">
              <path d="M2 8 L6 0 L10 8 Z" fill="#fff6e8" stroke="#c9a227" strokeWidth="0.6" />
              <circle cx="6" cy="1" r="2" fill="#d62828" />
            </g>
          ) : null}
        </motion.g>
        <motion.g
          animate={walking ? { rotate: [12, -12, 12] } : { rotate: 0 }}
          transition={walking ? { duration: 0.35, repeat: Infinity } : undefined}
          style={{ transformOrigin: '44px 40px' }}
        >
          <rect x="43" y="36" width="9" height="20" rx="4" fill="url(#philSkin)" />
        </motion.g>

        {/* Head */}
        <circle cx="32" cy="22" r="14" fill="url(#philSkin)" stroke="#c99060" strokeWidth="1" />
        <ellipse cx="32" cy="16" rx="13" ry="8" fill="#3a2a1a" />
        <circle cx="27" cy="22" r="1.6" fill="#1a1410" />
        <circle cx="37" cy="22" r="1.6" fill="#1a1410" />
        <path d="M28 28 Q32 31 36 28" fill="none" stroke="#b07040" strokeWidth="1.3" strokeLinecap="round" />
        {/* Legendary sparkle */}
        <circle cx="42" cy="12" r="2" fill="#f5d76e" opacity="0.85" />
      </motion.svg>
    </div>
  )
}
