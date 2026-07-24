import { useState } from 'react'
import { motion } from 'framer-motion'
import type { FavoritesApi } from '../lib/favorites'
import { getLeague, LEAGUES, leaguesInDisplayOrder, type LeagueId } from '../lib/leagues'
import { leagueAccentColor } from '../lib/stats/branding'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { LeagueLogoMark } from './LeagueLogoMark'
import { PlayerAvatar } from './PlayerAvatar'
import { PlayerComparePanel } from './PlayerComparePanel'
import { PredictionGamePanel } from './PredictionGamePanel'
import type { Match } from '../lib/matches'

type StatsTab = 'pulse' | 'compare' | 'predict' | 'leagues'

/**
 * Stats hub — real football intelligence (not Fantasy / FPL tools).
 */
export function StatsScreen({
  favorites,
  matches,
  onOpenLeagueStats,
  onOpenPlayer,
  reduce,
  initialTab = 'pulse',
}: {
  favorites: FavoritesApi
  matches: Match[]
  onOpenLeagueStats: (id: LeagueId) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  reduce: boolean | null
  initialTab?: StatsTab
}) {
  const [tab, setTab] = useState<StatsTab>(initialTab)
  const leagues = leaguesInDisplayOrder(favorites.leagueIds)
  const favoriteLeagues = leagues.filter((league) => favorites.isLeagueFavorite(league.id))

  const tabs: Array<{ id: StatsTab; label: string }> = [
    { id: 'pulse', label: 'Pulse' },
    { id: 'compare', label: 'Compare' },
    { id: 'predict', label: 'Predict' },
    { id: 'leagues', label: 'Leagues' },
  ]

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
        <header className="mb-4">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-lime"
          >
            Brayden intelligence
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.05 }}
            className="mt-2 font-display text-5xl tracking-[0.04em] text-cream sm:text-6xl"
          >
            Stats
          </motion.h1>
          <p className="mt-2 text-sm text-mist/80">
            Ratings pulse, head-to-head season stats, and quick predictions.
          </p>
        </header>

        <div className="scrollbar-hide mb-5 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                tab === t.id ? 'bg-lime text-ink' : 'bg-white/5 text-mist hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'pulse' ? (
          <div className="space-y-4">
            <section className="border border-white/10 bg-white/[0.03] px-4 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
                Favorite players
              </h2>
              {favorites.players.length === 0 ? (
                <p className="mt-2 text-sm text-mist/70">
                  Star players from a match lineup or search — their pulse will show here.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {favorites.players.slice(0, 8).map((player) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenPlayer({
                            id: player.id,
                            leagueId: player.leagueId,
                            name: player.name,
                            shortName: player.shortName,
                            photoUrl: player.photoUrl,
                            teamId: player.teamId,
                            teamName: player.teamName,
                            position: player.position,
                          })
                        }
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <PlayerAvatar
                            name={player.name}
                            photoUrl={player.photoUrl}
                            jerseyUrl={player.jerseyUrl}
                            jersey={player.jersey}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-cream">
                              {player.name}
                            </span>
                            <span className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                              {player.teamName || getLeague(player.leagueId).short}
                              {player.position ? ` · ${player.position}` : ''}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-lime">Profile →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border border-white/10 bg-white/[0.03] px-4 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
                Your leagues · open for stats
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {(favoriteLeagues.length > 0 ? favoriteLeagues : leagues.slice(0, 6)).map(
                  (league) => {
                    const accent = leagueAccentColor(league.id)
                    return (
                      <button
                        key={league.id}
                        type="button"
                        onClick={() => onOpenLeagueStats(league.id)}
                        className="flex items-center justify-between gap-3 border px-3 py-2.5 text-left hover:border-lime/40"
                        style={{
                          boxShadow: `inset 3px 0 0 ${accent}`,
                          borderColor: `${accent}40`,
                          background: `linear-gradient(90deg, ${accent}1f, transparent 50%)`,
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <LeagueLogoMark
                            leagueId={league.id}
                            name={league.name}
                            size="sm"
                            ringColor={accent}
                          />
                          <span className="min-w-0">
                            <span className="block font-display text-2xl text-cream">
                              {league.name}
                            </span>
                            <span className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                              Leaders · Player boards · Table
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-lime">→</span>
                      </button>
                    )
                  },
                )}
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'compare' ? (
          <PlayerComparePanel
            favoritePlayers={favorites.players}
            onOpenPlayer={onOpenPlayer}
          />
        ) : null}

        {tab === 'predict' ? <PredictionGamePanel matches={matches} /> : null}

        {tab === 'leagues' ? (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-sm text-mist/75">
              Open a competition for stats only — leaders, boards, and tables by season.
            </p>
            {LEAGUES.map((league) => {
              const accent = leagueAccentColor(league.id)
              return (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => onOpenLeagueStats(league.id)}
                  className="flex items-center justify-between gap-3 border bg-pitch/40 px-3 py-3 text-left hover:border-lime/40"
                  style={{
                    borderColor: `${accent}55`,
                    boxShadow: `inset 3px 0 0 ${accent}`,
                    background: `linear-gradient(90deg, ${accent}1f, rgba(11,61,46,0.4) 55%)`,
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <LeagueLogoMark
                      leagueId={league.id}
                      name={league.name}
                      size="sm"
                      ringColor={accent}
                    />
                    <span className="min-w-0">
                      <span className="block font-display text-2xl text-cream">{league.name}</span>
                      <span className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                        {league.country} · Stats hub
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-lime">→</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
