import { useMemo, useState } from 'react'
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
import { ProfileAccordion } from './ProfileAccordion'
import { ProfileHeader, ProfileShell } from './ProfileShell'

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
  const [openSection, setOpenSection] = useState<'upcoming' | 'recent' | null>('upcoming')

  const standing = useMemo(
    () => standings.rows.find((row) => row.teamId === team.id) ?? null,
    [standings.rows, team.id],
  )

  const form = useMemo(() => recentFormForTeam(matches, team.id, 5), [matches, team.id])

  const { recent, upcoming } = useMemo(
    () => splitTeamFixtures(matches, team.id, todayKey),
    [matches, team.id, todayKey],
  )

  const upcomingGrouped = useMemo(() => groupMatchesByDate(upcoming), [upcoming])
  const favorited = favorites.isTeamFavorite(team.id)
  const displayName = standing?.team || team.name

  const toggle = (section: 'upcoming' | 'recent') => {
    setOpenSection((current) => (current === section ? null : section))
  }

  const tableCells = standing
    ? ([
        ['Pos', String(standing.rank)],
        ['P', String(standing.played)],
        ['W', String(standing.won)],
        ['D', String(standing.drawn)],
        ['L', String(standing.lost)],
        ['GD', standing.goalDiff > 0 ? `+${standing.goalDiff}` : String(standing.goalDiff)],
        ['Pts', String(standing.points)],
      ] as const)
    : []

  return (
    <ProfileShell onBack={onBack} onOpenFavorites={onOpenFavorites} reduce={reduce}>
      <ProfileHeader
        reduce={reduce}
        star={
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
        }
        eyebrow={
          <button
            type="button"
            onClick={() => onOpenLeague(team.leagueId)}
            className="text-left underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            {league.name}
          </button>
        }
        title={displayName}
        meta={
          <>
            {team.shortName}
            {standing ? ` · #${standing.rank} · ${standing.points} pts` : ''}
          </>
        }
      />

      <section className="mt-6" aria-label="Season table line">
        {standings.loading && !standing ? (
          <p className="text-sm text-mist/70">Loading table…</p>
        ) : standings.error && !standing ? (
          <p className="text-sm text-mist/80">{standings.error}</p>
        ) : standing ? (
          <dl className="grid grid-cols-4 gap-3 border border-white/10 px-3 py-3.5 text-center sm:grid-cols-7">
            {tableCells.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
                  {label}
                </dt>
                <dd className="mt-1 font-display text-2xl tracking-wide text-cream tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-mist/70">No table row yet for this club.</p>
        )}

        {standing?.note ? <p className="mt-2 text-xs text-mist/60">{standing.note}</p> : null}

        <div className="mt-4">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
            Form
          </p>
          {form.length === 0 ? (
            <p className="text-sm text-mist/70">No finished matches in the loaded window.</p>
          ) : (
            <div className="flex gap-1.5" aria-label="Recent form">
              {form.map((result, index) => (
                <FormDot key={`${result}-${index}`} result={result} />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <ProfileAccordion
          title="Upcoming"
          open={openSection === 'upcoming'}
          onToggle={() => toggle('upcoming')}
          meta={loading ? '…' : String(upcoming.length)}
        >
          {loading ? (
            <p className="text-sm text-mist/70">Loading fixtures…</p>
          ) : error ? (
            <p className="text-sm text-mist/80">{error}</p>
          ) : upcomingGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">No upcoming matches known yet.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {upcomingGrouped.map(({ dateKey, matches: dayMatches }) => (
                <section key={dateKey} aria-label={formatMatchDayHeading(dateKey)}>
                  <h2 className="mb-2 px-0.5 font-display text-xl tracking-wide text-cream">
                    {formatMatchDayHeading(dateKey)}
                  </h2>
                  <MatchList
                    matches={dayMatches}
                    onOpenTeam={onOpenTeam}
                    onOpenPlayer={onOpenPlayer}
                    favoriteLeagueIds={favorites.leagueIds}
                    favoriteTeamIds={favorites.teamIds}
                    favoritePlayerTeamIds={favorites.favoritePlayerTeamIds}
                    emptyLabel="No matches"
                  />
                </section>
              ))}
            </div>
          )}
        </ProfileAccordion>

        <ProfileAccordion
          title="Recent"
          open={openSection === 'recent'}
          onToggle={() => toggle('recent')}
          meta={loading ? '…' : String(recent.length)}
        >
          {loading ? (
            <p className="text-sm text-mist/70">Loading results…</p>
          ) : (
            <MatchList
              matches={recent}
              onOpenTeam={onOpenTeam}
              onOpenPlayer={onOpenPlayer}
              favoriteLeagueIds={favorites.leagueIds}
              favoriteTeamIds={favorites.teamIds}
              favoritePlayerTeamIds={favorites.favoritePlayerTeamIds}
              emptyLabel="No recent results in the current window."
            />
          )}
        </ProfileAccordion>
      </div>
    </ProfileShell>
  )
}
