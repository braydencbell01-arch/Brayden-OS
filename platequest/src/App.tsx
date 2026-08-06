import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CameraTab } from './CameraTab'
import { HomeTab } from './HomeTab'
import { GamesTab } from './GamesTab'
import { ProfileTab } from './ProfileTab'
import { StatesTab } from './StatesTab'
import type { PlateRead } from './plateOcr'
import { scorePlatesFromLocation, type Place } from './geo'
import { getJurisdiction, JURISDICTIONS } from './jurisdictions'
import { loadGame, logPlate, saveGame } from './roadTripGame'
import { tryCompleteDailyHunt } from './dailyHunt'
import {
  appendSpotHistory,
  clearWantedCode,
  loadWanted,
  recordWantedHit,
  saveWanted,
} from './wanted'

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
const HOME_LOC_KEY = 'platequest.homeLocation'
const HUNT_BONUS_KEY = 'platequest.huntBonus'

function loadHomeLocation(): Place | null {
  try {
    const raw = localStorage.getItem(HOME_LOC_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Place
    if (
      typeof p?.id === 'string' &&
      typeof p?.label === 'string' &&
      typeof p?.lat === 'number' &&
      typeof p?.lon === 'number'
    ) {
      return p
    }
    return null
  } catch {
    return null
  }
}

function plateDisplayName(codeOrName: string): string | null {
  const j = getJurisdiction(codeOrName)
  if (j) return j.name
  const byName = JURISDICTIONS.find(
    (x) => x.name.toLowerCase() === codeOrName.trim().toLowerCase(),
  )
  return byName?.name ?? null
}

/** Drop old OCR serial junk saved as “last plate”. */
function loadLastPlateName(): string | null {
  try {
    const raw = localStorage.getItem(LAST_KEY)
    if (!raw) return null
    return plateDisplayName(raw)
  } catch {
    return null
  }
}

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
  const [huntBonus, setHuntBonus] = useState(() => loadNumber(HUNT_BONUS_KEY))
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
  const [lastPlate, setLastPlate] = useState<string | null>(() => loadLastPlateName())
  const [homeLocation, setHomeLocation] = useState<Place | null>(() => loadHomeLocation())
  const [browseCode, setBrowseCode] = useState<string | null>(null)
  const [wanted, setWanted] = useState<string[]>(() => loadWanted())

  const locationPlatePoints = useMemo(() => {
    if (!homeLocation) return null
    const codes = JURISDICTIONS.filter((j) => j.region === 'us-state').map((j) => j.code)
    return scorePlatesFromLocation(homeLocation, codes)
  }, [homeLocation])

  useEffect(() => {
    try {
      localStorage.setItem(POINTS_KEY, String(points))
      localStorage.setItem(HUNT_BONUS_KEY, String(huntBonus))
      localStorage.setItem(FOUND_KEY, JSON.stringify(foundCodes))
      if (lastPlate) localStorage.setItem(LAST_KEY, lastPlate)
      if (homeLocation) localStorage.setItem(HOME_LOC_KEY, JSON.stringify(homeLocation))
      else localStorage.removeItem(HOME_LOC_KEY)
    } catch {
      /* ignore quota */
    }
  }, [points, huntBonus, foundCodes, lastPlate, homeLocation])

  const totalPoints = points + huntBonus

  function noteCollectionSpot(code: string, source: 'camera' | 'manual') {
    const upper = code.toUpperCase()
    appendSpotHistory(upper, source)
    setFoundCodes((prev) => (prev.includes(upper) ? prev : [...prev, upper]))
    if (wanted.includes(upper)) {
      recordWantedHit(upper)
      const next = clearWantedCode(upper, wanted)
      setWanted(next)
    }
  }

  // Apply camera IDs to collection + active road-trip game even when Games tab is not open.
  useEffect(() => {
    if (!pendingPlateCode) return
    const code = pendingPlateCode
    const hunt = tryCompleteDailyHunt(code)
    const game = loadGame()
    if (!game || game.status !== 'active') {
      noteCollectionSpot(code, 'camera')
      if (hunt.newlyCompleted) setHuntBonus((b) => b + hunt.bonusPoints)
      setPendingPlateCode(null)
      return
    }
    if (game.settings.confirmBeforeLog) {
      const j = getJurisdiction(code)
      const pts = game.platePoints[code]
      const ok = window.confirm(`Log ${j?.name ?? code} for ${pts} points?`)
      if (!ok) {
        if (hunt.newlyCompleted) {
          noteCollectionSpot(code, 'camera')
          setHuntBonus((b) => b + hunt.bonusPoints)
        }
        setPendingPlateCode(null)
        return
      }
    }
    const next = logPlate(game, code)
    setPendingPlateCode(null)
    if (!next) {
      noteCollectionSpot(code, 'camera')
      if (hunt.newlyCompleted) setHuntBonus((b) => b + hunt.bonusPoints)
      return
    }
    saveGame(next)
    setPoints(next.score)
    if (hunt.newlyCompleted) setHuntBonus((b) => b + hunt.bonusPoints)
    noteCollectionSpot(code, 'camera')
    setFoundCodes(next.foundCodes)
    setGameTick((t) => t + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to pending plate
  }, [pendingPlateCode])

  function onIdentified(read: PlateRead) {
    const code = read.guessedState ?? read.jurisdiction?.code
    const j = (code && getJurisdiction(code)) || read.jurisdiction
    if (j) setLastPlate(j.name)
    if (!code || !getJurisdiction(code)) return
    setPendingPlateCode(code.toUpperCase())
  }

  function markFoundManual(code: string) {
    const upper = code.toUpperCase()
    const j = getJurisdiction(upper)
    if (!j) return
    noteCollectionSpot(upper, 'manual')
    setLastPlate(j.name)
    const hunt = tryCompleteDailyHunt(upper)
    if (hunt.newlyCompleted) setHuntBonus((b) => b + hunt.bonusPoints)
    const game = loadGame()
    if (game && game.status === 'active' && upper in game.platePoints) {
      const next = logPlate(game, upper)
      if (next) {
        saveGame(next)
        setPoints(next.score)
        setFoundCodes(next.foundCodes)
        setGameTick((t) => t + 1)
      }
    }
  }

  function onWantedChange(codes: string[]) {
    saveWanted(codes)
    setWanted(codes)
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
              <ProfileTab
                points={totalPoints}
                foundCodes={foundCodes}
                lastPlate={lastPlate}
                homeLocation={homeLocation}
                onHomeLocationChange={setHomeLocation}
                onOpenState={(code) => {
                  setBrowseCode(code)
                  setTab('states')
                }}
                wanted={wanted}
                onWantedChange={onWantedChange}
              />
            )}
            {tab === 'camera' && <CameraTab onIdentified={onIdentified} />}
            {tab === 'home' && (
              <HomeTab
                points={totalPoints}
                foundCodes={foundCodes}
                lastPlate={lastPlate}
                homeLocation={homeLocation}
                onHomeLocationChange={setHomeLocation}
                onOpenCamera={() => setTab('camera')}
                onOpenGames={() => setTab('games')}
                onOpenStates={() => {
                  setBrowseCode(null)
                  setTab('states')
                }}
              />
            )}
            {tab === 'states' && (
              <StatesTab
                key={browseCode ?? 'browse'}
                platePoints={locationPlatePoints}
                homeLocation={homeLocation}
                initialCode={browseCode}
                foundCodes={foundCodes}
                wanted={wanted}
                onWantedChange={onWantedChange}
                onMarkFound={markFoundManual}
              />
            )}
            {tab === 'games' && (
              <GamesTab
                reloadToken={gameTick}
                initialJoinCode={inviteCodeFromUrl}
                onJoinHandled={() => setInviteCodeFromUrl(null)}
                onGameScoreChange={(score, codes) => {
                  setPoints(score)
                  setFoundCodes((prev) => {
                    const merged = new Set([...prev, ...codes])
                    return [...merged]
                  })
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
                onClick={() => {
                  if (t.id === 'states') setBrowseCode(null)
                  setTab(t.id)
                }}
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
