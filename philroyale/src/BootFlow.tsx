import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CharacterModel } from './characters/CharacterModel'

const BOOT_SEEN_KEY = 'philroyale.bootSeen.v1'

/** Overlapping hero poses for the CR-style loading splash. */
const COLLAGE = [
  { id: 'phil', left: '8%', bottom: '4%', scale: 1.35, z: 3, facing: 1 },
  { id: 'kathie', left: '52%', bottom: '2%', scale: 1.25, z: 4, facing: -1 },
  { id: 'evilPhil', left: '28%', bottom: '18%', scale: 1.55, z: 2, facing: 1 },
  { id: 'todd', left: '68%', bottom: '22%', scale: 1.05, z: 1, facing: -1 },
  { id: 'mike', left: '0%', bottom: '28%', scale: 0.95, z: 1, facing: 1 },
] as const

const TIPS = [
  'Two Kings enter. One King leaves!',
  'Place troops behind the bridge for a stronger push.',
  'Climb the Trophy Road to unlock new cards.',
  'Build five decks — they save automatically.',
  'Touchdown mode uses a fresh draft each match.',
]

type Phase = 'supercell' | 'loading' | 'done'

function hasSeenBoot(): boolean {
  try {
    return sessionStorage.getItem(BOOT_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markBootSeen(): void {
  try {
    sessionStorage.setItem(BOOT_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Exact SUP / ERC / ELL 3×3 slab wordmark (Supercell boot style). */
function SupercellLogo() {
  return (
    <div
      className="select-none"
      aria-label="Supercell"
      style={{
        fontFamily: '"Rockwell", "Roboto Slab", "Courier New", Georgia, serif',
        fontWeight: 900,
        letterSpacing: '0.12em',
        color: '#f4f4f4',
        textShadow:
          '0 1px 0 #fff, 0 2px 0 #bbb, 0 3px 0 #999, 0 6px 14px #000000aa',
        WebkitTextStroke: '0.5px #ddd',
      }}
    >
      {['SUP', 'ERC', 'ELL'].map((row) => (
        <div
          key={row}
          className="flex justify-center"
          style={{
            gap: '0.28em',
            fontSize: 'clamp(2.4rem, 11vw, 4.2rem)',
            lineHeight: 0.92,
            fontStyle: 'normal',
          }}
        >
          {row.split('').map((ch, i) => (
            <span
              key={`${row}-${i}`}
              style={{
                display: 'inline-block',
                transform: 'scaleY(1.08)',
                filter: 'contrast(1.05)',
              }}
            >
              {ch}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export function BootFlow({ children }: { children: ReactNode }) {
  const shorten = hasSeenBoot()
  const [phase, setPhase] = useState<Phase>(shorten ? 'loading' : 'supercell')
  const [progress, setProgress] = useState(shorten ? 55 : 0)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]!)

  useEffect(() => {
    if (phase !== 'supercell') return
    // Fade in ~1s, hold, fade out ~0.9s → then loading
    const t = window.setTimeout(() => setPhase('loading'), 3000)
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'loading') return
    const duration = shorten ? 900 : 2800 + Math.random() * 700
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(Math.round(t * 100))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        markBootSeen()
        setPhase('done')
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, shorten])

  if (phase === 'done') return <>{children}</>

  return (
    <AnimatePresence mode="wait">
      {phase === 'supercell' ? (
        <motion.div
          key="sc"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.85, times: [0, 0.28, 0.72, 1], ease: 'easeInOut' }}
          >
            <SupercellLogo />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="load"
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            background: `
              radial-gradient(ellipse 120% 55% at 50% 0%, #5a9ad8 0%, #2a5a92 42%, transparent 70%),
              linear-gradient(180deg, #3a6aaa 0%, #1a3a62 38%, #0e1c30 62%, #1a100c 100%)
            `,
          }}
        >
          {/* Soft clouds */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-8 h-24 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse 40% 60% at 20% 50%, #fff8, transparent), radial-gradient(ellipse 35% 50% at 75% 40%, #fff6, transparent)',
            }}
          />

          <div className="relative flex min-h-0 flex-1 flex-col items-center px-4 pt-10">
            <div className="relative z-10 text-center">
              <div
                aria-hidden
                className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(180deg,#4a9eff,#1d4a86)',
                  boxShadow: '0 3px 0 #0a2040, inset 0 1px 0 #ffffff55',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#f5d76e" d="M5 18h14l-1.5-9-4 3L12 6l-1.5 6-4-3L5 18z" />
                </svg>
              </div>
              <h1
                className="font-[family-name:var(--font-display)] text-[clamp(2.1rem,11vw,3.6rem)] tracking-wide text-[#f5d76e]"
                style={{ textShadow: '0 4px 0 #8a6a12, 0 10px 28px #00000088' }}
              >
                Phil Royale
              </h1>
            </div>

            <div className="relative mt-2 h-[min(48vh,340px)] w-full max-w-md flex-1">
              {/* Green mist / portal at bottom like CR splash */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28"
                style={{
                  background:
                    'radial-gradient(ellipse 70% 80% at 50% 100%, #3dff7a88 0%, #1a6a3088 35%, transparent 70%)',
                }}
              />
              {COLLAGE.map((slot) => (
                <div
                  key={slot.id}
                  className="absolute overflow-visible"
                  style={{
                    left: slot.left,
                    bottom: slot.bottom,
                    width: '42%',
                    height: '70%',
                    zIndex: slot.z,
                    transform: `scale(${slot.scale})`,
                    transformOrigin: 'bottom center',
                    filter: 'drop-shadow(0 8px 12px #00000099)',
                  }}
                >
                  <CharacterModel
                    charId={slot.id}
                    anim="idle"
                    facing={slot.facing}
                    portrait
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 shrink-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
            <p className="mb-2 text-center text-sm font-bold text-white drop-shadow">
              {tip}
            </p>
            <div
              className="relative mx-auto h-6 max-w-md overflow-hidden rounded-md ring-2 ring-[#1a4a8a]"
              style={{
                background: 'linear-gradient(180deg,#0a2040,#061428)',
                boxShadow: 'inset 0 2px 4px #00000088',
              }}
            >
              <motion.div
                className="h-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(180deg,#8ed8ff,#3a8fd4 45%, #1d4a86)',
                  boxShadow: 'inset 0 1px 0 #ffffff66',
                }}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-extrabold tabular-nums text-white drop-shadow">
                {progress}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
