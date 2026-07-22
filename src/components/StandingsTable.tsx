import type { LeagueId } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import type { StandingRow } from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'

export function StandingsTable({
  rows,
  loading,
  error,
  leagueId,
  isTeamFavorite,
  onToggleTeam,
  onOpenTeam,
  onRetry,
}: {
  rows: StandingRow[]
  loading: boolean
  error: string | null
  leagueId: LeagueId
  isTeamFavorite: (teamId: string) => boolean
  onToggleTeam: (team: FavoriteTeam) => void
  onOpenTeam?: (team: FavoriteTeam) => void
  onRetry?: () => void
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2" aria-label="Loading table">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-9 animate-pulse rounded bg-white/[0.06]" />
        ))}
      </div>
    )
  }

  if (error && rows.length === 0) {
    return (
      <div className="border border-white/10 bg-white/[0.03] px-3 py-3">
        <p className="text-sm text-mist/80">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full border border-lime/45 bg-lime/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime transition hover:bg-lime hover:text-ink"
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-mist/70">Standings are not available yet for this season.</p>
  }

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[30rem] border-collapse text-left text-xs">
        <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.12em] text-mist/65">
          <tr>
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="w-10 px-1 py-2 font-semibold">
              <span className="sr-only">Favorite</span>
            </th>
            <th className="px-3 py-2 font-semibold">Club</th>
            <th className="px-2 py-2 text-center font-semibold">P</th>
            <th className="px-2 py-2 text-center font-semibold">W</th>
            <th className="px-2 py-2 text-center font-semibold">D</th>
            <th className="px-2 py-2 text-center font-semibold">L</th>
            <th className="px-2 py-2 text-center font-semibold">GD</th>
            <th className="px-3 py-2 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = isTeamFavorite(row.teamId)
            const teamRef: FavoriteTeam = {
              id: row.teamId,
              name: row.team,
              shortName: row.shortName,
              leagueId,
            }
            return (
              <tr key={`${row.rank}-${row.teamId}`} className="border-t border-white/10">
                <td className="px-3 py-2 tabular-nums text-mist/80">{row.rank}</td>
                <td className="px-1 py-2 text-center">
                  <FavoriteStar
                    active={active}
                    size="sm"
                    label={row.shortName}
                    onToggle={() => onToggleTeam(teamRef)}
                  />
                </td>
                <td className="px-3 py-2 font-semibold text-cream">
                  {onOpenTeam ? (
                    <button
                      type="button"
                      onClick={() => onOpenTeam(teamRef)}
                      className="text-left underline-offset-2 transition hover:text-lime hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {row.shortName}
                    </button>
                  ) : (
                    row.shortName
                  )}
                  {row.note ? (
                    <span className="mt-0.5 block text-[0.6rem] font-medium normal-case tracking-normal text-mist/55">
                      {row.note}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">{row.played}</td>
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">{row.won}</td>
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">{row.drawn}</td>
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">{row.lost}</td>
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-lime">{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
