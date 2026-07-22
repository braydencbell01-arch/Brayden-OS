import { motion } from 'framer-motion'
import type { Match } from '../lib/football/types'

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function scoreText(match: Match) {
  if (match.score.home == null || match.score.away == null) return 'vs'
  return `${match.score.home} – ${match.score.away}`
}

function isLive(match: Match) {
  return match.status === 'live' || match.status === 'halftime'
}

export function MatchList({
  matches,
  loading,
  error,
  source,
  updatedAt,
  usingMock,
  showLeague = true,
  reduce,
  emptyLabel = 'No Big 5 matches on this date.',
}: {
  matches: Match[]
  loading: boolean
  error: string | null
  source: 'live' | 'mock'
  updatedAt: string | null
  usingMock: boolean
  showLeague?: boolean
  reduce: boolean | null
  emptyLabel?: string
}) {
  const liveCount = matches.filter(isLive).length

  return (
    <section aria-label="Match scores" className="relative">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Matches</p>
          <p className="mt-1 text-sm text-mist/80">
            {liveCount > 0
              ? `${liveCount} live · scores refresh automatically`
              : 'Fixtures and scores for the Big 5'}
          </p>
        </div>
        <div className="text-right text-[0.65rem] uppercase tracking-[0.14em] text-mist/55">
          <p>{usingMock || source === 'mock' ? 'Demo data' : 'Live feed'}</p>
          {updatedAt && (
            <p className="mt-0.5 normal-case tracking-normal text-mist/40">
              Updated {new Date(updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-lime/20 bg-black/20 px-3 py-2 text-xs text-mist/80" role="status">
          {error}. Showing demo fixtures until the API is reachable.
        </p>
      )}

      {loading && matches.length === 0 ? (
        <p className="px-1 text-sm text-mist/60">Loading matches…</p>
      ) : matches.length === 0 ? (
        <p className="px-1 text-sm text-mist/60">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match, i) => (
            <motion.li
              key={match.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: reduce ? 0 : Math.min(i * 0.04, 0.28),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="border-b border-white/10 py-3 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {showLeague && (
                    <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/55">
                      {match.leagueName}
                    </p>
                  )}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <p className="truncate text-right font-display text-2xl tracking-[0.04em] text-cream">
                      {match.home.name}
                    </p>
                    <p
                      className={[
                        'min-w-[4.5rem] text-center font-display text-3xl tracking-wide',
                        isLive(match) ? 'text-lime' : 'text-cream/90',
                      ].join(' ')}
                      aria-label={`Score ${scoreText(match)}`}
                    >
                      {scoreText(match)}
                    </p>
                    <p className="truncate font-display text-2xl tracking-[0.04em] text-cream">
                      {match.away.name}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={[
                      'text-xs font-bold uppercase tracking-[0.14em]',
                      isLive(match) ? 'text-lime' : 'text-mist/70',
                    ].join(' ')}
                  >
                    {isLive(match) ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime" />
                        </span>
                        {match.statusLabel}
                      </span>
                    ) : match.status === 'scheduled' ? (
                      formatKickoff(match.kickoff)
                    ) : (
                      match.statusLabel
                    )}
                  </p>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  )
}
