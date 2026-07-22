import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CalendarStrip } from './components/CalendarStrip'
import { FavoriteStar } from './components/FavoriteStar'
import { FavoritesScreen } from './components/FavoritesScreen'
import { MatchList } from './components/MatchList'
import { StandingsTable } from './components/StandingsTable'
import { TeamProfileScreen } from './components/TeamProfileScreen'
import {
  addDays,
  CALENDAR_RADIUS_DAYS,
  formatMatchDayHeading,
  startOfDay,
  toDateKey,
} from './lib/dates'
import { useFavorites, type FavoriteTeam, type FavoritesApi } from './lib/favorites'
import { LEAGUES, type League, type LeagueId } from './lib/leagues'
import {
  dateKeysForFavorites,
  groupMatchesByDate,
  matchesForLeagueFrom,
  matchesOnDate,
  type Match,
} from './lib/matches'
import { useLeagueStandings } from './lib/stats/useLeagueStandings'
import { useLiveBigFiveMatches } from './lib/stats/useLiveBigFiveMatches'

type Screen = 'home' | 'league' | 'favorites' | 'team'

function formatUpdatedAt(updatedAt: number | null): string {
  if (!updatedAt) return 'Waiting for first sync'
  return `Updated ${new Date(updatedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })}`
}

function FavoritesLink({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-mist/80 transition hover:text-star focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-star focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
    >
      Favorites
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        aria-hidden
        className="text-star drop-shadow-[0_0_6px_rgba(255,216,74,0.8)]"
      >
        <path
          d="M12 2.8l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.6l1-6.1-4.4-4.3 6.1-.9L12 2.8z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function HomeScreen({
  selectedDate,
  onSelectDate,
  onJumpToToday,
  onOpenLeague,
  onOpenTeam,
  onOpenFavorites,
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
  onOpenLeague: (id: LeagueId) => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenFavorites: () => void
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

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6 md:max-w-xl md:px-6">
        <div className="mb-4 flex justify-end">
          <FavoritesLink onOpen={onOpenFavorites} />
        </div>

        <header className="mb-8">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-lime"
          >
            Soccer intelligence
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 font-display text-6xl leading-[0.9] tracking-[0.04em] text-cream sm:text-7xl"
          >
            Brayden Stats
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
          favoriteDateKeys={favoriteDateKeys}
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
          ) : error ? (
            <p className="text-sm text-mist/80">{error}</p>
          ) : (
            <MatchList
              matches={dayMatches}
              showLeague
              onOpenTeam={onOpenTeam}
              emptyLabel="No matches on this date. Try another day or jump to Today."
            />
          )}
        </section>

        <section className="mt-10 flex flex-1 flex-col" aria-label="Leagues">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.2 }}
            className="mb-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Leagues</p>
            <p className="mt-1 text-sm text-mist/80">Star a league, then open it for upcoming fixtures</p>
          </motion.div>

          <div className="flex flex-col gap-3">
            {LEAGUES.map((league, i) => {
              const favorited = favorites.isLeagueFavorite(league.id)
              return (
                <motion.div
                  key={league.id}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: reduce ? 0 : 0.22 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-stretch border border-white/10 bg-gradient-to-r from-pitch/80 to-turf/40 transition hover:border-lime/50"
                >
                  <div className="flex items-center px-2">
                    <FavoriteStar
                      active={favorited}
                      label={league.name}
                      onToggle={() => favorites.toggleLeague(league.id)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenLeague(league.id)}
                    className="group flex min-w-0 flex-1 items-center justify-between px-3 py-4 text-left outline-none transition hover:from-turf/50 focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
                  >
                    <span>
                      <span className="block font-display text-3xl tracking-[0.06em] text-cream transition group-hover:text-lime sm:text-4xl">
                        {league.name}
                      </span>
                      <span className="mt-0.5 block text-xs font-medium uppercase tracking-[0.16em] text-mist/70">
                        {league.country}
                      </span>
                    </span>
                    <span className="font-display text-xl tracking-wide text-lime/90 transition group-hover:translate-x-1">
                      {league.short} →
                    </span>
                  </button>
                </motion.div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function LeagueScreen({
  league,
  matches,
  loading,
  error,
  favorites,
  onBack,
  onOpenTeam,
  onOpenFavorites,
  reduce,
}: {
  league: League
  matches: Match[]
  loading: boolean
  error: string | null
  favorites: FavoritesApi
  onBack: () => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenFavorites: () => void
  reduce: boolean | null
}) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const horizon = useMemo(() => addDays(today, CALENDAR_RADIUS_DAYS), [today])
  const leagueMatches = useMemo(
    () => matchesForLeagueFrom(matches, league.id, today, horizon),
    [matches, league.id, today, horizon],
  )
  const grouped = useMemo(() => groupMatchesByDate(leagueMatches), [leagueMatches])
  const standings = useLeagueStandings(league.id)
  const leagueFavorited = favorites.isLeagueFavorite(league.id)

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.5), transparent 55%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6 md:max-w-xl md:px-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <motion.button
            type="button"
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-mist transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
          >
            <span aria-hidden>←</span> Back to home
          </motion.button>
          <FavoritesLink onOpen={onOpenFavorites} />
        </div>

        <motion.header
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-white/10 pb-6"
        >
          <div className="flex items-start gap-2">
            <FavoriteStar
              active={leagueFavorited}
              label={league.name}
              onToggle={() => favorites.toggleLeague(league.id)}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
                {league.country}
              </p>
              <h1 className="mt-2 font-display text-6xl tracking-[0.04em] text-cream sm:text-7xl">
                {league.name}
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-mist/80">
            Table + upcoming fixtures
            {!loading && !error ? ` · ${leagueMatches.length} matches` : ''}
          </p>
        </motion.header>

        <motion.section
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.1 }}
          className="mt-8"
          aria-label={`${league.name} standings`}
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Table</p>
            <p className="mt-1 text-sm text-mist/80">Tap a club name for its profile · star to favorite</p>
          </div>
          <StandingsTable
            rows={standings.rows}
            loading={standings.loading}
            error={standings.error}
            leagueId={league.id}
            isTeamFavorite={favorites.isTeamFavorite}
            onToggleTeam={favorites.toggleTeam}
            onOpenTeam={onOpenTeam}
          />
        </motion.section>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.15 }}
          className="mt-10 flex flex-1 flex-col gap-6"
        >
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Fixtures</p>
            <p className="mt-1 text-sm text-mist/80">Tap a match for possession, shots, and key moments</p>
          </div>

          {loading ? (
            <p className="text-sm text-mist/70">Loading fixtures…</p>
          ) : error ? (
            <p className="text-sm text-mist/80">{error}</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-mist/70">
              No upcoming {league.name} matches scheduled.
            </p>
          ) : (
            grouped.map(({ dateKey, matches: dayMatches }) => (
              <section key={dateKey} aria-label={formatMatchDayHeading(dateKey)}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="font-display text-2xl tracking-wide text-cream">
                    {formatMatchDayHeading(dateKey)}
                  </h2>
                  {dateKey === toDateKey(today) && (
                    <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime">
                      Today
                    </span>
                  )}
                </div>
                <MatchList matches={dayMatches} onOpenTeam={onOpenTeam} emptyLabel="No matches" />
              </section>
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const favorites = useFavorites()
  const { matches, loading, error, updatedAt, refreshing, hasLive, refresh } =
    useLiveBigFiveMatches()
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [screen, setScreen] = useState<Screen>('home')
  const [activeLeagueId, setActiveLeagueId] = useState<LeagueId | null>(null)
  const [activeTeam, setActiveTeam] = useState<FavoriteTeam | null>(null)
  const [teamReturnScreen, setTeamReturnScreen] = useState<Exclude<Screen, 'team'>>('home')

  const activeLeague = LEAGUES.find((l) => l.id === activeLeagueId) ?? null

  const jumpToToday = () => setSelectedDate(startOfDay(new Date()))

  const openLeague = (id: LeagueId) => {
    setActiveLeagueId(id)
    setActiveTeam(null)
    setScreen('league')
  }

  const openFavorites = () => {
    setActiveTeam(null)
    setScreen('favorites')
  }

  const openTeam = (team: FavoriteTeam) => {
    if (screen !== 'team') {
      setTeamReturnScreen(screen)
    }
    setActiveTeam(team)
    setScreen('team')
  }

  const closeTeam = () => {
    setActiveTeam(null)
    setScreen(teamReturnScreen)
  }

  const goHome = () => {
    setActiveLeagueId(null)
    setActiveTeam(null)
    setScreen('home')
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'team' && activeTeam ? (
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
            favorites={favorites}
            onBack={closeTeam}
            onOpenTeam={openTeam}
            onOpenFavorites={openFavorites}
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
            onBack={goHome}
            onOpenLeague={openLeague}
            onOpenTeam={openTeam}
            reduce={reduce}
          />
        </motion.div>
      ) : screen === 'league' && activeLeague ? (
        <motion.div
          key={activeLeague.id}
          initial={reduce ? false : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: 40 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <LeagueScreen
            league={activeLeague}
            matches={matches}
            loading={loading}
            error={error}
            favorites={favorites}
            onBack={goHome}
            onOpenTeam={openTeam}
            onOpenFavorites={openFavorites}
            reduce={reduce}
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
            onSelectDate={setSelectedDate}
            onJumpToToday={jumpToToday}
            onOpenLeague={openLeague}
            onOpenTeam={openTeam}
            onOpenFavorites={openFavorites}
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
  )
}
