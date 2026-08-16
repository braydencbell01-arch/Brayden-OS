import { useRef } from 'react'
import { motion } from 'framer-motion'
import { CARD_PORTRAIT_BG } from './cardArt'
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
  portraitFilter?: string
  /** Portrait uses troop cutout (transparent) instead of card art — fixes wrong card backgrounds. */
  portraitSrc?: string
  enraged?: boolean
  gait?: 'jog' | 'run' | 'dog' | 'limp' | 'sprint' | 'blitz' | 'stiff' | 'waddle' | 'flutter'
  attack?:
    | 'whip'
    | 'sundae'
    | 'berryJuice'
    | 'shoot'
    | 'bite'
    | 'hug'
    | 'slobber'
    | 'kick'
    | 'dumbbell'
    | 'headbutt'
    | 'love'
    | 'witchcraft'
    | 'uppercut'
    | 'jump'
    | 'ram'
    | 'poop'
    | 'none'
  /** Persistent hand prop (Michael curls a dumbbell until he throws it). */
  carry?: 'dumbbell' | 'none'
  /**
   * When true, keep the full troop sprite legs (no SVG runner overlays).
   * Use for photo troops whose art already includes feet — overlay shoes looked like ankle weights.
   */
  spriteLegs?: boolean
  /** Pants / fur color for running leg overlays */
  legColor?: string
  shoeColor?: string
  /** Troop art already has pistols — show muzzle flashes only (no SVG guns). */
  gunsInSprite?: boolean
  /** Extra zoom on card portrait (humans ~1.28; dogs/spells leave default). */
  portraitScale?: number
  /** Extra zoom on battlefield troop sprite. */
  troopScale?: number
}

