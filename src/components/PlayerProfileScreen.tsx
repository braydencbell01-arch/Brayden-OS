import { useState } from 'react'
import { motion } from 'framer-motion'
import { getLeague } from '../lib/leagues'
import type { FavoritePlayer, FavoritesApi } from '../lib/favorites'
import { usePlayerProfile } from '../lib/stats/usePlayerProfile'
import type { MatchLineupPlayer } from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'

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
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-pitch font-display text-3xl text-lime">
        {initials || '•'}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className="h-24 w-24 rounded-full border border-white/15 object-cover bg-pitch"
      onError={() => setFailed(true)}
    />
  )
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

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.5), transparent 55%), radial-gradient(ellipse 40% 30% at 100% 10%, rgba(255,216,74,0.12), transparent 50%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6 md:max-w-xl md:px-6">
        <div className="mb-8 flex items-center justify-between gap-3">
          <motion.button
            type="button"
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-mist transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
          >
            <span aria-hidden>←</span> Back
          </motion.button>
          <button
            type="button"
            onClick={onOpenFavorites}
            className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-mist/80 transition hover:text-star"
          >
            Favorites
          </button>
        </div>

        {loading && !profile ? (
          <p className="text-sm text-mist/70">Loading player profile…</p>
        ) : error && !profile ? (
          <p className="text-sm text-mist/80">{error}</p>
        ) : profile ? (
          <>
            <motion.header
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="border-b border-white/10 pb-6"
            >
              <div className="flex items-start gap-4">
                <ProfilePhoto src={profile.photoUrl} name={profile.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <FavoriteStar
                      active={favorited}
                      label={profile.name}
                      onToggle={() => favorites.togglePlayer(favoritePayload)}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
                        {league.short}
                        {profile.position ? ` · ${profile.position}` : ''}
                      </p>
                      <h1 className="mt-1 font-display text-5xl tracking-[0.04em] text-cream sm:text-6xl">
                        {profile.name}
                      </h1>
                      <p className="mt-2 text-sm text-mist/80">
                        {profile.teamName || 'Free agent / unknown club'}
                        {profile.jersey ? ` · #${profile.jersey}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                    Avg rating
                  </p>
                  <p className="mt-1 font-display text-3xl text-star">
                    {profile.averageRating != null ? profile.averageRating.toFixed(1) : '—'}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                    Age
                  </p>
                  <p className="mt-1 font-display text-3xl text-cream">{profile.age ?? '—'}</p>
                </div>
                <div className="border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                    Nation
                  </p>
                  <p className="mt-1 text-sm font-semibold text-cream">
                    {profile.citizenship || '—'}
                  </p>
                </div>
              </div>
            </motion.header>

            <section className="mt-8" aria-label="Season stats">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">
                Season stats
              </p>
              {profile.seasonStats.length === 0 ? (
                <p className="text-sm text-mist/70">No season split published for this league yet.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {profile.seasonStats.map((stat) => (
                    <li
                      key={stat.label}
                      className="border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/60">
                        {stat.label}
                      </p>
                      <p className="mt-1 font-display text-2xl text-cream">{stat.value}</p>
                    </li>
                  ))}
                </ul>
              )}
              {(profile.height || profile.weight) && (
                <p className="mt-3 text-xs text-mist/65">
                  {profile.height || '—'} · {profile.weight || '—'}
                </p>
              )}
            </section>

            <section className="mt-8" aria-label="Recent Brayden Ratings">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">
                Recent Brayden Ratings
              </p>
              {profile.recentRatings.length === 0 ? (
                <p className="text-sm text-mist/70">Not enough recent matches to rate yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {profile.recentRatings.map((row) => (
                    <li
                      key={row.eventId}
                      className="flex items-center justify-between border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <span className="text-xs text-mist/75">
                        {row.starter ? 'Started' : 'Sub'}
                        {row.goals ? ` · ${row.goals}G` : ''}
                        {row.assists ? ` · ${row.assists}A` : ''}
                      </span>
                      <span className="font-display text-2xl text-star">{row.rating.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-8" aria-label="Club history">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">
                Club / transfer history
              </p>
              {profile.clubHistory.length === 0 ? (
                <p className="text-sm text-mist/70">No club history listed yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {profile.clubHistory.map((stint) => (
                    <li
                      key={`${stint.teamId}-${stint.seasons}`}
                      className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-3"
                    >
                      {stint.logoUrl ? (
                        <img
                          src={stint.logoUrl}
                          alt=""
                          className="h-8 w-8 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white/10" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-cream">{stint.teamName}</p>
                        <p className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                          {stint.seasons}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-mist/55">
                Club path from ESPN. Fee amounts for pay-per-stat land when a market-value feed is
                connected.
              </p>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
