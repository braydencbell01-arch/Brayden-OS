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

/** Only skip names on razor-thin slices. */
const NAME_MIN_PX = 6
/** Show £ amount once the segment is tall enough. */
const AMOUNT_MIN_PX = 24
const CHART_H = 560
const LABEL_GUTTER = 76

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
  // Line sits exactly on bottomPct (container height 0). Label floats beside it.
  return (
    <div
      className="pointer-events-none absolute left-0 z-30"
      style={{ bottom: `${bottomPct}%`, right: 0, height: 0 }}
    >
      <div
        className="absolute top-0 border-t border-dashed"
        style={{ borderColor: color, left: 0, right: LABEL_GUTTER }}
      />
      <div
        className="absolute top-0 flex -translate-y-1/2 flex-col items-end leading-none"
        style={{ right: 4, width: LABEL_GUTTER - 8 }}
      >
        <span className="text-[0.58rem] font-bold" style={{ color }}>
          {label}
        </span>
        <span className="text-[0.52rem] tabular-nums text-black/45">{valueLabel}</span>
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
  const money = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp, false) : formatMoneyGbp(n, false)
  const moneyShort = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp) : formatMoneyGbp(n)
  const y = (v: number) => (Math.max(v, 0) / scaleMax) * CHART_H
  const pct = (v: number) => (Math.max(v, 0) / scaleMax) * 100
  const stackH = y(club.squadCostGbp)
  const ticks = axisTicks(scaleMax, scaleMax > 600_000_000 ? 50_000_000 : 20_000_000)

  // Exact pixel heights so the stack top matches threshold math.
  const segs = club.blocks.map((block, i) => {
    const h = y(block.amountGbp)
    return { block, i, h }
  })
  // Fix rounding so heights sum to stackH
  const rawSum = segs.reduce((s, x) => s + x.h, 0)
  if (segs.length && Math.abs(rawSum - stackH) > 0.01) {
    segs[0].h += stackH - rawSum
  }

  const unlabeled = segs.filter(({ h }) => h < NAME_MIN_PX)

  return (
    <div className="mt-3">
      <div className="flex gap-1.5 sm:gap-2">
        <div className="relative w-9 shrink-0 sm:w-11" style={{ height: CHART_H }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 text-[0.5rem] tabular-nums text-mist/45 sm:text-[0.55rem]"
              style={{ bottom: `${pct(t)}%` }}
            >
              {formatMoneyGbp(t)}
            </span>
          ))}
        </div>

        <div
          className="relative min-w-0 flex-1 overflow-hidden rounded-sm border border-white/12 bg-[#e8ece6]"
          style={{ height: CHART_H }}
        >
          {ticks.map((t) => (
            <div
              key={`g-${t}`}
              className="pointer-events-none absolute border-t border-dotted border-black/[0.06]"
              style={{ bottom: `${pct(t)}%`, left: 0, right: LABEL_GUTTER }}
            />
          ))}

          <ThresholdLine
            label="Adj. rev"
            color="#111"
            bottomPct={pct(club.revenueGbp)}
            valueLabel={moneyShort(club.revenueGbp)}
          />
          <ThresholdLine
            label="Green 85%"
            color="#0f6b45"
            bottomPct={pct(club.greenThresholdGbp)}
            valueLabel={moneyShort(club.greenThresholdGbp)}
          />
          <ThresholdLine
            label="Red 115%"
            color="#b83232"
            bottomPct={pct(club.redThresholdGbp)}
            valueLabel={moneyShort(club.redThresholdGbp)}
          />
          {club.uefaThresholdGbp != null ? (
            <ThresholdLine
              label="UEFA 70%"
              color="#1d4ed8"
              bottomPct={pct(club.uefaThresholdGbp)}
              valueLabel={moneyShort(club.uefaThresholdGbp)}
            />
          ) : null}

          {/* Hairline at exact squad-cost top for SCR read. */}
          <div
            className="pointer-events-none absolute z-20 border-t border-black/35"
            style={{ bottom: stackH, left: 0, right: LABEL_GUTTER }}
            title={`Squad cost ${moneyShort(club.squadCostGbp)}`}
          />

          <div
            className="absolute bottom-0 left-0 z-10 flex flex-col overflow-hidden shadow-md"
            style={{ height: stackH, right: LABEL_GUTTER }}
          >
            {segs.map(({ block, i, h }) => {
              const showName = h >= NAME_MIN_PX
              const showAmount = h >= AMOUNT_MIN_PX
              const fill = blockFill(block.kind, i)
              const darkText = block.kind === 'agents'
              const fontPx = h >= 40 ? 13 : h >= 22 ? 11 : h >= 14 ? 9 : 8
              return (
                <motion.div
                  key={block.id}
                  initial={reduce ? false : { opacity: 0.35 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18, delay: reduce ? 0 : Math.min(i * 0.012, 0.2) }}
                  className="flex w-full shrink-0 items-center overflow-hidden border-b border-black/10 px-1.5"
                  style={{
                    height: h,
                    background: fill,
                    color: darkText ? '#1a1a1a' : '#f6f8f6',
                  }}
                  title={`${block.label}: ${money(block.amountGbp)}`}
                >
                  {showName ? (
                    <div className="min-w-0 leading-none">
                      <p
                        className="truncate font-bold"
                        style={{ fontSize: fontPx, lineHeight: 1.05 }}
                      >
                        {block.label}
                      </p>
                      {showAmount ? (
                        <p
                          className="mt-0.5 truncate font-semibold tabular-nums opacity-90"
                          style={{ fontSize: Math.max(fontPx - 2, 8) }}
                        >
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

      {unlabeled.length > 0 ? (
        <p className="mt-2 text-[0.62rem] leading-relaxed text-mist/50">
          {unlabeled.map(({ block, i }, n) => (
            <span key={block.id}>
              {n > 0 ? ' · ' : ''}
              <span style={{ color: blockFill(block.kind, i) }}>■</span> {block.label}
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
                  {(ratio * 100).toFixed(1)}%
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
