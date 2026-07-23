import { useCallback, useEffect, useRef, useState } from 'react'
import { getLeague } from '../lib/leagues'
import type { FavoritePlayer, FavoritesApi } from '../lib/favorites'
import { ratingColorStyle } from '../lib/stats/ratingColor'
import { usePlayerProfile } from '../lib/stats/usePlayerProfile'
import type { MatchLineupPlayer, PlayerRecentMatchRating } from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'
import { PlayerAvatar } from './PlayerAvatar'
import { ProfileAccordion } from './ProfileAccordion'
import {
  ProfileHeader,
  ProfileMetric,
  ProfileMetricsRow,
  ProfileShell,
} from './ProfileShell'

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

function ratingMatchMeta(row: PlayerRecentMatchRating): string {
  const vs =
    row.opponentAbbrev || row.opponent
      ? `vs ${row.opponentAbbrev || row.opponent}`
      : null
  const side =
    row.homeAway === 'home' ? 'H' : row.homeAway === 'away' ? 'A' : null
  const date = formatMatchDate(row.date)
  return [vs ? (side ? `${vs} (${side})` : vs) : null, date, row.starter ? 'Started' : 'Sub']
    .filter(Boolean)
    .join(' · ')
}

function RecentRatingsList({
  rows,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  rows: PlayerRecentMatchRating[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
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
        return (
          <li
            key={row.eventId}
            className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug text-mist/75">{ratingMatchMeta(row)}</p>
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
        )
      })}
      <li ref={sentinelRef} className="list-none py-1 text-center text-[11px] text-mist/50">
        {loadingMore ? 'Loading more ratings…' : hasMore ? 'Scroll for more' : 'End of ratings'}
      </li>
    </ul>
  )
}

export function PlayerProfileScreen({
  player,
  favorites,
  onBack,
  reduce,
}: {
  player: PlayerNavRef
  favorites: FavoritesApi
  onBack: () => void
  reduce: boolean | null
}) {
  const {
    profile,
    loading,
    error,
    reload,
    loadMoreRatings,
    loadingMoreRatings,
    hasMoreRatings,
  } = usePlayerProfile(player.leagueId, player.id)
  const league = getLeague(player.leagueId)
  const [openSection, setOpenSection] = useState<'stats' | 'ratings' | 'transfers' | null>(
    null,
  )

  const favoritePayload: FavoritePlayer = {
    id: player.id,
    name: profile?.name || player.name || 'Player',
    shortName: profile?.shortName || player.shortName || player.name || 'Player',
    photoUrl: profile?.photoUrl || player.photoUrl,
    jerseyUrl: profile?.jerseyUrl || player.jerseyUrl,
    jersey: profile?.jersey || player.jersey,
    position: profile?.position || player.position,
    leagueId: player.leagueId,
    teamId: profile?.teamId || player.teamId,
    teamName: profile?.teamName || player.teamName,
  }

  const favorited = favorites.isPlayerFavorite(player.id)

  const toggle = (section: 'stats' | 'ratings' | 'transfers') => {
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
              <PlayerAvatar
                name={profile.name}
                photoUrl={profile.photoUrl}
                jerseyUrl={profile.jerseyUrl || player.jerseyUrl}
                jersey={profile.jersey || player.jersey}
                size="lg"
              />
            }
            eyebrow={
              <>
                {profile.represents || 'Nation TBD'}
                {profile.position ? ` · ${profile.position}` : ''}
              </>
            }
            title={profile.name}
            meta={
              <>
                {profile.teamName || 'Club TBD'}
                {` · ${league.short}`}
                {profile.jersey ? ` · #${profile.jersey}` : ''}
              </>
            }
          />

          <ProfileMetricsRow>
            <ProfileMetric
              label="Avg rating"
              value={
                <span
                  className={profile.averageRating == null ? 'text-mist/50' : ''}
                  style={ratingColorStyle(profile.averageRating)}
                >
                  {profile.averageRating != null ? profile.averageRating.toFixed(1) : '—'}
                </span>
              }
            />
            <ProfileMetric
              label="Club"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {profile.teamName || '—'}
                </span>
              }
            />
            <ProfileMetric
              label={profile.representsNationalTeam ? 'National team' : 'Represents'}
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {profile.represents || '—'}
                </span>
              }
            />
            <ProfileMetric label="Age" value={profile.age ?? '—'} />
            <ProfileMetric
              label="Height"
              value={
                <span className="block text-2xl leading-8 text-cream">
                  {profile.height || '—'}
                </span>
              }
            />
            <ProfileMetric
              label="Weight"
              value={
                <span className="block text-2xl leading-8 text-cream">
                  {profile.weight || '—'}
                </span>
              }
            />
          </ProfileMetricsRow>

          <div className="mt-6 flex flex-col gap-3">
            <ProfileAccordion
              title="Season stats"
              subtitle={profile.seasonStatsLabel || undefined}
              open={openSection === 'stats'}
              onToggle={() => toggle('stats')}
            >
              {profile.seasonStats.length === 0 ? (
                <p className="text-sm text-mist/70">
                  No full-season stats for this league yet.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {profile.seasonStats.map((stat) => (
                    <li key={stat.label} className="border border-white/10 px-3 py-2">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
                        {stat.label}
                      </p>
                      <p className="mt-1 font-display text-2xl text-cream tabular-nums">{stat.value}</p>
                    </li>
                  ))}
                </ul>
              )}
            </ProfileAccordion>

            <ProfileAccordion
              title="Match ratings"
              subtitle="Brayden Rating · scroll for full history"
              open={openSection === 'ratings'}
              onToggle={() => toggle('ratings')}
            >
              {profile.recentRatings.length === 0 ? (
                <p className="text-sm text-mist/70">Not enough recent matches to rate yet.</p>
              ) : (
                <RecentRatingsList
                  rows={profile.recentRatings}
                  hasMore={hasMoreRatings}
                  loadingMore={loadingMoreRatings}
                  onLoadMore={() => {
                    void loadMoreRatings()
                  }}
                />
              )}
            </ProfileAccordion>

            <ProfileAccordion
              title="Career history"
              subtitle="Club and national team"
              open={openSection === 'transfers'}
              onToggle={() => toggle('transfers')}
            >
              <div className="flex flex-col gap-5">
                <section aria-label="Club transfer history">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                    Clubs
                  </p>
                  {profile.clubHistory.length === 0 ? (
                    <p className="text-sm text-mist/70">No club history listed yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {profile.clubHistory.map((stint) => (
                        <li
                          key={`club-${stint.teamId}-${stint.seasons}`}
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
                            <p className="truncate text-sm font-semibold text-cream">
                              {stint.teamName}
                            </p>
                            <p className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                              {stint.seasons}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-label="National team transfer history">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                    National team
                  </p>
                  {profile.nationalHistory.length === 0 ? (
                    <p className="text-sm text-mist/70">No national team history listed yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {profile.nationalHistory.map((stint) => (
                        <li
                          key={`nat-${stint.teamId}-${stint.seasons}`}
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
                            <p className="truncate text-sm font-semibold text-cream">
                              {stint.teamName}
                            </p>
                            <p className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                              {stint.seasons}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </ProfileAccordion>
          </div>
        </>
      ) : null}
    </ProfileShell>
  )
}
