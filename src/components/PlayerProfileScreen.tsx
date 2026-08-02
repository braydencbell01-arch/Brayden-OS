import { useCallback, useEffect, useRef, useState, type ReactNode, Fragment } from 'react'
import { MISSING_LONG, MISSING_SHORT, missingLong, missingShort } from '../lib/display'
import { isInternationalLeague, type LeagueId } from '../lib/leagues'
import type { FavoritePlayer, FavoriteTeam, FavoritesApi } from '../lib/favorites'
import { leagueIdFromEspnCode } from '../lib/search'
import { ratingColorStyle } from '../lib/stats/ratingColor'
import { usePlayerAdvancedExtras } from '../lib/stats/usePlayerAdvancedExtras'
import { usePlayerCareer } from '../lib/stats/usePlayerCareer'
import { usePlayerProfile } from '../lib/stats/usePlayerProfile'
import type {
  MatchLineupPlayer,
  PlayerCareerSeason,
  PlayerClubStint,
  PlayerRecentMatchRating,
} from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'
import { PlayerAvatar } from './PlayerAvatar'
import { ProfileAccordion } from './ProfileAccordion'
import { RatingBreakdownPanel } from './RatingBreakdownPanel'
import {
  ProfileHeader,
  ProfileMetric,
  ProfileMetricsRow,
  ProfileShell,
} from './ProfileShell'
import { SeasonPicker } from './SeasonPicker'
import { buildHash, shareUrlForHash } from '../lib/hashRoute'

export type PlayerNavRef = {
  id: string
  leagueId: MatchLineupPlayer['leagueId']
  name?: string
  shortName?: string
  photoUrl?: string
  jerseyUrl?: string
  jersey?: string
  teamId?: string
  teamName?: string
  position?: string
}

function formatMatchDate(iso: string | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SoccerBallIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 6.2 14.6 8.1 13.7 11.2h-3.4L9.4 8.1 12 6.2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M8.2 12.4 9.4 15.4 7.2 17.6M15.8 12.4 14.6 15.4 16.8 17.6M7.2 17.6h9.6M6.4 10.2 8.2 12.4M17.6 10.2 15.8 12.4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Cleat / boot mark used for assists. */
function CleatIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4.5 14.2c1.2-1.1 2.8-1.7 5.1-1.7h5.2c1.7 0 3 .4 4.1 1.3.7.6 1.1 1.4 1.1 2.3v.6c0 .7-.6 1.3-1.3 1.3H8.4c-1.6 0-3-.7-4-1.9-.5-.7-.6-1.3.1-1.9Z"
        fill="currentColor"
      />
      <path
        d="M9.2 12.5V9.8c0-1.5.9-2.8 2.3-3.3l3.2-1.1c.7-.2 1.4.3 1.4 1v2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 19.2v1M11.2 19.4v1M14.2 19.4v1M17.1 19.2v1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function repeatIcons(count: number, Icon: typeof SoccerBallIcon, label: string) {
  const n = Math.max(0, Math.min(8, Math.floor(count)))
  if (n === 0) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-lime" title={`${n} ${label}`} aria-label={`${n} ${label}`}>
      {Array.from({ length: n }, (_, i) => (
        <Icon key={i} className="shrink-0" />
      ))}
    </span>
  )
}

function ratingMatchMetaParts(row: PlayerRecentMatchRating): {
  opponentLabel: string | null
  rest: string
} {
  const opponentLabel =
    row.opponentAbbrev || row.opponent
      ? `vs ${row.opponentAbbrev || row.opponent}`
      : null
  const side = row.homeAway === 'home' ? 'H' : row.homeAway === 'away' ? 'A' : null
  const score =
    row.teamScore != null && row.opponentScore != null
      ? `${row.teamScore}-${row.opponentScore}`
      : null
  const date = formatMatchDate(row.date)
  const minutes =
    row.minutes != null && row.minutes > 0 ? `${Math.round(row.minutes)}′` : null
  const rest = [
    side,
    score,
    date,
    minutes,
    row.starter ? 'Started' : 'Sub',
  ]
    .filter(Boolean)
    .join(' · ')
  return { opponentLabel, rest }
}

