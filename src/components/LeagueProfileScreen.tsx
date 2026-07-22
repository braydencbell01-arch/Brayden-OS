import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  addDays,
  CALENDAR_RADIUS_DAYS,
  formatMatchDayHeading,
  startOfDay,
  toDateKey,
} from '../lib/dates'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import type { League } from '../lib/leagues'
import {
  groupMatchesByDate,
  matchesForLeagueFrom,
  type Match,
} from '../lib/matches'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { FavoriteStar } from './FavoriteStar'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { StandingsTable } from './StandingsTable'

export function LeagueProfileScreen({
  league,
  matches,
  loading,
  error,
  favorites,
  onBack,
  onOpenTeam,
  onOpenPlayer,
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
  onOpenPlayer: (player: PlayerNavRef) => void
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

  const leader = standings.rows[0] ?? null
  const clubCount = standings.rows.length

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
            <span aria-hidden>←</span> Back
          </motion.button>
          <button
            type="button"
            onClick={onOpenFavorites}
            className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-mist/80 transition hover:text-star focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-star focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
          >
            Favorites
          </button>
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
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
                League profile · {league.country}
              </p>
              <h1 className="mt-2 font-display text-5xl tracking-[0.04em] text-cream sm:text-6xl">
                {league.name}
              </h1>
              <p className="mt-2 text-sm text-mist/80">
                {league.short}
                {!loading && !error ? ` · ${leagueMatches.length} upcoming matches` : ''}
              </p>
            </div>
          </div>
        </motion.header>

        <motion.section
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.08 }}
          className="mt-8"
          aria-label="League snapshot"
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Season</p>
            <p className="mt-1 text-sm text-mist/80">Snapshot of the competition</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                Clubs
              </p>
              <p className="mt-1 font-display text-3xl text-cream">
                {standings.loading ? '…' : clubCount || '—'}
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                Upcoming
              </p>
              <p className="mt-1 font-display text-3xl text-cream">
                {loading ? '…' : leagueMatches.length}
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                Leader
              </p>
              {standings.loading ? (
                <p className="mt-1 font-display text-3xl text-cream">…</p>
              ) : leader ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenTeam({
                      id: leader.teamId,
                      name: leader.team,
                      shortName: leader.shortName,
                      leagueId: league.id,
                    })
                  }
                  className="mt-1 text-sm font-semibold text-lime underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                >
                  {leader.shortName}
                </button>
              ) : (
                <p className="mt-1 font-display text-3xl text-cream">—</p>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.1 }}
          className="mt-8"
          aria-label={`${league.name} standings`}
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Table</p>
            <p className="mt-1 text-sm text-mist/80">
              Tap a club name for its profile · star to favorite
            </p>
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

        <motion.section
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.15 }}
          className="mt-10"
          aria-label="Upcoming fixtures"
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">
              Fixtures
            </p>
            <p className="mt-1 text-sm text-mist/80">
              Tap a match for lineups, ratings, and key moments
            </p>
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
            <div className="flex flex-col gap-6">
              {grouped.map(({ dateKey, matches: dayMatches }) => (
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
                  <MatchList
                    matches={dayMatches}
                    onOpenTeam={onOpenTeam}
                    onOpenPlayer={onOpenPlayer}
                    emptyLabel="No matches"
                  />
                </section>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}
