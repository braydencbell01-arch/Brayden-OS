import { isInternationalLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import type { LeagueFormRow, TeamFormResult } from '../lib/matches'

function FormDot({ result }: { result: TeamFormResult }) {
  const styles =
    result === 'W'
      ? 'bg-lime text-ink'
      : result === 'D'
        ? 'bg-white/20 text-cream'
        : 'bg-white/10 text-mist/80'

  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center text-[0.65rem] font-bold ${styles}`}
      title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
    >
      {result}
    </span>
  )
}

export function LeagueFormTable({
  rows,
  leagueId,
  onOpenTeam,
}: {
  rows: LeagueFormRow[]
  leagueId: LeagueId
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-mist/70">No form available yet for this season window.</p>
  }

  const hasAnyForm = rows.some((row) => row.form.length > 0)
  if (!hasAnyForm) {
    return <p className="text-sm text-mist/70">No finished matches in the loaded window yet.</p>
  }

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[18rem] border-collapse text-left text-xs">
        <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.12em] text-mist/65">
          <tr>
            <th className="px-3 py-2 font-semibold">Club</th>
            <th className="px-3 py-2 font-semibold">Last 5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const canOpen = Boolean(onOpenTeam && row.teamId)
            return (
              <tr key={row.teamId} className="border-t border-white/10">
                <td className="px-3 py-2 font-semibold text-cream">
                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTeam?.({
                          id: row.teamId,
                          name: row.team,
                          shortName: row.shortName,
                          leagueId,
                          kind: isInternationalLeague(leagueId) ? 'national' : 'club',
                        })
                      }
                      className="profile-link text-left transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {row.shortName}
                    </button>
                  ) : (
                    row.shortName
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.form.length === 0 ? (
                    <span className="text-mist/50">—</span>
                  ) : (
                    <div className="flex gap-1" aria-label={`${row.shortName} form`}>
                      {row.form.map((result, index) => (
                        <FormDot key={`${row.teamId}-${index}-${result}`} result={result} />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
