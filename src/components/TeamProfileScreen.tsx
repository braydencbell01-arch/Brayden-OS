import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { getLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import {
  groupMatchesByDate,
  recentFormForTeam,
  splitTeamFixtures,
  type Match,
  type TeamFormResult,
} from '../lib/matches'
import { formatMatchDayHeading, startOfDay, toDateKey } from '../lib/dates'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { FavoriteStar } from './FavoriteStar'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'

function FormDot({ result }: { result: TeamFormResult }) {
  const styles =
    result === 'W'
      ? 'bg-lime text-ink'
      : result === 'D'
        ? 'bg-white/20 text-cream'
        : 'bg-white/10 text-mist/80'

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center text-[0.7rem] font-bold ${styles}`}
      title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
    >
      {result}
    </span>
  )
}

export function TeamProfileScreen({
  team,
  matches,
  loading,
  error,
  favorites,
  onBack,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
  onOpenFavorites,
  reduce,
}: {
  team: FavoriteTeam
  matches: Match[]
  loading: boolean
  error: string | null
  favorites: FavoritesApi
  onBack: () => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  onOpenLeague: (id: LeagueId) => void
  onOpenFavorites: () => void
  reduce: boolean | null
}) {
  const league = getLeague(team.leagueId)
  const standings = useLeagueStandings(team.leagueId)
  const todayKey = useMemo(() => toDateKey(startOfDay(new Date())), [])

  const standing = useMemo(
    () => standings.rows.find((row) => row.teamId === team.id) ?? null,
    [standings.rows, team.id],
  )

  const form = useMemo(
    () => recentFormForTeam(matches, team.id, 5),
    [matches, team.id],
  )

  const { recent, upcoming } = useMemo(
    () => splitTeamFixtures(matches, team.id, todayKey),
    [matches, team.id, todayKey],
  )

  const upcomingGrouped = useMemo(() => groupMatchesByDate(upcoming), [upcoming])
  const favorited = favorites.isTeamFavorite(team.id)
  const displayName = standing?.team || team.name

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
              active={favorited}
              label={displayName}
              onToggle={() =>
                favorites.toggleTeam({
                  id: team.id,
                  name: displayName,
                  shortName: team.shortName,
                  leagueId: team.leagueId,
                })
              }
            />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onOpenLeague(team.leagueId)}
                className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-lime underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                {league.name} · Profile →
              </button>
              <h1 className="mt-2 font-display text-5xl tracking-[0.04em] text-cream sm:text-6xl">
                {displayName}
              </h1>
              <p className="mt-2 text-sm text-mist/80">
                {team.shortName}
                {standing ? ` · #${standing.rank} · ${standing.points} pts` : ''}
              </p>
            </div>
          </div>
        </motion.header>

        <motion.section
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.08 }}
          className="mt-8"
          aria-label="Season snapshot"
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Season</p>
            <p className="mt-1 text-sm text-mist/80">Table line and recent form</p>
          </div>

          {standings.loading && !standing ? (
            <p className="text-sm text-mist/70">Loading table line…</p>
          ) : standings.error && !standing ? (
            <p className="text-sm text-mist/80">{standings.error}</p>
          ) : standing ? (
            <div className="border border-white/10 bg-white/[0.04] px-4 py-4">
              <dl className="grid grid-cols-4 gap-3 text-center sm:grid-cols-7">
                {(
                  [
                    ['Pos', String(standing.rank)],
                    ['P', String(standing.played)],
                    ['W', String(standing.won)],
                    ['D', String(standing.drawn)],
                    ['L', String(standing.lost)],
                    ['GD', standing.goalDiff > 0 ? `+${standing.goalDiff}` : String(standing.goalDiff)],
                    ['Pts', String(standing.points)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                      {label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl tracking-wide text-cream tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {standing.note ? (
                <p className="mt-3 text-xs text-mist/65">{standing.note}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-mist/70">No table row yet for this club.</p>
          )}

          <div className="mt-4 px-1">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
              Last {form.length || 5}
            </p>
            {form.length === 0 ? (
              <p className="text-sm text-mist/70">No finished matches in the loaded window yet.</p>
            ) : (
              <div className="flex gap-1.5" aria-label="Recent form">
                {form.map((result, index) => (
                  <FormDot key={`${result}-${index}`} result={result} />
                ))}
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.12 }}
          className="mt-10"
          aria-label="Upcoming fixtures"
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Upcoming</p>
            <p className="mt-1 text-sm text-mist/80">Tap a club name to open their profile</p>
          </div>

          {loading ? (
            <p className="text-sm text-mist/70">Loading fixtures…</p>
          ) : error ? (
            <p className="text-sm text-mist/80">{error}</p>
          ) : upcomingGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">No upcoming matches in the current window.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {upcomingGrouped.map(({ dateKey, matches: dayMatches }) => (
                <section key={dateKey} aria-label={formatMatchDayHeading(dateKey)}>
                  <h2 className="mb-2 px-1 font-display text-2xl tracking-wide text-cream">
                    {formatMatchDayHeading(dateKey)}
                  </h2>
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

        <motion.section
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.16 }}
          className="mt-10"
          aria-label="Recent results"
        >
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Recent</p>
            <p className="mt-1 text-sm text-mist/80">Latest finished matches</p>
          </div>

          {loading ? (
            <p className="text-sm text-mist/70">Loading results…</p>
          ) : (
            <MatchList
              matches={recent}
              onOpenTeam={onOpenTeam}
              onOpenPlayer={onOpenPlayer}
              emptyLabel="No recent results in the current window."
            />
          )}
        </motion.section>
      </div>
    </div>
  )
}
