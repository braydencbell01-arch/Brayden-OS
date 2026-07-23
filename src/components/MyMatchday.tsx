import type { FavoritePlayer, FavoriteTeam, FavoritesApi } from '../lib/favorites'
import { getLeague, type LeagueId } from '../lib/leagues'
import type { PlayerNavRef } from './PlayerProfileScreen'

/**
 * Home personalization strip.
 * Favorite players appear as chips only — they never yellow Match day rows or
 * league dropdowns (those use league/team favorites via `isFavoriteMatch`).
 */
export function MyMatchday({
  favorites,
  onOpenPlayer,
  onOpenLeague,
}: {
  favorites: FavoritesApi
  onOpenTeam?: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  onOpenLeague: (id: LeagueId) => void
  /** Unused — kept so App can pass the same props without churn. */
  matches?: unknown
  showPredictions?: boolean
  onOpenMatchDay?: () => void
}) {
  const favoritePlayers = favorites.players.slice(0, 4)
  const hasAnyFavorite =
    favorites.leagues.length > 0 ||
    favorites.teams.length > 0 ||
    favorites.players.length > 0

  if (!hasAnyFavorite) {
    return (
      <section className="mb-5 border border-white/10 bg-white/[0.03] px-4 py-4" aria-label="My matchday">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          My matchday
        </p>
        <p className="mt-2 text-sm text-mist/75">
          Star a league or club to yellow Match day fixtures. Favorite players stay on your list —
          they do not light up games.
        </p>
        <button
          type="button"
          onClick={() => onOpenLeague(getLeague('premier-league').id)}
          className="mt-3 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-lime"
        >
          Browse Premier League →
        </button>
      </section>
    )
  }

  return (
    <section className="mb-5" aria-label="My matchday">
      <div className="mb-2 px-1">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          My matchday
        </p>
        <p className="mt-0.5 text-sm text-mist/75">
          Yellow marks favorited leagues and clubs only — not players.
        </p>
      </div>

      {favoritePlayers.length > 0 ? (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {favoritePlayers.map((player: FavoritePlayer) => (
            <button
              key={player.id}
              type="button"
              onClick={() =>
                onOpenPlayer({
                  id: player.id,
                  leagueId: player.leagueId,
                  name: player.name,
                  shortName: player.shortName,
                  photoUrl: player.photoUrl,
                  jerseyUrl: player.jerseyUrl,
                  jersey: player.jersey,
                  teamId: player.teamId,
                  teamName: player.teamName,
                  position: player.position,
                })
              }
              className="shrink-0 border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-lime/40"
            >
              <p className="max-w-[7rem] truncate text-xs font-semibold text-cream">{player.name}</p>
              <p className="text-[0.6rem] uppercase tracking-[0.12em] text-mist/55">
                {player.teamName || getLeague(player.leagueId).short}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {favorites.leagues.length === 0 && favorites.teams.length === 0 ? (
        <p className="border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-mist/65">
          Star a league or club so those fixtures light up yellow on Match day.
        </p>
      ) : null}
    </section>
  )
}