/**
 * Cards and battlefield share the same character art.
 * Portrait shows promo card (blue studio). Battlefield shows transparent
 * troop cutouts derived from that same card so style/pose/identity match.
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
  portraitFilter,
  portraitSrc,
  objectPos: _objectPos = '50% 20%',
  enraged,
  gait = 'run',
  attack = 'none',
  carry = 'none',
  spriteLegs = true,
  legColor = '#2a2a32',
  shoeColor = '#1a1a20',
  gunsInSprite = false,
  portraitScale = 1.26,
  troopScale = 1.18,
}: Props) {
  // Face the way the unit is moving — snap flip; back only when clearly marching up.
  const cosF = Math.cos(facing)
  const sinF = Math.sin(facing)
  const flipRaw = cosF < 0 ? -1 : 1
  // Distinct back art only; avoid thrashing when pathing (same cutout + flip = glitch).
  const showBackRaw = Boolean(troopBackSrc && troopBackSrc !== troopSrc && sinF < -0.45)
  const walking = anim === 'walk'
  const attacking = anim === 'attack'
  // Freeze facing/back while attacking so shoot/kick don't flip or remount mid-anim.
  const frozenFlip = useRef(flipRaw)
  const frozenBack = useRef(showBackRaw)
  if (!attacking) {
    frozenFlip.current = flipRaw
    frozenBack.current = showBackRaw
  }
  const flip = attacking ? frozenFlip.current : flipRaw
  const showBack = attacking ? frozenBack.current : showBackRaw
  const src = showBack && troopBackSrc ? troopBackSrc : troopSrc

  // Slow CR-readable cadence — near Jacobson (stiff) / Chuck (limp), sometimes slower.
  const duration = gaitWalkDuration(gait)

  if (portrait) {
    // Full-bleed card art — cover + slight zoom so the blue well never shows.
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ background: CARD_PORTRAIT_BG }}
      >
        <img
          src={portraitSrc ?? cardSrc ?? troopSrc}
          alt={alt}
          className="h-full w-full object-cover"
          style={{
            objectPosition: _objectPos,
            transform: `scale(${portraitScale})`,
            transformOrigin: '50% 45%',
            filter: portraitFilter ?? 'brightness(1.05) saturate(1.08)',
          }}
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full overflow-visible"
      style={{ transform: `scaleX(${flip})`, transformOrigin: '50% 100%' }}
    >
      {/* Soft ground blob only — never filter:drop-shadow on the moving sprite */}
      <div
        className="absolute bottom-0 left-1/2 h-[11%] w-[68%] -translate-x-1/2 rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse, #00000077 0%, #00000033 45%, transparent 72%)',
          transform: walking ? 'scaleX(1.08)' : 'scaleX(1)',
        }}
        aria-hidden
      />
      {walking ? (
        <div
          className="pointer-events-none absolute bottom-[2%] left-1/2 h-[18%] w-[90%] -translate-x-1/2"
          aria-hidden
        >
          <div
            className="absolute inset-0 animate-pulse rounded-[50%] opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 30% 70%, #c4a57455 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, #b8956a44 0%, transparent 50%)',
            }}
          />
        </div>
      ) : null}

      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 100%', willChange: 'transform' }}
        animate={
          attacking
            ? attack === 'whip'
              ? {
                  // Wind-up → crack whip forward
                  y: [0, 2, -6, -2, 0],
                  x: [0, -4, 14, 8, 0],
                  rotate: [0, -18, 28, 10, 0],
                  scale: [1, 0.96, 1.08, 1.02, 1],
                }
              : attack === 'sundae'
                ? {
                    y: [0, -4, -12, -6, 0],
                    x: [0, -2, 8, 4, 0],
                    rotate: [0, -12, 8, 4, 0],
                    scale: [1, 0.98, 1.06, 1, 1],
                  }
                : attack === 'berryJuice'
                  ? {
                      // Gather juice in hands → grow → fling
                      y: [0, 4, 2, -6, 0],
                      x: [0, -2, -1, 10, 0],
                      rotate: [0, -6, -4, 14, 0],
                      scaleY: [1, 0.94, 0.96, 1.06, 1],
                      scaleX: [1, 1.04, 1.02, 0.98, 1],
                    }
                : attack === 'shoot'
                  ? {
                      // Subtle recoil only — no scale (scale fought scaleX flip and glitched).
                      y: [0, -1, 0, -1, 0],
                      x: [0, -2, 1, -1, 0],
                      rotate: [0, -2, 1, -1, 0],
                    }
                  : attack === 'bite'
                    ? {
                        x: [0, -2, 18, 10, 0],
                        y: [0, 3, -6, 1, 0],
                        rotate: [0, -6, 14, 4, 0],
                        scale: [1, 0.94, 1.12, 1.04, 1],
                      }
                    : attack === 'hug'
                      ? {
                          y: [0, 2, -4, 0],
                          x: [0, -2, 10, 0],
                          scale: [1, 0.95, 1.14, 1],
                          rotate: [0, -4, 6, 0],
                        }
                      : attack === 'slobber'
                        ? {
                            y: [0, 3, -5, -1, 0],
                            x: [0, -3, 6, 2, 0],
                            rotate: [0, -10, 8, 2, 0],
                            scaleY: [1, 0.92, 1.06, 1.02, 1],
                          }
                        : attack === 'kick'
                          ? {
                              // Crouch → launch → flying kick → land
                              y: [0, 6, -28, -18, 0],
                              x: [0, -2, 16, 22, 0],
                              rotate: [0, -12, -32, 18, 0],
                              scaleY: [1, 0.88, 1.12, 1.04, 1],
                            }
                          : attack === 'dumbbell'
                            ? {
                                y: [0, 2, -14, -4, 0],
                                x: [0, -3, 10, 4, 0],
                                rotate: [0, -8, -16, 12, 0],
                                scaleY: [1, 0.94, 1.08, 1, 1],
                              }
                            : attack === 'headbutt'
                              ? {
                                  y: [0, 4, -4, 2, 0],
                                  x: [0, -4, 18, 10, 0],
                                  rotate: [0, 12, 28, 8, 0],
                                  scaleY: [1, 0.92, 1.1, 1, 1],
                                }
                            : attack === 'ram'
                              ? {
                                  // Cock horns back → slam head-on into the building
                                  y: [0, 5, -3, 6, 0],
                                  x: [0, -12, 24, 16, 0],
                                  rotate: [0, -26, 22, 10, 0],
                                  scaleY: [1, 0.88, 1.14, 1.04, 1],
                                  scaleX: [1, 1.08, 0.9, 1, 1],
                                }
                              : attack === 'poop'
                                ? {
                                    // Crouch → dump → spin/turn → scoop → throw
                                    y: [0, 10, 12, 8, 4, -2, 0],
                                    x: [0, 0, 0, -2, 4, 10, 0],
                                    rotate: [0, 4, 6, 170, 185, 12, 0],
                                    scaleY: [1, 0.72, 0.68, 0.9, 0.95, 1.08, 1],
                                    scaleX: [1, 1.06, 1.08, 0.92, 0.95, 1.04, 1],
                                  }
                              : attack === 'witchcraft'
                                ? {
                                    y: [0, -2, -6, -2, 0],
                                    x: [0, -4, 8, 4, 0],
                                    rotate: [0, -14, 10, 4, 0],
                                    scale: [1, 0.97, 1.05, 1, 1],
                                  }
                                : attack === 'uppercut'
                                  ? {
                                      y: [0, 8, -10, -4, 0],
                                      x: [0, -2, 12, 6, 0],
                                      rotate: [0, 8, -18, -6, 0],
                                      scaleY: [1, 0.9, 1.12, 1.02, 1],
                                    }
                                  : attack === 'jump'
                                    ? {
                                        // Hop squash → peak → dive smash (world pos also arcs)
                                        y: [0, 8, -28, -6, 4],
                                        x: [0, -2, 6, 4, 2],
                                        rotate: [0, -12, 8, 18, 4],
                                        scale: [1, 0.9, 1.2, 1.05, 0.4],
                                        opacity: [1, 1, 1, 1, 0],
                                      }
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
                : gait === 'blitz'
                  ? {
                      // Dash bounce — slower cadence, modest hop
                      y: [0, -4, 0, -4.5, 0],
                      scaleY: [1, 0.94, 1, 0.93, 1],
                      x: [0, 0.4, 0, -0.4, 0],
                    }
                  : gait === 'sprint'
                    ? {
                        // Steady sprint bounce — bigger stride, slow cadence
                        y: [0, -5, -1, -5.5, 0],
                        scaleY: [1, 0.94, 1, 0.93, 1],
                        x: [0, 0.8, 0, -0.8, 0],
                      }
                    : gait === 'stiff'
                      ? {
                          // Rigid gym-bro march — almost no bounce
                          y: [0, -1.5, 0, -1.5, 0],
                          rotate: [0, 1, 0, -1, 0],
                          scaleY: [1, 0.995, 1, 0.995, 1],
                        }
                    : gait === 'waddle'
                      ? {
                          // Penguin waddle — heavy side-to-side rock
                          y: [0, -2, 0, -2, 0],
                          rotate: [0, 11, 0, -11, 0],
                          x: [0, 3, 0, -3, 0],
                          scaleY: [1, 0.96, 1, 0.96, 1],
                        }
                    : gait === 'flutter'
                      ? {
                          // Hovering flap — bob in the air, little wing-rock
                          y: [0, -9, -3, -11, 0],
                          rotate: [0, 8, -6, 7, 0],
                          x: [0, 1.5, 0, -1.5, 0],
                          scaleY: [1, 0.94, 1.06, 0.95, 1],
                        }
                      : {
                          // Running stride: bounce only (no left/right rotate — that looked two-way)
                          y: [0, -6, -1, -7, 0],
                          scaleY: [1, 0.94, 1, 0.93, 1],
                        }
              : gait === 'flutter'
                ? {
                    y: [0, -6, -2, -7, 0],
                    rotate: [0, 5, -4, 4, 0],
                    scaleY: [1, 0.96, 1.03, 0.97, 1],
                  }
                : { y: [0, -1.5, 0] }
        }
        transition={
          attacking
            ? {
                duration:
                  attack === 'kick'
                    ? 0.65
                    : attack === 'dumbbell'
                      ? 0.55
                      : attack === 'ram'
                        ? 0.52
                      : attack === 'poop'
                        ? 3.4
                      : attack === 'headbutt'
                        ? 0.4
                        : attack === 'whip' || attack === 'hug'
                          ? 0.72
                          : attack === 'slobber' || attack === 'sundae' || attack === 'berryJuice'
                            ? 0.9
                            : attack === 'jump'
                              ? 0.48
                            : 0.36,
                times:
                  attack === 'kick' ||
                  attack === 'dumbbell' ||
                  attack === 'headbutt' ||
                  attack === 'ram'
                    ? [0, 0.18, 0.42, 0.72, 1]
                    : attack === 'poop'
                      ? [0, 0.14, 0.28, 0.48, 0.62, 0.82, 1]
                    : attack === 'berryJuice'
                      ? [0, 0.2, 0.45, 0.72, 1]
                    : attack === 'jump'
                      ? [0, 0.12, 0.42, 0.72, 1]
                    : undefined,
              }
            : walking
              ? { duration, repeat: Infinity, ease: 'easeInOut' }
              : gait === 'flutter'
                ? { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {/* Full-body photo troops keep real legs; others clip for SVG runners underneath */}
        <div
          className="absolute inset-[-6%_-2%_0]"
          style={{
            clipPath:
              spriteLegs || !(walking || attacking) ? undefined : 'inset(0 0 18% 0)',
            overflow: spriteLegs || !(walking || attacking) ? 'visible' : 'hidden',
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            aria-hidden
            className="h-full w-full object-contain object-bottom"
            style={{
              objectPosition: '50% 100%',
              transform: `scale(${troopScale})`,
              transformOrigin: '50% 100%',
              mixBlendMode: 'normal',
              filter: enraged
                ? 'hue-rotate(265deg) saturate(1.55) brightness(1.08) contrast(1.1)'
                : undefined,
            }}
          />
        </div>

        {!spriteLegs ? (
          <RunLegs gait={gait} walking={walking} legColor={legColor} shoeColor={shoeColor} />
        ) : null}

        {/* Attack props */}
        {attacking && attack === 'shoot' ? (
          <GunOverlay muzzleOnly={gunsInSprite} />
        ) : null}
        {attacking && attack === 'whip' ? <WhipOverlay /> : null}
        {attacking && attack === 'sundae' ? <SundaeThrowOverlay /> : null}
        {attacking && attack === 'berryJuice' ? <BerryJuiceChargeOverlay /> : null}
        {attacking && attack === 'bite' ? <BiteOverlay enraged={enraged} /> : null}
        {attacking && attack === 'hug' ? <HugOverlay /> : null}
        {attacking && attack === 'slobber' ? <SlobberSpitOverlay /> : null}
        {attacking && attack === 'kick' ? <FlyingKickOverlay /> : null}
        {attacking && attack === 'dumbbell' ? <DumbbellHuckOverlay /> : null}
        {attacking && attack === 'headbutt' ? <HeadButtOverlay /> : null}
        {attacking && attack === 'ram' ? <RamOverlay /> : null}
        {attacking && attack === 'love' ? <LoveOverlay /> : null}
        {attacking && attack === 'witchcraft' ? <WitchcraftOverlay /> : null}
        {attacking && attack === 'uppercut' ? <UppercutOverlay /> : null}
        {attacking && attack === 'jump' ? <JumpOverlay /> : null}
        {attacking && attack === 'poop' ? <ShortTemperOverlay /> : null}
        {!attacking && carry === 'dumbbell' ? <DumbbellCurlOverlay walking={walking} /> : null}

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

function gaitWalkDuration(
  gait: 'jog' | 'run' | 'dog' | 'limp' | 'sprint' | 'blitz' | 'stiff' | 'waddle' | 'flutter',
): number {
  // Seconds per leg cycle. Tuned to Jacobson/Chuck (or slower) — no frantic spinning legs.
  switch (gait) {
    case 'blitz':
      return 0.62
    case 'sprint':
      return 0.72
    case 'dog':
      return 0.7
    case 'jog':
    case 'run':
      return 0.82
    case 'flutter':
      return 0.78
    case 'waddle':
      return 0.95
    case 'stiff':
      return 0.95
    case 'limp':
      return 1.15
    default:
      return 0.85
  }
}

function RunLegs({
  gait,
  walking,
  legColor,
  shoeColor,
}: {
  gait: 'jog' | 'run' | 'dog' | 'limp' | 'sprint' | 'blitz' | 'stiff' | 'waddle' | 'flutter'
  walking: boolean
  legColor: string
  shoeColor: string
}) {
  if (!walking) return null
  const dur = gaitWalkDuration(gait)
  const dog = gait === 'dog'
  const limp = gait === 'limp'
  const sprint = gait === 'sprint'
  const blitz = gait === 'blitz'
  const stiff = gait === 'stiff'
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
                ? { rotate: [14, -16, 14], y: [0, 1.5, 0] }
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
              : blitz
                ? { rotate: [28, -30, 28] }
                : sprint
                  ? { rotate: [24, -26, 24] }
                  : stiff
                    ? { rotate: [8, -10, 8] }
                    : { rotate: [18, -20, 18] }
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
              : blitz
                ? { rotate: [-30, 28, -30] }
                : sprint
                  ? { rotate: [-26, 24, -26] }
                  : stiff
                    ? { rotate: [-10, 8, -10] }
                    : { rotate: [-20, 18, -20] }
            : { rotate: -6 }
        }
        transition={
          walking
            ? { duration: dur, repeat: Infinity, ease: 'easeInOut', delay: dur * 0.5 }
            : undefined
        }
        style={{ transformOrigin: '50px 6px' }}
      >
        <path d="M46 4 Q48 22 47 36 L55 36 Q56 20 54 4 Z" fill={color} />
        <ellipse cx="51" cy="38" rx="7" ry="3" fill={accent} />
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

function GunOverlay({ muzzleOnly = false }: { muzzleOnly?: boolean }) {
  // Both barrels aim local +X (same way). PhotoTroop scaleX-flips with facing,
  // so after flip they both point at the enemy — not at each other.
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {/* Left-hand pistol — barrel forward */}
      <motion.g
        initial={{ rotate: -6, y: 6 }}
        animate={{ rotate: [-16, -20, -16], y: [0, -1, 0] }}
        transition={{ duration: 0.35 }}
        style={{ transformOrigin: '16px 56px' }}
      >
        {!muzzleOnly ? (
          <>
            <rect x="8" y="52" width="18" height="5" rx="1.2" fill="#2a2a30" stroke="#0a0a0c" strokeWidth="0.6" />
            <rect x="22" y="50.5" width="12" height="4" rx="1" fill="#4a4a52" />
            <rect x="6" y="56" width="5" height="9" rx="1" fill="#1a1a20" />
          </>
        ) : null}
        <motion.circle
          cx="36"
          cy="52.5"
          r="3.2"
          fill="#ffe08a"
          animate={{ opacity: [0, 1, 0], scale: [0.35, 1.35, 0.2] }}
          transition={{ duration: 0.28, times: [0, 0.2, 1] }}
        />
        <motion.circle
          cx="40"
          cy="52"
          r="1.6"
          fill="#fff6c8"
          animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.6, 0.2] }}
          transition={{ duration: 0.28, times: [0, 0.18, 1] }}
        />
      </motion.g>
      {/* Right-hand pistol — same aim direction, staggered second shot */}
      <motion.g
        initial={{ rotate: -4, y: 6 }}
        animate={{ rotate: [-14, -18, -14], y: [0, -1, 0] }}
        transition={{ duration: 0.35, delay: 0.12 }}
        style={{ transformOrigin: '44px 56px' }}
      >
        {!muzzleOnly ? (
          <>
            <rect x="36" y="52" width="18" height="5" rx="1.2" fill="#2a2a30" stroke="#0a0a0c" strokeWidth="0.6" />
            <rect x="50" y="50.5" width="12" height="4" rx="1" fill="#4a4a52" />
            <rect x="34" y="56" width="5" height="9" rx="1" fill="#1a1a20" />
          </>
        ) : null}
        <motion.circle
          cx="64"
          cy="52.5"
          r="3.2"
          fill="#ffe08a"
          animate={{ opacity: [0, 0, 1, 0], scale: [0.35, 0.35, 1.35, 0.2] }}
          transition={{ duration: 0.42, times: [0, 0.32, 0.5, 1] }}
        />
        <motion.circle
          cx="68"
          cy="52"
          r="1.6"
          fill="#fff6c8"
          animate={{ opacity: [0, 0, 0.9, 0], scale: [0.3, 0.3, 1.6, 0.2] }}
          transition={{ duration: 0.42, times: [0, 0.32, 0.48, 1] }}
        />
      </motion.g>
    </svg>
  )
}

