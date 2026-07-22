import type { MatchDetailStats } from '../lib/stats/types'

export function MatchStatsPanel({
  stats,
  loading,
  error,
  scheduled,
}: {
  stats: MatchDetailStats | null
  loading: boolean
  error: string | null
  scheduled: boolean
}) {
  if (scheduled) {
    return (
      <p className="mt-3 text-xs text-mist/65">
        Full match stats unlock at kickoff — Jefferson will pull them live from ESPN.
      </p>
    )
  }

  if (loading && !stats) {
    return <p className="mt-3 text-xs text-mist/65">Pulling match stats…</p>
  }

  if (error && !stats) {
    return <p className="mt-3 text-xs text-mist/70">{error}</p>
  }

  if (!stats) return null

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      {stats.lines.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {stats.lines.map((line) => (
            <li
              key={line.key}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs"
            >
              <span className="text-right font-semibold tabular-nums text-cream">{line.home}</span>
              <span className="min-w-[5.5rem] text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/65">
                {line.label}
              </span>
              <span className="text-left font-semibold tabular-nums text-cream">{line.away}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-mist/65">No team stats published for this match yet.</p>
      )}

      {stats.moments.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-white/10 pt-3">
          {stats.moments.map((moment) => (
            <li key={moment.id} className="flex gap-2 text-xs text-mist/85">
              <span
                className={[
                  'w-10 shrink-0 font-bold tabular-nums',
                  moment.kind === 'goal' ? 'text-lime' : 'text-mist/70',
                ].join(' ')}
              >
                {moment.clock || '—'}
              </span>
              <span>{moment.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
