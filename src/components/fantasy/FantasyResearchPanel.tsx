import { useMemo, useState } from 'react'
import type { FplCatalog } from '../../lib/fantasy/fplData'
import { computePayPerStat, formatMillions, formatPounds } from '../../lib/payPerStat'
import type { PlayerNavRef } from '../PlayerProfileScreen'
import { FantasyPlayerComparePanel } from './FantasyPlayerComparePanel'

type ResearchTab = 'value' | 'compare'

/**
 * FPL research tools (pay-per-stat + head-to-head) for the Fantasy tab.
 */
export function FantasyResearchPanel({
  catalog,
  onOpenPlayer,
  initialTab = 'value',
}: {
  catalog: FplCatalog | null
  onOpenPlayer?: (player: PlayerNavRef) => void
  initialTab?: ResearchTab
}) {
  const [tab, setTab] = useState<ResearchTab>(initialTab)

  const valueLeaders = useMemo(() => {
    if (!catalog) return []
    return catalog.players
      .filter((p) => p.totalPoints > 40)
      .map((p) => {
        const pps = computePayPerStat({
          cost: p.cost,
          goals: Math.max(1, Math.round(p.totalPoints / 12)),
          assists: Math.max(0, Math.round(p.totalPoints / 25)),
          totalPoints: p.totalPoints,
          name: p.webName,
        })
        return { player: p, pps }
      })
      .filter((row) => row.pps.perPoint != null)
      .sort((a, b) => (a.pps.perPoint ?? 0) - (b.pps.perPoint ?? 0))
      .slice(0, 8)
  }, [catalog])

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(
          [
            { id: 'value' as const, label: 'Value' },
            { id: 'compare' as const, label: 'Compare' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold transition ${
              tab === item.id ? 'bg-lime text-ink' : 'bg-white/5 text-mist hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'value' ? (
        <section className="border border-white/10 bg-white/[0.03] px-4 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
            Pay-per-stat (FPL price)
          </h2>
          <p className="mt-2 text-xs text-mist/60">
            £m FPL cost ÷ estimated output. Not Transfermarkt market value — draft research only.
          </p>
          {!catalog ? (
            <p className="mt-3 text-sm text-mist/70">Loading Premier League catalog…</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {valueLeaders.map(({ player, pps }) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
                >
                  <span>
                    <span className="block text-sm font-semibold text-cream">{player.webName}</span>
                    <span className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                      {player.teamShort} · {formatMillions(player.cost)} · {player.totalPoints} pts
                    </span>
                  </span>
                  <span className="text-right text-xs text-lime">
                    {pps.perPoint != null ? `${formatPounds(pps.perPoint)}/pt` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <FantasyPlayerComparePanel catalog={catalog} onOpenPlayer={onOpenPlayer} />
      )}
    </div>
  )
}
