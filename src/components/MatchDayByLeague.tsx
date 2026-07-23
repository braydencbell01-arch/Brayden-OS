import { useId, useMemo, useState } from 'react'
import { getLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import { groupMatchesByLeague, isFavoriteMatch, type Match } from '../lib/matches'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-lime/80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FavoriteDot() {
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-star shadow-[0_0_8px_rgba(255,216,74,0.95)]"
      aria-hidden
    />
  )
}

function LeagueDropdown({
  leagueId,
  matches,
  open,
  onToggle,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
  favoriteLeagueIds,
  favoriteTeamIds,
}: {
  leagueId: LeagueId
  matches: Match[]
  open: boolean
  onToggle: () => void
  onOpenTeam?: (team: FavoriteTeam) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenLeague?: (id: LeagueId) => void
  favoriteLeagueIds: Set<string>
  favoriteTeamIds: Set<string>
}) {
  const league = getLeague(leagueId)
  const panelId = useId()
  const liveCount = matches.filter((match) => match.status === 'live').length
  const hasFavorite = matches.some((match) =>
    isFavoriteMatch(match, favoriteLeagueIds, favoriteTeamIds),
  )

  return (
    <div
      className={[
        'overflow-hidden border bg-pitch/40',
        hasFavorite ? 'border-star/30' : 'border-white/10',
      ].join(' ')}
    >
      <div className="flex w-full items-center gap-2 px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-cream sm:text-base">
            {hasFavorite ? <FavoriteDot /> : null}
            {onOpenLeague ? (
              <button
                type="button"
                onClick={() => onOpenLeague(leagueId)}
                className="profile-link min-w-0 truncate text-left transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                {league.name}
              </button>
            ) : (
              <span className="truncate">{league.name}</span>
            )}
          </p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
            {league.country}
            {liveCount > 0 ? (
              <span className="ml-2 text-lime">· {liveCount} live</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex shrink-0 items-center gap-2 rounded px-1.5 py-1 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          <span className="font-display text-lg tracking-wide text-cream/85 tabular-nums">
            {matches.length}
          </span>
          <Chevron open={open} />
        </button>
      </div>

      {open ? (
        <div id={panelId} className="border-t border-white/10">
          <MatchList
            matches={matches}
            showLeague={false}
            flat
            onOpenTeam={onOpenTeam}
            onOpenPlayer={onOpenPlayer}
            onOpenLeague={onOpenLeague}
            favoriteLeagueIds={favoriteLeagueIds}
            favoriteTeamIds={favoriteTeamIds}
            emptyLabel="No matches in this league."
          />
        </div>
      ) : null}
    </div>
  )
}

export function MatchDayByLeague({
  matches,
  dateKey,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
  emptyLabel,
  favoriteLeagueIds,
  favoriteTeamIds,
}: {
  matches: Match[]
  /** Reset open panels when the selected calendar day changes */
  dateKey: string
  onOpenTeam?: (team: FavoriteTeam) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenLeague?: (id: LeagueId) => void
  emptyLabel: string
  favoriteLeagueIds?: Set<string>
  favoriteTeamIds?: Set<string>
}) {
  const groups = useMemo(
    () => groupMatchesByLeague(matches, favoriteLeagueIds),
    [matches, favoriteLeagueIds],
  )
  const leagueIds = favoriteLeagueIds ?? new Set<string>()
  const teamIds = favoriteTeamIds ?? new Set<string>()

  const [openIds, setOpenIds] = useState<Set<LeagueId>>(() => new Set())
  const [openForDate, setOpenForDate] = useState(dateKey)

  if (openForDate !== dateKey) {
    setOpenForDate(dateKey)
    setOpenIds(new Set())
  }

  if (groups.length === 0) {
    return <p className="text-sm text-mist/70">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map(({ leagueId, matches: leagueMatches }) => (
        <LeagueDropdown
          key={leagueId}
          leagueId={leagueId}
          matches={leagueMatches}
          open={openIds.has(leagueId)}
          onToggle={() =>
            setOpenIds((prev) => {
              const next = new Set(prev)
              if (next.has(leagueId)) next.delete(leagueId)
              else next.add(leagueId)
              return next
            })
          }
          onOpenTeam={onOpenTeam}
          onOpenPlayer={onOpenPlayer}
          onOpenLeague={onOpenLeague}
          favoriteLeagueIds={leagueIds}
          favoriteTeamIds={teamIds}
        />
      ))}
    </div>
  )
}
