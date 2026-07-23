import { motion } from 'framer-motion'
import { leaguesInDisplayOrder, type LeagueId } from '../lib/leagues'
import type { FavoritesApi } from '../lib/favorites'

/**
 * Stats tab hub — jumps into league profiles where standings, player stats,
 * and stat leaders live (instead of a dead “coming soon” screen).
 */
export function StatsScreen({
  favorites,
  onOpenLeague,
  reduce,
}: {
  favorites: FavoritesApi
  onOpenLeague: (id: LeagueId) => void
  reduce: boolean | null
}) {
  const leagues = leaguesInDisplayOrder(favorites.leagueIds)
  const favoriteLeagues = leagues.filter((league) => favorites.isLeagueFavorite(league.id))
  const otherLeagues = leagues.filter((league) => !favorites.isLeagueFavorite(league.id))

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

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-screen md:max-w-xl md:px-6">
        <header className="mb-6">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-lime"
          >
            Numbers
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 font-display text-5xl tracking-[0.04em] text-cream sm:text-6xl"
          >
            Stats
          </motion.h1>
          <p className="mt-2 text-sm text-mist/80">
            Open a league for standings, player stats, and stat leaders.
          </p>
        </header>

        {favoriteLeagues.length > 0 ? (
          <section className="mb-6" aria-label="Favorite leagues">
            <p className="mb-2 px-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-star/90">
              Your leagues
            </p>
            <div className="flex flex-col gap-2">
              {favoriteLeagues.map((league) => (
                <LeagueStatsRow
                  key={league.id}
                  name={league.name}
                  country={league.country}
                  favorited
                  onClick={() => onOpenLeague(league.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section aria-label="All leagues">
          {favoriteLeagues.length > 0 ? (
            <p className="mb-2 px-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/65">
              All leagues
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {(favoriteLeagues.length > 0 ? otherLeagues : leagues).map((league, i) => (
              <motion.div
                key={league.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: reduce ? 0 : Math.min(i, 12) * 0.03,
                }}
              >
                <LeagueStatsRow
                  name={league.name}
                  country={league.country}
                  onClick={() => onOpenLeague(league.id)}
                />
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function LeagueStatsRow({
  name,
  country,
  favorited,
  onClick,
}: {
  name: string
  country: string
  favorited?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center justify-between gap-3 border px-3 py-3.5 text-left transition outline-none',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime',
        favorited
          ? 'border-star/35 bg-star/[0.07] hover:border-star/55'
          : 'border-white/10 bg-pitch/40 hover:border-lime/40',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="profile-link block truncate font-display text-2xl tracking-[0.04em] text-cream sm:text-3xl">
          {name}
        </span>
        <span className="mt-0.5 block text-[0.65rem] font-medium uppercase tracking-[0.14em] text-mist/65">
          {country} · Standings · Leaders
        </span>
      </span>
      <span className="shrink-0 text-lime">→</span>
    </button>
  )
}
