import type { LeagueId } from '../lib/leagues'
import { isInternationalLeague } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import type { StandingRow } from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'

function StandingGroupTable({
  rows,
  leagueId,
  teamColumnLabel,
  isTeamFavorite,
  onToggleTeam,
  onOpenTeam,
  highlightedTeamId,
}: {
  rows: StandingRow[]
  leagueId: LeagueId
  teamColumnLabel: string
  isTeamFavorite: (teamId: string) => boolean
  onToggleTeam: (team: FavoriteTeam) => void
  onOpenTeam?: (team: FavoriteTeam) => void
  /** When set, that club’s row is visually emphasized (e.g. team profile). */
  highlightedTeamId?: string
}) {
  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
        <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.12em] text-mist/65">
          <tr>
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="w-10 px-1 py-2 font-semibold">
              <span className="sr-only">Favorite</span>
            </th>
            <th className="px-3 py-2 font-semibold">{teamColumnLabel}</th>
            <th className="px-2 py-2 text-center font-semibold">P</th>
            <th className="px-2 py-2 text-center font-semibold">W</th>
            <th className="px-2 py-2 text-center font-semibold">D</th>
            <th className="px-2 py-2 text-center font-semibold">L</th>
            <th className="px-2 py-2 text-center font-semibold">GF</th>
            <th className="px-2 py-2 text-center font-semibold">GA</th>
            <th className="px-2 py-2 text-center font-semibold">GD</th>
            <th className="px-3 py-2 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = isTeamFavorite(row.teamId)
            const highlighted = highlightedTeamId != null && row.teamId === highlightedTeamId
            const teamRef: FavoriteTeam = {
              id: row.teamId,
              name: row.team,
              shortName: row.shortName,
              leagueId,
              kind: isInternationalLeague(leagueId) ? 'national' : 'club',
            }
            return (
              <tr
                key={`${row.group || 'table'}-${row.rank}-${row.teamId}`}
                className={`border-t border-white/10 ${
                  highlighted ? 'bg-lime/15 shadow-[inset_3px_0_0_0_#c8f542]' : ''
                }`}
                aria-current={highlighted ? 'true' : undefined}
              >
                <td
                  className={`px-3 py-2 tabular-nums ${
                    highlighted ? 'font-semibold text-lime' : 'text-mist/80'
                  }`}
                >
                  {row.rank}
                </td>
                <td className="px-1 py-2 text-center">
                  <FavoriteStar
                    active={active}
                    size="sm"
                    label={row.shortName}
                    onToggle={() => onToggleTeam(teamRef)}
                  />
                </td>
                <td
                  className={`px-3 py-2 font-semibold ${
                    highlighted ? 'text-lime' : 'text-cream'
                  }`}
                >
                  {onOpenTeam && !highlighted ? (
                    <button
                      type="button"
                      onClick={() => onOpenTeam(teamRef)}
                      className="profile-link text-left transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
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
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">{row.goalsFor}</td>
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">{row.goalsAgainst}</td>
                <td className="px-2 py-2 text-center tabular-nums text-mist/80">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td
                  className={`px-3 py-2 text-right font-bold tabular-nums ${
                    highlighted ? 'text-cream' : 'text-lime'
                  }`}
                >
                  {row.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function StandingsTable({
  rows,
  loading,
  error,
  leagueId,
  isTeamFavorite,
  onToggleTeam,
  onOpenTeam,
  onRetry,
  highlightedTeamId,
}: {
  rows: StandingRow[]
  loading: boolean
  error: string | null
  leagueId: LeagueId
  isTeamFavorite: (teamId: string) => boolean
  onToggleTeam: (team: FavoriteTeam) => void
  onOpenTeam?: (team: FavoriteTeam) => void
  onRetry?: () => void
  highlightedTeamId?: string
}) {
  const teamColumnLabel = isInternationalLeague(leagueId) ? 'Team' : 'Club'
  const grouped = (() => {
    const hasGroups = rows.some((row) => row.group)
    if (!hasGroups) return [{ label: null as string | null, rows }]
    const order: string[] = []
    const map = new Map<string, StandingRow[]>()
    for (const row of rows) {
      const key = row.group || 'Table'
      if (!map.has(key)) {
        map.set(key, [])
        order.push(key)
      }
      map.get(key)!.push(row)
    }
    return order.map((label) => ({ label, rows: map.get(label) ?? [] }))
  })()

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
    return (
      <p className="text-sm text-mist/70">
        {isInternationalLeague(leagueId)
          ? 'No table for this competition yet (group stage may not have started, or friendlies have no standings).'
          : 'Standings are not available yet for this season.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(({ label, rows: groupRows }) => (
        <section key={label || 'all'} aria-label={label || 'Standings'}>
          {label ? (
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
              {label}
            </p>
          ) : null}
          <StandingGroupTable
            rows={groupRows}
            leagueId={leagueId}
            teamColumnLabel={teamColumnLabel}
            isTeamFavorite={isTeamFavorite}
            onToggleTeam={onToggleTeam}
            onOpenTeam={onOpenTeam}
            highlightedTeamId={highlightedTeamId}
          />
        </section>
      ))}
    </div>
  )
}
