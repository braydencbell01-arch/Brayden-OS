import type { FavoritePlayer, FavoritesApi } from '../lib/favorites'
import type { LeagueId } from '../lib/leagues'
import type { TeamRoster } from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'
import { PlayerAvatar } from './PlayerAvatar'
import type { PlayerNavRef } from './PlayerProfileScreen'

export function TeamRosterPanel({
  data,
  loading,
  error,
  leagueId,
  teamId,
  teamName,
  favorites,
  onOpenPlayer,
}: {
  data: TeamRoster | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  teamId: string
  teamName: string
  favorites: FavoritesApi
  onOpenPlayer?: (player: PlayerNavRef) => void
}) {
  if (loading && !data) {
    return <p className="text-sm text-mist/70">Loading roster…</p>
  }

  if (error && !data) {
    return <p className="text-sm text-mist/80">{error}</p>
  }

  if (!data || data.groups.length === 0) {
    return <p className="text-sm text-mist/70">No roster available for this club yet.</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
        {data.seasonLabel}
      </p>

      {data.groups.map((group) => (
        <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
            {group.label}
            <span className="ml-2 text-mist/50">{group.players.length}</span>
          </p>
          <ul className="flex flex-col">
            {group.players.map((player, index) => {
              const clickable = Boolean(onOpenPlayer)
              const favoritePayload: FavoritePlayer = {
                id: player.id,
                name: player.name,
                shortName: player.shortName,
                photoUrl: player.photoUrl,
                jersey: player.jersey,
                position: player.positionAbbrev !== '—' ? player.positionAbbrev : player.positionLabel,
                leagueId,
                teamId,
                teamName,
              }
              const favorited = favorites.isPlayerFavorite(player.id)

              return (
                <li
                  key={player.id}
                  className={`flex items-center gap-1 ${
                    index > 0 ? 'border-t border-white/[0.06]' : ''
                  }`}
                >
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() =>
                      onOpenPlayer?.({
                        id: player.id,
                        leagueId,
                        name: player.name,
                        shortName: player.shortName,
                        photoUrl: player.photoUrl,
                        jersey: player.jersey,
                        position: player.positionAbbrev,
                        teamId,
                        teamName,
                      })
                    }
                    className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left outline-none transition ${
                      clickable
                        ? 'hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime'
                        : 'cursor-default'
                    }`}
                  >
                    <PlayerAvatar
                      name={player.name}
                      photoUrl={player.photoUrl}
                      jersey={player.jersey}
                      size="sm"
                    />
                    <span className="w-8 shrink-0 font-display text-lg tracking-wide text-mist/70 tabular-nums">
                      {player.jersey || '—'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-semibold ${
                          clickable ? 'profile-link text-cream' : 'text-cream'
                        }`}
                      >
                        {player.name}
                      </span>
                      <span className="block truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                        {player.positionLabel}
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-lime/80">
                      {player.positionAbbrev !== '—' ? player.positionAbbrev : ''}
                    </span>
                  </button>
                  <FavoriteStar
                    active={favorited}
                    size="sm"
                    label={player.shortName || player.name}
                    onToggle={() => favorites.togglePlayer(favoritePayload)}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
