import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BottomNav, type BottomTab } from './components/BottomNav'
import { CalendarStrip } from './components/CalendarStrip'
import { FavoritesScreen } from './components/FavoritesScreen'
import { HomeSearch } from './components/HomeSearch'
import { LeagueProfileScreen } from './components/LeagueProfileScreen'
import { LeagueStatsHubScreen } from './components/LeagueStatsHubScreen'
import { LeaguesScreen } from './components/LeaguesScreen'
import { MatchDayByLeague } from './components/MatchDayByLeague'
import { FantasyScreen } from './components/fantasy/FantasyScreen'
import { SettingsScreen, OnboardingOverlay } from './components/SettingsScreen'
import { StatsScreen } from './components/StatsScreen'
import { useFantasy } from './lib/fantasy/useFantasy'
import {
  PlayerProfileScreen,
  type PlayerNavRef,
} from './components/PlayerProfileScreen'
import { TeamProfileScreen } from './components/TeamProfileScreen'
import { startOfDay, toDateKey } from './lib/dates'
import { useFavorites, type FavoriteTeam, type FavoritesApi } from './lib/favorites'
import { buildHash, parseHash } from './lib/hashRoute'
import { LEAGUES, type LeagueId } from './lib/leagues'
import { dateKeysForFavorites, matchesOnDate, type Match } from './lib/matches'
import { loadSettings, saveSettings } from './lib/settings'
import { useLiveBigFiveMatches } from './lib/stats/useLiveBigFiveMatches'
import { useTodayKey } from './lib/useToday'

type Screen =
  | BottomTab
  | 'league-profile'
  | 'league-stats'
  | 'team'
  | 'player'

