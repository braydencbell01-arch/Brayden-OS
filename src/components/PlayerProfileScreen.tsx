import { useState } from 'react'
import { getLeague } from '../lib/leagues'
import type { FavoritePlayer, FavoritesApi } from '../lib/favorites'
import { usePlayerProfile } from '../lib/stats/usePlayerProfile'
import type { MatchLineupPlayer } from '../lib/stats/types'
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

function ratingTone(rating: number | null): string {
  if (rating == null) return 'text-mist/50'
  if (rating >= 8) return 'text-lime'
  if (rating >= 6.5) return 'text-star'
  if (rating >= 5) return 'text-cream'
  if (rating >= 3.5) return 'text-mist/80'
  return 'text-red-300/90'
}

export function PlayerProfileScreen({
  player,
  favorites,
  onBack,
  onOpenFavorites,
  reduce,
}: {
  player: PlayerNavRef
  favorites: FavoritesApi
  onBack: () => void
  onOpenFavorites: () => void
  reduce: boolean | null
}) {
  const { profile, loading, error } = usePlayerProfile(player.leagueId, player.id)
  const league = getLeague(player.leagueId)
  const [openSection, setOpenSection] = useState<'stats' | 'ratings' | 'transfers' | null>(
    'stats',
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

  const transferCount =
    (profile?.clubHistory.length ?? 0) + (profile?.nationalHistory.length ?? 0)

  return (
    <ProfileShell onBack={onBack} onOpenFavorites={onOpenFavorites} reduce={reduce}>
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
              accent
              value={
                <span className={ratingTone(profile.averageRating)}>
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
              open={openSection === 'stats'}
              onToggle={() => toggle('stats')}
              meta={profile.seasonStats.length ? String(profile.seasonStats.length) : undefined}
            >
              {profile.seasonStats.length === 0 ? (
                <p className="text-sm text-mist/70">No season split for this league yet.</p>
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
              subtitle="Brayden Rating Latest Matches"
              open={openSection === 'ratings'}
              onToggle={() => toggle('ratings')}
              meta={
                profile.recentRatings.length ? String(profile.recentRatings.length) : undefined
              }
            >
              {profile.recentRatings.length === 0 ? (
                <p className="text-sm text-mist/70">Not enough recent matches to rate yet.</p>
              ) : (
                <ul className="scrollbar-hide flex max-h-80 flex-col gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
                  {profile.recentRatings.map((row) => (
                    <li
                      key={row.eventId}
                      className="flex items-center justify-between border border-white/10 px-3 py-2"
                    >
                      <span className="text-xs text-mist/75">
                        {row.starter ? 'Started' : 'Sub'}
                        {row.goals ? ` · ${row.goals}G` : ''}
                        {row.assists ? ` · ${row.assists}A` : ''}
                      </span>
                      <span
                        className={`font-display text-2xl tabular-nums ${ratingTone(row.rating)}`}
                      >
                        {row.rating.toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ProfileAccordion>

            <ProfileAccordion
              title="Transfer history"
              subtitle="Club And National Team"
              open={openSection === 'transfers'}
              onToggle={() => toggle('transfers')}
              meta={transferCount ? String(transferCount) : undefined}
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
