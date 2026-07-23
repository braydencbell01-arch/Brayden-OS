import type { LeagueId } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import type { LeaguePlayerStatsOverview } from '../lib/stats/types'
import type { PlayerNavRef } from './PlayerProfileScreen'

export function LeaguePlayerStatsPanel({
  data,
  loading,
  error,
  leagueId,
  onOpenPlayer,
  onOpenTeam,
}: {
  data: LeaguePlayerStatsOverview | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  if (loading && !data) {
    return <p className="text-sm text-mist/70">Loading player stats…</p>
  }

  if (error && !data) {
    return <p className="text-sm text-mist/80">{error}</p>
  }

  if (!data || data.rows.length === 0) {
    return <p className="text-sm text-mist/70">No player stats available for this league yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
        {data.seasonLabel} · #1 in each category
      </p>

      <ul className="flex flex-col gap-1.5">
        {data.rows.map((row) => {
          const playerClickable = Boolean(
            onOpenPlayer && row.player.id && /^\d+$/.test(row.player.id),
          )
          const teamClickable = Boolean(
            onOpenTeam && row.player.teamId && row.player.teamName,
          )
          return (
            <li
              key={row.categoryId}
              className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2.5 sm:grid-cols-[minmax(0,9rem)_1fr_auto]"
            >
              <span className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-lime/85">
                {row.label}
              </span>
              <div className="min-w-0">
                {playerClickable ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPlayer?.({
                        id: row.player.id,
                        leagueId,
                        name: row.player.name,
                        shortName: row.player.shortName,
                        jersey: row.player.jersey,
                        teamId: row.player.teamId,
                        teamName: row.player.teamName,
                      })
                    }
                    className="profile-link block max-w-full truncate text-left text-sm font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                  >
                    {row.player.name}
                  </button>
                ) : (
                  <p className="truncate text-sm font-semibold text-cream">{row.player.name}</p>
                )}
                {row.player.teamName ? (
                  teamClickable ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTeam?.({
                          id: row.player.teamId!,
                          name: row.player.teamName!,
                          shortName: row.player.teamName!,
                          leagueId,
                        })
                      }
                      className="profile-link mt-0.5 block max-w-full truncate text-left text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {row.player.teamName}
                    </button>
                  ) : (
                    <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                      {row.player.teamName}
                    </p>
                  )
                ) : null}
              </div>
              <span className="font-display text-xl tracking-wide text-lime tabular-nums">
                {row.player.displayValue}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
