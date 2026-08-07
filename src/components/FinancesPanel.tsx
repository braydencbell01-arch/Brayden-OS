import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  PL_FINANCES,
  blockFill,
  clubScaleMax,
  formatMoneyGbp,
  formatMoneyUsd,
  scrRatio,
} from '../lib/stats/finances/format'
import type { FinanceBlock, FinanceClub } from '../lib/stats/finances/types'

// Stack: largest block at top → smallest at bottom (Bucks-style SCR column).

function StackColumn({
  club,
  scaleMax,
  selected,
  onSelect,
  showUsd,
  reduce,
}: {
  club: FinanceClub
  scaleMax: number
  selected: boolean
  onSelect: () => void
  showUsd: boolean
  reduce: boolean | null
}) {
  const ratio = scrRatio(club)
  const pct = (v: number) => `${Math.max((v / scaleMax) * 100, 0)}%`

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-[4.6rem] shrink-0 flex-col items-center gap-1.5 text-left transition sm:w-[5.2rem] ${
        selected ? 'opacity-100' : 'opacity-80 hover:opacity-100'
      }`}
    >
      <div
        className={`relative h-56 w-full overflow-hidden border sm:h-64 ${
          selected ? 'border-lime/70 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        {/* Threshold / revenue guides */}
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-dashed border-cream/55"
          style={{ bottom: pct(club.revenueGbp) }}
          title={`Revenue ${formatMoneyGbp(club.revenueGbp)}`}
        />
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-dashed border-lime"
          style={{ bottom: pct(club.greenThresholdGbp) }}
          title={`Green 85% ${formatMoneyGbp(club.greenThresholdGbp)}`}
        />
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t border-dashed border-red-400/90"
          style={{ bottom: pct(club.redThresholdGbp) }}
          title={`Red 115% ${formatMoneyGbp(club.redThresholdGbp)}`}
        />
        {club.uefaThresholdGbp != null ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 border-t border-dashed border-sky-300/80"
            style={{ bottom: pct(club.uefaThresholdGbp) }}
            title={`UEFA 70% ${formatMoneyGbp(club.uefaThresholdGbp)}`}
          />
        ) : null}

        <div className="absolute inset-0 z-10 flex flex-col justify-end">
          <div
            className="flex w-full flex-col"
            style={{ height: `${(club.squadCostGbp / scaleMax) * 100}%` }}
          >
            {club.blocks.map((block, i) => (
              <motion.div
                key={block.id}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(i * 0.01, 0.2) }}
                style={{
                  flex: `${block.amountGbp} 1 0%`,
                  background: blockFill(block.kind, i),
                  minHeight: 1,
                }}
                className="w-full border-b border-pitch-deep/35"
                title={`${block.label}: ${formatMoneyGbp(block.amountGbp)}`}
              />
            ))}
          </div>
        </div>
      </div>
      <span className="font-display text-lg leading-none text-cream">{club.short}</span>
      <span
        className={`text-[0.65rem] font-semibold tabular-nums ${
          ratio > 1.15 ? 'text-red-300' : ratio > 0.85 ? 'text-amber-200' : 'text-lime'
        }`}
      >
        {(ratio * 100).toFixed(0)}%
      </span>
      <span className="text-[0.6rem] text-mist/55 tabular-nums">
        {showUsd
          ? formatMoneyUsd(club.squadCostGbp, PL_FINANCES.usdPerGbp)
          : formatMoneyGbp(club.squadCostGbp)}
      </span>
    </button>
  )
}

function BlockRow({
  block,
  showUsd,
  usdPerGbp,
}: {
  block: FinanceBlock
  showUsd: boolean
  usdPerGbp: number
}) {
  const money = (n: number) =>
    showUsd ? formatMoneyUsd(n, usdPerGbp, false) : formatMoneyGbp(n, false)
  return (
    <li className="flex items-start justify-between gap-3 border-b border-white/5 py-2 text-sm">
      <span className="min-w-0">
        <span className="block text-cream">{block.label}</span>
        {block.kind === 'player' && (block.wageGbp != null || block.amortGbp != null) ? (
          <span className="text-[0.7rem] text-mist/55">
            Wage {money(block.wageGbp ?? 0)}
            {block.amortGbp ? ` · Amort ${money(block.amortGbp)}` : ''}
          </span>
        ) : (
          <span className="text-[0.7rem] uppercase tracking-[0.12em] text-mist/45">
            {block.kind === 'agents' ? 'FA agent fees' : 'Staff estimate'}
          </span>
        )}
      </span>
      <span className="shrink-0 font-semibold tabular-nums text-lime">{money(block.amountGbp)}</span>
    </li>
  )
}

/**
 * Premier League Squad Cost Ratio view — wages + amort + agents + coaching vs revenue.
 */
