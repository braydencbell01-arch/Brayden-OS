import { useState } from 'react'
import { getLeague } from '../lib/leagues'
import { formatKickoffTime } from '../lib/dates'
import type { Match } from '../lib/matches'
import { useMatchDetailStats } from '../lib/stats/useMatchDetailStats'
import { MatchStatsPanel } from './MatchStatsPanel'

function statusLabel(match: Match): string {
  if (match.status === 'scheduled') return formatKickoffTime(match.kickoff)
  if (match.status === 'live') return 'LIVE'
  if (match.status === 'finished') return 'FT'
  if (match.status === 'postponed') return 'PPD'
  return match.statusText
}

function Score({ match }: { match: Match }) {
  const showScore = match.status === 'live' || match.status === 'finished'
  if (!showScore) {
    return <span className="font-display text-lg tracking-wide text-mist/50">vs</span>
  }
  return (
    <span className="font-display text-2xl tracking-wide text-cream tabular-nums">
      {match.home.score ?? 0}
      <span className="mx-1 text-mist/50">–</span>
      {match.away.score ?? 0}
    </span>
  )
}

function ExpandableMatchRow({
  match,
  showLeague = false,
}: {
  match: Match
  showLeague?: boolean
}) {
  const [open, setOpen] = useState(false)
  const league = getLeague(match.leagueId)
  const status = statusLabel(match)
  const { stats, loading, error } = useMatchDetailStats(open ? match : null)

  return (
    <article className="border border-white/10 bg-white/[0.04] transition hover:border-lime/35 hover:bg-white/[0.07]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/70">
            {showLeague ? league.short : match.venue || league.country}
          </p>
          <p
            className={[
              'text-[0.65rem] font-bold uppercase tracking-[0.14em]',
              match.status === 'live' ? 'text-lime' : 'text-mist/80',
            ].join(' ')}
          >
            {status}
            <span className="ml-2 text-mist/50">{open ? '▴' : '▾'} stats</span>
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <p className="text-right text-sm font-semibold text-cream sm:text-base">
            {match.home.shortName}
          </p>
          <Score match={match} />
          <p className="text-left text-sm font-semibold text-cream sm:text-base">
            {match.away.shortName}
          </p>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3">
          <MatchStatsPanel
            stats={stats}
            loading={loading}
            error={error}
            scheduled={match.status === 'scheduled'}
          />
        </div>
      )}
    </article>
  )
}

export function MatchList({
  matches,
  showLeague = false,
  emptyLabel,
}: {
  matches: Match[]
  showLeague?: boolean
  emptyLabel: string
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-mist/70">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {matches.map((match) => (
        <li key={match.id}>
          <ExpandableMatchRow match={match} showLeague={showLeague} />
        </li>
      ))}
    </ul>
  )
}