function WhipOverlay() {
  return (
    <svg
      viewBox="0 0 80 118"
      className="pointer-events-none absolute inset-[-12%] h-[124%] w-[124%]"
      aria-hidden
    >
      <motion.g
        initial={{ rotate: -50 }}
        animate={{ rotate: [-55, -70, 70, 25] }}
        transition={{ duration: 0.78, times: [0, 0.32, 0.55, 1] }}
        style={{ transformOrigin: '42px 52px' }}
      >
        <path
          d="M42 52 Q62 36 78 14 Q84 8 88 6"
          fill="none"
          stroke="#5a2a10"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M42 52 Q62 36 78 14 Q84 8 88 6"
          fill="none"
          stroke="#f5d76e"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <motion.circle
          cx="90"
          cy="5"
          r="4"
          fill="#ff3b3b"
          animate={{ scale: [0.6, 1.4, 0.8], opacity: [0.5, 1, 0.7] }}
          transition={{ duration: 0.78 }}
        />
        <motion.path
          d="M78 18 Q92 10 98 22"
          fill="none"
          stroke="#ffe08a"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 0], opacity: [0, 0, 1, 0] }}
          transition={{ duration: 0.78, times: [0, 0.4, 0.55, 1] }}
        />
      </motion.g>
      <circle cx="42" cy="54" r="5" fill="#e8b888" stroke="#a86838" strokeWidth="0.8" />
    </svg>
  )
}