function RecentRatingsList({
  rows,
  leagueId,
  hasMore,
  loadingMore,
  loadError,
  onLoadMore,
  onOpenTeam,
}: {
  rows: PlayerRecentMatchRating[]
  leagueId: LeagueId
  hasMore: boolean
  loadingMore: boolean
  loadError: string | null
  onLoadMore: () => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  const scrollerRef = useRef<HTMLUListElement | null>(null)
  const sentinelRef = useRef<HTMLLIElement | null>(null)

  const maybeLoad = useCallback(() => {
    if (!hasMore || loadingMore) return
    onLoadMore()
  }, [hasMore, loadingMore, onLoadMore])

  useEffect(() => {
    const root = scrollerRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) maybeLoad()
      },
      { root, rootMargin: '80px', threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [maybeLoad, rows.length])

  return (
    <ul
      ref={scrollerRef}
      className="flex max-h-80 flex-col gap-1.5 overflow-y-auto overscroll-contain pr-1"
    >
      {rows.map((row) => {
        const goals = repeatIcons(row.goals, SoccerBallIcon, 'goals')
        const assists = repeatIcons(row.assists, CleatIcon, 'assists')
        const { opponentLabel, rest } = ratingMatchMetaParts(row)
        const canOpenOpponent = Boolean(
          onOpenTeam && row.opponentId && /^\d+$/.test(row.opponentId),
        )
        return (
          <Fragment key={row.eventId}>
          <li
            className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug text-mist/75">
                {opponentLabel ? (
                  canOpenOpponent ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTeam?.({
                          id: row.opponentId!,
                          name: row.opponent || row.opponentAbbrev || 'Opponent',
                          shortName: row.opponentAbbrev || row.opponent || 'Opponent',
                          leagueId,
                          kind: isInternationalLeague(leagueId) ? 'national' : 'club',
                        })
                      }
                      className="profile-link font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {opponentLabel}
                    </button>
                  ) : (
                    <span className="font-semibold text-cream">{opponentLabel}</span>
                  )
                ) : null}
                {opponentLabel && rest ? ' · ' : null}
                {rest}
              </p>
              {goals || assists ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {goals}
                  {assists}
                </div>
              ) : null}
            </div>
            <span
              className="shrink-0 font-display text-2xl tabular-nums"
              style={ratingColorStyle(row.rating)}
            >
              {row.rating.toFixed(1)}
            </span>
          </li>
          {row.performance100 != null ? (
            <li key={`${row.eventId}-why`} className="list-none px-1 pb-2">
              <RatingBreakdownPanel
                compact
                breakdown={{
                  rating: row.rating,
                  performance100: row.performance100,
                  attack: row.attack ?? 0,
                  creation: row.creation ?? 0,
                  discipline: row.discipline ?? 0,
                  goalkeeping: row.goalkeeping ?? 0,
                  defending: row.defending ?? 0,
                  notes: row.notes ?? [],
                  minutesUsed: row.minutes ?? 90,
                }}
              />
            </li>
          ) : null}
        </Fragment>
        )
      })}
      <li ref={sentinelRef} className="list-none py-1 text-center text-[11px] text-mist/50">
        {loadError ? (
          <button
            type="button"
            onClick={onLoadMore}
            className="text-star underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            {loadError} · Retry
          </button>
        ) : loadingMore ? (
          'Loading more ratings…'
        ) : hasMore ? (
          'Scroll for more'
        ) : (
          'End of ratings'
        )}
      </li>
    </ul>
  )
}

function ProfileTextLink({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`profile-link text-left transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${className}`}
    >
      {children}
    </button>
  )
}

