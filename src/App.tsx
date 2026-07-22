import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BottomNav, type BottomTab } from './components/BottomNav'
import { CalendarStrip } from './components/CalendarStrip'
import { FavoritesScreen } from './components/FavoritesScreen'
import { HomeSearch } from './components/HomeSearch'
import { LeagueProfileScreen } from './components/LeagueProfileScreen'
import { LeaguesScreen } from './components/LeaguesScreen'
import { MatchDayByLeague } from './components/MatchDayByLeague'
import { FantasyScreen } from './components/fantasy/FantasyScreen'
import { PlaceholderScreen } from './components/PlaceholderScreen'
import { useFantasy } from './lib/fantasy/useFantasy'
import {
  PlayerProfileScreen,
  type PlayerNavRef,
} from './components/PlayerProfileScreen'
import { TeamProfileScreen } from './components/TeamProfileScreen'
import { startOfDay, toDateKey } from './lib/dates'
import { useFavorites, type FavoriteTeam, type FavoritesApi } from './lib/favorites'
import { LEAGUES, type LeagueId } from './lib/leagues'
import { dateKeysForFavorites, matchesOnDate, type Match } from './lib/matches'
import { useLiveBigFiveMatches } from './lib/stats/useLiveBigFiveMatches'

type Screen =
  | BottomTab
  | 'league-profile'
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
    () =>
      dateKeysForFavorites(
        matches,
        favorites.leagueIds,
        favorites.teamIds,
        favorites.favoritePlayerTeamIds,
      ),
    [matches, favorites.leagueIds, favorites.teamIds, favorites.favoritePlayerTeamIds],
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

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-screen pt-screen md:max-w-xl md:px-6">
        <div className="mb-3 flex items-center gap-3">
          <BrandMark />
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
            Player ratings from match stats, and what clubs pay per goal, assist, and more.
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

        <div className="sticky top-0 z-30 -mx-5 mb-5 border-b border-white/10 bg-pitch-deep/92 px-5 pb-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-md md:-mx-6 md:px-6">
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

          {loading ? (
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
                    dateKey={toDateKey(selectedDate)}
                    onOpenTeam={onOpenTeam}
                    onOpenPlayer={onOpenPlayer}
                    favoriteLeagueIds={favorites.leagueIds}
                    favoriteTeamIds={favorites.teamIds}
                    favoritePlayerTeamIds={favorites.favoritePlayerTeamIds}
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
  const [activeLeagueId, setActiveLeagueId] = useState<LeagueId | null>(null)
  const [activeTeam, setActiveTeam] = useState<FavoriteTeam | null>(null)
  const [activePlayer, setActivePlayer] = useState<PlayerNavRef | null>(null)
  /** Bottom tab to restore when overlays fully close (never overwritten by league→team). */
  const [returnTab, setReturnTab] = useState<BottomTab>('home')
  /** One-level stack so Team → opponent → Back returns to the previous club. */
  const previousTeamRef = useRef<FavoriteTeam | null>(null)
  /** Team → League Back restores the club (separate from opponent stack). */
  const leagueReturnTeamRef = useRef<FavoriteTeam | null>(null)

  const activeLeague = LEAGUES.find((l) => l.id === activeLeagueId) ?? null

  const jumpToToday = () => {
    const day = startOfDay(new Date())
    setSelectedDate(day)
    void ensureDate(day)
  }

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
    setActiveTab(tab)
    setActiveLeagueId(null)
    setActiveTeam(null)
    setActivePlayer(null)
    previousTeamRef.current = null
    leagueReturnTeamRef.current = null
    setReturnTab(tab)
    setScreen(tab)
    // Fresh tab or re-tap active: jump to top so you aren't mid-scroll on a new view.
    if (sameTab || typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: sameTab ? 'smooth' : 'auto' })
    }
  }

  const openLeague = (id: LeagueId) => {
    if (isTabScreen(screen)) {
      setReturnTab(screen)
      setActiveTab(screen)
      previousTeamRef.current = null
      leagueReturnTeamRef.current = null
      setActiveTeam(null)
    } else if (screen === 'team' && activeTeam) {
      // Team → league: keep the club so Back returns here instead of the tab.
      leagueReturnTeamRef.current = activeTeam
      setActiveTeam(null)
    } else if (screen === 'player' && activeTeam) {
      leagueReturnTeamRef.current = activeTeam
      setActiveTeam(null)
    } else {
      setActiveTeam(null)
    }
    setActivePlayer(null)
    setActiveLeagueId(id)
    setScreen('league-profile')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openTeam = (team: FavoriteTeam) => {
    if (screen === 'team' && activeTeam && activeTeam.id !== team.id) {
      previousTeamRef.current = activeTeam
    } else if (isTabScreen(screen)) {
      // Only reset the opponent stack when opening from a bottom tab.
      // Opening a club from a league profile must keep previousTeamRef so
      // Team → opponent → League → other club → Back still restores the stack.
      previousTeamRef.current = null
      leagueReturnTeamRef.current = null
      setReturnTab(screen)
      setActiveTab(screen)
    }
    setActivePlayer(null)
    setActiveTeam(team)
    setScreen('team')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openPlayer = (player: PlayerNavRef) => {
    if (screen !== 'team' && screen !== 'player') {
      previousTeamRef.current = null
      if (isTabScreen(screen)) {
        leagueReturnTeamRef.current = null
        setReturnTab(screen)
        setActiveTab(screen)
      }
    }
    setActivePlayer(player)
    setScreen('player')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeOverlay = () => {
    // Team → Player → Back should return to the team, not skip the stack.
    if (activePlayer && activeTeam) {
      setActivePlayer(null)
      setScreen('team')
      return
    }

    // Team → opponent → Back should restore the previous club.
    if (previousTeamRef.current) {
      const previous = previousTeamRef.current
      previousTeamRef.current = null
      setActivePlayer(null)
      setActiveTeam(previous)
      setScreen('team')
      return
    }

    setActiveTeam(null)
    setActivePlayer(null)
    if (activeLeagueId) {
      setScreen('league-profile')
      return
    }
    leagueReturnTeamRef.current = null
    setScreen(returnTab)
    setActiveTab(returnTab)
  }

  const closeLeagueProfile = () => {
    setActiveLeagueId(null)
    setActivePlayer(null)
    const returnTeam = leagueReturnTeamRef.current
    if (returnTeam) {
      leagueReturnTeamRef.current = null
      setActiveTeam(returnTeam)
      setScreen('team')
      return
    }
    setActiveTeam(null)
    previousTeamRef.current = null
    setScreen(returnTab)
    setActiveTab(returnTab)
  }

  const navActive: BottomTab =
    screen === 'league-profile'
      ? activeTab
      : screen === 'team' || screen === 'player'
        ? activeTab
        : isTabScreen(screen)
          ? screen
          : 'home'

  return (
    <>
      <AnimatePresence mode="wait">
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
            key="stats"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlaceholderScreen
              title="Stats"
              reduce={reduce}
              onBrowseLeagues={() => selectTab('leagues')}
            />
          </motion.div>
        ) : screen === 'fantasy' ? (
          <motion.div
            key="fantasy"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <FantasyScreen fantasy={fantasy} reduce={reduce} />
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

      <BottomNav active={navActive} onSelect={selectTab} />
    </>
  )
}