/** Faggol Short Temper — dump → scoop → lob (body crouch/spin is on the troop). */
function ShortTemperOverlay() {
  return (
    <svg
      viewBox="0 0 80 118"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      {/* Fresh pile at the heels while crouched */}
      <motion.g
        initial={{ opacity: 0, scale: 0.2, y: 0 }}
        animate={{
          opacity: [0, 0, 1, 1, 1, 0, 0],
          scale: [0.2, 0.2, 1, 1.05, 0.95, 0.4, 0.2],
          x: [0, 0, 0, 0, 6, 28, 40],
          y: [0, 0, 0, -4, -18, -36, -48],
        }}
        transition={{ duration: 3.4, times: [0, 0.14, 0.28, 0.48, 0.62, 0.82, 1] }}
        style={{ transformOrigin: '40px 102px' }}
      >
        <ellipse cx="40" cy="104" rx="7" ry="4.2" fill="#5c3a18" />
        <ellipse cx="37" cy="101" rx="4.2" ry="3.4" fill="#6e4a22" />
        <ellipse cx="44" cy="100" rx="3.6" ry="3" fill="#4a2e12" />
        <ellipse cx="40" cy="98" rx="3.2" ry="2.6" fill="#7a5530" />
      </motion.g>
      {/* Scoop hand swipe toward the pile, then fling */}
      <motion.g
        initial={{ rotate: 20, opacity: 0 }}
        animate={{
          rotate: [20, 20, 20, -8, -40, -70, -20],
          opacity: [0, 0, 0, 1, 1, 0.6, 0],
          x: [0, 0, 0, 2, 8, 18, 10],
          y: [0, 0, 0, 4, -6, -20, -8],
        }}
        transition={{ duration: 3.4, times: [0, 0.14, 0.28, 0.48, 0.62, 0.82, 1] }}
        style={{ transformOrigin: '52px 78px' }}
      >
        <path
          d="M48 72 Q56 78 58 90 L52 92 Q48 82 46 74 Z"
          fill="#e8b888"
          stroke="#c48a5a"
          strokeWidth="0.6"
        />
      </motion.g>
      {/* Steam / stink while dumping */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.85, 0.7, 0.2, 0, 0], y: [0, 0, -2, -8, -14, -18, -18] }}
        transition={{ duration: 3.4, times: [0, 0.14, 0.28, 0.48, 0.62, 0.82, 1] }}
      >
        <path
          d="M36 96 Q34 90 37 86"
          fill="none"
          stroke="#9aaa6a88"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M44 95 Q46 89 43 84"
          fill="none"
          stroke="#9aaa6a66"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </motion.g>
    </svg>
  )
}

