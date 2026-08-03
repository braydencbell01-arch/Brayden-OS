import { useEffect, useId, useMemo, useState } from 'react'
import { getLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import { leagueAccentColor } from '../lib/stats/branding'
import { groupMatchesByLeague, isFavoriteMatch, type Match } from '../lib/matches'
import { LeagueLogoMark } from './LeagueLogoMark'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'

const EMPTY_ID_SET = new Set<string>()

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
  allMatches,
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
  allMatches?: Match[]
  open: boolean
  onToggle: () => void
  onOpenTeam?: (team: FavoriteTeam) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenLeague?: (id: LeagueId) => void
  favoriteLeagueIds: Set<string>
  favoriteTeamIds: Set<string>
}) {
  const league = getLeague(leagueId)
  const accent = leagueAccentColor(leagueId)
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
      style={
        hasFavorite
          ? undefined
          : {
              borderColor: `${accent}55`,
              boxShadow: `inset 3px 0 0 ${accent}`,
            }
      }
    >
      <div className="flex w-full items-stretch gap-1 px-2 py-2 sm:px-3 sm:py-2.5">
        {onOpenLeague ? (
          <button
            type="button"
            onClick={() => onOpenLeague(leagueId)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            aria-label={`${league.name} profile`}
          >
            <LeagueLogoMark
              leagueId={leagueId}
              name={league.name}
              size="sm"
              ringColor={accent}
            />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-cream sm:text-base">
                {hasFavorite ? <FavoriteDot /> : null}
                <span className="profile-link truncate">{league.name}</span>
              </p>
              <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                {league.country}
                {liveCount > 0 ? (
                  <span className="ml-2 text-lime">· {liveCount} live</span>
                ) : null}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1">
            <LeagueLogoMark
              leagueId={leagueId}
              name={league.name}
              size="sm"
              ringColor={accent}
            />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-cream sm:text-base">
                {hasFavorite ? <FavoriteDot /> : null}
                <span className="truncate">{league.name}</span>
              </p>
              <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                {league.country}
                {liveCount > 0 ? (
                  <span className="ml-2 text-lime">· {liveCount} live</span>
                ) : null}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex shrink-0 items-center gap-2 rounded px-2 py-1 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          aria-label={`${open ? 'Collapse' : 'Expand'} ${league.name} matches`}
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
            allMatches={allMatches}
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
  allMatches,
  dateKey,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
  emptyLabel,
  favoriteLeagueIds,
  favoriteTeamIds,
}: {
  matches: Match[]
  /** Broader pool for form/briefings (e.g. all loaded matches, not just the day). */
  allMatches?: Match[]
  /** Reset open panels when the selected calendar day changes */
  dateKey: string
  onOpenTeam?: (team: FavoriteTeam) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenLeague?: (id: LeagueId) => void
  emptyLabel: string
  favoriteLeagueIds?: Set<string>
  favoriteTeamIds?: Set<string>
}) {
  // Favorites first, then biggest competitions — not onboarding preferred league.
  const groups = useMemo(
    () => groupMatchesByLeague(matches, favoriteLeagueIds, null, favoriteTeamIds),
    [matches, favoriteLeagueIds, favoriteTeamIds],
  )
  const leagueIds = favoriteLeagueIds ?? EMPTY_ID_SET
  const teamIds = favoriteTeamIds ?? EMPTY_ID_SET

  const [openIds, setOpenIds] = useState<Set<LeagueId>>(() => new Set())

  useEffect(() => {
    setOpenIds(new Set())
  }, [dateKey])

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
          allMatches={allMatches}
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
