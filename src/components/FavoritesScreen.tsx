import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { missingShort } from '../lib/display'
import {
  SUGGESTION_PAGE_SIZE,
  suggestedLeagueCount,
  suggestedLeagues,
  suggestedPlayerCount,
  suggestedPlayers,
  suggestedTeamCount,
  suggestedTeams,
} from '../lib/favoriteSuggestions'
import { LEAGUES, getLeague, isInternationalLeague, teamSubtitleLabel, teamSubtitleLeagueId, type LeagueId } from '../lib/leagues'
import type { FavoritePlayer, FavoriteTeam, FavoritesApi } from '../lib/favorites'
import { leagueAccentColor, teamLogoUrl } from '../lib/stats/branding'
import { EntityLogo } from './EntityLogo'
import { FavoriteStar } from './FavoriteStar'
import { LeagueLogoMark } from './LeagueLogoMark'
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

  const [openSection, setOpenSection] = useState<FavoritesSection | null>(null)

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

  const [leagueVisible, setLeagueVisible] = useState(SUGGESTION_PAGE_SIZE)
  const [teamVisible, setTeamVisible] = useState(SUGGESTION_PAGE_SIZE)
  const [playerVisible, setPlayerVisible] = useState(SUGGESTION_PAGE_SIZE)

  const leagueAvailable = useMemo(
    () => suggestedLeagueCount(favorites.leagueIds),
    [favorites.leagueIds],
  )
  const teamAvailable = useMemo(
    () => suggestedTeamCount(favorites.teamIds, favorites.leagueIds),
    [favorites.teamIds, favorites.leagueIds],
  )
  const playerAvailable = useMemo(
    () => suggestedPlayerCount(favorites.playerIds),
    [favorites.playerIds],
  )

  const leagueSuggestions = useMemo(
    () => suggestedLeagues(favorites.leagueIds, leagueVisible),
    [favorites.leagueIds, leagueVisible],
  )
  const teamSuggestions = useMemo(
    () => suggestedTeams(favorites.teamIds, favorites.leagueIds, teamVisible),
    [favorites.teamIds, favorites.leagueIds, teamVisible],
  )
  const playerSuggestions = useMemo(
    () => suggestedPlayers(favorites.playerIds, playerVisible),
    [favorites.playerIds, playerVisible],
  )

  const hasSuggestions =
    leagueAvailable > 0 || teamAvailable > 0 || playerAvailable > 0

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
        </motion.header>

        {isEmpty ? (
          <div className="mb-5 border border-star/25 bg-star/10 px-4 py-4">
            <p className="text-sm font-semibold text-cream">Nothing starred yet</p>
            <p className="mt-1 text-sm text-mist/75">
              Start with a league or club — yellow calendar dots mark those fixtures only.
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
                          {favoriteLeagues.map((league) => {
                            const accent = leagueAccentColor(league.id)
                            return (
                            <li key={league.id}>
                              <div
                                className="flex items-center gap-2 border border-white/10 px-3 py-3"
                                style={{
                                  boxShadow: `inset 3px 0 0 ${accent}`,
                                  background: `linear-gradient(90deg, ${accent}22, rgba(255,255,255,0.04) 42%)`,
                                  borderColor: `${accent}40`,
                                }}
                              >
                                <FavoriteStar
                                  active
                                  label={league.name}
                                  onToggle={() => favorites.toggleLeague(league.id)}
                                />
                                <LeagueLogoMark
                                  leagueId={league.id}
                                  name={league.name}
                                  size="sm"
                                  ringColor={accent}
                                />
                                <button
                                  type="button"
                                  onClick={() => onOpenLeague(league.id)}
                                  className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                >
                                  <span className="profile-link block font-display text-2xl tracking-wide text-cream">
                                    {league.name}
                                  </span>
                                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                                    {league.country}
                                  </span>
                                </button>
                              </div>
                            </li>
                            )
                          })}
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
                            const subtitle = teamSubtitleLabel(team)
                            const subtitleLeagueId = teamSubtitleLeagueId(team)
                            return (
                              <li key={team.id}>
                                <div className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-3">
                                  <FavoriteStar
                                    active
                                    label={team.shortName}
                                    onToggle={() => favorites.toggleTeam(team)}
                                  />
                                  <EntityLogo
                                    name={team.name}
                                    src={teamLogoUrl(team.id)}
                                    size="sm"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => onOpenTeam(team)}
                                      className="profile-link block max-w-full truncate text-left text-sm font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                    >
                                      {team.name}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenLeague(subtitleLeagueId)}
                                      className="profile-link mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                    >
                                      {subtitle}
                                    </button>
                                  </div>
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
                              <div className="border border-white/10 bg-white/[0.04]">
                                <div className="flex items-center gap-2 px-3 py-3">
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
                                    className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                  >
                                    <span className="profile-link block truncate text-sm font-semibold text-cream">
                                      {player.name}
                                    </span>
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 px-3 py-2 pl-[3.25rem]">
                                  {player.teamName && player.teamId ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenTeam({
                                          id: player.teamId!,
                                          name: player.teamName!,
                                          shortName: player.teamName!,
                                          leagueId: player.leagueId,
                                          kind: isInternationalLeague(player.leagueId)
                                            ? 'national'
                                            : 'club',
                                        })
                                      }
                                      className="profile-link text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                    >
                                      {player.teamName}
                                    </button>
                                  ) : null}
                                  {player.citizenship || player.position ? (
                                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/70">
                                      {[
                                        player.citizenship,
                                        player.position ? missingShort(player.position) : null,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onOpenLeague(player.leagueId)}
                                      className="profile-link text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                                    >
                                      {getLeague(player.leagueId).short}
                                    </button>
                                  )}
                                </div>
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

        {hasSuggestions ? (
          <section className="mt-8 border-t border-white/10 pt-6" aria-label="Suggestions">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-star">
              Suggestions
            </p>

            <div className="mt-4">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/65">
                Competitions
              </p>
              {leagueSuggestions.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {leagueSuggestions.map((league) => {
                    const accent = leagueAccentColor(league.id)
                    return (
                      <li key={league.id}>
                        <div
                          className="flex items-center gap-2 border border-white/10 px-3 py-3"
                          style={{
                            boxShadow: `inset 3px 0 0 ${accent}`,
                            background: `linear-gradient(90deg, ${accent}22, rgba(255,255,255,0.04) 42%)`,
                            borderColor: `${accent}40`,
                          }}
                        >
                          <FavoriteStar
                            active={false}
                            label={league.name}
                            onToggle={() => favorites.toggleLeague(league.id)}
                          />
                          <LeagueLogoMark
                            leagueId={league.id}
                            name={league.name}
                            size="sm"
                            ringColor={accent}
                          />
                          <button
                            type="button"
                            onClick={() => onOpenLeague(league.id)}
                            className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime"
                          >
                            <span className="profile-link block font-display text-2xl tracking-wide text-cream">
                              {league.name}
                            </span>
                            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                              {league.country}
                            </span>
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              {leagueAvailable > leagueVisible ? (
                <button
                  type="button"
                  onClick={() =>
                    setLeagueVisible((count) => count + SUGGESTION_PAGE_SIZE)
                  }
                  className="mt-3 w-full border border-white/12 bg-white/[0.03] px-3 py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                >
                  Show more
                </button>
              ) : (
                <p className="mt-3 text-center text-xs text-mist/55">No more competitions</p>
              )}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/65">
                Teams
              </p>
              {teamSuggestions.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {teamSuggestions.map((team) => (
                    <li key={team.id}>
                      <div className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-3">
                        <FavoriteStar
                          active={false}
                          label={team.shortName}
                          onToggle={() => favorites.toggleTeam(team)}
                        />
                        <EntityLogo
                          name={team.name}
                          src={teamLogoUrl(team.id)}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onOpenTeam(team)}
                            className="profile-link block max-w-full truncate text-left text-sm font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                          >
                            {team.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenLeague(teamSubtitleLeagueId(team))}
                            className="profile-link mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                          >
                            {teamSubtitleLabel(team)}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {teamAvailable > teamVisible ? (
                <button
                  type="button"
                  onClick={() => setTeamVisible((count) => count + SUGGESTION_PAGE_SIZE)}
                  className="mt-3 w-full border border-white/12 bg-white/[0.03] px-3 py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                >
                  Show more
                </button>
              ) : (
                <p className="mt-3 text-center text-xs text-mist/55">No more teams</p>
              )}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/65">
                Players
              </p>
              {playerSuggestions.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {playerSuggestions.map((player) => (
                    <li key={player.id}>
                      <div className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-3">
                        <FavoriteStar
                          active={false}
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
                          className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime"
                        >
                          <span className="profile-link block truncate text-sm font-semibold text-cream">
                            {player.name}
                          </span>
                          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/70">
                            {[player.teamName, player.citizenship, player.position]
                              .filter(Boolean)
                              .join(' · ') || getLeague(player.leagueId).short}
                          </span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {playerAvailable > playerVisible ? (
                <button
                  type="button"
                  onClick={() =>
                    setPlayerVisible((count) => count + SUGGESTION_PAGE_SIZE)
                  }
                  className="mt-3 w-full border border-white/12 bg-white/[0.03] px-3 py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                >
                  Show more
                </button>
              ) : (
                <p className="mt-3 text-center text-xs text-mist/55">No more players</p>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
