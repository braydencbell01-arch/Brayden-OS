import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CharacterModel } from './characters/CharacterModel'

const BOOT_SEEN_KEY = 'philroyale.bootSeen.v1'

const COLLAGE = [
  'phil',
  'evilPhil',
  'kathie',
  'todd',
  'mike',
  'pete',
  'beans',
  'scott',
] as const

const TIPS = [
  'Place troops behind the bridge for a stronger push.',
  'Chests unlock over time — or open now with gold.',
  'Climb the Trophy Road to unlock new cards.',
  'Build five decks and switch before battle.',
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

export function BootFlow({ children }: { children: ReactNode }) {
  const shorten = hasSeenBoot()
  const [phase, setPhase] = useState<Phase>(shorten ? 'loading' : 'supercell')
  const [progress, setProgress] = useState(shorten ? 55 : 0)
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)]!

  useEffect(() => {
    if (phase !== 'supercell') return
    // ~1.2s fade in, brief hold, 0.8s fade out
    const t = window.setTimeout(() => setPhase('loading'), 2800)
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="select-none text-center"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: '0.18em',
              color: '#ffffff',
              textShadow: '0 2px 0 #000, 0 0 24px #ffffff33',
            }}
          >
            {['SUP', 'ERC', 'ELL'].map((row) => (
              <div
                key={row}
                className="flex justify-center gap-[0.35em] text-[clamp(1.8rem,8vw,3.2rem)] font-black leading-[1.05]"
              >
                {row.split('').map((ch, i) => (
                  <span key={`${row}-${i}`}>{ch}</span>
                ))}
              </div>
            ))}
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
              radial-gradient(ellipse 90% 50% at 50% 15%, #3a6aaa 0%, transparent 55%),
              linear-gradient(180deg, #1a3a62 0%, #0e1c30 45%, #1a100c 100%)
            `,
          }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pt-8">
            <h1
              className="relative z-10 font-[family-name:var(--font-display)] text-[clamp(2rem,10vw,3.4rem)] tracking-wide text-[#f5d76e]"
              style={{ textShadow: '0 4px 0 #8a6a12, 0 10px 28px #00000088' }}
            >
              Phil Royale
            </h1>
            <div className="relative mt-4 h-[min(42vh,280px)] w-full max-w-md">
              {COLLAGE.map((id, i) => {
                const col = i % 4
                const row = Math.floor(i / 4)
                return (
                  <div
                    key={id}
                    className="absolute overflow-hidden rounded-xl"
                    style={{
                      width: '28%',
                      height: '48%',
                      left: `${6 + col * 22}%`,
                      top: `${row * 48 + (col % 2) * 4}%`,
                      transform: `rotate(${(i % 3) * 4 - 4}deg)`,
                      boxShadow: '0 6px 16px #00000088',
                      background: 'linear-gradient(180deg,#4a3018,#1a100c)',
                      zIndex: i,
                    }}
                  >
                    <div className="flex h-full w-full items-end justify-center pb-1">
                      <div className="h-[115%] w-[115%] origin-bottom scale-[1.15]">
                        <CharacterModel charId={id} anim="idle" facing={1} portrait />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative z-10 shrink-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
            <p className="mb-2 text-center text-sm font-bold text-white/85">{tip}</p>
            <div
              className="mx-auto h-5 max-w-md overflow-hidden rounded-full ring-2 ring-[#1a4a8a]"
              style={{
                background: 'linear-gradient(180deg,#0a2040,#061428)',
                boxShadow: 'inset 0 2px 4px #00000088',
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(180deg,#6ec8ff,#2f6fbf 55%,#1d4a86)',
                  boxShadow: 'inset 0 1px 0 #ffffff55',
                }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs font-extrabold tabular-nums text-[#8ec8ff]">
              {progress}%
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
