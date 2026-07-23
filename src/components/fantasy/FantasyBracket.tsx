import { seriesAggregate } from '../../lib/fantasy/schedule'
import { MISSING_SHORT } from '../../lib/display'
import type { FantasyLeague, PlayoffSeries } from '../../lib/fantasy/types'

function managerName(league: FantasyLeague, memberId: string | undefined): string {
  if (!memberId) return MISSING_SHORT
  return league.members.find((m) => m.id === memberId)?.name ?? memberId
}

function SeriesCard({ league, series }: { league: FantasyLeague; series: PlayoffSeries }) {
  const agg = seriesAggregate(league, series.id)
  const aScore = agg?.a ?? 0
  const bScore = agg?.b ?? 0

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">
        {series.kind} - #{series.seedA} vs #{series.seedB} - GW {series.gws[0]}-
        {series.gws[series.gws.length - 1]}
      </p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
          <span className="font-semibold text-cream">{managerName(league, series.memberAId)}</span>
          <span className="font-display text-2xl text-lime">{aScore.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
          <span className="font-semibold text-cream">{managerName(league, series.memberBId)}</span>
          <span className="font-display text-2xl text-cream">{bScore.toFixed(1)}</span>
        </div>
      </div>
      {series.winnerId ? (
        <p className="mt-2 text-xs text-mist/60">Winner: {managerName(league, series.winnerId)}</p>
      ) : (
        <p className="mt-2 text-xs text-mist/50">Aggregate series; higher seed wins ties.</p>
      )}
    </div>
  )
}

function PlaceholderFinal({ league }: { league: FantasyLeague }) {
  const semis = league.playoffs.filter((series) => series.kind === 'semifinal')
  const finalists = semis.map((series) => series.winnerId).filter(Boolean)

  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime">Final</p>
      <div className="mt-3 space-y-2">
        <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm font-semibold text-cream">
          {managerName(league, finalists[0])}
        </div>
        <div className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm font-semibold text-cream">
          {managerName(league, finalists[1])}
        </div>
      </div>
      <p className="mt-2 text-xs text-mist/50">Final fills after both semifinal series resolve.</p>
    </div>
  )
}

export function FantasyBracket({ league }: { league: FantasyLeague }) {
  const semis = league.playoffs.filter((series) => series.kind === 'semifinal')
  const final = league.playoffs.find((series) => series.kind === 'final')

  if (league.playoffs.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-mist/70">
        Playoff bracket seeds after GW {league.playoffStartGw - 1}.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-mist/60">
          Semifinals
        </h2>
        <div className="mt-2 grid gap-3">
          {semis.map((series) => (
            <SeriesCard key={series.id} league={league} series={series} />
          ))}
        </div>
      </div>

      <div className="flex justify-center text-lime/70" aria-hidden>
        |
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-mist/60">Final</h2>
        <div className="mt-2">
          {final ? <SeriesCard league={league} series={final} /> : <PlaceholderFinal league={league} />}
        </div>
      </div>
    </div>
  )
}
