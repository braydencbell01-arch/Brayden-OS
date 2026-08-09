import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'

const FINLEY_SRC = `${import.meta.env.BASE_URL}characters/finley-card.png`

type Props = {
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  enraged?: boolean
}

/**
 * Finley — black dog with gold chain (CR toy look).
 * Dog gait + swaying chain; rage = purple snarl/claw; attack = vicious bite.
 */
export function FinleyModel({ anim, facing, portrait, enraged }: Props) {
  const flip = Math.cos(facing) < -0.15 ? -1 : 1
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const run = walking || (enraged && !attacking)

  if (portrait) {
    return (
      <img
        src={FINLEY_SRC}
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

      <motion.div
        className="absolute inset-0"
        animate={
          attacking
            ? { x: [0, 10, 14, 0], y: [0, -6, 2, 0], rotate: [0, -6, 8, 0], scale: [1, 1.08, 1.12, 1] }
            : run
              ? {
                  y: [0, -5, 0, -4, 0],
                  rotate: [0, 4, 0, -4, 0],
                  scaleX: [1, 1.04, 1, 0.97, 1],
                  scaleY: [1, 0.96, 1, 1.03, 1],
                }
              : { y: [0, -2, 0] }
        }
        transition={
          attacking
            ? { duration: 0.38, times: [0, 0.25, 0.55, 1] }
            : run
              ? { duration: enraged ? 0.32 : 0.42, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <img
          src={FINLEY_SRC}
          alt=""
          draggable={false}
          aria-hidden
          className="h-full w-full object-contain object-bottom drop-shadow-[1px_3px_4px_rgba(0,0,0,0.55)]"
          style={{
            clipPath: 'inset(4% 10% 8% 10%)',
            filter: enraged
              ? 'hue-rotate(265deg) saturate(1.55) brightness(1.08) contrast(1.1)'
              : undefined,
          }}
        />

        {/* Gold chain sway (reads over the collar) */}
        <motion.svg
          viewBox="0 0 80 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <motion.g
            animate={run ? { rotate: [-12, 14, -12], x: [-1, 2, -1] } : { rotate: [-3, 3, -3] }}
            transition={
              run
                ? { duration: enraged ? 0.28 : 0.4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
            }
            style={{ transformOrigin: '40px 42px' }}
          >
            {[
              [28, 44],
              [34, 46],
              [40, 47],
              [46, 46],
              [52, 44],
            ].map(([cx, cy], i) => (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="4.2"
                ry="3.2"
                fill="#f5d76e"
                stroke="#a87818"
                strokeWidth="0.9"
                opacity="0.95"
              />
            ))}
          </motion.g>
        </motion.svg>

        {enraged ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 45%, #a040ff55 0%, transparent 62%)',
              mixBlendMode: 'screen',
            }}
            aria-hidden
          />
        ) : null}
      </motion.div>

      {/* Vicious bite flash */}
      {attacking ? (
        <motion.div
          className="pointer-events-none absolute left-[58%] top-[48%] h-4 w-5 -translate-x-1/2"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.5, 0.8], x: [0, 8, 12, 4] }}
          transition={{ duration: 0.38 }}
          aria-hidden
        >
          <div className="absolute inset-0 rounded-full bg-[#ff6b6b] opacity-80 blur-[1px]" />
          <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full">
            <path d="M4 10 L8 18 L12 10 L16 18 L20 10" fill="none" stroke="#fff" strokeWidth="2.2" />
          </svg>
        </motion.div>
      ) : null}

      {/* Rage snarl + clawing */}
      {enraged && !attacking ? (
        <>
          <motion.div
            className="pointer-events-none absolute left-[42%] top-[40%] text-[0.7rem] font-black text-[#ffb0ff]"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 0.55, repeat: Infinity }}
            aria-hidden
          >
            ϟ
          </motion.div>
          <motion.div
            className="pointer-events-none absolute left-[62%] top-[58%] h-3 w-4"
            animate={{ rotate: [-25, 35, -25], x: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.28, repeat: Infinity }}
            aria-hidden
          >
            <svg viewBox="0 0 20 16" className="h-full w-full">
              <path d="M2 14 Q6 2 8 12" fill="none" stroke="#e8b0ff" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 14 Q12 1 14 12" fill="none" stroke="#e8b0ff" strokeWidth="2" strokeLinecap="round" />
              <path d="M14 14 Q17 3 19 12" fill="none" stroke="#e8b0ff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>
        </>
      ) : null}
    </div>
  )
}
