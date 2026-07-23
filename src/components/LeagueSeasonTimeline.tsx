import type { LeagueId } from '../lib/leagues'

type Phase = {
  id: string
  label: string
}

const TIMELINES: Partial<Record<LeagueId, Phase[]>> = {
  'fifa-world': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'uefa-euro': [
    { id: 'group', label: 'Group stage' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'conmebol-america': [
    { id: 'group', label: 'Group stage' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'uefa-nations': [
    { id: 'league', label: 'League phase' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'finals', label: 'Finals' },
  ],
  'fifa-worldq': [
    { id: 'groups', label: 'Qualifying groups' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
}

/** Light tournament-phase strip for major international competitions. */
export function LeagueSeasonTimeline({ leagueId }: { leagueId: LeagueId }) {
  const phases = TIMELINES[leagueId]
  if (!phases || phases.length === 0) return null

  return (
    <div className="border border-white/10 bg-white/[0.03] px-3 py-3" aria-label="Season timeline">
      <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        Season timeline
      </p>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {phases.map((phase, index) => (
          <li key={phase.id} className="flex items-center gap-2">
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
