import { buildPreMatchBriefing, predictMatch } from '../lib/insights'
import type { Match } from '../lib/matches'

function FormStrip({ form }: { form: string[] }) {
  return (
    <span className="font-mono text-[0.65rem] tracking-[0.14em] text-mist/70">
      {form.join('') || '—'}
    </span>
  )
}

export function PreMatchBriefingPanel({
  match,
  allMatches,
  showPrediction,
}: {
  match: Match
  allMatches: Match[]
  showPrediction?: boolean
}) {
  if (match.status !== 'scheduled' && match.status !== 'other') return null
  const briefing = buildPreMatchBriefing(match, allMatches)
  const pred = showPrediction ? predictMatch(match, allMatches) : null

  return (
    <div className="mt-3 border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
        Pre-match briefing
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-mist/55">{match.home.shortName} form</p>
          <FormStrip form={briefing.homeForm} />
        </div>
        <div className="text-right">
          <p className="text-mist/55">{match.away.shortName} form</p>
          <FormStrip form={briefing.awayForm} />
        </div>
      </div>
      {briefing.h2h.length > 0 ? (
        <div className="mt-3">
          <p className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">Recent H2H</p>
          <ul className="mt-1 space-y-1">
            {briefing.h2h.slice(0, 3).map((row) => (
              <li key={`${row.dateKey}-${row.score}`} className="text-xs text-mist/75">
                {row.dateKey} · {row.home} {row.score} {row.away}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-xs text-mist/55">No recent H2H in the loaded fixture window.</p>
      )}
      <p className="mt-2 text-xs text-cream/85">{briefing.tip}</p>
      {pred ? (
        <p className="mt-1 text-[0.65rem] text-mist/55">
          Lean {pred.predictedScore} · {pred.homeWinPct}/{pred.drawPct}/{pred.awayWinPct}% (
          {pred.confidence})
        </p>
      ) : null}
    </div>
  )
}
