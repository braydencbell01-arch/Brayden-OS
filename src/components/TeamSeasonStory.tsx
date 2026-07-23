import { useMemo } from 'react'
import { buildTeamSeasonStory } from '../lib/insights'
import type { Match } from '../lib/matches'

export function TeamSeasonStory({
  matches,
  teamId,
  teamName,
}: {
  matches: Match[]
  teamId: string
  teamName: string
}) {
  const beats = useMemo(
    () => buildTeamSeasonStory(matches, teamId, teamName),
    [matches, teamId, teamName],
  )

  return (
    <div className="border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
        Season story
      </p>
      <ul className="mt-2 space-y-1.5">
        {beats.map((beat) => (
          <li key={beat} className="text-sm text-mist/80">
            · {beat}
          </li>
        ))}
      </ul>
    </div>
  )
}
