import type { StandingRow } from '../lib/stats/types'

export function StandingsTable({
  rows,
  loading,
  error,
}: {
  rows: StandingRow[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return <p className="text-sm text-mist/70">Loading table…</p>
  }

  if (error) {
    return <p className="text-sm text-mist/80">{error}</p>
  }

  if (rows.length === 0) {
    return <p className="text-sm text-mist/70">Standings are not available yet for this season.</p>
  }

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
        <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.12em] text-mist/65">
          <tr>
            <th className="px-3 py-2 font-semibold">#</th>
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
          {rows.map((row) => (
            <tr key={`${row.rank}-${row.team}`} className="border-t border-white/10">
              <td className="px-3 py-2 tabular-nums text-mist/80">{row.rank}</td>
              <td className="px-3 py-2 font-semibold text-cream">
                {row.shortName}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
