import type { MatchDetailStats, MatchLineupPlayer } from '../lib/stats/types'
import { MatchLineupPanel } from './MatchLineupPanel'

export function MatchStatsPanel({
  stats,
  loading,
  error,
  scheduled,
  onOpenPlayer,
}: {
  stats: MatchDetailStats | null
  loading: boolean
  error: string | null
  scheduled: boolean
  onOpenPlayer?: (player: MatchLineupPlayer) => void
}) {
  if (scheduled) {
    return (
      <p className="mt-3 text-xs text-mist/65">
        Lineups usually post closer to kickoff.
        <span className="mt-1 block text-mist/55">
          Ratings and full match stats unlock once the match starts.
        </span>
      </p>
    )
  }

  if (loading && !stats) {
    return (
      <div className="mt-3 space-y-2" aria-label="Loading match details">
        <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
        <div className="h-10 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-10 animate-pulse rounded bg-white/[0.06]" />
      </div>
    )
  }

  if (error && !stats) {
    return <p className="mt-3 text-xs text-mist/70">{error}</p>
  }

  if (!stats) {
    return <p className="mt-3 text-xs text-mist/65">Match details aren’t ready yet.</p>
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="mb-4">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          Lineups + ratings
        </p>
        <p className="mb-3 text-xs text-mist/65">
          Tap a player for their profile. Ratings start at 5.0 and average out over the match.
        </p>
        <MatchLineupPanel lineups={stats.lineups} onOpenPlayer={onOpenPlayer} />
      </div>

      {stats.lines.length > 0 ? (
        <ul className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
          {stats.lines.map((line) => (
            <li
              key={line.key}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs"
            >
              <span className="text-right font-semibold tabular-nums text-cream">
                {line.home && line.home !== '—' ? line.home : 'Not available'}
              </span>
              <span className="min-w-[5.5rem] text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/65">
                {line.label}
              </span>
              <span className="text-left font-semibold tabular-nums text-cream">
                {line.away && line.away !== '—' ? line.away : 'Not available'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-mist/65">Not available</p>
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
                {moment.clock || 'Not available'}
              </span>
              <span>{moment.text || 'Not available'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