function CareerSeasonsPanel({
  seasons,
  loading,
  error,
  fallbackLeagueId,
  onOpenTeam,
  emptyLabel = 'No club seasons listed yet.',
}: {
  seasons: PlayerCareerSeason[]
  loading: boolean
  error: string | null
  fallbackLeagueId: LeagueId
  onOpenTeam?: (team: FavoriteTeam) => void
  emptyLabel?: string
}) {
  if (loading && seasons.length === 0) {
    return <p className="text-sm text-mist/70">Loading career…</p>
  }
  if (error && seasons.length === 0) {
    return <p className="text-sm text-mist/80">{error}</p>
  }
  if (seasons.length === 0) {
    return <p className="text-sm text-mist/70">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {seasons.map((row) => {
        const leagueId = leagueIdFromEspnCode(row.leagueSlug) || fallbackLeagueId
        const canOpen = Boolean(onOpenTeam && row.clubId && /^\d+$/.test(row.clubId))
        return (
          <li
            key={row.id}
            className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_auto] items-center gap-2 border border-white/10 px-3 py-2.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_auto]"
          >
            <div className="min-w-0">
              {canOpen ? (
                <ProfileTextLink
                  className="block truncate text-sm font-semibold text-cream"
                  onClick={() =>
                    onOpenTeam?.({
                      id: row.clubId,
                      name: row.clubName,
                      shortName: row.clubName,
                      leagueId,
                      kind: isInternationalLeague(leagueId) ? 'national' : 'club',
                    })
                  }
                >
                  {row.clubName}
                </ProfileTextLink>
              ) : (
                <p className="truncate text-sm font-semibold text-cream">{row.clubName}</p>
              )}
              <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                {row.leagueName}
                <span className="text-mist/40"> · </span>
                {row.seasonYear}
              </p>
            </div>
            <p className="text-sm tabular-nums text-mist/85">
              <span className="font-semibold text-cream">{row.matchesPlayed}</span> MP
              <span className="mx-1.5 text-mist/35">·</span>
              <span className="font-semibold text-cream">{row.goals}</span> G
              <span className="mx-1.5 text-mist/35">·</span>
              <span className="font-semibold text-cream">{row.assists}</span> A
            </p>
            <p
              className={`text-right font-display text-2xl tabular-nums ${
                row.averageRating == null ? 'text-mist/40' : ''
              }`}
              style={ratingColorStyle(row.averageRating)}
              title="Average Brayden Rating"
            >
              {row.averageRating != null ? row.averageRating.toFixed(1) : MISSING_SHORT}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function ClubHistoryList({
  stints,
  emptyLabel,
  leagueId,
  kind = 'club',
  onOpenTeam,
}: {
  stints: PlayerClubStint[]
  emptyLabel: string
  leagueId: LeagueId
  kind?: FavoriteTeam['kind']
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  if (stints.length === 0) {
    return <p className="text-sm text-mist/70">{emptyLabel}</p>
  }

  const openLeagueId: LeagueId = kind === 'national' ? 'fifa-friendly' : leagueId

  return (
    <ul className="flex flex-col gap-1.5">
      {stints.map((stint) => {
        const canOpen = Boolean(onOpenTeam && stint.teamId && /^\d+$/.test(stint.teamId))
        return (
          <li
            key={`${stint.teamId}-${stint.seasons}`}
            className="flex items-center gap-3 border border-white/10 px-3 py-2.5"
          >
            {stint.logoUrl ? (
              <img
                src={stint.logoUrl}
                alt=""
                className="h-7 w-7 object-contain"
                loading="lazy"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-white/10" />
            )}
            <div className="min-w-0 flex-1">
              {canOpen ? (
                <ProfileTextLink
                  className="block truncate text-sm font-semibold text-cream"
                  onClick={() =>
                    onOpenTeam?.({
                      id: stint.teamId,
                      name: stint.teamName,
                      shortName: stint.teamName,
                      leagueId: openLeagueId,
                      kind,
                    })
                  }
                >
                  {missingShort(stint.teamName)}
                </ProfileTextLink>
              ) : (
                <p className="truncate text-sm font-semibold text-cream">
                  {missingShort(stint.teamName)}
                </p>
              )}
              <p className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                {missingShort(stint.seasons)}
                {stint.isActive ? (
                  <span className="ml-2 text-lime">Active</span>
                ) : null}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function SeasonStatsCompare({
  current,
  currentLabel,
  previous,
  previousLabel,
}: {
  current: Array<{ label: string; value: string }>
  currentLabel?: string
  previous?: Array<{ label: string; value: string }>
  previousLabel?: string
}) {
  if (current.length === 0) {
    return (
      <p className="text-sm text-mist/70">No full-season stats for this season yet.</p>
    )
  }

  if (!previous || previous.length === 0) {
    return (
      <ul className="grid grid-cols-2 gap-2">
        {current.map((stat) => (
          <li key={stat.label} className="border border-white/10 px-3 py-2">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-2xl text-cream tabular-nums">{stat.value}</p>
          </li>
        ))}
      </ul>
    )
  }

  const labels = Array.from(
    new Set([...current.map((s) => s.label), ...previous.map((s) => s.label)]),
  )
  const currentByLabel = new Map(current.map((s) => [s.label, s.value]))
  const previousByLabel = new Map(previous.map((s) => [s.label, s.value]))

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[16rem] border-collapse text-left text-xs">
        <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.12em] text-mist/65">
          <tr>
            <th className="px-3 py-2 font-semibold">Stat</th>
            <th className="px-3 py-2 text-right font-semibold">
              {currentLabel || 'This season'}
            </th>
            <th className="px-3 py-2 text-right font-semibold">
              {previousLabel || 'Last season'}
            </th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr key={label} className="border-t border-white/10">
              <td className="px-3 py-2 font-semibold text-cream">{label}</td>
              <td className="px-3 py-2 text-right font-display text-lg tabular-nums text-lime">
                {currentByLabel.get(label) ?? MISSING_SHORT}
              </td>
              <td className="px-3 py-2 text-right font-display text-lg tabular-nums text-mist/80">
                {previousByLabel.get(label) ?? MISSING_SHORT}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PlayerProfileScreen({
  player,
  favorites,
  onBack,
  onOpenTeam,
  onOpenLeague: _onOpenLeague,
  reduce,
}: {
  player: PlayerNavRef
  favorites: FavoritesApi
  onBack: () => void
  onOpenTeam?: (team: FavoriteTeam) => void
  /** Kept for callers; league country no longer shown in the header subtitle. */
  onOpenLeague?: (id: LeagueId) => void
  reduce: boolean | null
}) {
  void _onOpenLeague
  const {
    profile,
    loading,
    error,
    reload,
    loadMoreRatings,
    loadingMoreRatings,
    hasMoreRatings,
    ratingsMoreError,
    seasons,
    seasonsLoading,
    selectedSeason,
    selectedSeasonKey,
    selectSeason,
    statsLoading,
  } = usePlayerProfile(player.leagueId, player.id)
  const displayLeagueId = profile?.leagueId || player.leagueId
  const [openSection, setOpenSection] = useState<
    'stats' | 'ratings' | 'career' | 'transfers' | null
  >(null)

  const career = usePlayerCareer(
    profile?.id ?? player.id,
    profile?.clubHistory,
    profile?.positionAbbrev || player.position,
    openSection === 'career',
  )
  const nationalCareer = usePlayerCareer(
    profile?.id ?? player.id,
    profile?.nationalHistory,
    profile?.positionAbbrev || player.position,
    openSection === 'career',
    { national: true },
  )
  const advanced = usePlayerAdvancedExtras(
    profile?.name || player.name || null,
    Boolean(profile),
  )

  const favoritePayload: FavoritePlayer = {
    id: player.id,
    name: profile?.name || player.name || 'Player',
    shortName: profile?.shortName || player.shortName || player.name || 'Player',
    photoUrl: profile?.photoUrl || player.photoUrl,
    jerseyUrl: profile?.jerseyUrl || player.jerseyUrl,
    jersey: profile?.jersey || player.jersey,
    position: profile?.position || player.position,
    citizenship: profile?.citizenship || profile?.represents || undefined,
    leagueId: profile?.leagueId || player.leagueId,
    teamId: profile?.teamId || player.teamId,
    teamName: profile?.teamName || player.teamName,
  }

  const favorited = favorites.isPlayerFavorite(player.id)
  const represents = profile?.represents || profile?.citizenship || null
  const nationality = profile?.citizenship || profile?.represents || null
  const positionLabel = profile?.position || player.position || null
  const teamId = profile?.teamId || player.teamId
  const teamName = profile?.teamName || player.teamName
  const canOpenClub = Boolean(onOpenTeam && teamId && teamName && /^\d+$/.test(teamId))
  const activeClubStint = profile?.clubHistory.find((stint) => stint.isActive)
  const nationalSide =
    profile?.nationalHistory.find((stint) => stint.isActive) || profile?.nationalHistory[0]
  const alsoPlaysFor =
    nationalSide && teamId && nationalSide.teamId !== teamId ? nationalSide : null

  useEffect(() => {
    if (!favorited || !profile) return
    favorites.patchPlayer(favoritePayload)
    // Only sync when profile identity / nationality fields settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid looping on favorites object identity
  }, [
    favorited,
    profile?.id,
    profile?.citizenship,
    profile?.represents,
    profile?.name,
    profile?.teamId,
    profile?.teamName,
    profile?.position,
    profile?.leagueId,
  ])

  const openCurrentClub = () => {
    if (!canOpenClub || !teamId || !teamName) return
    const clubLeagueId = profile?.leagueId || player.leagueId
    onOpenTeam?.({
      id: teamId,
      name: teamName,
      shortName: teamName,
      leagueId: clubLeagueId,
      kind: isInternationalLeague(clubLeagueId) ? 'national' : 'club',
    })
  }

  const openAlsoPlaysFor = () => {
    if (!alsoPlaysFor || !onOpenTeam) return
    onOpenTeam({
      id: alsoPlaysFor.teamId,
      name: alsoPlaysFor.teamName,
      shortName: alsoPlaysFor.teamName,
      leagueId: 'fifa-friendly',
      kind: 'national',
    })
  }

  const toggle = (section: 'stats' | 'ratings' | 'career' | 'transfers') => {
    setOpenSection((current) => (current === section ? null : section))
  }

  return (
    <ProfileShell onBack={onBack} reduce={reduce}>
      {loading && !profile ? (
        <p className="text-sm text-mist/70">Loading player…</p>
      ) : error && !profile ? (
        <div className="border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-sm text-mist/80">{error}</p>
          <button
            type="button"
            onClick={() => void reload(player.leagueId, player.id)}
            className="mt-3 rounded-full border border-lime/45 bg-lime/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime transition hover:bg-lime hover:text-ink"
          >
            Retry
          </button>
        </div>
      ) : profile ? (
        <>
          <ProfileHeader
            reduce={reduce}
            star={
              <FavoriteStar
                active={favorited}
                label={profile.name}
                onToggle={() => favorites.togglePlayer(favoritePayload)}
              />
            }
            trailing={
              <div className="flex flex-col items-end gap-2">
                <PlayerAvatar
                  name={profile.name}
                  photoUrl={profile.photoUrl}
                  jerseyUrl={profile.jerseyUrl || player.jerseyUrl}
                  jersey={profile.jersey || player.jersey}
                  size="lg"
                />
                {profile.teamLogoUrl ? (
                  <img
                    src={profile.teamLogoUrl}
                    alt=""
                    className="h-8 w-8 object-contain"
                    loading="lazy"
                  />
                ) : null}
              </div>
            }
            eyebrow={
              <span className="inline-flex items-center gap-2">
                {profile.flagUrl ? (
                  <img
                    src={profile.flagUrl}
                    alt=""
                    className="h-4 w-6 object-contain"
                    loading="lazy"
                  />
                ) : null}
                <span>
                  {represents
                    ? profile.representsNationalTeam
                      ? `Represents ${represents}`
                      : represents
                    : missingLong(null)}
                  {profile.dateOfBirth ? ` · Born ${profile.dateOfBirth}` : ''}
                </span>
              </span>
            }
            title={missingShort(profile.name)}
            meta={
              <>
                {canOpenClub ? (
                  <ProfileTextLink onClick={openCurrentClub}>
                    {missingShort(teamName)}
                  </ProfileTextLink>
                ) : (
                  missingLong(teamName)
                )}
                {activeClubStint?.isActive ? (
                  <span className="text-mist/55"> · Active</span>
                ) : null}
                {` · ${missingShort(positionLabel)}`}
                {nationality ? (
                  <>
                    {' · '}
                    <span>{missingShort(nationality)}</span>
                  </>
                ) : null}
                {profile.jersey ? ` · #${missingShort(profile.jersey)}` : ''}
              </>
            }
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const hash = buildHash({
                  kind: 'player',
                  player: {
                    id: player.id,
                    leagueId: player.leagueId,
                    name: profile.name,
                    shortName: profile.shortName,
                    teamId: profile.teamId,
                    teamName: profile.teamName,
                    position: profile.position,
                  },
                })
                const url = shareUrlForHash(hash)
                void navigator.clipboard.writeText(url).catch(() => {
                  window.prompt('Copy profile link', url)
                })
              }}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist transition hover:border-lime/40 hover:text-lime"
            >
              Copy link
            </button>
          </div>

          {alsoPlaysFor ? (
            <button
              type="button"
              onClick={openAlsoPlaysFor}
              className="mt-4 flex w-full items-center gap-3 border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition hover:border-lime/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              {alsoPlaysFor.logoUrl ? (
                <img
                  src={alsoPlaysFor.logoUrl}
                  alt=""
                  className="h-7 w-7 object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-white/10" />
              )}
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                  Also plays for
                </p>
                <p className="profile-link truncate text-sm font-semibold text-cream">
                  {alsoPlaysFor.teamName}
                </p>
              </div>
            </button>
          ) : null}

          {advanced.data?.injury ? (
            <p className="mt-3 border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-mist/80">
              Injury · {advanced.data.injury}
            </p>
          ) : null}

          {profile.seasonSummary && profile.seasonSummary.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Season snapshot">
              {profile.seasonSummary.map((chip) => (
                <span
                  key={chip.label}
                  className="border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/80"
                >
                  <span className="text-cream">{chip.value}</span>
                  <span className="ml-1.5 text-mist/50">{chip.label}</span>
                </span>
              ))}
            </div>
          ) : null}

          <ProfileMetricsRow>
            <ProfileMetric
              label="Avg rating"
              value={
                <span
                  className={profile.averageRating == null ? 'text-mist/50' : ''}
                  style={ratingColorStyle(profile.averageRating)}
                >
                  {profile.averageRating != null
                    ? profile.averageRating.toFixed(1)
                    : MISSING_SHORT}
                </span>
              }
            />
            <ProfileMetric
              label="xG"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {advanced.loading && advanced.data?.xg == null
                    ? '…'
                    : missingShort(
                        advanced.data?.xg != null ? advanced.data.xg.toFixed(2) : null,
                      )}
                </span>
              }
            />
            <ProfileMetric
              label="xA"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {advanced.loading && advanced.data?.xa == null
                    ? '…'
                    : missingShort(
                        advanced.data?.xa != null ? advanced.data.xa.toFixed(2) : null,
                      )}
                </span>
              }
            />
            <ProfileMetric
              label="G − xG"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {advanced.data?.goalsMinusXg != null
                    ? `${advanced.data.goalsMinusXg > 0 ? '+' : ''}${advanced.data.goalsMinusXg.toFixed(2)}`
                    : missingShort(null)}
                </span>
              }
            />
            <ProfileMetric
              label="Value"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {missingShort(advanced.data?.marketValue)}
                </span>
              }
            />
            <ProfileMetric label="Age" value={profile.age ?? MISSING_SHORT} />
            <ProfileMetric
              label="Height"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {missingShort(profile.height)}
                </span>
              }
            />
            <ProfileMetric
              label="Weight"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {missingShort(profile.weight)}
                </span>
              }
            />
            <ProfileMetric
              label="Position"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {missingShort(positionLabel)}
                </span>
              }
            />
          </ProfileMetricsRow>

          <div className="mt-6 flex flex-col gap-3">
            <ProfileAccordion
              title="Season stats"
              subtitle={
                profile.previousSeasonStats?.length
                  ? 'Selected season vs prior year'
                  : profile.seasonStatsLabel || undefined
              }
              open={openSection === 'stats'}
              onToggle={() => toggle('stats')}
            >
              <div className="flex flex-col gap-4">
                <SeasonPicker
                  seasons={seasons}
                  selectedSeason={selectedSeason ?? profile.seasonYear ?? null}
                  selectedKey={selectedSeasonKey}
                  loading={seasonsLoading}
                  onSelect={selectSeason}
                  emptyLabel="No season stats years available"
                />
                {statsLoading ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">
                    Updating…
                  </p>
                ) : null}
                <SeasonStatsCompare
                  current={profile.seasonStats}
                  currentLabel={profile.seasonStatsLabel || 'This season'}
                  previous={profile.previousSeasonStats}
                  previousLabel={profile.previousSeasonStatsLabel || 'Last season'}
                />
              </div>
            </ProfileAccordion>

            <ProfileAccordion
              title="Previous ratings"
              subtitle="Brayden Rating · newest first"
              open={openSection === 'ratings'}
              onToggle={() => toggle('ratings')}
            >
              {profile.recentRatings.length === 0 ? (
                <p className="text-sm text-mist/70">Not enough recent matches to rate yet.</p>
              ) : (
                <RecentRatingsList
                  rows={profile.recentRatings}
                  leagueId={displayLeagueId}
                  hasMore={hasMoreRatings}
                  loadingMore={loadingMoreRatings}
                  onOpenTeam={onOpenTeam}
                  loadError={ratingsMoreError}
                  onLoadMore={() => {
                    void loadMoreRatings()
                  }}
                />
              )}
            </ProfileAccordion>

            <ProfileAccordion
              title="Career"
              subtitle="Club and national team seasons"
              open={openSection === 'career'}
              onToggle={() => toggle('career')}
            >
              <div className="flex flex-col gap-5">
                <section aria-label="Club career">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                    Clubs
                  </p>
                  <CareerSeasonsPanel
                    seasons={career.seasons}
                    loading={career.loading}
                    error={career.error}
                    fallbackLeagueId={displayLeagueId}
                    onOpenTeam={onOpenTeam}
                  />
                </section>
                <section aria-label="National team career">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                    National team
                  </p>
                  <CareerSeasonsPanel
                    seasons={nationalCareer.seasons}
                    loading={nationalCareer.loading}
                    error={nationalCareer.error}
                    fallbackLeagueId="fifa-friendly"
                    onOpenTeam={onOpenTeam}
                    emptyLabel="No national team seasons listed yet."
                  />
                </section>
              </div>
            </ProfileAccordion>

            <ProfileAccordion
              title="History"
              subtitle="Club and national-team stints"
              open={openSection === 'transfers'}
              onToggle={() => toggle('transfers')}
            >
              <div className="flex flex-col gap-5">
                <section aria-label="Club transfer history">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                    Clubs
                  </p>
                  <ClubHistoryList
                    stints={profile.clubHistory}
                    emptyLabel="No club history listed yet."
                    leagueId={displayLeagueId}
                    kind="club"
                    onOpenTeam={onOpenTeam}
                  />
                </section>

                <section aria-label="National team transfer history">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                    National team
                  </p>
                  <ClubHistoryList
                    stints={profile.nationalHistory}
                    emptyLabel="No national team history listed yet."
                    leagueId="fifa-friendly"
                    kind="national"
                    onOpenTeam={onOpenTeam}
                  />
                </section>
              </div>
            </ProfileAccordion>
          </div>
        </>
      ) : (
        <div className="border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-sm text-mist/80">{MISSING_LONG}</p>
          <button
            type="button"
            onClick={() => void reload(player.leagueId, player.id)}
            className="mt-3 rounded-full border border-lime/45 bg-lime/15 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime transition hover:bg-lime hover:text-ink"
          >
            Retry
          </button>
        </div>
      )}
    </ProfileShell>
  )
}
