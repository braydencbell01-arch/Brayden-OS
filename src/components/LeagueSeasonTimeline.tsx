import type { LeagueId } from '../lib/leagues'

type Phase = {
  id: string
  label: string
}

const KNOCKOUT_DEEP: Phase[] = [
  { id: 'early', label: 'Early rounds' },
  { id: 'r32', label: 'Round of 32' },
  { id: 'r16', label: 'Round of 16' },
  { id: 'qf', label: 'Quarter-finals' },
  { id: 'sf', label: 'Semi-finals' },
  { id: 'final', label: 'Final' },
]

const KNOCKOUT_STANDARD: Phase[] = [
  { id: 'r32', label: 'Round of 32' },
  { id: 'r16', label: 'Round of 16' },
  { id: 'qf', label: 'Quarter-finals' },
  { id: 'sf', label: 'Semi-finals' },
  { id: 'final', label: 'Final' },
]

const KNOCKOUT_COMPACT: Phase[] = [
  { id: 'r16', label: 'Round of 16' },
  { id: 'qf', label: 'Quarter-finals' },
  { id: 'sf', label: 'Semi-finals' },
  { id: 'final', label: 'Final' },
]

const SUPERCUP: Phase[] = [{ id: 'final', label: 'Final' }]

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
  'uefa-euro-qual': [
    { id: 'groups', label: 'Qualifying groups' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'uefa-champions-qual': [
    { id: 'rounds', label: 'Qualifying rounds' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'uefa-europa-qual': [
    { id: 'rounds', label: 'Qualifying rounds' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  'uefa-conference-qual': [
    { id: 'rounds', label: 'Qualifying rounds' },
    { id: 'playoffs', label: 'Play-offs' },
  ],
  // Domestic cups
  'fa-cup': KNOCKOUT_DEEP,
  'efl-cup': KNOCKOUT_STANDARD,
  'community-shield': SUPERCUP,
  'efl-trophy': KNOCKOUT_COMPACT,
  'copa-del-rey': KNOCKOUT_DEEP,
  'spanish-supercopa': [
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'coppa-italia': KNOCKOUT_STANDARD,
  'italian-supercoppa': [
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Final' },
  ],
  'dfb-pokal': KNOCKOUT_DEEP,
  'german-supercup': SUPERCUP,
  'coupe-de-france': KNOCKOUT_DEEP,
  'trophee-des-champions': SUPERCUP,
  'coupe-de-la-ligue': KNOCKOUT_COMPACT,
  'copa-do-brasil': KNOCKOUT_DEEP,
  'brazilian-supercopa': SUPERCUP,
  'copa-mx': KNOCKOUT_COMPACT,
  'campeon-de-campeones': SUPERCUP,
  'us-open-cup': KNOCKOUT_DEEP,
  'copa-argentina': KNOCKOUT_DEEP,
  'argentine-supercopa': SUPERCUP,
  'trofeo-de-campeones': SUPERCUP,
  'knvb-beker': KNOCKOUT_STANDARD,
  'johan-cruyff-shield': SUPERCUP,
  'taca-de-portugal': KNOCKOUT_DEEP,
  'scottish-cup': KNOCKOUT_DEEP,
  'scottish-league-cup': KNOCKOUT_STANDARD,
  'scottish-challenge-cup': KNOCKOUT_COMPACT,
  'saudi-kings-cup': KNOCKOUT_STANDARD,
}

/** Tournament-phase strip for internationals and domestic cups. */
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
