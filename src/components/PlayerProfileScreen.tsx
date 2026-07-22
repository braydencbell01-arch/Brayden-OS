import { useState } from 'react'
import { getLeague } from '../lib/leagues'
import type { FavoritePlayer, FavoritesApi } from '../lib/favorites'
import { usePlayerProfile } from '../lib/stats/usePlayerProfile'
import type { MatchLineupPlayer } from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'
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
  teamId?: string
  teamName?: string
  position?: string
}

function ProfilePhoto({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (failed) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/15 bg-pitch font-display text-2xl text-lime">
        {initials || '•'}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className="h-20 w-20 shrink-0 rounded-full border border-white/15 object-cover bg-pitch"
      onError={() => setFailed(true)}
    />
  )
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
  const [openSection, setOpenSection] = useState<'stats' | 'ratings' | 'clubs' | null>('stats')

  const favoritePayload: FavoritePlayer = {
    id: player.id,
    name: profile?.name || player.name || 'Player',
    shortName: profile?.shortName || player.shortName || player.name || 'Player',
    photoUrl: profile?.photoUrl || player.photoUrl,
    position: profile?.position || player.position,
    leagueId: player.leagueId,
    teamId: profile?.teamId || player.teamId,
    teamName: profile?.teamName || player.teamName,
  }

  const favorited = favorites.isPlayerFavorite(player.id)

  const toggle = (section: 'stats' | 'ratings' | 'clubs') => {
    setOpenSection((current) => (current === section ? null : section))
  }

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
            trailing={<ProfilePhoto src={profile.photoUrl} name={profile.name} />}
            eyebrow={
              <>
                {league.short}
                {profile.position ? ` · ${profile.position}` : ''}
              </>
            }
            title={profile.name}
            meta={
              <>
                {profile.teamName || 'Club TBD'}
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
            <ProfileMetric label="Age" value={profile.age ?? '—'} />
            <ProfileMetric
              label="Nation"
              value={
                <span className="block truncate text-lg font-semibold leading-8 text-cream">
                  {profile.citizenship || '—'}
                </span>
              }
            />
          </ProfileMetricsRow>

          <div className="mt-6 flex flex-col gap-3">
            <ProfileAccordion
              title="Season stats"
              subtitle={profile.height || profile.weight ? `${profile.height || '—'} · ${profile.weight || '—'}` : undefined}
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
              subtitle="Brayden Rating · last matches"
              open={openSection === 'ratings'}
              onToggle={() => toggle('ratings')}
              meta={
                profile.recentRatings.length ? String(profile.recentRatings.length) : undefined
              }
            >
              {profile.recentRatings.length === 0 ? (
                <p className="text-sm text-mist/70">Not enough recent matches to rate yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
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
              title="Clubs"
              subtitle="Career path"
              open={openSection === 'clubs'}
              onToggle={() => toggle('clubs')}
              meta={profile.clubHistory.length ? String(profile.clubHistory.length) : undefined}
            >
              {profile.clubHistory.length === 0 ? (
                <p className="text-sm text-mist/70">No club history listed yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {profile.clubHistory.map((stint) => (
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
                        <p className="truncate text-sm font-semibold text-cream">{stint.teamName}</p>
                        <p className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                          {stint.seasons}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ProfileAccordion>
          </div>
        </>
      ) : null}
    </ProfileShell>
  )
}
