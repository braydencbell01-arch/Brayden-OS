import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CHARACTERS } from './characters'
import { CharacterModel } from './characters/CharacterModel'

const BOOT_SEEN_KEY = 'philroyale.bootSeen.v1'
/** Loading splash always stays up at least this long (can run longer while assets load). */
const LOADING_MIN_MS = 3000

type CollageSlot = {
  id: string
  left: string
  bottom: string
  scale: number
  z: number
  facing: number
  w: string
}

/**
 * CR-style loading collage — every card, battlefield sprites only (no blue portrait boxes).
 * Packed to fill the screen; overlap + z-index for depth.
 */
function buildCollage(): CollageSlot[] {
  const ids = CHARACTERS.map((c) => c.id)
  // Prefer a lively front row of signature units, then pack the rest.
  const priority = [
    'phil',
    'kathie',
    'evilPhil',
    'berry',
    'tristan',
    'hamburgerChicken',
    'bigMable',
    'chickenBarrel',
    'stevesDiner',
    'lynne',
    'jeremy',
    'pete',
  ]
  const ordered = [
    ...priority.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !priority.includes(id)),
  ]
  const cols = 7
  const rows = Math.ceil(ordered.length / cols)
  return ordered.map((id, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    // Stagger columns so the cloud feels packed, not a rigid grid.
    const stagger = (row % 2 === 0 ? 0 : 0.42) + ((i * 17) % 7) * 0.015
    const leftPct = -8 + (col + stagger) * (116 / Math.max(1, cols - 0.2))
    const bottomPct = -4 + row * (88 / Math.max(1, rows - 1))
    const front = row <= 1
    const scale = front ? 1.02 + (i % 4) * 0.05 : 0.78 + (i % 5) * 0.04
    const w = front ? 26 + (i % 4) * 2 : 20 + (i % 4) * 2
    return {
      id,
      left: `${leftPct}%`,
      bottom: `${bottomPct}%`,
      scale,
      z: front ? 12 + (cols - col) + row : 2 + row * 2 + (col % 3),
      facing: col % 2 === 0 ? 1 : -1,
      w: `${w}%`,
    }
  })
}

const COLLAGE = buildCollage()

const TIPS = [
  'Two Kings enter. One King leaves!',
  'Place troops behind the bridge for a stronger push.',
  'Climb the Trophy Road to unlock new cards.',
  'Build five decks — they save automatically.',
  'Touchdown is a party mode — invite a friend (no trophies).',
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

function charAssetUrls(charId: string): string[] {
  const base = import.meta.env.BASE_URL || './'
  const root = base.endsWith('/') ? base : `${base}/`
  const fileBase =
    charId === 'stevesDiner'
      ? 'steves-diner'
      : charId === 'bigMable'
        ? 'big-mable'
        : charId === 'evilPhil'
          ? 'evil-phil'
          : charId === 'dogHut'
            ? 'dog-hut'
            : charId === 'philsCar'
              ? 'phils-car'
              : charId === 'iceCream'
                ? 'ice-cream'
                : charId === 'footballHuck'
                  ? 'baseball'
                  : charId === 'bobbySpecial'
                    ? 'bobby-special'
                    : charId === 'hamburgerChicken'
                      ? 'hamburger-chicken'
                      : charId === 'chickenArmy'
                        ? 'chicken'
                        : charId === 'chickenBarrel'
                          ? 'chicken'
                          : charId === 'philSpirit'
                            ? 'phil-spirit'
                            : charId === 'peteSpirit'
                              ? 'pete-spirit'
                              : charId === 'jeremySpirit'
                                ? 'jeremy-spirit'
                                : charId.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
  return [
    `${root}characters/${fileBase}-troop.png`,
    `${root}characters/${fileBase}-card.png`,
  ]
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

async function preloadBootAssets(
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const urls = Array.from(
    new Set(COLLAGE.flatMap((slot) => charAssetUrls(slot.id))),
  )
  if (urls.length === 0) {
    onProgress?.(1)
    return
  }
  let done = 0
  await Promise.all(
    urls.map(async (url) => {
      await preloadImage(url)
      done += 1
      onProgress?.(done / urls.length)
    }),
  )
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
  const [progress, setProgress] = useState(0)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]!)

  useEffect(() => {
    if (phase !== 'supercell') return
    const t = window.setTimeout(() => setPhase('loading'), 3000)
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'loading') return
    let cancelled = false
    let raf = 0
    const start = performance.now()
    let assetRatio = 0
    let assetsDone = false

    void preloadBootAssets((ratio) => {
      assetRatio = ratio
    }).then(() => {
      if (!cancelled) {
        assetRatio = 1
        assetsDone = true
      }
    })

    const tick = (now: number) => {
      if (cancelled) return
      const elapsed = now - start
      const timeRatio = Math.min(1, elapsed / LOADING_MIN_MS)
      // Bar tracks the slower of min-time vs asset preload; never finishes early.
      const combined = Math.min(timeRatio, assetsDone ? 1 : Math.min(0.94, assetRatio * 0.94 + 0.02))
      setProgress(Math.round(combined * 100))
      if (elapsed >= LOADING_MIN_MS && assetsDone) {
        setProgress(100)
        markBootSeen()
        setPhase('done')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [phase])

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
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-8 h-24 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse 40% 60% at 20% 50%, #fff8, transparent), radial-gradient(ellipse 35% 50% at 75% 40%, #fff6, transparent)',
            }}
          />

          <div className="relative flex min-h-0 flex-1 flex-col items-center px-2 pt-8 sm:pt-10">
            <div className="relative z-20 shrink-0 text-center">
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

            <div className="relative mt-0 w-full max-w-xl flex-1 min-h-[min(68vh,560px)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-36"
                style={{
                  background:
                    'radial-gradient(ellipse 80% 90% at 50% 100%, #3dff7a88 0%, #1a6a3088 35%, transparent 70%)',
                }}
              />
              {COLLAGE.map((slot, i) => (
                <motion.div
                  key={`${slot.id}-${i}`}
                  className="absolute overflow-visible"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.012 * i }}
                  style={{
                    left: slot.left,
                    bottom: slot.bottom,
                    width: slot.w,
                    height: '42%',
                    zIndex: slot.z,
                    transform: `scale(${slot.scale})`,
                    transformOrigin: 'bottom center',
                    // Soft ground shadow only — never a rectangular card plate
                    filter: 'drop-shadow(0 8px 10px #00000088)',
                  }}
                >
                  {/* Battlefield sprites only — transparent cutouts, no blue portrait boxes */}
                  <CharacterModel
                    charId={slot.id}
                    anim="idle"
                    facing={slot.facing}
                    portrait={false}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-30 shrink-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
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
