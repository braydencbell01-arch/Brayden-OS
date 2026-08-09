import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { CharacterAnim } from './PhilModel'

type Props = {
  cardSrc: string
  troopSrc: string
  /** Shown when moving “up” the map (away from camera) */
  troopBackSrc?: string
  alt: string
  anim: CharacterAnim
  facing: number
  portrait?: boolean
  objectPos?: string
  enraged?: boolean
  gait?: 'jog' | 'run' | 'dog' | 'limp'
  attack?: 'whip' | 'sundae' | 'shoot' | 'bite' | 'hug' | 'slobber' | 'none'
  /** Pants / fur color for running leg overlays */
  legColor?: string
  shoeColor?: string
}

/**
 * Cards use promo art. Battlefield uses front/back 3D troop sprites + attack overlays.
 * No CSS drop-shadow (that caused a ghost “second troop” while moving).
 */
export function PhotoTroop({
  cardSrc,
  troopSrc,
  troopBackSrc,
  alt,
  anim,
  facing,
  portrait,
  objectPos = '50% 20%',
  enraged,
  gait = 'run',
  attack = 'none',
  legColor = '#2a2a32',
  shoeColor = '#1a1a20',
}: Props) {
  // Hysteresis stops flip/back thrashing when pathing around towers (looked like two directions).
  const flipRef = useRef(1)
  const backRef = useRef(false)
  const cosF = Math.cos(facing)
  const sinF = Math.sin(facing)
  if (cosF < -0.55) flipRef.current = -1
  else if (cosF > 0.55) flipRef.current = 1
  if (troopBackSrc) {
    if (sinF < -0.6) backRef.current = true
    else if (sinF > 0.35) backRef.current = false
  } else {
    backRef.current = false
  }
  const flip = flipRef.current
  const showBack = backRef.current
  const src = showBack && troopBackSrc ? troopBackSrc : troopSrc

  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  const duration =
    gait === 'dog' ? 0.28 : gait === 'limp' ? 0.72 : gait === 'jog' ? 0.36 : 0.4

  if (portrait) {
    return (
      <img
        src={cardSrc}
        alt={alt}
        className="h-full w-full object-cover"
        style={{ objectPosition: objectPos }}
        draggable={false}
      />
    )
  }

  return (
    <div
      className="relative h-full w-full overflow-visible"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      {/* Soft ground blob only — never filter:drop-shadow on the moving sprite */}
      <div
        className="absolute bottom-0 left-1/2 h-[9%] w-[62%] -translate-x-1/2 rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse, #00000066 0%, transparent 70%)' }}
        aria-hidden
      />

      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 100%', willChange: 'transform' }}
        animate={
          attacking
            ? attack === 'whip'
              ? { y: [0, -2, -4, 1, 0], rotate: [0, -8, -14, 16, 0] }
              : attack === 'sundae'
                ? { y: [0, -5, -9, 0], rotate: [0, -5, 6, 0] }
                : attack === 'shoot'
                  ? { y: [0, -2, 0], rotate: [0, -2, 2, 0] }
                  : attack === 'bite'
                    ? { x: [0, 12, 16, 0], y: [0, -5, 2, 0], rotate: [0, -4, 8, 0] }
                    : attack === 'hug'
                      ? { y: [0, -2, 0], scale: [1, 1.04, 1] }
                      : attack === 'slobber'
                        ? { y: [0, -3, -1, 0], rotate: [0, -6, 4, 0], scaleY: [1, 0.96, 1.02, 1] }
                        : { y: [0, -3, 0] }
            : walking
              ? gait === 'limp'
                ? {
                    // Heavy old limp — dip on the bad leg, slow rock
                    y: [0, -2, 0, -5, 0],
                    rotate: [0, 3, 0, -7, 0],
                    x: [0, 1, 0, -2, 0],
                    scaleY: [1, 0.98, 1, 0.94, 1],
                  }
                : {
                    // Running stride: bounce only (no left/right rotate — that looked two-way)
                    y: [0, -6, -1, -7, 0],
                    scaleY: [1, 0.94, 1, 0.93, 1],
                  }
              : { y: [0, -1.5, 0] }
        }
        transition={
          attacking
            ? {
                duration:
                  attack === 'whip' || attack === 'hug'
                    ? 0.72
                    : attack === 'slobber' || attack === 'sundae'
                      ? 0.55
                      : 0.36,
              }
            : walking
              ? { duration, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {/* Upper body sprite; legs clipped so SVG runners show underneath */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: walking || attacking ? 'inset(0 0 18% 0)' : 'inset(0)' }}>
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            aria-hidden
            className="h-full w-full object-contain object-bottom"
            style={{
              filter: enraged
                ? 'hue-rotate(265deg) saturate(1.55) brightness(1.08) contrast(1.1)'
                : undefined,
            }}
          />
        </div>

        {/* Running / stance legs under the clipped sprite */}
        <RunLegs gait={gait} walking={walking} legColor={legColor} shoeColor={shoeColor} />

        {/* Attack props */}
        {attacking && attack === 'shoot' ? <GunOverlay /> : null}
        {attacking && attack === 'whip' ? <WhipOverlay /> : null}
        {attacking && attack === 'sundae' ? <SundaeThrowOverlay /> : null}
        {attacking && attack === 'bite' ? <BiteOverlay enraged={enraged} /> : null}
        {attacking && attack === 'hug' ? <HugOverlay /> : null}
        {attacking && attack === 'slobber' ? <SlobberSpitOverlay /> : null}

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
    </div>
  )
}

function RunLegs({
  gait,
  walking,
  legColor,
  shoeColor,
}: {
  gait: 'jog' | 'run' | 'dog' | 'limp'
  walking: boolean
  legColor: string
  shoeColor: string
}) {
  if (!walking) return null
  const dur = gait === 'dog' ? 0.28 : gait === 'limp' ? 0.72 : gait === 'jog' ? 0.36 : 0.4
  const dog = gait === 'dog'
  const limp = gait === 'limp'
  const color = legColor
  const accent = shoeColor

  if (dog) {
    return (
      <svg viewBox="0 0 80 40" className="absolute bottom-[2%] left-1/2 h-[28%] w-[85%] -translate-x-1/2" aria-hidden>
        {(
          [
            { ox: 22, phase: 0 },
            { ox: 34, phase: 0.5 },
            { ox: 46, phase: 0.25 },
            { ox: 58, phase: 0.75 },
          ] as const
        ).map((leg, i) => (
          <motion.g
            key={i}
            animate={
              walking
                ? { rotate: [18, -22, 18], y: [0, 2, 0] }
                : { rotate: 0 }
            }
            transition={walking ? { duration: dur, repeat: Infinity, ease: 'easeInOut', delay: leg.phase * dur } : undefined}
            style={{ transformOrigin: `${leg.ox}px 8px` }}
          >
            <path
              d={`M${leg.ox - 2} 6 Q${leg.ox} 18 ${leg.ox - 1} 28 L${leg.ox + 4} 28 Q${leg.ox + 3} 16 ${leg.ox + 2} 6 Z`}
              fill={color}
            />
            <ellipse cx={leg.ox + 1} cy={30} rx="4" ry="2.2" fill={accent} />
          </motion.g>
        ))}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 80 48" className="absolute bottom-0 left-1/2 h-[32%] w-[70%] -translate-x-1/2" aria-hidden>
      <motion.g
        animate={
          walking
            ? limp
              ? { rotate: [8, -6, 8, -18, 8], y: [0, 0, 0, 3, 0] }
              : { rotate: [28, -32, 28] }
            : { rotate: 6 }
        }
        transition={walking ? { duration: dur, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{ transformOrigin: '30px 6px' }}
      >
        <path d="M26 4 Q28 22 27 36 L35 36 Q36 20 34 4 Z" fill={color} />
        <ellipse cx="31" cy="38" rx="7" ry="3" fill={accent} />
      </motion.g>
      <motion.g
        animate={
          walking
            ? limp
              ? { rotate: [-6, 10, -6, 22, -6], y: [0, 1, 0, 0, 0] }
              : { rotate: [-32, 28, -32] }
            : { rotate: -6 }
        }
        transition={walking ? { duration: dur, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{ transformOrigin: '46px 6px' }}
      >
        <path d="M42 4 Q44 22 43 36 L51 36 Q52 20 50 4 Z" fill={color} />
        <ellipse cx="47" cy="38" rx="7" ry="3" fill={accent} />
      </motion.g>
    </svg>
  )
}

function HugOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      {/* Giant grab arms grow out and clamp inward */}
      <motion.g
        initial={{ scale: 0.4, opacity: 0.2 }}
        animate={{ scale: [0.5, 1.55, 1.35], opacity: [0.4, 1, 1], x: [0, -6, 2] }}
        transition={{ duration: 0.72, times: [0, 0.45, 1] }}
        style={{ transformOrigin: '18px 56px' }}
      >
        <path
          d="M22 48 Q6 52 2 70 Q4 82 16 78 Q22 66 26 54 Z"
          fill="#e8b888"
          stroke="#a86838"
          strokeWidth="1"
        />
        <path d="M20 50 Q12 48 8 56" fill="none" stroke="#2a3a6a" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="6" cy="74" rx="7" ry="5" fill="#e8b888" stroke="#a86838" strokeWidth="0.8" />
      </motion.g>
      <motion.g
        initial={{ scale: 0.4, opacity: 0.2 }}
        animate={{ scale: [0.5, 1.55, 1.35], opacity: [0.4, 1, 1], x: [0, 6, -2] }}
        transition={{ duration: 0.72, times: [0, 0.45, 1] }}
        style={{ transformOrigin: '62px 56px' }}
      >
        <path
          d="M58 48 Q74 52 78 70 Q76 82 64 78 Q58 66 54 54 Z"
          fill="#e8b888"
          stroke="#a86838"
          strokeWidth="1"
        />
        <path d="M60 50 Q68 48 72 56" fill="none" stroke="#2a3a6a" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="74" cy="74" rx="7" ry="5" fill="#e8b888" stroke="#a86838" strokeWidth="0.8" />
      </motion.g>
      {/* Hearts float up during the hug */}
      {[
        { x: 28, delay: 0 },
        { x: 40, delay: 0.12 },
        { x: 52, delay: 0.22 },
        { x: 34, delay: 0.32 },
      ].map((h, i) => (
        <motion.g
          key={i}
          initial={{ x: h.x, y: 58, opacity: 0, scale: 0.4 }}
          animate={{ y: [58, 28, 8], opacity: [0, 1, 0], scale: [0.4, 1.1, 0.8] }}
          transition={{ duration: 0.7, delay: h.delay, ease: 'easeOut' }}
        >
          <path
            d="M0 3 C0 0 4 0 5 3 C6 0 10 0 10 3 C10 6 5 10 5 10 C5 10 0 6 0 3 Z"
            fill="#ff4d6d"
            stroke="#c9184a"
            strokeWidth="0.5"
          />
        </motion.g>
      ))}
    </svg>
  )
}

function GunOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {/* Dual pistols raised */}
      <motion.g
        initial={{ rotate: 20, y: 8 }}
        animate={{ rotate: [-8, -12, -8], y: [0, -1, 0] }}
        transition={{ duration: 0.35 }}
        style={{ transformOrigin: '22px 52px' }}
      >
        <rect x="8" y="48" width="16" height="5" rx="1.2" fill="#2a2a30" stroke="#0a0a0c" strokeWidth="0.6" />
        <rect x="20" y="46" width="10" height="4" rx="1" fill="#4a4a52" />
        <rect x="6" y="52" width="5" height="8" rx="1" fill="#1a1a20" />
        <motion.circle
          cx="32"
          cy="48"
          r="3"
          fill="#ffe08a"
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.2] }}
          transition={{ duration: 0.28, times: [0, 0.2, 1] }}
        />
      </motion.g>
      <motion.g
        initial={{ rotate: -20, y: 8 }}
        animate={{ rotate: [8, 12, 8], y: [0, -1, 0] }}
        transition={{ duration: 0.35, delay: 0.12 }}
        style={{ transformOrigin: '58px 52px' }}
      >
        <rect x="56" y="48" width="16" height="5" rx="1.2" fill="#2a2a30" stroke="#0a0a0c" strokeWidth="0.6" />
        <rect x="50" y="46" width="10" height="4" rx="1" fill="#4a4a52" />
        <rect x="69" y="52" width="5" height="8" rx="1" fill="#1a1a20" />
        <motion.circle
          cx="48"
          cy="48"
          r="3"
          fill="#ffe08a"
          animate={{ opacity: [0, 0, 1, 0], scale: [0.4, 0.4, 1.3, 0.2] }}
          transition={{ duration: 0.4, times: [0, 0.35, 0.5, 1] }}
        />
      </motion.g>
    </svg>
  )
}

function WhipOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <motion.g
        initial={{ rotate: -40 }}
        animate={{ rotate: [-50, -60, 55, 20] }}
        transition={{ duration: 0.72, times: [0, 0.35, 0.55, 1] }}
        style={{ transformOrigin: '48px 50px' }}
      >
        <path
          d="M48 50 Q70 40 78 22"
          fill="none"
          stroke="#6a3a18"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M48 50 Q70 40 78 22"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />
        <circle cx="78" cy="20" r="2.2" fill="#8a2018" />
      </motion.g>
      {/* Grip hand cue */}
      <circle cx="48" cy="52" r="4" fill="#e8b888" stroke="#a86838" strokeWidth="0.6" />
    </svg>
  )
}

function SundaeThrowOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <motion.g
        initial={{ x: 0, y: 0, opacity: 1 }}
        animate={{ x: [0, 6, 28], y: [0, -18, -40], opacity: [1, 1, 0], rotate: [0, -20, -40] }}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: '54px 44px' }}
      >
        <ellipse cx="54" cy="52" rx="5" ry="4" fill="#fff6e8" stroke="#d0c4a8" strokeWidth="0.6" />
        <circle cx="54" cy="46" r="4.5" fill="#fffaf0" />
        <circle cx="54" cy="42" r="2" fill="#d62828" />
      </motion.g>
      <motion.g
        animate={{ rotate: [-10, -50, -10] }}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: '42px 48px' }}
      >
        <path d="M40 46 Q34 54 36 64 L44 64 Q44 52 46 46 Z" fill="#e8b888" />
      </motion.g>
    </svg>
  )
}

