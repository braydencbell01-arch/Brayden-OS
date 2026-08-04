import { useEffect, useState } from 'react'
import type { LeagueId } from '../lib/leagues'
import {
  fetchLeagueSeasonTimeline,
  staticLeagueSeasonTimeline,
  type SeasonTimelinePhase,
} from '../lib/stats/leagueSeasonTimeline'

/** Tournament-phase strip for internationals, continentals, and cups. */
export function LeagueSeasonTimeline({ leagueId }: { leagueId: LeagueId }) {
  const [phases, setPhases] = useState<SeasonTimelinePhase[] | null>(
    () => staticLeagueSeasonTimeline(leagueId),
  )

  useEffect(() => {
    let cancelled = false
    setPhases(staticLeagueSeasonTimeline(leagueId))
    void fetchLeagueSeasonTimeline(leagueId).then((next) => {
      if (!cancelled) setPhases(next)
    })
    return () => {
      cancelled = true
    }
  }, [leagueId])

  if (!phases || phases.length === 0) return null

  return (
    <div className="border border-white/10 bg-white/[0.03] px-3 py-3" aria-label="Season timeline">
      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        Season timeline
      </p>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {phases.map((phase, index) => (
          <li key={`${phase.id}-${index}`} className="flex items-center gap-2">
            <span className="border border-white/15 bg-pitch/50 px-2.5 py-1 text-[0.7rem] font-semibold text-cream">
              {phase.label}
            </span>
            {index < phases.length - 1 ? (
              <span className="text-mist/40" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