function formatUpdatedAt(updatedAt: number | null): string {
  if (!updatedAt) return 'Waiting for first sync'
  return `Updated ${new Date(updatedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })}`
}

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo-mark.svg`}
      alt="BrayStats"
      width={28}
      height={28}
      className={`h-7 w-7 shrink-0 rounded-md ${className}`}
    />
  )
}

function isTabScreen(screen: Screen): screen is BottomTab {
  return (
    screen === 'home' ||
    screen === 'stats' ||
    screen === 'leagues' ||
    screen === 'fantasy' ||
    screen === 'favorites'
  )
}

function HomeScreen({
  selectedDate,
  onSelectDate,
  onJumpToToday,
  onNeedMatchRange,
  knownForwardDays,
  onOpenLeague,
  onOpenTeam,
  onOpenPlayer,
  onOpenSettings,
  matches,
  loading,
  error,
  updatedAt,
  refreshing,
  hasLive,
  onRefresh,
  favorites,
  reduce,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onJumpToToday: () => void
  onNeedMatchRange: (from: Date, to: Date) => void
  knownForwardDays: number
  onOpenLeague: (id: LeagueId) => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  onOpenSettings: () => void
  matches: Match[]
  loading: boolean
  error: string | null
  updatedAt: number | null
  refreshing: boolean
  hasLive: boolean
  onRefresh: () => void
  favorites: FavoritesApi
  reduce: boolean | null
}) {
  const dayMatches = useMemo(() => matchesOnDate(matches, selectedDate), [matches, selectedDate])
  const favoriteDateKeys = useMemo(
    // League + team favorites only — never fold player club IDs into this set.
    () => dateKeysForFavorites(matches, favorites.leagueIds, favorites.teamIds),
    [matches, favorites.leagueIds, favorites.teamIds],
  )
  const dayLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,107,74,0.55), transparent 55%), radial-gradient(ellipse 45% 40% at 100% 20%, rgba(200,245,66,0.12), transparent 50%), radial-gradient(ellipse 40% 35% at 0% 80%, rgba(20,107,74,0.35), transparent 55%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-40" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-screen md:max-w-xl md:px-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <BrandMark />
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-full border border-white/15 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-mist/75 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            aria-label="Open settings"
          >
            Settings
          </button>
        </div>

        <header className="mb-4">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-lime/90"
          >
            Football intelligence
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1.5 font-display text-5xl leading-[0.9] tracking-[0.04em] text-cream sm:text-6xl"
          >
            BrayStats
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: reduce ? 0 : 0.14 }}
            className="mt-2 max-w-md text-sm text-mist/85"
          >
            Ratings, match stats, and league, club, and player information.
          </motion.p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6rem] tracking-wide text-mist/55">
            <span>{formatUpdatedAt(updatedAt)}</span>
            {hasLive && <span className="text-lime/80">· Live</span>}
            {refreshing && <span>· Syncing…</span>}
            <button
              type="button"
              onClick={onRefresh}
              className="text-mist/60 underline-offset-2 transition hover:text-lime hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              Refresh
            </button>
          </div>
        </header>

        <div className="sticky top-0 z-30 -mx-5 mb-4 border-b border-white/10 bg-pitch-deep/92 px-5 pb-2 pt-1.5 backdrop-blur-md md:-mx-6 md:px-6">
          <HomeSearch
            matches={matches}
            favoriteTeams={favorites.teams}
            favoritePlayers={favorites.players}
            onOpenLeague={onOpenLeague}
            onOpenTeam={onOpenTeam}
            onOpenPlayer={onOpenPlayer}
          />
          <CalendarStrip
            selected={selectedDate}
            onSelect={onSelectDate}
            onJumpToToday={onJumpToToday}
            onNeedRange={onNeedMatchRange}
            favoriteDateKeys={favoriteDateKeys}
            minForwardDays={knownForwardDays}
            reduce={reduce}
          />
        </div>

        <section className="mt-1" aria-label="Fixtures for selected date">
          <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-lime/80">
                Match day
              </p>
              <p className="mt-0.5 text-sm text-mist/80">{dayLabel}</p>
              <p className="mt-1 text-[0.65rem] text-mist/55">
                Star leagues or clubs to yellow fixtures · yellow calendar dots mark favorites
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className={[
                  'rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] transition outline-none',
                  'focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep',
                  hasLive || refreshing
                    ? 'border-lime/50 bg-lime/15 text-lime'
                    : 'border-white/15 text-mist/75 hover:border-lime/40 hover:text-lime',
                ].join(' ')}
                aria-label="Refresh fixtures"
              >
                {refreshing ? 'Syncing…' : 'Refresh'}
              </button>
              <p className="font-display text-lg tracking-wide text-cream/80">
                {loading ? '…' : `${dayMatches.length}`}
              </p>
            </div>
          </div>

          {loading || (refreshing && dayMatches.length === 0 && !error) ? (
            <div className="space-y-2" aria-label="Loading fixtures">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded bg-white/[0.06]" />
              ))}
            </div>
          ) : (
            <>
              {error && dayMatches.length === 0 ? (
                <div className="border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm text-mist/80">{error}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onRefresh}
                      className="rounded-full border border-lime/45 bg-lime/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime transition hover:bg-lime hover:text-ink"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={onJumpToToday}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-mist transition hover:border-lime/40 hover:text-lime"
                    >
                      Today
                    </button>
                  </div>
                </div>
              ) : null}
              {error && dayMatches.length > 0 ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-mist/70">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {!error || dayMatches.length > 0 ? (
                dayMatches.length === 0 ? (
                  <div className="border border-white/10 bg-white/[0.03] px-4 py-4">
                    <p className="text-sm text-mist/70">
                      No matches on this date. Try another day or jump back to Today.
                    </p>
                    <button
                      type="button"
                      onClick={onJumpToToday}
                      className="mt-3 rounded-full border border-lime/45 bg-lime/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime transition hover:bg-lime hover:text-ink"
                    >
                      Jump to Today
                    </button>
                  </div>
                ) : (
                  <MatchDayByLeague
                    matches={dayMatches}
                    allMatches={matches}
                    dateKey={toDateKey(selectedDate)}
                    onOpenTeam={onOpenTeam}
                    onOpenPlayer={onOpenPlayer}
                    onOpenLeague={onOpenLeague}
                    favoriteLeagueIds={favorites.leagueIds}
                    favoriteTeamIds={favorites.teamIds}
                    emptyLabel="No matches on this date. Try another day or jump to Today."
                  />
                )
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const favorites = useFavorites()
  const fantasy = useFantasy()
  const {
    matches,
    loading,
    error,
    updatedAt,
    refreshing,
    hasLive,
    knownForwardDays,
    refresh,
    ensureRange,
    ensureDate,
  } = useLiveBigFiveMatches()
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [screen, setScreen] = useState<Screen>('home')
  const [activeTab, setActiveTab] = useState<BottomTab>('home')
  const [statsInitialTab, setStatsInitialTab] = useState<'pulse' | 'compare' | 'predict' | 'leagues'>(
    'pulse',
  )
  const [compareDeepLink, setCompareDeepLink] = useState<{ a?: string; b?: string }>({})
  const [fantasyResearchTab, setFantasyResearchTab] = useState<'value' | 'compare' | undefined>()
  const [activeLeagueId, setActiveLeagueId] = useState<LeagueId | null>(null)
  const [activeTeam, setActiveTeam] = useState<FavoriteTeam | null>(null)
  const [activePlayer, setActivePlayer] = useState<PlayerNavRef | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !loadSettings().onboardingDone)
  /** Bottom tab to restore when overlays fully close (never overwritten by league→team). */
  const [returnTab, setReturnTab] = useState<BottomTab>('home')
  /** Club stack so Team → opponent → … → Back unwinds correctly. */
  const teamStackRef = useRef<FavoriteTeam[]>([])
  /** Team → League Back restores the club (separate from opponent stack). */
  const leagueReturnTeamRef = useRef<FavoriteTeam | null>(null)
  /** Player → League Back restores the player when no club is underneath. */
  const leagueReturnPlayerRef = useRef<PlayerNavRef | null>(null)
  /** Player → Team Back restores the player when the club stack is empty. */
  const teamReturnPlayerRef = useRef<PlayerNavRef | null>(null)
  /** League → Team keeps the origin league so Back can return past a nested league hop. */
  const teamOriginLeagueRef = useRef<LeagueId | null>(null)
  /** Restore league profile vs stats hub when Back leaves team/player. */
  const leagueReturnModeRef = useRef<'profile' | 'stats'>('profile')
  /** Skip applying hash we just wrote from in-app navigation. */
  const writingHashRef = useRef(false)
  const todayKey = useTodayKey()
  const todayKeyRef = useRef(todayKey)

  const activeLeague = LEAGUES.find((l) => l.id === activeLeagueId) ?? null

  const writeHash = useCallback((route: Parameters<typeof buildHash>[0]) => {
    if (typeof window === 'undefined') return
    const next = buildHash(route)
    if (window.location.hash === next) return
    writingHashRef.current = true
    window.location.hash = next
  }, [])

  const jumpToToday = useCallback(() => {
    const day = startOfDay(new Date())
    setSelectedDate(day)
    void ensureDate(day)
  }, [ensureDate])

  // Keep Home on “today” when the calendar day rolls over overnight.
  useEffect(() => {
    const previous = todayKeyRef.current
    if (previous === todayKey) return
    todayKeyRef.current = todayKey
    if (toDateKey(selectedDate) === previous) jumpToToday()
  }, [todayKey, selectedDate, jumpToToday])

  const handleSelectDate = useCallback(
    (date: Date) => {
      const day = startOfDay(date)
      setSelectedDate(day)
      void ensureDate(day)
    },
    [ensureDate],
  )

  const handleNeedMatchRange = useCallback(
    (from: Date, to: Date) => {
      void ensureRange(from, to)
    },
    [ensureRange],
  )

  const selectTab = (tab: BottomTab) => {
    const sameTab = screen === tab
    setShowSettings(false)
    setActiveTab(tab)
    setActiveLeagueId(null)
    setActiveTeam(null)
    setActivePlayer(null)
    teamStackRef.current = []
    leagueReturnTeamRef.current = null
    leagueReturnPlayerRef.current = null
    teamReturnPlayerRef.current = null
    teamOriginLeagueRef.current = null
    setReturnTab(tab)
    if (tab === 'stats') setStatsInitialTab('pulse')
    if (tab !== 'fantasy') setFantasyResearchTab(undefined)
    setScreen(tab)
    writeHash({ kind: 'tab', tab })
    // Fresh tab or re-tap active: jump to top so you aren't mid-scroll on a new view.
    if (sameTab || typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: sameTab ? 'smooth' : 'auto' })
    }
  }

  // Deep-link #fantasy-join=… should land on Fantasy Home (join UI), not a league hub.
  // Do not call selectTab here — that would rewrite the invite hash via writeHash.
  useEffect(() => {
    if (!fantasy.pendingInvite) return
    setShowSettings(false)
    setActiveLeagueId(null)
    setActiveTeam(null)
    setActivePlayer(null)
    teamStackRef.current = []
    leagueReturnTeamRef.current = null
    leagueReturnPlayerRef.current = null
    teamReturnPlayerRef.current = null
    teamOriginLeagueRef.current = null
    setActiveTab('fantasy')
    setReturnTab('fantasy')
    setScreen('fantasy')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to invite arrival
  }, [fantasy.pendingInvite])

  const openLeague = (id: LeagueId) => {
    if (isTabScreen(screen)) {
      setReturnTab(screen)
      setActiveTab(screen)
      teamStackRef.current = []
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      teamReturnPlayerRef.current = null
      teamOriginLeagueRef.current = null
      setActiveTeam(null)
      setActivePlayer(null)
      leagueReturnModeRef.current = 'profile'
    } else if (screen === 'team' && activeTeam) {
      // Team → league: keep the club so Back returns here instead of the tab.
      // Preserve leagueReturnModeRef so team → Back can still hit the stats hub.
      leagueReturnTeamRef.current = activeTeam
      leagueReturnPlayerRef.current = null
      setActiveTeam(null)
      setActivePlayer(null)
    } else if (screen === 'player' && activeTeam) {
      leagueReturnTeamRef.current = activeTeam
      leagueReturnPlayerRef.current = null
      setActiveTeam(null)
      setActivePlayer(null)
    } else if (screen === 'player' && activePlayer) {
      // Player opened without a club underneath (search / favorites).
      leagueReturnPlayerRef.current = activePlayer
      leagueReturnTeamRef.current = null
      setActivePlayer(null)
    } else {
      setActiveTeam(null)
      setActivePlayer(null)
      leagueReturnModeRef.current = 'profile'
    }
    setShowSettings(false)
    setActiveLeagueId(id)
    setScreen('league-profile')
    writeHash({ kind: 'league', leagueId: id })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openLeagueStats = (id: LeagueId) => {
    if (isTabScreen(screen)) {
      setReturnTab(screen)
      setActiveTab(screen)
      teamStackRef.current = []
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      teamReturnPlayerRef.current = null
      teamOriginLeagueRef.current = null
      setActiveTeam(null)
      setActivePlayer(null)
    } else {
      setActiveTeam(null)
      setActivePlayer(null)
    }
    setShowSettings(false)
    setActiveLeagueId(id)
    setScreen('league-stats')
    leagueReturnModeRef.current = 'stats'
    writeHash({ kind: 'league-stats', leagueId: id })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openTeam = (team: FavoriteTeam) => {
    if (screen === 'player' && activePlayer) {
      // Leaving a player for a club — Back should restore the player when the stack ends.
      teamReturnPlayerRef.current = activePlayer
    }
    if (
      (screen === 'team' || screen === 'player') &&
      activeTeam &&
      activeTeam.id !== team.id
    ) {
      // Team → opponent, or Player → another club: keep prior clubs for Back.
      teamStackRef.current = [...teamStackRef.current, activeTeam]
    } else if (screen !== 'team' && screen !== 'player') {
      teamStackRef.current = []
      if (isTabScreen(screen)) {
        leagueReturnTeamRef.current = null
        leagueReturnPlayerRef.current = null
        teamReturnPlayerRef.current = null
        teamOriginLeagueRef.current = null
        setReturnTab(screen)
        setActiveTab(screen)
      } else if (screen === 'league-profile' && activeLeagueId) {
        teamOriginLeagueRef.current = activeLeagueId
      } else if (screen === 'league-stats' && activeLeagueId) {
        teamOriginLeagueRef.current = activeLeagueId
      }
    }
    setShowSettings(false)
    setActivePlayer(null)
    setActiveTeam(team)
    setScreen('team')
    writeHash({ kind: 'team', team })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openPlayer = (player: PlayerNavRef) => {
    if (screen !== 'team' && screen !== 'player') {
      teamStackRef.current = []
      if (isTabScreen(screen)) {
        leagueReturnTeamRef.current = null
        leagueReturnPlayerRef.current = null
        teamReturnPlayerRef.current = null
        teamOriginLeagueRef.current = null
        setReturnTab(screen)
        setActiveTab(screen)
      } else if (screen === 'league-profile' && activeLeagueId) {
        teamOriginLeagueRef.current = activeLeagueId
      } else if (screen === 'league-stats' && activeLeagueId) {
        teamOriginLeagueRef.current = activeLeagueId
      }
    }
    setShowSettings(false)
    setActivePlayer(player)
    setScreen('player')
    writeHash({ kind: 'player', player })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openSettings = () => {
    setShowSettings(true)
    writeHash({ kind: 'settings' })
  }

  const closeSettings = () => {
    setShowSettings(false)
    if (isTabScreen(screen)) {
      writeHash({ kind: 'tab', tab: screen })
    } else if (screen === 'league-profile' && activeLeagueId) {
      writeHash({ kind: 'league', leagueId: activeLeagueId })
    } else if (screen === 'league-stats' && activeLeagueId) {
      writeHash({ kind: 'league-stats', leagueId: activeLeagueId })
    } else if (screen === 'team' && activeTeam) {
      writeHash({ kind: 'team', team: activeTeam })
    } else if (screen === 'player' && activePlayer) {
      writeHash({ kind: 'player', player: activePlayer })
    } else {
      writeHash({ kind: 'tab', tab: activeTab })
    }
  }

  const applyHashRoute = useCallback((hash: string) => {
    const route = parseHash(hash)
    // Fantasy-join is owned by useFantasy + pendingInvite effect — do not clear that hash.
    if (!route || route.kind === 'fantasy-join') return

    if (route.kind === 'settings') {
      setShowSettings(true)
      return
    }

    setShowSettings(false)

    if (route.kind === 'tab') {
      setActiveTab(route.tab)
      setActiveLeagueId(null)
      setActiveTeam(null)
      setActivePlayer(null)
      teamStackRef.current = []
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      teamReturnPlayerRef.current = null
      teamOriginLeagueRef.current = null
      setReturnTab(route.tab)
      setScreen(route.tab)
      return
    }

    if (route.kind === 'league') {
      if (!LEAGUES.some((l) => l.id === route.leagueId)) return
      teamStackRef.current = []
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      teamReturnPlayerRef.current = null
      teamOriginLeagueRef.current = null
      leagueReturnModeRef.current = 'profile'
      setActiveTeam(null)
      setActivePlayer(null)
      setActiveLeagueId(route.leagueId)
      setScreen('league-profile')
      return
    }

    if (route.kind === 'league-stats') {
      if (!LEAGUES.some((l) => l.id === route.leagueId)) return
      teamStackRef.current = []
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      teamReturnPlayerRef.current = null
      teamOriginLeagueRef.current = null
      leagueReturnModeRef.current = 'stats'
      setActiveTeam(null)
      setActivePlayer(null)
      setActiveLeagueId(route.leagueId)
      setReturnTab('stats')
      setActiveTab('stats')
      setScreen('league-stats')
      return
    }

    if (route.kind === 'team') {
      teamStackRef.current = []
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      teamReturnPlayerRef.current = null
      teamOriginLeagueRef.current = null
      setActiveLeagueId(null)
      setActivePlayer(null)
      setActiveTeam(route.team)
      setScreen('team')
      return
    }

    if (route.kind === 'player') {
      teamStackRef.current = []
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      teamReturnPlayerRef.current = null
      teamOriginLeagueRef.current = null
      setActiveLeagueId(null)
      setActiveTeam(null)
      setActivePlayer(route.player)
      setScreen('player')
      return
    }

    if (route.kind === 'compare') {
      // Real-stats compare lives on Stats; FPL compare is under Fantasy → Research.
      setCompareDeepLink({ a: route.a, b: route.b })
      setStatsInitialTab('compare')
      setActiveTab('stats')
      setActiveLeagueId(null)
      setActiveTeam(null)
      setActivePlayer(null)
      teamStackRef.current = []
      setReturnTab('stats')
      setScreen('stats')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    document.documentElement.dataset.density = loadSettings().density
    const onHashChange = () => {
      if (writingHashRef.current) {
        writingHashRef.current = false
        return
      }
      applyHashRoute(window.location.hash)
    }
    applyHashRoute(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [applyHashRoute])

  const closeOverlay = () => {
    // Team → Player → Back should return to the team, not skip the stack.
    if (activePlayer && activeTeam) {
      setActivePlayer(null)
      setScreen('team')
      writeHash({ kind: 'team', team: activeTeam })
      return
    }

    // Unwind Team → opponent → … stack.
    const previous = teamStackRef.current.pop()
    if (previous) {
      setActivePlayer(null)
      setActiveTeam(previous)
      setScreen('team')
      writeHash({ kind: 'team', team: previous })
      return
    }

    const returnPlayer = teamReturnPlayerRef.current
    if (returnPlayer) {
      teamReturnPlayerRef.current = null
      setActiveTeam(null)
      setActivePlayer(returnPlayer)
      setScreen('player')
      writeHash({ kind: 'player', player: returnPlayer })
      return
    }

    setActiveTeam(null)
    setActivePlayer(null)
    if (activeLeagueId) {
      if (leagueReturnModeRef.current === 'stats') {
        setScreen('league-stats')
        writeHash({ kind: 'league-stats', leagueId: activeLeagueId })
      } else {
        setScreen('league-profile')
        writeHash({ kind: 'league', leagueId: activeLeagueId })
      }
      return
    }
    leagueReturnTeamRef.current = null
    leagueReturnPlayerRef.current = null
    teamOriginLeagueRef.current = null
    setScreen(returnTab)
    setActiveTab(returnTab)
    writeHash({ kind: 'tab', tab: returnTab })
  }

  const closeLeagueProfile = () => {
    const returnTeam = leagueReturnTeamRef.current
    if (returnTeam) {
      leagueReturnTeamRef.current = null
      leagueReturnPlayerRef.current = null
      setActivePlayer(null)
      setActiveTeam(returnTeam)
      // Restore the league this club was opened from (if any), not the nested hop.
      setActiveLeagueId(teamOriginLeagueRef.current)
      setScreen('team')
      writeHash({ kind: 'team', team: returnTeam })
      return
    }
    const returnPlayer = leagueReturnPlayerRef.current
    if (returnPlayer) {
      leagueReturnPlayerRef.current = null
      setActiveLeagueId(null)
      setActiveTeam(null)
      setActivePlayer(returnPlayer)
      setScreen('player')
      writeHash({ kind: 'player', player: returnPlayer })
      return
    }
    setActivePlayer(null)
    setActiveLeagueId(null)
    setActiveTeam(null)
    teamStackRef.current = []
    teamOriginLeagueRef.current = null
    setScreen(returnTab)
    setActiveTab(returnTab)
    writeHash({ kind: 'tab', tab: returnTab })
  }

  const navActive: BottomTab =
    screen === 'league-profile' || screen === 'league-stats'
      ? activeTab
      : screen === 'team' || screen === 'player'
        ? activeTab
        : isTabScreen(screen)
          ? screen
          : 'home'

  return (
    <>
      <AnimatePresence mode="sync">
        {screen === 'player' && activePlayer ? (
          <motion.div
            key={`player-${activePlayer.id}`}
            initial={reduce ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlayerProfileScreen
              player={activePlayer}
              favorites={favorites}
              onBack={closeOverlay}
              onOpenTeam={openTeam}
              onOpenLeague={openLeague}
              reduce={reduce}
            />
          </motion.div>
        ) : screen === 'team' && activeTeam ? (
          <motion.div
            key={`team-${activeTeam.id}`}
            initial={reduce ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <TeamProfileScreen
              team={activeTeam}
              matches={matches}
              loading={loading}
              error={error}
              refreshing={refreshing}
              favorites={favorites}
              onBack={closeOverlay}
              onOpenTeam={openTeam}
              onOpenPlayer={openPlayer}
              onOpenLeague={openLeague}
              onNeedPastRange={(from, to) => ensureRange(from, to)}
              reduce={reduce}
            />
          </motion.div>
        ) : screen === 'league-profile' && activeLeague ? (
          <motion.div
            key={activeLeague.id}
            initial={reduce ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <LeagueProfileScreen
              league={activeLeague}
              matches={matches}
              loading={loading}
              error={error}
              favorites={favorites}
              onBack={closeLeagueProfile}
              onOpenTeam={openTeam}
              onOpenPlayer={openPlayer}
              reduce={reduce}
            />
          </motion.div>
        ) : screen === 'league-stats' && activeLeague ? (
          <motion.div
            key={`league-stats-${activeLeague.id}`}
            initial={reduce ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <LeagueStatsHubScreen
              league={activeLeague}
              favorites={favorites}
              onBack={closeLeagueProfile}
              onOpenTeam={openTeam}
              onOpenPlayer={openPlayer}
              reduce={reduce}
            />
          </motion.div>
        ) : screen === 'favorites' ? (
          <motion.div
            key="favorites"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <FavoritesScreen
              favorites={favorites}
              onOpenLeague={openLeague}
              onOpenTeam={openTeam}
              onOpenPlayer={openPlayer}
              onBrowseLeagues={() => selectTab('leagues')}
              reduce={reduce}
            />
          </motion.div>
        ) : screen === 'leagues' ? (
          <motion.div
            key="leagues"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <LeaguesScreen
              favorites={favorites}
              onOpenLeague={openLeague}
              reduce={reduce}
            />
          </motion.div>
        ) : screen === 'stats' ? (
          <motion.div
            key={`stats-${statsInitialTab}`}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatsScreen
              favorites={favorites}
              matches={matches}
              onOpenLeagueStats={openLeagueStats}
              onOpenPlayer={openPlayer}
              reduce={reduce}
              initialTab={statsInitialTab}
              compareA={compareDeepLink.a}
              compareB={compareDeepLink.b}
            />
          </motion.div>
        ) : screen === 'fantasy' ? (
          <motion.div
            key={`fantasy-${fantasyResearchTab ?? 'home'}`}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <FantasyScreen
              fantasy={fantasy}
              reduce={reduce}
              onOpenPlayer={openPlayer}
              initialResearchTab={fantasyResearchTab}
            />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={reduce ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <HomeScreen
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onJumpToToday={jumpToToday}
              onNeedMatchRange={handleNeedMatchRange}
              knownForwardDays={knownForwardDays}
              onOpenLeague={openLeague}
              onOpenTeam={openTeam}
              onOpenPlayer={openPlayer}
              onOpenSettings={openSettings}
              matches={matches}
              loading={loading}
              error={error}
              updatedAt={updatedAt}
              refreshing={refreshing}
              hasLive={hasLive}
              onRefresh={refresh}
              favorites={favorites}
              reduce={reduce}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showSettings ? (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <SettingsScreen
            onBack={closeSettings}
            onOpenOnboarding={() => {
              setShowOnboarding(true)
              setShowSettings(false)
            }}
            reduce={reduce}
          />
        </div>
      ) : null}

      {showOnboarding ? (
        <OnboardingOverlay
          onDone={() => {
            setShowOnboarding(false)
          }}
          onPickLeague={(id) => {
            saveSettings({ preferredLeagueId: id, onboardingDone: true })
            openLeague(id)
          }}
        />
      ) : null}

      <BottomNav
        active={navActive}
        onSelect={selectTab}
        favoritesCount={
          favorites.leagues.length + favorites.teams.length + favorites.players.length
        }
      />
    </>
  )
}
