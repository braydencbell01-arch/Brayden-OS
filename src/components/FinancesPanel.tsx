import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EntityLogo } from './EntityLogo'
import { teamLogoUrl } from '../lib/stats/branding'
import {
  PL_FINANCES,
  axisTicks,
  blockFill,
  clubScaleMax,
  formatMoneyGbp,
  formatMoneyUsd,
  scrRatio,
} from '../lib/stats/finances/format'
import type { FinanceClub } from '../lib/stats/finances/types'

/** Min segment height (px) to print name inside the block. */
const NAME_MIN_PX = 36
/** Min height to also print the £ amount. */
const AMOUNT_MIN_PX = 52

function ThresholdLine({
  label,
  color,
  bottomPct,
  valueLabel,
}: {
  label: string
  color: string
  bottomPct: number
  valueLabel: string
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
      style={{ bottom: `${bottomPct}%` }}
    >
      <div className="h-0 flex-1 border-t border-dashed" style={{ borderColor: color }} />
      <div
        className="ml-1 shrink-0 rounded-sm px-1.5 py-0.5 text-right"
        style={{ background: 'rgba(6, 38, 28, 0.92)' }}
      >
        <p className="text-[0.65rem] font-bold leading-tight" style={{ color }}>
          {label}
        </p>
        <p className="text-[0.6rem] tabular-nums text-mist/70">{valueLabel}</p>
      </div>
    </div>
  )
}

