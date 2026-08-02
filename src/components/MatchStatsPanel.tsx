import type { FavoriteTeam } from '../lib/favorites'
import { MISSING_LONG, missingLong, missingShort } from '../lib/display'
import type { MatchDetailStats, MatchLineupPlayer, MatchMoment } from '../lib/stats/types'
import { MatchLineupPanel } from './MatchLineupPanel'

function MomentRow({ moment }: { moment: MatchMoment }) {
  const isGoal = moment.kind === 'goal'
  const isRed = moment.cardKind === 'red'
  const label = moment.label || (isGoal ? 'Goal' : 'Card')
  const primary = moment.primaryPlayer
  const assist = isGoal ? moment.secondaryPlayer : undefined

  return (
    <li className="flex gap-2.5 text-xs">
      <span
        className={[
          'w-11 shrink-0 pt-0.5 font-bold tabular-nums',
          isGoal ? 'text-lime' : isRed ? 'text-red-300' : 'text-mist/70',
        ].join(' ')}
      >
        {missingShort(moment.clock)}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={[
            'font-semibold',
            isGoal ? 'text-cream' : isRed ? 'text-red-200' : 'text-cream',
          ].join(' ')}
        >
          {label}
        </span>
        {moment.teamName ? (
          <span className="text-mist/55"> · {missingShort(moment.teamName)}</span>
        ) : null}
        {primary ? (
          <span className="mt-0.5 block text-cream">
            {missingShort(primary)}
            {assist ? (
              <span className="text-mist/65">
                {' '}
                · Assist: {missingShort(assist)}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="mt-0.5 block text-mist/80">{missingLong(moment.text)}</span>
        )}
      </span>
    </li>
  )
}

export function MatchStatsPanel({
  stats,
  loading,
  error,
  scheduled,
  onOpenPlayer,
  onOpenTeam,
}: {
  stats: MatchDetailStats | null
  loading: boolean
  error: string | null
  scheduled: boolean
  onOpenPlayer?: (player: MatchLineupPlayer) => void
  onOpenTeam?: (team: FavoriteTeam) => void
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
    return <p className="mt-3 text-xs text-mist/65">{MISSING_LONG}</p>
  }

  const majorMoments = stats.moments.filter(
    (moment) => moment.kind === 'goal' || moment.kind === 'card',
  )

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="mb-4">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          Key moments
        </p>
        {majorMoments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {majorMoments.map((moment) => (
              <MomentRow key={moment.id} moment={moment} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mist/65">No goals or cards yet.</p>
        )}
      </div>

      <div className="mb-4 border-t border-white/10 pt-3">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          Lineups
        </p>
        <p className="mb-3 text-xs text-mist/65">
          Tap a player for their profile. Ratings start at 5.0 and average out over the match.
        </p>
        <MatchLineupPanel
          lineups={stats.lineups}
          onOpenPlayer={onOpenPlayer}
          onOpenTeam={onOpenTeam}
        />
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          Match stats
        </p>
        {stats.lines.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {stats.lines.map((line) => (
              <li
                key={line.key}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs"
              >
                <span className="text-right font-semibold tabular-nums text-cream">
                  {missingShort(line.home)}
                </span>
                <span className="min-w-[5.5rem] text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/65">
                  {line.label}
                </span>
                <span className="text-left font-semibold tabular-nums text-cream">
                  {missingShort(line.away)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mist/65">{MISSING_LONG}</p>
        )}
      </div>
    </div>
  )
}