/** Berry / Susan — blue juice grows in hands, then lobbed. */
function BerryJuiceChargeOverlay() {
  return (
    <svg
      viewBox="0 0 80 118"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      <motion.g
        initial={{ opacity: 0, scale: 0.15 }}
        animate={{
          opacity: [0, 1, 1, 1, 0],
          scale: [0.15, 0.55, 1.05, 1.15, 0.55],
          x: [0, 0, 0, 14, 36],
          y: [0, 2, -2, -18, -42],
        }}
        transition={{ duration: 0.9, times: [0, 0.2, 0.5, 0.72, 1] }}
        style={{ transformOrigin: '40px 58px' }}
      >
        <ellipse
          cx="40"
          cy="58"
          rx="11"
          ry="9"
          fill="url(#berryJuiceGrad)"
          opacity="0.95"
        />
        <ellipse cx="36" cy="54" rx="3.5" ry="2.8" fill="#e8f8ffcc" />
        <ellipse cx="44" cy="60" rx="2.2" ry="1.8" fill="#80d8ff88" />
      </motion.g>
      {/* Hands cupping the blob */}
      <motion.g
        animate={{
          rotate: [-8, -4, 0, 18, 8],
          y: [2, 1, 0, -8, -2],
        }}
        transition={{ duration: 0.9, times: [0, 0.2, 0.5, 0.72, 1] }}
        style={{ transformOrigin: '34px 62px' }}
      >
        <path
          d="M28 58 Q24 66 28 72 L36 70 Q34 64 34 58 Z"
          fill="#e8b888"
          stroke="#c48a5a"
          strokeWidth="0.5"
        />
      </motion.g>
      <motion.g
        animate={{
          rotate: [8, 4, 0, -12, -6],
          y: [2, 1, 0, -8, -2],
        }}
        transition={{ duration: 0.9, times: [0, 0.2, 0.5, 0.72, 1] }}
        style={{ transformOrigin: '46px 62px' }}
      >
        <path
          d="M52 58 Q56 66 52 72 L44 70 Q46 64 46 58 Z"
          fill="#e8b888"
          stroke="#c48a5a"
          strokeWidth="0.5"
        />
      </motion.g>
      <defs>
        <radialGradient id="berryJuiceGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e8f8ff" />
          <stop offset="35%" stopColor="#60c8ff" />
          <stop offset="75%" stopColor="#1878e0" />
          <stop offset="100%" stopColor="#0a4090" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function SundaeThrowOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <motion.g
        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        animate={{ x: [0, 8, 30], y: [0, -20, -44], opacity: [1, 1, 0], rotate: [0, -25, -50], scale: [1, 1.05, 0.9] }}
        transition={{ duration: 0.55 }}
        style={{ transformOrigin: '54px 48px' }}
      >
        {/* Cone */}
        <path d="M48 58 L60 58 L54 72 Z" fill="#c48a3a" stroke="#8a5a20" strokeWidth="0.6" />
        <path d="M49 59 L59 59 L54 70 Z" fill="#e8b86a" opacity="0.55" />
        {/* Scoops */}
        <ellipse cx="50" cy="54" rx="5.5" ry="4.8" fill="#8b5a2b" />
        <ellipse cx="58" cy="53" rx="5.2" ry="4.6" fill="#ff8aa0" />
        <ellipse cx="54" cy="48" rx="5.8" ry="5" fill="#fffaf0" stroke="#e8dcc0" strokeWidth="0.5" />
        {/* Cherry + stem */}
        <circle cx="54" cy="42" r="2.4" fill="#d62828" />
        <path d="M54 40 Q56 36 58 35" fill="none" stroke="#2e7d32" strokeWidth="1" strokeLinecap="round" />
      </motion.g>
      <motion.g
        animate={{ rotate: [-10, -55, -10] }}
        transition={{ duration: 0.55 }}
        style={{ transformOrigin: '42px 48px' }}
      >
        <path d="M40 46 Q34 54 36 64 L44 64 Q44 52 46 46 Z" fill="#e8b888" />
      </motion.g>
    </svg>
  )
}

function LoveOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <motion.g
        initial={{ scale: 0.2, opacity: 0, y: 8 }}
        animate={{ scale: [0.2, 1.15, 1], opacity: [0, 1, 0.85], y: [8, -2, -18] }}
        transition={{ duration: 0.65 }}
        style={{ transformOrigin: '40px 40px' }}
      >
        <path
          d="M40 58 C40 58 22 46 22 34 C22 28 27 24 32 24 C35.5 24 38 26 40 29 C42 26 44.5 24 48 24 C53 24 58 28 58 34 C58 46 40 58 40 58 Z"
          fill="#e53935"
          stroke="#ffb3c1"
          strokeWidth="1.4"
        />
        <path
          d="M30 30 C32 28.5 35 30 36 33"
          fill="none"
          stroke="#ffe0e6"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </motion.g>
      <motion.circle
        cx="40"
        cy="42"
        r="16"
        fill="none"
        stroke="#ff8a9a66"
        strokeWidth="2"
        initial={{ scale: 0.4, opacity: 0.8 }}
        animate={{ scale: [0.4, 1.4], opacity: [0.7, 0] }}
        transition={{ duration: 0.65 }}
        style={{ transformOrigin: '40px 42px' }}
      />
    </svg>
  )
}

function WitchcraftOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <motion.g
        initial={{ rotate: -20, opacity: 0.4 }}
        animate={{ rotate: [-20, 8, 0], opacity: [0.4, 1, 1] }}
        transition={{ duration: 0.55 }}
        style={{ transformOrigin: '28px 70px' }}
      >
        <rect x="26" y="48" width="4" height="34" rx="1.5" fill="#5a3a18" />
        <circle cx="28" cy="46" r="6" fill="#c060ff" />
        <circle cx="28" cy="46" r="3.5" fill="#f0d0ff" />
      </motion.g>
      <motion.circle
        cx="52"
        cy="36"
        r="8"
        fill="#b040ff"
        initial={{ scale: 0.2, opacity: 0, x: -10 }}
        animate={{ scale: [0.2, 1.2, 0.9], opacity: [0, 1, 0.7], x: [-10, 8, 18] }}
        transition={{ duration: 0.55 }}
      />
      <motion.circle
        cx="52"
        cy="36"
        r="14"
        fill="none"
        stroke="#d080ff88"
        strokeWidth="2"
        initial={{ scale: 0.3, opacity: 0.8 }}
        animate={{ scale: [0.3, 1.3], opacity: [0.8, 0] }}
        transition={{ duration: 0.55 }}
        style={{ transformOrigin: '52px 36px' }}
      />
    </svg>
  )
}

function UppercutOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <motion.g
        initial={{ y: 10, rotate: 20 }}
        animate={{ y: [10, 4, -18, -8], rotate: [20, 8, -35, -10], x: [0, 2, 12, 6] }}
        transition={{ duration: 0.72, ease: 'easeInOut' }}
        style={{ transformOrigin: '48px 70px' }}
      >
        <ellipse cx="54" cy="58" rx="9" ry="11" fill="#e8b888" />
        <path d="M48 66 Q46 78 50 86" stroke="#e8b888" strokeWidth="7" strokeLinecap="round" fill="none" />
      </motion.g>
      <motion.path
        d="M40 78 Q48 60 58 42"
        fill="none"
        stroke="#ffffff66"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1], opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.72 }}
      />
    </svg>
  )
}

function JumpOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {/* Motion streak while diving onto the target */}
      <motion.path
        d="M18 88 Q32 52 48 28"
        fill="none"
        stroke="#9fd0ff"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 0.2], opacity: [0, 0.85, 0] }}
        transition={{ duration: 0.48, times: [0, 0.45, 1] }}
      />
      <motion.circle
        cx="40"
        cy="70"
        r="18"
        fill="#8ec8ff44"
        initial={{ scale: 0.4, opacity: 0.8 }}
        animate={{ scale: [0.4, 1.4, 2.4], opacity: [0.7, 0.4, 0] }}
        transition={{ duration: 0.48 }}
        style={{ transformOrigin: '40px 70px' }}
      />
      <motion.ellipse
        cx="40"
        cy="100"
        rx="18"
        ry="6"
        fill="#00000066"
        initial={{ scaleX: 0.5, opacity: 0.55 }}
        animate={{ scaleX: [0.5, 0.7, 1.35, 0.35], opacity: [0.55, 0.35, 0.45, 0] }}
        transition={{ duration: 0.48, times: [0, 0.35, 0.72, 1] }}
        style={{ transformOrigin: '40px 100px' }}
      />
      {/* Impact flash on land */}
      <motion.circle
        cx="52"
        cy="92"
        r="10"
        fill="#fff8"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 1.6, 0.2], opacity: [0, 0, 0.9, 0] }}
        transition={{ duration: 0.48, times: [0, 0.55, 0.72, 1] }}
        style={{ transformOrigin: '52px 92px' }}
      />
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

function FlyingKickOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      {/* Speed lines on launch */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.65, times: [0, 0.35, 1] }}
      >
        <path d="M8 70 H28" stroke="#fff6e8" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M6 78 H24" stroke="#ffe08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
        <path d="M10 62 H26" stroke="#fff6e8" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      </motion.g>
      {/* Extended kicking leg flash */}
      <motion.g
        initial={{ rotate: 20, opacity: 0 }}
        animate={{ rotate: [-10, -40, 15], opacity: [0, 1, 0.8, 0] }}
        transition={{ duration: 0.65, times: [0, 0.35, 0.7, 1] }}
        style={{ transformOrigin: '42px 72px' }}
      >
        <path d="M40 70 Q58 58 72 48 L76 52 Q60 64 44 76 Z" fill="#2a2a32" />
        <ellipse cx="74" cy="48" rx="6" ry="3.5" fill="#0a0a0c" transform="rotate(-35 74 48)" />
      </motion.g>
      {/* Impact burst at contact */}
      <motion.g
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.4, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 0.65, times: [0, 0.55, 1] }}
        style={{ transformOrigin: '70px 50px' }}
      >
        <circle cx="70" cy="50" r="8" fill="#ffe08a55" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="70"
            y1="50"
            x2={70 + Math.cos((deg * Math.PI) / 180) * 14}
            y2={50 + Math.sin((deg * Math.PI) / 180) * 14}
            stroke="#fff6e8"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        ))}
      </motion.g>
    </svg>
  )
}

