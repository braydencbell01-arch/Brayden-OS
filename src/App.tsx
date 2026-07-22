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
      width={32}
      height={32}
      className={`h-8 w-8 shrink-0 rounded-lg ${className}`}
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

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-6 md:max-w-xl md:px-6">
        <div className="mb-4 flex items-center gap-3">
          <BrandMark />
        </div>

        <HomeSearch
          matches={matches}
          favoriteTeams={favorites.teams}
          favoritePlayers={favorites.players}
          onOpenLeague={onOpenLeague}
          onOpenTeam={onOpenTeam}
          onOpenPlayer={onOpenPlayer}
        />

        <header className="mb-8">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-lime"
          >
            Football intelligence
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 font-display text-6xl leading-[0.9] tracking-[0.04em] text-cream sm:text-7xl"
          >
            BrayStats
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: reduce ? 0 : 0.14 }}
            className="mt-3 max-w-md text-base text-mist/90"
          >
            Player ratings from match stats, and what clubs pay per goal, assist, and more.
          </motion.p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/70">
            <span>{formatUpdatedAt(updatedAt)}</span>
            {hasLive && <span className="text-lime">Live polling</span>}
            {refreshing && <span>Syncing…</span>}
            <button
              type="button"
              onClick={onRefresh}
              className="border border-white/15 px-2 py-1 text-mist transition hover:border-lime/50 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              Refresh
            </button>
          </div>
        </header>

        <CalendarStrip
          selected={selectedDate}
          onSelect={onSelectDate}
          onJumpToToday={onJumpToToday}
          onNeedRange={onNeedMatchRange}
          favoriteDateKeys={favoriteDateKeys}
          minForwardDays={knownForwardDays}
          reduce={reduce}
        />

        <section className="mt-8" aria-label="Fixtures for selected date">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">
                Match day
              </p>
              <p className="mt-1 text-sm text-mist/80">{dayLabel}</p>
            </div>
            <p className="font-display text-xl tracking-wide text-cream/80">
              {loading ? '…' : `${dayMatches.length}`}
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-mist/70">Loading fixtures…</p>
          ) : (
            <>
              {error && dayMatches.length === 0 ? (
                <p className="text-sm text-mist/80">{error}</p>
              ) : null}
              {error && dayMatches.length > 0 ? (
                <p className="mb-3 text-sm text-mist/70">{error}</p>
              ) : null}
              {!error || dayMatches.length > 0 ? (
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
    setActiveTab(tab)
    setActiveLeagueId(null)
    setActiveTeam(null)
    setActivePlayer(null)
    previousTeamRef.current = null
    leagueReturnTeamRef.current = null
    setReturnTab(tab)
    setScreen(tab)
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
  }

  const openTeam = (team: FavoriteTeam) => {
    if (screen === 'team' && activeTeam && activeTeam.id !== team.id) {
      previousTeamRef.current = activeTeam
    } else if (screen !== 'team' && screen !== 'player') {
      previousTeamRef.current = null
      if (isTabScreen(screen)) {
        leagueReturnTeamRef.current = null
        setReturnTab(screen)
        setActiveTab(screen)
      }
    }
    setActivePlayer(null)
    setActiveTeam(team)
    setScreen('team')
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
              onNeedPastRange={(from, to) => {
                void ensureRange(from, to)
              }}
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
            <PlaceholderScreen title="Stats" reduce={reduce} />
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
