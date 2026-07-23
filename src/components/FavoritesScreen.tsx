import { useState } from 'react'
import { motion } from 'framer-motion'
import { LEAGUES, getLeague, type LeagueId } from '../lib/leagues'
import type { FavoritePlayer, FavoriteTeam, FavoritesApi } from '../lib/favorites'
import { FavoriteStar } from './FavoriteStar'
import { PlayerAvatar } from './PlayerAvatar'
import type { PlayerNavRef } from './PlayerProfileScreen'

type FavoritesSection = 'leagues' | 'teams' | 'players'

export function FavoritesScreen({
  favorites,
  onOpenLeague,
  onOpenTeam,
  onOpenPlayer,
  onBrowseLeagues,
  reduce,
}: {
  favorites: FavoritesApi
  onOpenLeague: (id: LeagueId) => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  onBrowseLeagues: () => void
  reduce: boolean | null
}) {
  const favoriteLeagues = LEAGUES.filter((league) => favorites.isLeagueFavorite(league.id))
  const isEmpty =
    favoriteLeagues.length === 0 && favorites.teams.length === 0 && favorites.players.length === 0

  const [openSection, setOpenSection] = useState<FavoritesSection | null>(() =>
    favoriteLeagues.length > 0 || isEmpty ? 'leagues' : favorites.teams.length > 0 ? 'teams' : 'players',
  )

  const toggleSection = (section: FavoritesSection) => {
    setOpenSection((current) => (current === section ? null : section))
  }

  const toNav = (player: FavoritePlayer): PlayerNavRef => ({
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

  const counts: Record<FavoritesSection, number> = {
    leagues: favoriteLeagues.length,
    teams: favorites.teams.length,
    players: favorites.players.length,
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.5), transparent 55%), radial-gradient(ellipse 40% 35% at 100% 20%, rgba(255,216,74,0.12), transparent 55%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-screen md:max-w-xl md:px-6">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 border-b border-white/10 pb-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-star">Your picks</p>
          <h1 className="mt-2 font-display text-6xl tracking-[0.04em] text-cream sm:text-7xl">
            Favorites
          </h1>
          <p className="mt-3 text-sm text-mist/80">
            Star leagues, clubs, and players to pin Match day, calendar dots, and Stats.
          </p>
        </motion.header>

        {isEmpty ? (
          <div className="mb-5 border border-star/25 bg-star/10 px-4 py-4">
            <p className="text-sm font-semibold text-cream">Nothing starred yet</p>
            <p className="mt-1 text-sm text-mist/75">
              Start with a league — yellow calendar dots and faster match days follow from there.
            </p>
            <button
              type="button"
              onClick={onBrowseLeagues}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-lime/45 bg-lime/15 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-lime transition hover:bg-lime hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              Browse leagues →
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3" role="tablist" aria-label="Favorites categories">
          {(
            [
              { id: 'leagues', label: 'Leagues' },
              { id: 'teams', label: 'Teams' },
              { id: 'players', label: 'Players' },
            ] as const
          ).map((section) => {
            const open = openSection === section.id
            const count = counts[section.id]
            return (
              <div key={section.id} className="border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  role="tab"
                  aria-expanded={open}
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-star focus-visible:ring-inset"
                >
                  <span className="font-display text-3xl tracking-wide text-cream">{section.label}</span>
                  <span className="flex items-center gap-2 text-sm text-mist/70">
                    <span className="tabular-nums text-cream/80">{count}</span>
                    <span aria-hidden>{open ? '▴' : '▾'}</span>
                  </span>
                </button>

                {open && (
                  <div className="border-t border-white/10 px-4 py-3">
                    {section.id === 'leagues' && (
                      favoriteLeagues.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-mist/70">
                            No favorited leagues yet. Tap the star next to a league on the Leagues tab.
                          </p>
                          <button
                            type="button"
                            onClick={onBrowseLeagues}
                            className="profile-link text-sm font-semibold text-lime"
                          >
                            Go to Leagues →
                          </button>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {favoriteLeagues.map((league) => (
                            <li key={league.id}>
                              <div className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-3">
                                <FavoriteStar
                                  active
                                  label={league.name}
                                  onToggle={() => favorites.toggleLeague(league.id)}
                                />
                                <button
                                  type="button"
                                  onClick={() => onOpenLeague(league.id)}
                                  className="flex min-w-0 flex-1 items-center justify-between text-left outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                >
                                  <span>
                                    <span className="profile-link block font-display text-2xl tracking-wide text-cream">
                                      {league.name}
                                    </span>
                                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                                      {league.country}
                                    </span>
                                  </span>
                                  <span className="text-lime">Profile →</span>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )
                    )}

                    {section.id === 'teams' && (
                      favorites.teams.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-mist/70">
                            No favorited teams yet. Open a league table and tap the star next to a club.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (favoriteLeagues[0]) onOpenLeague(favoriteLeagues[0].id)
                              else onBrowseLeagues()
                            }}
                            className="profile-link text-sm font-semibold text-lime"
                          >
                            {favoriteLeagues[0]
                              ? `Open ${favoriteLeagues[0].name} table →`
                              : 'Browse leagues →'}
                          </button>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {favorites.teams.map((team) => {
                            const league = getLeague(team.leagueId)
                            return (
                              <li key={team.id}>
                                <div className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-3">
                                  <FavoriteStar
                                    active
                                    label={team.shortName}
                                    onToggle={() => favorites.toggleTeam(team)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onOpenTeam(team)}
                                    className="flex min-w-0 flex-1 items-center justify-between text-left outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                  >
                                    <span>
                                      <span className="profile-link block text-sm font-semibold text-cream">
                                        {team.name}
                                      </span>
                                      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                                        {league.short}
                                      </span>
                                    </span>
                                    <span className="text-lime">Profile →</span>
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )
                    )}

                    {section.id === 'players' && (
                      favorites.players.length === 0 ? (
                        <p className="text-sm text-mist/70">
                          No favorited players yet. Open a match lineup or search a player, then star
                          their profile.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {favorites.players.map((player) => (
                            <li key={player.id}>
                              <div className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-3">
                                <FavoriteStar
                                  active
                                  label={player.name}
                                  onToggle={() => favorites.togglePlayer(player)}
                                />
                                <PlayerAvatar
                                  name={player.name}
                                  photoUrl={player.photoUrl}
                                  jerseyUrl={player.jerseyUrl}
                                  jersey={player.jersey}
                                  size="sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => onOpenPlayer(toNav(player))}
                                  className="flex min-w-0 flex-1 items-center justify-between text-left outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                >
                                  <span>
                                    <span className="profile-link block text-sm font-semibold text-cream">
                                      {player.name}
                                    </span>
                                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                                      {player.teamName || getLeague(player.leagueId).short}
                                      {player.position ? ` · ${player.position}` : ''}
                                    </span>
                                  </span>
                                  <span className="text-lime">Profile →</span>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
