import { motion } from 'framer-motion'
import { FavoriteStar } from './FavoriteStar'
import { leaguesInDisplayOrder, type LeagueId } from '../lib/leagues'
import type { FavoritesApi } from '../lib/favorites'

export function LeaguesScreen({
  favorites,
  onOpenLeague,
  reduce,
}: {
  favorites: FavoritesApi
  onOpenLeague: (id: LeagueId) => void
  reduce: boolean | null
}) {
  const leagues = leaguesInDisplayOrder(favorites.leagueIds)

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,107,74,0.55), transparent 55%), radial-gradient(ellipse 45% 40% at 100% 20%, rgba(200,245,66,0.12), transparent 50%), radial-gradient(ellipse 40% 35% at 0% 80%, rgba(20,107,74,0.35), transparent 55%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-40" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-6 md:max-w-xl md:px-6">
        <header className="mb-8">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-lime"
          >
            Competitions
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 font-display text-5xl tracking-[0.04em] text-cream sm:text-6xl"
          >
            Leagues
          </motion.h1>
          <p className="mt-2 text-sm text-mist/80">Tap a league to open its profile</p>
        </header>

        <div className="flex flex-col gap-3">
          {leagues.map((league, i) => {
            const favorited = favorites.isLeagueFavorite(league.id)
            return (
              <motion.div
                key={league.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.45,
                  delay: reduce ? 0 : 0.08 + i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-stretch border border-white/10 bg-gradient-to-r from-pitch/80 to-turf/40 transition hover:border-lime/50"
              >
                <div className="flex items-center px-2">
                  <FavoriteStar
                    active={favorited}
                    label={league.name}
                    onToggle={() => favorites.toggleLeague(league.id)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLeague(league.id)}
                  className="group flex min-w-0 flex-1 items-center justify-between px-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
                >
                  <span>
                    <span className="block font-display text-3xl tracking-[0.06em] text-cream transition group-hover:text-lime sm:text-4xl">
                      {league.name}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium uppercase tracking-[0.16em] text-mist/70">
                      {league.country}
                    </span>
                  </span>
                  <span className="font-display text-xl tracking-wide text-lime/90 transition group-hover:translate-x-1">
                    Profile →
                  </span>
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
