import { useMemo } from 'react'
import type { FavoritePlayer, FavoriteTeam, FavoritesApi } from '../lib/favorites'
import { getLeague, type LeagueId } from '../lib/leagues'
import { isFavoriteMatch, type Match } from '../lib/matches'
import { predictMatch } from '../lib/insights'
import type { PlayerNavRef } from './PlayerProfileScreen'

export function MyMatchday({
  matches,
  favorites,
  showPredictions,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
  onOpenMatchDay,
}: {
  matches: Match[]
  favorites: FavoritesApi
  showPredictions: boolean
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  onOpenLeague: (id: LeagueId) => void
  onOpenMatchDay?: () => void
}) {
  const todayMatches = useMemo(() => {
    return matches
      .filter((m) =>
        isFavoriteMatch(m, favorites.leagueIds, favorites.teamIds),
      )
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
      .slice(0, 8)
  }, [matches, favorites.leagueIds, favorites.teamIds])

  const favoritePlayers = favorites.players.slice(0, 4)
  const isEmpty =
    todayMatches.length === 0 &&
    favorites.teams.length === 0 &&
    favorites.players.length === 0 &&
    favorites.leagues.length === 0

  if (isEmpty) {
    return (
      <section className="mb-5 border border-white/10 bg-white/[0.03] px-4 py-4" aria-label="My matchday">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
          My matchday
        </p>
        <p className="mt-2 text-sm text-mist/75">
          Star a league or club to personalize Home. Your fixtures and form will land here.
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
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
            My matchday
          </p>
          <p className="mt-0.5 text-sm text-mist/75">Your clubs, leagues, and players</p>
        </div>
        {onOpenMatchDay ? (
          <button
            type="button"
            onClick={onOpenMatchDay}
            className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/60 hover:text-lime"
          >
            Calendar
          </button>
        ) : null}
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

      {todayMatches.length === 0 ? (
        <p className="border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-mist/65">
          No favorited fixtures in the loaded window. Jump the calendar or star more clubs.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todayMatches.map((match) => {
            const pred =
              showPredictions && match.status === 'scheduled'
                ? predictMatch(match, matches)
                : null
            return (
              <li
                key={match.id}
                className="border border-star/25 bg-star/[0.05] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/60">
                  <button
                    type="button"
                    onClick={() => onOpenLeague(match.leagueId)}
                    className="hover:text-lime"
                  >
                    {getLeague(match.leagueId).short}
                  </button>
                  <span>{match.statusText}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenTeam({
                        id: match.home.id,
                        name: match.home.name,
                        shortName: match.home.shortName,
                        leagueId: match.leagueId,
                      })
                    }
                    className="truncate text-left text-sm font-semibold text-cream hover:text-lime"
                  >
                    {match.home.shortName}
                  </button>
                  <span className="font-display text-lg tabular-nums text-cream">
                    {match.home.score != null && match.away.score != null
                      ? `${match.home.score}–${match.away.score}`
                      : 'vs'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenTeam({
                        id: match.away.id,
                        name: match.away.name,
                        shortName: match.away.shortName,
                        leagueId: match.leagueId,
                      })
                    }
                    className="truncate text-right text-sm font-semibold text-cream hover:text-lime"
                  >
                    {match.away.shortName}
                  </button>
                </div>
                {pred ? (
                  <p className="mt-1.5 text-[0.65rem] text-mist/60">
                    BrayStats lean {pred.predictedScore} · {pred.homeWinPct}/{pred.drawPct}/
                    {pred.awayWinPct}% · {pred.confidence} confidence
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
