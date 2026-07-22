import { useState } from 'react'
import { getLeague } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
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

function TeamNameButton({
  match,
  side,
  onOpenTeam,
}: {
  match: Match
  side: 'home' | 'away'
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  const team = side === 'home' ? match.home : match.away
  const align = side === 'home' ? 'text-right' : 'text-left'

  if (!onOpenTeam) {
    return (
      <p className={`${align} text-sm font-semibold text-cream sm:text-base`}>{team.shortName}</p>
    )
  }

  return (
    <button
      type="button"
      onClick={() =>
        onOpenTeam({
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          leagueId: match.leagueId,
        })
      }
      className={`${align} text-sm font-semibold text-cream underline-offset-2 transition hover:text-lime hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime sm:text-base`}
    >
      {team.shortName}
    </button>
  )
}

function ExpandableMatchRow({
  match,
  showLeague = false,
  onOpenTeam,
}: {
  match: Match
  showLeague?: boolean
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  const [open, setOpen] = useState(false)
  const league = getLeague(match.leagueId)
  const status = statusLabel(match)
  const { stats, loading, error } = useMatchDetailStats(open ? match : null)

  return (
    <article className="border border-white/10 bg-white/[0.04] transition hover:border-lime/35 hover:bg-white/[0.07]">
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mb-2 flex w-full items-center justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
        >
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
        </button>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamNameButton match={match} side="home" onOpenTeam={onOpenTeam} />
          <Score match={match} />
          <TeamNameButton match={match} side="away" onOpenTeam={onOpenTeam} />
        </div>
      </div>

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
  onOpenTeam,
}: {
  matches: Match[]
  showLeague?: boolean
  emptyLabel: string
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-mist/70">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {matches.map((match) => (
        <li key={match.id}>
          <ExpandableMatchRow match={match} showLeague={showLeague} onOpenTeam={onOpenTeam} />
        </li>
      ))}
    </ul>
  )
}