function BiteOverlay({ enraged }: { enraged?: boolean }) {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <motion.g
        animate={{ scaleX: [1, 1.15, 1], scaleY: [1, 0.9, 1] }}
        transition={{ duration: 0.32 }}
        style={{ transformOrigin: '40px 52px' }}
      >
        <motion.path
          d="M28 48 Q40 62 52 48"
          fill="none"
          stroke={enraged ? '#ff60ff' : '#fff'}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0.2 }}
          animate={{ pathLength: [0.2, 1, 0.3] }}
          transition={{ duration: 0.32 }}
        />
        {/* Fangs */}
        <motion.path
          d="M34 50 L32 58 M46 50 L48 58"
          stroke="#fffaf0"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 0.32 }}
        />
      </motion.g>
      {enraged ? (
        <>
          <motion.path
            d="M18 56 L8 50 M18 62 L6 62"
            stroke="#c060ff"
            strokeWidth="2.2"
            strokeLinecap="round"
            animate={{ x: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.32 }}
          />
          <motion.path
            d="M62 56 L72 50 M62 62 L74 62"
            stroke="#c060ff"
            strokeWidth="2.2"
            strokeLinecap="round"
            animate={{ x: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.32 }}
          />
        </>
      ) : null}
    </svg>
  )
}

function SpitOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <motion.g
        initial={{ x: 40, y: 52, scale: 0.3, opacity: 1 }}
        animate={{ x: [40, 58, 78], y: [52, 44, 30], scale: [0.4, 0.9, 1.1], opacity: [1, 1, 0] }}
        transition={{ duration: 0.5 }}
      >
        <ellipse cx="0" cy="0" rx="7" ry="5" fill="#9ccc3a" stroke="#5a8a18" strokeWidth="0.8" />
        <ellipse cx="-2" cy="-1" rx="2" ry="1.5" fill="#d8f090" opacity="0.8" />
      </motion.g>
      {/* Cheek puff */}
      <motion.ellipse
        cx="42"
        cy="52"
        rx="6"
        ry="5"
        fill="#e8b060"
        opacity="0.35"
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  )
}

function SlobberSpitOverlay() {
  return <SpitOverlay />
}
