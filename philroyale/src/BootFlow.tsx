import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CHARACTERS } from './characters'

const BOOT_SEEN_KEY = 'philroyale.bootSeen.v1'
/** Loading splash always stays up at least this long (can run longer while assets load). */
const LOADING_MIN_MS = 3000

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
  const base = import.meta.env.BASE_URL || './'
  const root = base.endsWith('/') ? base : `${base}/`
  const urls = Array.from(
    new Set([
      `${root}loading-screen.jpg`,
      `${root}philroyale-logo-512.jpg`,
      ...CHARACTERS.flatMap((c) => charAssetUrls(c.id)),
    ]),
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
    if (shorten) return
    const t = window.setTimeout(() => setPhase('loading'), 3000)
    return () => window.clearTimeout(t)
  }, [shorten])

  useEffect(() => {
    if (phase !== 'loading') return
    let cancelled = false
    const started = performance.now()
    void (async () => {
      await preloadBootAssets((ratio) => {
        if (!cancelled) setProgress(Math.round(ratio * 100))
      })
      const wait = Math.max(0, LOADING_MIN_MS - (performance.now() - started))
      await new Promise((r) => window.setTimeout(r, wait))
      if (cancelled) return
      markBootSeen()
      setPhase('done')
    })()
    return () => {
      cancelled = true
    }
  }, [phase])

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
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#0a1018]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <img
            src={`${import.meta.env.BASE_URL}loading-screen.jpg`}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
            draggable={false}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, #00000066 0%, transparent 22%, transparent 58%, #000000aa 78%, #000000dd 100%)',
            }}
          />

          <div className="relative z-20 flex min-h-0 flex-1 flex-col items-center px-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <img
              src={`${import.meta.env.BASE_URL}philroyale-logo-512.jpg`}
              alt="Phil Royale"
              className="mx-auto h-auto w-[min(58vw,13.5rem)] select-none object-contain"
              style={{
                filter: 'drop-shadow(0 4px 0 #0a204088) drop-shadow(0 10px 22px #000000aa)',
              }}
              draggable={false}
            />
            <h1 className="sr-only">Phil Royale</h1>
          </div>

          <div className="relative z-30 shrink-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
            <p className="mb-2 text-center text-sm font-bold text-white drop-shadow-[0_1px_3px_#000]">
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
