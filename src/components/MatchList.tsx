import { useState } from 'react'
import { getLeague, isInternationalLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import { formatKickoffTime } from '../lib/dates'
import { MISSING_LONG, MISSING_SHORT, missingLong, missingShort } from '../lib/display'
import { isFavoriteMatch, type Match } from '../lib/matches'
import type { MatchLineupPlayer } from '../lib/stats/types'
import { useMatchDetailStats } from '../lib/stats/useMatchDetailStats'
import { MatchStatsPanel } from './MatchStatsPanel'
import { PreMatchBriefingPanel } from './PreMatchBriefingPanel'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { loadSettings } from '../lib/settings'

function FavoriteDot({ label }: { label: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-star shadow-[0_0_8px_rgba(255,216,74,0.95)]"
      title={label}
      aria-label={label}
    />
  )
}

function toPlayerNav(player: MatchLineupPlayer): PlayerNavRef {
  return {
    id: player.id,
    leagueId: player.leagueId,
    name: player.name,
    shortName: player.shortName,
    photoUrl: player.photoUrl,
    jerseyUrl: player.jerseyUrl,
    jersey: player.jersey,
    teamId: player.teamId,
    teamName: player.teamName,
    position: player.positionAbbrev,
  }
}

function statusLabel(match: Match): string {
  if (match.status === 'scheduled') {
    return match.kickoffTimeKnown ? formatKickoffTime(match.kickoff) : MISSING_LONG
  }
  if (match.status === 'postponed') return missingLong(match.statusText || 'PPD')
  // Prefer ESPN clock / AET / PEN detail over a blunt LIVE/FT label.
  if (match.statusText?.trim()) return match.statusText
  if (match.status === 'live') return 'LIVE'
  if (match.status === 'finished') return 'FT'
  return MISSING_LONG
}

function Score({ match }: { match: Match }) {
  const showScore = match.status === 'live' || match.status === 'finished'
  if (!showScore) {
    return <span className="font-display text-lg tracking-wide text-mist/50">vs</span>
  }
  const home = match.home.score
  const away = match.away.score
  if (home == null || away == null) {
    return (
      <span className="font-display text-lg tracking-wide text-mist/50">{MISSING_SHORT}</span>
    )
  }
  return (
    <span className="font-display text-2xl tracking-wide text-cream tabular-nums">
      {home}
      <span className="mx-1 text-mist/50">–</span>
      {away}
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
  const label = missingShort(team.shortName)

  if (!onOpenTeam) {
    return (
      <p className={`${align} text-sm font-semibold text-cream sm:text-base`}>{label}</p>
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
          kind: isInternationalLeague(match.leagueId) ? 'national' : 'club',
        })
      }
      className={`${align} profile-link text-sm font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime sm:text-base`}
    >
      {label}
    </button>
  )
}

function ExpandableMatchRow({
  match,
  allMatches,
  showLeague = false,
  isFavorite = false,
  flat = false,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
}: {
  match: Match
  allMatches: Match[]
  showLeague?: boolean
  isFavorite?: boolean
  flat?: boolean
  onOpenTeam?: (team: FavoriteTeam) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenLeague?: (id: LeagueId) => void
}) {
  const [open, setOpen] = useState(false)
  const league = getLeague(match.leagueId)
  const status = statusLabel(match)
  const { stats, loading, error } = useMatchDetailStats(open ? match : null)
  const expandLabel =
    match.status === 'scheduled' ? 'Details' : match.status === 'live' ? 'Live' : 'Lineups'
  const leagueLabel = showLeague
    ? league.short
    : missingLong(match.venue)

  return (
    <article
      className={
        flat
          ? [
              'border-b border-white/10 transition last:border-b-0 hover:bg-white/[0.03]',
              isFavorite ? 'bg-star/[0.04]' : '',
            ].join(' ')
          : [
              'border bg-white/[0.04] transition hover:border-lime/35 hover:bg-white/[0.07]',
              isFavorite ? 'border-star/35' : 'border-white/10',
            ].join(' ')
      }
    >
      <div className={flat ? 'px-3 py-2.5' : 'px-4 py-3'}>
        <div className="mb-1.5 flex w-full items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/70">
            {isFavorite ? <FavoriteDot label="Favorite match" /> : null}
            {showLeague && onOpenLeague ? (
              <button
                type="button"
                onClick={() => onOpenLeague(match.leagueId)}
                className="profile-link truncate text-left transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                {leagueLabel}
              </button>
            ) : (
              <span className="truncate">{leagueLabel}</span>
            )}
          </p>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={[
              'shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] outline-none transition hover:text-lime focus-visible:ring-2 focus-visible:ring-lime',
              match.status === 'live' ? 'text-lime' : 'text-mist/80',
            ].join(' ')}
          >
            {status}
            <span className="ml-2 text-mist/50">
              {open ? '▴' : '▾'} {expandLabel}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamNameButton match={match} side="home" onOpenTeam={onOpenTeam} />
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${expandLabel} for ${match.home.shortName} vs ${match.away.shortName}`}
            onClick={() => setOpen((value) => !value)}
            className="outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            <Score match={match} />
          </button>
          <TeamNameButton match={match} side="away" onOpenTeam={onOpenTeam} />
        </div>
      </div>

      {open && (
        <div className={flat ? 'border-t border-white/10 px-3 pb-3 pt-1' : 'px-4 pb-3'}>
          {match.status === 'scheduled' || match.status === 'other' ? (
            <PreMatchBriefingPanel
              match={match}
              allMatches={allMatches}
              showPrediction={loadSettings().showPredictions}
            />
          ) : null}
          <MatchStatsPanel
            stats={stats}
            loading={loading}
            error={error}
            scheduled={match.status === 'scheduled'}
            onOpenPlayer={
              onOpenPlayer
                ? (player) => onOpenPlayer(toPlayerNav(player))
                : undefined
            }
            onOpenTeam={onOpenTeam}
          />
        </div>
      )}
    </article>
  )
}

export function MatchList({
  matches,
  allMatches,
  showLeague = false,
  flat = false,
  emptyLabel,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
  favoriteLeagueIds,
  favoriteTeamIds,
}: {
  matches: Match[]
  allMatches?: Match[]
  showLeague?: boolean
  /** Divider rows instead of nested bordered cards (for league shells). */
  flat?: boolean
  emptyLabel: string
  onOpenTeam?: (team: FavoriteTeam) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenLeague?: (id: LeagueId) => void
  favoriteLeagueIds?: Set<string>
  favoriteTeamIds?: Set<string>
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-mist/70">{emptyLabel}</p>
  }

  const leagueIds = favoriteLeagueIds ?? new Set<string>()
  const teamIds = favoriteTeamIds ?? new Set<string>()
  const briefingPool = allMatches ?? matches

  return (
    <ul className={flat ? 'flex flex-col' : 'flex flex-col gap-2'}>
      {matches.map((match) => (
        <li key={match.id}>
          <ExpandableMatchRow
            match={match}
            allMatches={briefingPool}
            showLeague={showLeague}
            flat={flat}
            isFavorite={isFavoriteMatch(match, leagueIds, teamIds)}
            onOpenTeam={onOpenTeam}
            onOpenPlayer={onOpenPlayer}
            onOpenLeague={onOpenLeague}
          />
        </li>
      ))}
    </ul>
  )
}