function HexDumbbell({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-9" y="-3.5" width="6" height="7" rx="1" fill="#1a1a20" stroke="#0a0a0c" strokeWidth="0.6" />
      <rect x="3" y="-3.5" width="6" height="7" rx="1" fill="#1a1a20" stroke="#0a0a0c" strokeWidth="0.6" />
      <rect x="-4" y="-1.4" width="8" height="2.8" rx="1" fill="#8a8a96" />
      <rect x="-8.2" y="-2.6" width="2" height="5.2" fill="#2e2e36" />
      <rect x="6.2" y="-2.6" width="2" height="5.2" fill="#2e2e36" />
    </g>
  )
}

  /** Continuous curls while Michael walks / idles — new bell after each huck. */
function DumbbellCurlOverlay({ walking }: { walking: boolean }) {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <motion.g
        animate={{ rotate: walking ? [18, -55, 18] : [12, -48, 12] }}
        transition={{
          duration: walking ? 0.55 : 0.85,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ transformOrigin: '54px 58px' }}
      >
        <path d="M52 56 Q58 62 56 78" stroke="#c48a5a" strokeWidth="5" strokeLinecap="round" fill="none" />
        <HexDumbbell x={56} y={82} />
      </motion.g>
    </svg>
  )
}

/** Overhead press then release — projectile takes the bell mid-flight. */
function DumbbellHuckOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <motion.g
        initial={{ rotate: 20, opacity: 1 }}
        animate={{ rotate: [20, -100, -120], y: [0, -18, -28], opacity: [1, 1, 0] }}
        transition={{ duration: 0.55, times: [0, 0.45, 1], ease: 'easeOut' }}
        style={{ transformOrigin: '48px 52px' }}
      >
        <path d="M48 52 Q52 40 50 28" stroke="#c48a5a" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <HexDumbbell x={50} y={24} />
      </motion.g>
      <motion.g
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 1] }}
        transition={{ duration: 0.55, times: [0.35, 0.55, 1] }}
        style={{ transformOrigin: '50px 22px' }}
      >
        <circle cx="50" cy="22" r="7" fill="#ffe08a44" />
      </motion.g>
    </svg>
  )
}

/** Cap/head snap into the opponent. */
function HeadButtOverlay() {
  return (
    <svg viewBox="0 0 80 118" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <motion.g
        initial={{ x: 0, opacity: 0 }}
        animate={{ x: [0, 10, 16, 0], opacity: [0, 0.85, 1, 0] }}
        transition={{ duration: 0.4, times: [0, 0.35, 0.65, 1] }}
      >
        <ellipse cx="58" cy="36" rx="11" ry="9" fill="#7eb6e855" stroke="#cfe8ff" strokeWidth="1.2" />
        <path d="M48 34 H68" stroke="#fff6e8" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </motion.g>
      <motion.g
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.3, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 0.4, times: [0.3, 0.55, 1] }}
        style={{ transformOrigin: '70px 40px' }}
      >
        <circle cx="70" cy="40" r="7" fill="#ffe08a55" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <line
            key={deg}
            x1="70"
            y1="40"
            x2={70 + Math.cos((deg * Math.PI) / 180) * 12}
            y2={40 + Math.sin((deg * Math.PI) / 180) * 12}
            stroke="#fff6e8"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        ))}
      </motion.g>
    </svg>
  )
}

/** Horn ram — cream horns lunge forward into the building. */
function RamOverlay() {
  return (
    <svg
      viewBox="0 0 80 118"
      className="pointer-events-none absolute inset-[-8%] h-[116%] w-[116%] overflow-visible"
      aria-hidden
    >
      <motion.g
        initial={{ x: 0, rotate: -18, opacity: 0 }}
        animate={{ x: [0, -6, 22, 16], rotate: [-18, -28, 12, 4], opacity: [0.4, 1, 1, 0] }}
        transition={{ duration: 0.52, times: [0, 0.22, 0.55, 1], ease: 'easeOut' }}
        style={{ transformOrigin: '40px 42px' }}
      >
        <path d="M36 40 Q28 22 18 14" fill="none" stroke="#e8d4a8" strokeWidth="7" strokeLinecap="round" />
        <path d="M44 40 Q56 20 68 12" fill="none" stroke="#e8d4a8" strokeWidth="7" strokeLinecap="round" />
        <path d="M36 40 Q28 22 18 14" fill="none" stroke="#fff6e8" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M44 40 Q56 20 68 12" fill="none" stroke="#fff6e8" strokeWidth="2.2" strokeLinecap="round" />
      </motion.g>
      <motion.g
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.45, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 0.52, times: [0.28, 0.52, 1] }}
        style={{ transformOrigin: '72px 36px' }}
      >
        <circle cx="72" cy="36" r="8" fill="#ffe08a66" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="72"
            y1="36"
            x2={72 + Math.cos((deg * Math.PI) / 180) * 14}
            y2={36 + Math.sin((deg * Math.PI) / 180) * 14}
            stroke="#fff6e8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </motion.g>
    </svg>
  )
}
