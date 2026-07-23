import type { RatingBreakdown } from '../lib/stats/rating'

export function RatingBreakdownPanel({
  breakdown,
  compact = false,
}: {
  breakdown: Pick<
    RatingBreakdown,
    'rating' | 'performance100' | 'attack' | 'creation' | 'discipline' | 'goalkeeping' | 'defending' | 'notes' | 'minutesUsed'
  >
  compact?: boolean
}) {
  const rows = [
    { label: 'Attack', value: breakdown.attack },
    { label: 'Creation', value: breakdown.creation },
    { label: 'Discipline', value: breakdown.discipline },
    { label: 'Defending', value: breakdown.defending },
    { label: 'Keeping', value: breakdown.goalkeeping },
  ].filter((row) => Math.abs(row.value) > 0.01)

  return (
    <div className={compact ? 'mt-2' : 'mt-3 border border-white/10 bg-white/[0.03] px-3 py-3'}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
        Why {breakdown.rating.toFixed(1)}
      </p>
      <p className="mt-1 text-xs text-mist/65">
        {breakdown.performance100.toFixed(0)}/100 performance · ~{Math.round(breakdown.minutesUsed)}′
      </p>
      {rows.length > 0 ? (
        <ul className="mt-2 grid grid-cols-2 gap-1.5">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between text-xs text-mist/75">
              <span>{row.label}</span>
              <span className={row.value >= 0 ? 'text-lime' : 'text-star'}>
                {row.value >= 0 ? '+' : ''}
                {row.value.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {breakdown.notes.length > 0 ? (
        <p className="mt-2 text-[0.65rem] text-mist/55">{breakdown.notes.slice(0, 3).join(' · ')}</p>
      ) : null}
    </div>
  )
}
