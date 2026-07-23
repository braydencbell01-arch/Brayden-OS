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

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-screen pt-screen md:max-w-xl md:px-6">
        <header className="mb-6">
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
          <p className="mt-2 text-sm text-mist/80">
            Browse every competition. Star one to pin it on Match day. For tables and leaders, use
            Stats.
          </p>
        </header>

        {favoriteLeagues.length > 0 ? (
          <section className="mb-6" aria-label="Favorite leagues">
            <p className="mb-2 px-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-star/90">
              Favorites
            </p>
            <div className="flex flex-col gap-3">
              {favoriteLeagues.map((league, i) => (
                <LeagueRow
                  key={league.id}
                  league={league}
                  favorited
                  index={i}
                  reduce={reduce}
                  onOpen={() => onOpenLeague(league.id)}
                  onToggleFavorite={() => favorites.toggleLeague(league.id)}
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
          <div className="flex flex-col gap-3">
            {(favoriteLeagues.length > 0 ? otherLeagues : leagues).map((league, i) => (
              <LeagueRow
                key={league.id}
                league={league}
                favorited={favorites.isLeagueFavorite(league.id)}
                index={i}
                reduce={reduce}
                onOpen={() => onOpenLeague(league.id)}
                onToggleFavorite={() => favorites.toggleLeague(league.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function LeagueRow({
  league,
  favorited,
  index,
  reduce,
  onOpen,
  onToggleFavorite,
}: {
  league: { id: LeagueId; name: string; country: string }
  favorited: boolean
  index: number
  reduce: boolean | null
  onOpen: () => void
  onToggleFavorite: () => void
}) {
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: reduce ? 0 : 0.06 + Math.min(index, 10) * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={[
        'flex items-stretch border bg-gradient-to-r from-pitch/80 to-turf/40 transition hover:border-lime/50',
        favorited ? 'border-star/35' : 'border-white/10',
      ].join(' ')}
    >
      <div className="flex items-center px-2">
        <FavoriteStar active={favorited} label={league.name} onToggle={onToggleFavorite} />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="group flex min-w-0 flex-1 items-center justify-between px-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
      >
        <span>
          <span className="profile-link block font-display text-3xl tracking-[0.06em] text-cream transition group-hover:text-lime sm:text-4xl">
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
}
