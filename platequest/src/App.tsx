import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CameraTab } from './CameraTab'
import { HomeTab } from './HomeTab'
import { GamesTab } from './GamesTab'
import { ProfileTab } from './ProfileTab'
import { StatesTab } from './StatesTab'
import type { PlateRead } from './plateOcr'
import { getJurisdiction } from './jurisdictions'
import { loadGame, logPlate, saveGame } from './roadTripGame'

type TabId = 'profile' | 'camera' | 'home' | 'states' | 'games'

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'camera', label: 'Camera' },
  { id: 'home', label: 'Home' },
  { id: 'states', label: 'Browse' },
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
  const [tab, setTab] = useState<TabId>(() => {
    try {
      return new URLSearchParams(window.location.search).has('join') ? 'games' : 'home'
    } catch {
      return 'home'
    }
  })
  const [points, setPoints] = useState(() => loadNumber(POINTS_KEY))
  const [foundCodes, setFoundCodes] = useState(() => loadList(FOUND_KEY))
  const [pendingPlateCode, setPendingPlateCode] = useState<string | null>(null)
  const [gameTick, setGameTick] = useState(0)
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('join')
    } catch {
      return null
    }
  })
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

  // Apply camera IDs to the active road-trip game even when Games tab is not open.
  useEffect(() => {
    if (!pendingPlateCode) return
    const game = loadGame()
    if (!game || game.status !== 'active') {
      setPendingPlateCode(null)
      return
    }
    if (game.settings.confirmBeforeLog) {
      const j = getJurisdiction(pendingPlateCode)
      const pts = game.platePoints[pendingPlateCode]
      const ok = window.confirm(`Log ${j?.name ?? pendingPlateCode} for ${pts} points?`)
      if (!ok) {
        setPendingPlateCode(null)
        return
      }
    }
    const next = logPlate(game, pendingPlateCode)
    setPendingPlateCode(null)
    if (!next) return
    saveGame(next)
    setPoints(next.score)
    setFoundCodes(next.foundCodes)
    setGameTick((t) => t + 1)
  }, [pendingPlateCode])

  function onIdentified(read: PlateRead) {
    if (read.text && read.text !== '—') setLastPlate(read.text)
    const code = read.guessedState ?? read.jurisdiction?.code
    if (!code || !getJurisdiction(code)) return
    setPendingPlateCode(code.toUpperCase())
  }

  return (
    <div className="road-bg flex h-full min-h-[100dvh] flex-col text-ink">
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
            {tab === 'profile' && (
              <ProfileTab points={points} foundCodes={foundCodes} lastPlate={lastPlate} />
            )}
            {tab === 'camera' && <CameraTab onIdentified={onIdentified} />}
            {tab === 'home' && (
              <HomeTab
                points={points}
                lastPlate={lastPlate}
                onOpenCamera={() => setTab('camera')}
                onOpenGames={() => setTab('games')}
                onOpenStates={() => setTab('states')}
              />
            )}
            {tab === 'states' && <StatesTab />}
            {tab === 'games' && (
              <GamesTab
                reloadToken={gameTick}
                initialJoinCode={inviteCodeFromUrl}
                onJoinHandled={() => setInviteCodeFromUrl(null)}
                onGameScoreChange={(score, codes) => {
                  setPoints(score)
                  setFoundCodes(codes)
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex flex-col items-center gap-1 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition sm:text-xs ${
                  active ? 'text-plate-hot' : 'text-fog hover:text-ink'
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
