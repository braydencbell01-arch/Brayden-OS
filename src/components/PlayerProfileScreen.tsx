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

function ratingMatchLabel(row: PlayerRecentMatchRating): string {
  const vs =
    row.opponentAbbrev || row.opponent
      ? `vs ${row.opponentAbbrev || row.opponent}`
      : null
  const side =
    row.homeAway === 'home' ? 'H' : row.homeAway === 'away' ? 'A' : null
  const date = formatMatchDate(row.date)
  const bits = [
    vs ? (side ? `${vs} (${side})` : vs) : null,
    date,
    row.starter ? 'Started' : 'Sub',
    row.goals ? `${row.goals}G` : null,
    row.assists ? `${row.assists}A` : null,
  ].filter(Boolean)
  return bits.join(' · ')
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
      {rows.map((row) => (
        <li
          key={row.eventId}
          className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
        >
          <span className="min-w-0 flex-1 text-xs leading-snug text-mist/75">
            {ratingMatchLabel(row)}
          </span>
          <span
            className="shrink-0 font-display text-2xl tabular-nums"
            style={ratingColorStyle(row.rating)}
          >
            {row.rating.toFixed(1)}
          </span>
        </li>
      ))}
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
  const { profile, loading, error, loadMoreRatings, loadingMoreRatings, hasMoreRatings } =
    usePlayerProfile(player.leagueId, player.id)
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
        <p className="text-sm text-mist/80">{error}</p>
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
              title="Recent ratings"
              subtitle="Brayden Rating · Scroll For Full History"
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
              title="Transfer history"
              subtitle="Club And National Team"
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
