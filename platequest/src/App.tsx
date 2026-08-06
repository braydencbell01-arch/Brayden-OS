import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CameraTab } from './CameraTab'
import { HomeTab } from './HomeTab'
import { GamesTab } from './GamesTab'
import type { PlateRead } from './plateOcr'
import { getJurisdiction } from './jurisdictions'

type TabId = 'camera' | 'home' | 'games'

const TABS: { id: TabId; label: string }[] = [
  { id: 'camera', label: 'Camera' },
  { id: 'home', label: 'Home' },
  { id: 'games', label: 'Games' },
]

const POINTS_KEY = 'platequest.points'
const FOUND_KEY = 'platequest.found'
const LAST_KEY = 'platequest.lastPlate'

function loadNumber(key: string, fallback = 0): number {
  try {
    const v = localStorage.getItem(key)
    if (v == null) return fallback
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export default function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [points, setPoints] = useState(() => loadNumber(POINTS_KEY))
  const [foundCodes, setFoundCodes] = useState(() => loadList(FOUND_KEY))
  const [lastPlate, setLastPlate] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(POINTS_KEY, String(points))
      localStorage.setItem(FOUND_KEY, JSON.stringify(foundCodes))
      if (lastPlate) localStorage.setItem(LAST_KEY, lastPlate)
    } catch {
      /* ignore quota */
    }
  }, [points, foundCodes, lastPlate])

  function award(code: string, delta: number) {
    setFoundCodes((prev) => (prev.includes(code) ? prev : [...prev, code]))
    setPoints((p) => p + delta)
  }

  function onIdentified(read: PlateRead) {
    if (read.text && read.text !== '—') setLastPlate(read.text)
    const code = read.guessedState ?? read.jurisdiction?.code
    if (!code) return
    if (foundCodes.includes(code)) return
    const j = getJurisdiction(code)
    const delta = j?.rarity === 'very-rare' ? 100 : j?.rarity === 'rare' ? 50 : j?.rarity === 'uncommon' ? 25 : 10
    award(code, delta)
  }

  return (
    <div className="road-bg flex h-full min-h-[100dvh] flex-col text-chrome">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, x: tab === 'camera' ? -20 : tab === 'games' ? 20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'camera' ? -12 : tab === 'games' ? 12 : 0 }}
            transition={{ duration: 0.22 }}
          >
            {tab === 'camera' && <CameraTab onIdentified={onIdentified} />}
            {tab === 'home' && (
              <HomeTab
                points={points}
                lastPlate={lastPlate}
                onOpenCamera={() => setTab('camera')}
                onOpenGames={() => setTab('games')}
              />
            )}
            {tab === 'games' && (
              <GamesTab
                points={points}
                foundCodes={foundCodes}
                onScore={(delta, code) => award(code, delta)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-asphalt/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex flex-col items-center gap-1 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  active ? 'text-plate' : 'text-fog hover:text-chrome'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`h-1 w-8 rounded-full transition ${active ? 'bg-plate' : 'bg-transparent'}`}
                  aria-hidden
                />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
