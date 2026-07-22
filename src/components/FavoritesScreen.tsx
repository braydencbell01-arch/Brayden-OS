import { useState } from 'react'
import { motion } from 'framer-motion'
import { LEAGUES, getLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import { FavoriteStar } from './FavoriteStar'

type FavoritesSection = 'leagues' | 'teams' | 'players'

export function FavoritesScreen({
  favorites,
  onBack,
  onOpenLeague,
  onOpenTeam,
  reduce,
}: {
  favorites: FavoritesApi
  onBack: () => void
  onOpenLeague: (id: LeagueId) => void
  onOpenTeam: (team: FavoriteTeam) => void
  reduce: boolean | null
}) {
  const [openSection, setOpenSection] = useState<FavoritesSection | null>('leagues')

  const favoriteLeagues = LEAGUES.filter((league) => favorites.isLeagueFavorite(league.id))

  const toggleSection = (section: FavoritesSection) => {
    setOpenSection((current) => (current === section ? null : section))
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
            <span aria-hidden>←</span> Back to home
          </motion.button>
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-star">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              aria-hidden
              className="drop-shadow-[0_0_8px_rgba(255,216,74,0.95)]"
            >
              <path
                d="M12 2.8l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.7 6.6 19.6l1-6.1-4.4-4.3 6.1-.9L12 2.8z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            Favorites
          </span>
        </div>

        <motion.header
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-white/10 pb-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-star">Your picks</p>
          <h1 className="mt-2 font-display text-6xl tracking-[0.04em] text-cream sm:text-7xl">
            Favorites
          </h1>
          <p className="mt-3 text-sm text-mist/80">
            Starred leagues and teams drive the yellow dots on your calendar.
          </p>
        </motion.header>

        <div className="mt-8 flex flex-col gap-3" role="tablist" aria-label="Favorites categories">
          {(
            [
              { id: 'leagues', label: 'Leagues' },
              { id: 'teams', label: 'Teams' },
              { id: 'players', label: 'Players' },
            ] as const
          ).map((section) => {
            const open = openSection === section.id
            return (
              <div key={section.id} className="border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  role="tab"
                  aria-expanded={open}
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left outline-none transition hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-star focus-visible:ring-inset"
                >
                  <span className="font-display text-3xl tracking-wide text-cream">{section.label}</span>
                  <span className="text-sm text-mist/70">{open ? '▴' : '▾'}</span>
                </button>

                {open && (
                  <div className="border-t border-white/10 px-4 py-3">
                    {section.id === 'leagues' && (
                      favoriteLeagues.length === 0 ? (
                        <p className="text-sm text-mist/70">
                          No favorited leagues yet. Tap the star next to a league on home.
                        </p>
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
                                    <span className="block font-display text-2xl tracking-wide text-cream">
                                      {league.name}
                                    </span>
                                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
                                      {league.country}
                                    </span>
                                  </span>
                                  <span className="text-lime">{league.short} →</span>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )
                    )}

                    {section.id === 'teams' && (
                      favorites.teams.length === 0 ? (
                        <p className="text-sm text-mist/70">
                          No favorited teams yet. Open a league table and tap a star between # and the club name.
                        </p>
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
                                      <span className="block text-sm font-semibold text-cream">
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
                      <p className="text-sm text-mist/70">
                        No players yet — player favorites will land here once player profiles are added.
                      </p>
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