export function FinancesPanel({ reduce }: { reduce: boolean | null }) {
  const clubs = PL_FINANCES.clubs
  const [selectedId, setSelectedId] = useState(clubs[0]?.id ?? 'man-city')
  const [showUsd, setShowUsd] = useState(false)
  const selected = useMemo(
    () => clubs.find((c) => c.id === selectedId) ?? clubs[0],
    [clubs, selectedId],
  )
  const scaleMax = useMemo(
    () => Math.max(...clubs.map((c) => clubScaleMax(c))),
    [clubs],
  )

  if (!selected) return null

  const ratio = scrRatio(selected)

  return (
    <div className="space-y-4">
      <section className="border border-white/10 bg-white/[0.03] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
              {PL_FINANCES.league} · {PL_FINANCES.season}
            </h2>
            <p className="mt-1 text-sm text-mist/75">
              Squad Cost Ratio — player wages + amortisation, agent fees, and coaching staff vs club
              revenue. Green 85% / red 115% (PL SCR); UEFA clubs also show 70%.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUsd((v) => !v)}
            className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[0.7rem] font-bold text-mist hover:border-lime/40 hover:text-lime"
          >
            {showUsd ? 'Show GBP' : 'Show USD'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] text-mist/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-cream/55" /> Revenue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-lime" /> Green 85%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-red-400/90" /> Red 115%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-sky-300/80" /> UEFA 70%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#e8b84a]" /> Agents
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#7a9bb8]" /> Coaching
          </span>
        </div>

        <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1">
          {clubs.map((club) => (
            <StackColumn
              key={club.id}
              club={club}
              scaleMax={scaleMax}
              selected={club.id === selected.id}
              onSelect={() => setSelectedId(club.id)}
              showUsd={showUsd}
              reduce={reduce}
            />
          ))}
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.03] px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-3xl text-cream">{selected.name}</h3>
            <p className="text-sm text-mist/70">
              Squad cost{' '}
              <span className="font-semibold text-cream">
                {showUsd
                  ? formatMoneyUsd(selected.squadCostGbp, PL_FINANCES.usdPerGbp, false)
                  : formatMoneyGbp(selected.squadCostGbp, false)}
              </span>
              {' · '}
              Revenue{' '}
              <span className="font-semibold text-cream">
                {showUsd
                  ? formatMoneyUsd(selected.revenueGbp, PL_FINANCES.usdPerGbp, false)
                  : formatMoneyGbp(selected.revenueGbp, false)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p
              className={`font-display text-4xl tabular-nums ${
                ratio > 1.15 ? 'text-red-300' : ratio > 0.85 ? 'text-amber-200' : 'text-lime'
              }`}
            >
              {(ratio * 100).toFixed(0)}%
            </p>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-mist/55">SCR</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[0.7rem] sm:grid-cols-4">
          <div className="border border-white/10 bg-pitch/30 px-2 py-2">
            <p className="text-mist/50">Green 85%</p>
            <p className="font-semibold tabular-nums text-lime">
              {formatMoneyGbp(selected.greenThresholdGbp)}
            </p>
          </div>
          <div className="border border-white/10 bg-pitch/30 px-2 py-2">
            <p className="text-mist/50">Red 115%</p>
            <p className="font-semibold tabular-nums text-red-300">
              {formatMoneyGbp(selected.redThresholdGbp)}
            </p>
          </div>
          <div className="border border-white/10 bg-pitch/30 px-2 py-2">
            <p className="text-mist/50">UEFA 70%</p>
            <p className="font-semibold tabular-nums text-sky-200">
              {selected.uefaThresholdGbp != null
                ? formatMoneyGbp(selected.uefaThresholdGbp)
                : '—'}
            </p>
          </div>
          <div className="border border-white/10 bg-pitch/30 px-2 py-2">
            <p className="text-mist/50">Agents (FA)</p>
            <p className="font-semibold tabular-nums text-[#e8b84a]">
              {formatMoneyGbp(selected.agentFeesGbp)}
            </p>
          </div>
        </div>

        <ul className="mt-3 max-h-80 overflow-y-auto">
          {selected.blocks.map((block) => (
            <BlockRow
              key={block.id}
              block={block}
              showUsd={showUsd}
              usdPerGbp={PL_FINANCES.usdPerGbp}
            />
          ))}
        </ul>
      </section>

      <p className="text-[0.7rem] leading-relaxed text-mist/50">{PL_FINANCES.disclaimer}</p>
      <details className="text-[0.7rem] text-mist/45">
        <summary className="cursor-pointer text-mist/60 hover:text-mist">Sources</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {PL_FINANCES.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
          <li>
            PL SCR rules:{' '}
            <a
              className="text-lime/80 underline"
              href="https://www.premierleague.com/en/news/4467022/"
              target="_blank"
              rel="noreferrer"
            >
              Premier League announcement
            </a>
          </li>
        </ul>
      </details>
    </div>
  )
}
