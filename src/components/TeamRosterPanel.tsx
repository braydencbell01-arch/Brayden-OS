import { isMissing, MISSING_LONG, missingShort } from '../lib/display'
import type { FavoritePlayer, FavoritesApi } from '../lib/favorites'
import type { LeagueId } from '../lib/leagues'
import type { LeagueSeasonOption, TeamRoster } from '../lib/stats/types'
import { FavoriteStar } from './FavoriteStar'
import { PlayerAvatar } from './PlayerAvatar'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { SeasonPicker } from './SeasonPicker'

export function TeamRosterPanel({
  data,
  loading,
  error,
  leagueId,
  teamId,
  teamName,
  favorites,
  seasons,
  seasonsLoading,
  selectedSeason,
  onSelectSeason,
  onOpenPlayer,
}: {
  data: TeamRoster | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  teamId: string
  teamName: string
  favorites: FavoritesApi
  seasons: LeagueSeasonOption[]
  seasonsLoading: boolean
  selectedSeason: number | null
  onSelectSeason: (year: number) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <SeasonPicker
        seasons={seasons}
        selectedSeason={selectedSeason ?? data?.season ?? null}
        loading={seasonsLoading}
        onSelect={onSelectSeason}
      />

      {loading && !data ? <p className="text-sm text-mist/70">Loading roster…</p> : null}

      {error && !data ? <p className="text-sm text-mist/80">{error}</p> : null}

      {!loading && !error && (!data || data.groups.length === 0) ? (
        <p className="text-sm text-mist/70">{MISSING_LONG}</p>
      ) : null}

      {data && data.groups.length > 0 ? (
        <>
          {loading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">
              Updating…
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
              {data.seasonLabel}
            </p>
          )}

      {data.groups.map((group) => (
        <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
            {group.label}
            <span className="ml-2 text-mist/50">{group.players.length}</span>
          </p>
          <ul className="flex flex-col gap-1.5">
            {group.players.map((player) => {
              const clickable = Boolean(onOpenPlayer)
              const favoritePayload: FavoritePlayer = {
                id: player.id,
                name: player.name,
                shortName: player.shortName,
                photoUrl: player.photoUrl,
                jersey: player.jersey,
                position: !isMissing(player.positionAbbrev)
                  ? player.positionAbbrev
                  : player.positionLabel,
                leagueId,
                teamId,
                teamName,
              }
              const favorited = favorites.isPlayerFavorite(player.id)

              return (
                <li
                  key={player.id}
                  className="flex items-center gap-1 border border-white/10 bg-white/[0.03] pr-1"
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
                      {missingShort(player.jersey)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-semibold ${
                          clickable ? 'profile-link text-cream' : 'text-cream'
                        }`}
                      >
                        {missingShort(player.name)}
                      </span>
                      <span className="block truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                        {missingShort(player.positionLabel)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-lime/80">
                      {missingShort(player.positionAbbrev)}
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
        </>
      ) : null}
    </div>
  )
}