function BigStack({
  club,
  scaleMax,
  showUsd,
  reduce,
}: {
  club: FinanceClub
  scaleMax: number
  showUsd: boolean
  reduce: boolean | null
}) {
  /** Tall Bucks-style column. */
  const chartH = 560
  const money = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp, false) : formatMoneyGbp(n, false)
  const moneyShort = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp) : formatMoneyGbp(n)
  const pct = (v: number) => Math.max((v / scaleMax) * 100, 0)
  const stackH = (club.squadCostGbp / scaleMax) * chartH
  const ticks = axisTicks(scaleMax, scaleMax > 600_000_000 ? 50_000_000 : 20_000_000)

  const unlabeled = club.blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => (b.amountGbp / scaleMax) * chartH < NAME_MIN_PX)

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        {/* Y-axis */}
        <div className="relative w-10 shrink-0 sm:w-12" style={{ height: chartH }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[0.55rem] tabular-nums text-mist/50 sm:text-[0.6rem]"
              style={{ bottom: `${pct(t)}%` }}
            >
              {formatMoneyGbp(t)}
            </span>
          ))}
        </div>

        {/* Chart */}
        <div
          className="relative min-w-0 flex-1 overflow-hidden border border-white/15 bg-[#eef2ee]"
          style={{ height: chartH }}
        >
          {/* Grid */}
          {ticks.map((t) => (
            <div
              key={`g-${t}`}
              className="pointer-events-none absolute inset-x-0 border-t border-dotted border-black/10"
              style={{ bottom: `${pct(t)}%` }}
            />
          ))}

          <ThresholdLine
            label="Adj. revenue"
            color="#1a1a1a"
            bottomPct={pct(club.revenueGbp)}
            valueLabel={moneyShort(club.revenueGbp)}
          />
          <ThresholdLine
            label="Green 85%"
            color="#146b4a"
            bottomPct={pct(club.greenThresholdGbp)}
            valueLabel={moneyShort(club.greenThresholdGbp)}
          />
          <ThresholdLine
            label="Red 115%"
            color="#c43c3c"
            bottomPct={pct(club.redThresholdGbp)}
            valueLabel={moneyShort(club.redThresholdGbp)}
          />
          {club.uefaThresholdGbp != null ? (
            <ThresholdLine
              label="UEFA 70%"
              color="#2563eb"
              bottomPct={pct(club.uefaThresholdGbp)}
              valueLabel={moneyShort(club.uefaThresholdGbp)}
            />
          ) : null}

          <div className="absolute inset-y-0 left-0 right-[4.5rem] z-10 flex flex-col justify-end sm:right-28">
            <div className="flex w-full flex-col shadow-lg" style={{ height: stackH }}>
              {club.blocks.map((block, i) => {
                const segH = (block.amountGbp / scaleMax) * chartH
                const showName = segH >= NAME_MIN_PX
                const showAmount = segH >= AMOUNT_MIN_PX
                const fill = blockFill(block.kind, i)
                const textOnDark = block.kind !== 'agents'
                return (
                  <motion.div
                    key={block.id}
                    initial={reduce ? false : { opacity: 0.4 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: reduce ? 0 : Math.min(i * 0.015, 0.25) }}
                    className="relative flex w-full items-center overflow-hidden border-b border-black/15 px-2.5"
                    style={{
                      flex: `${block.amountGbp} 1 0%`,
                      background: fill,
                      minHeight: 2,
                      color: textOnDark ? '#f7faf8' : '#1a1a1a',
                    }}
                    title={`${block.label}: ${money(block.amountGbp)}`}
                  >
                    {showName ? (
                      <div className="min-w-0">
                        <p className="truncate text-[0.8rem] font-bold leading-tight sm:text-[0.9rem]">
                          {block.label}
                        </p>
                        {showAmount ? (
                          <p className="text-[0.7rem] font-semibold tabular-nums opacity-90 sm:text-[0.75rem]">
                            {money(block.amountGbp)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {unlabeled.length > 0 ? (
        <p className="mt-2 text-[0.65rem] leading-relaxed text-mist/55">
          {unlabeled.map(({ b, i }, n) => (
            <span key={b.id}>
              {n > 0 ? ' · ' : ''}
              <span style={{ color: blockFill(b.kind, i) }}>■</span> {b.label}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}

function ClubNav({
  clubs,
  selectedId,
  onSelect,
}: {
  clubs: FinanceClub[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const idx = clubs.findIndex((c) => c.id === selectedId)
  const prev = () => onSelect(clubs[(idx - 1 + clubs.length) % clubs.length].id)
  const next = () => onSelect(clubs[(idx + 1) % clubs.length].id)

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={prev}
        className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-mist hover:border-lime/40 hover:text-lime"
        aria-label="Previous club"
      >
        ‹
      </button>
      <div className="scrollbar-hide flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {clubs.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold transition ${
              c.id === selectedId ? 'bg-lime text-ink' : 'bg-white/5 text-mist hover:bg-white/10'
            }`}
          >
            {c.short}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={next}
        className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-mist hover:border-lime/40 hover:text-lime"
        aria-label="Next club"
      >
        ›
      </button>
    </div>
  )
}

/**
 * Premier League Squad Cost Ratio — one club at a time, Bucks-style stacked column.
 */
export function FinancesPanel({ reduce }: { reduce: boolean | null }) {
  const clubs = PL_FINANCES.clubs
  const [selectedId, setSelectedId] = useState(clubs[0]?.id ?? 'chelsea')
  const [showUsd, setShowUsd] = useState(false)
  const selected = useMemo(
    () => clubs.find((c) => c.id === selectedId) ?? clubs[0],
    [clubs, selectedId],
  )

  if (!selected) return null

  const scaleMax = clubScaleMax(selected)
  const ratio = scrRatio(selected)
  const money = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp, false) : formatMoneyGbp(n, false)

  return (
    <div className="space-y-3">
      <ClubNav clubs={clubs} selectedId={selected.id} onSelect={setSelectedId} />

      <AnimatePresence mode="wait">
        <motion.section
          key={selected.id}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="border border-white/10 bg-white/[0.03] px-3 py-4 sm:px-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-lime">
                Squad cost · {PL_FINANCES.season}
              </p>
              <h2 className="mt-1 font-display text-4xl tracking-[0.03em] text-cream sm:text-5xl">
                {selected.name}
              </h2>
              <p className="mt-1 text-sm text-mist/70">
                SCR{' '}
                <span
                  className={`font-bold tabular-nums ${
                    ratio > 1.15 ? 'text-red-300' : ratio > 0.85 ? 'text-amber-200' : 'text-lime'
                  }`}
                >
                  {(ratio * 100).toFixed(0)}%
                </span>
                {' · '}
                {money(selected.squadCostGbp)} cost / {money(selected.revenueGbp)} adj. revenue
              </p>
              {selected.footballRevenueGbp != null ? (
                <p className="mt-0.5 text-[0.7rem] text-mist/50">
                  Football {money(selected.footballRevenueGbp)}
                  {selected.playerTradingGbp != null
                    ? ` · Player trading ${selected.playerTradingGbp >= 0 ? '+' : '−'}${money(
                        Math.abs(selected.playerTradingGbp),
                      )}`
                    : ''}
                  {selected.source === 'accounts' ? ' · Accounts' : ' · Est.'}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {selected.espnTeamId ? (
                <EntityLogo
                  name={selected.name}
                  src={teamLogoUrl(selected.espnTeamId)}
                  size="md"
                />
              ) : null}
              <button
                type="button"
                onClick={() => setShowUsd((v) => !v)}
                className="rounded-full border border-white/15 px-2.5 py-0.5 text-[0.65rem] font-bold text-mist hover:border-lime/40 hover:text-lime"
              >
                {showUsd ? 'GBP' : 'USD'}
              </button>
            </div>
          </div>

          <BigStack club={selected} scaleMax={scaleMax} showUsd={showUsd} reduce={reduce} />
        </motion.section>
      </AnimatePresence>

      <p className="text-[0.7rem] leading-relaxed text-mist/50">{PL_FINANCES.disclaimer}</p>
      <details className="text-[0.7rem] text-mist/45">
        <summary className="cursor-pointer text-mist/60 hover:text-mist">Sources & why SCR moved</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {PL_FINANCES.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
          <li>
            Capology first-team fixed wages understated bills (Brentford ~£42m Capology vs ~£131m
            accounts). The viral ~89% for Brentford is usually wages+amort÷(revenue+player sales)
            without agents; this chart adds FA agent fees (Brentford ~97% SCR-style).
          </li>
          <li>
            PL SCR:{' '}
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
