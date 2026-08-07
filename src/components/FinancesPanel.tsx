import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { EntityLogo } from './EntityLogo'
import { teamLogoUrl } from '../lib/stats/branding'
import {
  PL_FINANCES,
  axisTicks,
  clubScaleMax,
  formatMoneyGbp,
  formatMoneyUsd,
  scrRatio,
} from '../lib/stats/finances/format'
import {
  SEASON_TIMELINES,
  assignStableColors,
  blockFillStable,
  clubStateAtDate,
  eventsFiredBetween,
  formatSeasonDate,
  isoFromProgress,
  rangeForMode,
  type PlayMode,
  type SeasonEvent,
} from '../lib/stats/finances/seasonEngine'
import type { FinanceClub } from '../lib/stats/finances/types'

const NAME_MIN_PX = 6
const AMOUNT_MIN_PX = 24
const CHART_H = 560
const LABEL_GUTTER = 78
const EVENT_HOLD_MS = 1000

function ThresholdLine({
  label,
  bottomPct,
  valueLabel,
}: {
  label: string
  bottomPct: number
  valueLabel: string
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30"
      style={{ bottom: `${bottomPct}%`, height: 0 }}
    >
      <div className="absolute top-0 left-0 right-0 border-t-2 border-solid border-black" />
      <div
        className="absolute top-0 flex -translate-y-1/2 flex-col items-end leading-none bg-[#e8ece6] px-1"
        style={{ right: 2, width: LABEL_GUTTER - 6 }}
      >
        <span className="text-[0.58rem] font-bold text-black">{label}</span>
        <span className="text-[0.52rem] tabular-nums text-black/55">{valueLabel}</span>
      </div>
    </div>
  )
}

function BigStack({
  club,
  scaleMax,
  showUsd,
  reduce,
  colorMap,
  eventHold,
}: {
  club: FinanceClub
  scaleMax: number
  showUsd: boolean
  reduce: boolean | null
  colorMap: Map<string, string> | null
  eventHold: boolean
}) {
  const money = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp, false) : formatMoneyGbp(n, false)
  const moneyShort = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp) : formatMoneyGbp(n)
  const y = (v: number) => (Math.max(v, 0) / scaleMax) * CHART_H
  const pct = (v: number) => (Math.max(v, 0) / scaleMax) * 100
  const stackH = y(club.squadCostGbp)
  const ticks = axisTicks(scaleMax, scaleMax > 600_000_000 ? 50_000_000 : 20_000_000)

  const segs = club.blocks.map((block, i) => ({ block, i, h: y(block.amountGbp) }))
  const rawSum = segs.reduce((s, x) => s + x.h, 0)
  if (segs.length && Math.abs(rawSum - stackH) > 0.01) segs[0].h += stackH - rawSum

  const unlabeled = segs.filter(({ h }) => h < NAME_MIN_PX)
  const layoutDuration = eventHold ? 0.85 : reduce ? 0 : 0.35

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
          className="relative min-w-0 flex-1 rounded-sm border border-white/12 bg-[#e8ece6]"
          style={{ height: CHART_H }}
        >
          {ticks.map((t) => (
            <div
              key={`g-${t}`}
              className="pointer-events-none absolute inset-x-0 border-t border-dotted border-black/[0.06]"
              style={{ bottom: `${pct(t)}%` }}
            />
          ))}

          {/* Full-width solid black SCR lines — never clipped by the stack gutter */}
          <ThresholdLine
            label="115%"
            bottomPct={pct(club.redThresholdGbp)}
            valueLabel={moneyShort(club.redThresholdGbp)}
          />
          <ThresholdLine
            label="100%"
            bottomPct={pct(club.revenueGbp)}
            valueLabel={moneyShort(club.revenueGbp)}
          />
          <ThresholdLine
            label="85%"
            bottomPct={pct(club.greenThresholdGbp)}
            valueLabel={moneyShort(club.greenThresholdGbp)}
          />
          {club.uefaThresholdGbp != null ? (
            <ThresholdLine
              label="70%"
              bottomPct={pct(club.uefaThresholdGbp)}
              valueLabel={moneyShort(club.uefaThresholdGbp)}
            />
          ) : null}

          <LayoutGroup>
            <div
              className="absolute bottom-0 left-0 z-10 flex flex-col shadow-md"
              style={{ height: stackH, right: LABEL_GUTTER }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {segs.map(({ block, i, h }) => {
                  const showName = h >= NAME_MIN_PX
                  const showAmount = h >= AMOUNT_MIN_PX
                  const fill = blockFillStable(colorMap, block, i)
                  const darkText = block.kind === 'agents'
                  const fontPx = h >= 40 ? 13 : h >= 22 ? 11 : h >= 14 ? 9 : 8
                  const away = !!block.away
                  return (
                    <motion.div
                      key={block.id}
                      layout={!reduce}
                      initial={
                        reduce
                          ? false
                          : { opacity: 0, x: 72, height: 0 }
                      }
                      animate={{
                        opacity: away ? 0.42 : 1,
                        x: 0,
                        height: h,
                      }}
                      exit={
                        reduce
                          ? undefined
                          : { opacity: 0, x: -90, height: 0, marginBottom: 0 }
                      }
                      transition={{
                        layout: { duration: layoutDuration, ease: [0.22, 1, 0.36, 1] },
                        height: { duration: layoutDuration, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: Math.min(layoutDuration, 0.45) },
                        x: { duration: layoutDuration, ease: [0.22, 1, 0.36, 1] },
                      }}
                      className="flex w-full shrink-0 items-center overflow-hidden border-b border-black/10 px-1.5"
                      style={{
                        background: fill,
                        color: darkText ? '#1a1a1a' : '#f6f8f6',
                        filter: away ? 'grayscale(0.35)' : undefined,
                      }}
                      title={`${block.label}: ${money(block.amountGbp)}${
                        away ? ' (away / loan — still on books)' : ''
                      }`}
                    >
                      {showName ? (
                        <div className="min-w-0 leading-none">
                          <p
                            className="truncate font-bold"
                            style={{ fontSize: fontPx, lineHeight: 1.05 }}
                          >
                            {block.label}
                            {away ? ' · away' : ''}
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
              </AnimatePresence>
            </div>
          </LayoutGroup>
        </div>
      </div>

      {unlabeled.length > 0 ? (
        <p className="mt-2 text-[0.62rem] leading-relaxed text-mist/50">
          {unlabeled.map(({ block, i }, n) => (
            <span key={block.id} className={block.away ? 'opacity-50' : undefined}>
              {n > 0 ? ' · ' : ''}
              <span style={{ color: blockFillStable(colorMap, block, i) }}>■</span> {block.label}
              {block.away ? ' (away)' : ''}
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
 * Premier League Squad Cost Ratio — season / offseason play-through with scrubber.
 */
export function FinancesPanel({ reduce }: { reduce: boolean | null }) {
  const clubs = PL_FINANCES.clubs
  const [selectedId, setSelectedId] = useState(clubs[0]?.id ?? 'chelsea')
  const [showUsd, setShowUsd] = useState(false)
  const [playMode, setPlayMode] = useState<PlayMode>('season')
  const [playing, setPlaying] = useState(false)
  const [playDate, setPlayDate] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [eventLog, setEventLog] = useState<SeasonEvent[]>([])
  const [toast, setToast] = useState<SeasonEvent | null>(null)
  const [eventHold, setEventHold] = useState(false)

  const prevDateRef = useRef<string | null>(null)
  const rafRef = useRef(0)
  const anchorTsRef = useRef(0)
  const progressRef = useRef(0)
  const holdUntilRef = useRef(0)
  const toastTimerRef = useRef(0)
  const holdMsRef = useRef(0)
  const [colorMap, setColorMap] = useState<Map<string, string> | null>(null)

  const catalogClub = useMemo(
    () => clubs.find((c) => c.id === selectedId) ?? clubs[0],
    [clubs, selectedId],
  )
  const timeline = SEASON_TIMELINES.clubs[selectedId]
  const range = rangeForMode(playMode)

  const displayClub = useMemo(() => {
    if (!catalogClub) return null
    if (playDate && timeline) return clubStateAtDate(timeline, playDate)
    return catalogClub
  }, [catalogClub, playDate, timeline])

  // Stable colors: opening order first (size-sorted) so neighbours differ; ids stick for the run.
  useEffect(() => {
    if (!timeline || !catalogClub) return
    const openingSorted = [...timeline.openingBlocks].sort(
      (a, b) => b.amountGbp - a.amountGbp,
    )
    const ids: string[] = []
    const seen = new Set<string>()
    for (const b of openingSorted) {
      if (!seen.has(b.id)) {
        ids.push(b.id)
        seen.add(b.id)
      }
    }
    for (const b of catalogClub.blocks) {
      if (!seen.has(b.id)) {
        ids.push(b.id)
        seen.add(b.id)
      }
    }
    for (const e of timeline.events) {
      const id = e.addBlock?.id || e.removeBlockId || e.loanBlockId
      if (id && !seen.has(id)) {
        ids.push(id)
        seen.add(id)
      }
    }
    setColorMap(assignStableColors(ids))
  }, [timeline, catalogClub])

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }

  const pausePlayback = () => {
    stopRaf()
    setPlaying(false)
    setEventHold(false)
    holdUntilRef.current = 0
    holdMsRef.current = 0
  }

  const selectClub = (id: string) => {
    pausePlayback()
    setPlayDate(null)
    setProgress(0)
    progressRef.current = 0
    setEventLog([])
    setToast(null)
    prevDateRef.current = null
    setSelectedId(id)
  }

  const flashEvent = (event: SeasonEvent) => {
    setToast(event)
    setEventLog((log) => [event, ...log.filter((e) => e.id !== event.id)])
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), EVENT_HOLD_MS + 50)
  }

  const beginMode = (mode: PlayMode, fromProgress = 0) => {
    if (!timeline) return
    stopRaf()
    setPlayMode(mode)
    const r = rangeForMode(mode)
    const p = Math.min(1, Math.max(0, fromProgress))
    progressRef.current = p
    setProgress(p)
    const iso = isoFromProgress(p, r.start, r.end)
    setPlayDate(iso)
    prevDateRef.current = p === 0 ? null : iso
    if (p === 0) setEventLog([])
    setToast(null)
    setEventHold(false)
    holdUntilRef.current = 0
    holdMsRef.current = 0
    anchorTsRef.current = performance.now() - p * r.durationMs
    setPlaying(true)
  }

  const togglePlay = (mode: PlayMode) => {
    if (playing && playMode === mode) {
      pausePlayback()
      return
    }
    // Resume from the paused progress (same mode); otherwise restart that mode
    if (playDate && playMode === mode && progressRef.current > 0 && progressRef.current < 1) {
      beginMode(mode, progressRef.current)
      return
    }
    if (playing && playMode !== mode) pausePlayback()
    beginMode(mode, 0)
  }

  const onScrub = (value: number) => {
    if (!timeline) return
    pausePlayback()
    const p = value / 1000
    progressRef.current = p
    setProgress(p)
    const iso = isoFromProgress(p, range.start, range.end)
    const prev = prevDateRef.current
    if (iso !== prev) {
      // Rebuild event log up to scrubbed date within range
      const fired = eventsFiredBetween(timeline, null, iso, range.start).filter(
        (e) => e.date <= iso,
      )
      setEventLog([...fired].reverse())
      prevDateRef.current = iso
      setPlayDate(iso)
    }
    setToast(null)
    setEventHold(false)
  }

  useEffect(() => {
    if (!playing || !timeline) return

    const tick = (now: number) => {
      if (now < holdUntilRef.current) {
        setEventHold(true)
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      if (holdUntilRef.current) {
        // Resume clock after hold without jumping: shift anchor by actual hold duration
        anchorTsRef.current += holdMsRef.current || EVENT_HOLD_MS
        holdUntilRef.current = 0
        holdMsRef.current = 0
        setEventHold(false)
      }

      const elapsed = now - anchorTsRef.current
      const p = Math.min(1, elapsed / range.durationMs)
      progressRef.current = p
      setProgress(p)
      const nextIso = isoFromProgress(p, range.start, range.end)
      const prevIso = prevDateRef.current
      if (nextIso !== prevIso) {
        const fired = eventsFiredBetween(timeline, prevIso, nextIso, range.start)
        if (fired.length > 0) {
          for (const event of fired) flashEvent(event)
          const holdMs = EVENT_HOLD_MS * fired.length
          holdMsRef.current = holdMs
          holdUntilRef.current = now + holdMs
          setEventHold(true)
        }
        prevDateRef.current = nextIso
        setPlayDate(nextIso)
      }
      if (p < 1 || holdUntilRef.current > now) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPlaying(false)
        setEventHold(false)
        rafRef.current = 0
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => stopRaf()
  }, [playing, timeline, range.start, range.end, range.durationMs, playMode])

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      stopRaf()
    },
    [],
  )

  if (!displayClub) return null

  const scaleMax = clubScaleMax(displayClub)
  const ratio = scrRatio(displayClub)
  const money = (n: number) =>
    showUsd ? formatMoneyUsd(n, PL_FINANCES.usdPerGbp, false) : formatMoneyGbp(n, false)
  const dateLabel = playDate
    ? formatSeasonDate(playDate)
    : `End of ${PL_FINANCES.season}`
  const inPlayUi = playDate != null

  return (
    <div className="space-y-3">
      <ClubNav clubs={clubs} selectedId={displayClub.id} onSelect={selectClub} />

      <section className="relative border border-white/10 bg-white/[0.03] px-3 py-4 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-lime">
              Squad cost · {PL_FINANCES.season}
            </p>
            <h2 className="mt-1 font-display text-4xl tracking-[0.03em] text-cream sm:text-5xl">
              {displayClub.name}
            </h2>
            <p className="mt-1 font-display text-2xl tracking-[0.04em] text-lime tabular-nums sm:text-3xl">
              {dateLabel}
            </p>
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
              {money(displayClub.squadCostGbp)} cost / {money(displayClub.revenueGbp)} adj. revenue
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {displayClub.espnTeamId ? (
              <EntityLogo
                name={displayClub.name}
                src={teamLogoUrl(displayClub.espnTeamId)}
                size="md"
              />
            ) : null}
            <div className="flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={() => togglePlay('season')}
                disabled={!timeline}
                className={`rounded-full px-3 py-1 text-[0.68rem] font-bold disabled:opacity-40 ${
                  playing && playMode === 'season'
                    ? 'bg-white/15 text-cream'
                    : 'bg-lime text-ink'
                }`}
              >
                {playing && playMode === 'season' ? 'Pause' : 'Play season'}
              </button>
              <button
                type="button"
                onClick={() => togglePlay('offseason')}
                disabled={!timeline}
                className={`rounded-full px-3 py-1 text-[0.68rem] font-bold disabled:opacity-40 ${
                  playing && playMode === 'offseason'
                    ? 'bg-white/15 text-cream'
                    : 'border border-lime/50 text-lime'
                }`}
              >
                {playing && playMode === 'offseason' ? 'Pause' : 'Play offseason'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowUsd((v) => !v)}
              className="rounded-full border border-white/15 px-2.5 py-0.5 text-[0.65rem] font-bold text-mist hover:border-lime/40 hover:text-lime"
            >
              {showUsd ? 'GBP' : 'USD'}
            </button>
          </div>
        </div>

        {inPlayUi ? (
          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(e) => onScrub(Number(e.target.value))}
              className="w-full accent-lime"
              aria-label="Scrub timeline"
            />
            <div className="mt-1 flex justify-between text-[0.6rem] text-mist/50">
              <span>{formatSeasonDate(range.start)}</span>
              <span>
                {playMode === 'offseason' ? 'Offseason' : 'Season'}
                {eventHold ? ' · event' : ''}
              </span>
              <span>{formatSeasonDate(range.end)}</span>
            </div>
          </div>
        ) : null}

        <AnimatePresence>
          {toast ? (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute right-3 top-28 z-40 max-w-[14rem] border border-lime/50 bg-pitch-deep/95 px-3 py-2 shadow-lg sm:right-4"
            >
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-lime">
                {formatSeasonDate(toast.date)}
              </p>
              <p className="mt-0.5 text-sm font-bold leading-snug text-cream">{toast.headline}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <BigStack
          club={displayClub}
          scaleMax={scaleMax}
          showUsd={showUsd}
          reduce={reduce}
          colorMap={colorMap}
          eventHold={eventHold}
        />

        {(playing || eventLog.length > 0 || playDate) && (
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
                Events
              </h3>
              {playDate && !playing ? (
                <button
                  type="button"
                  onClick={() => {
                    setPlayDate(null)
                    setProgress(0)
                    progressRef.current = 0
                    setEventLog([])
                    setToast(null)
                    prevDateRef.current = null
                  }}
                  className="text-[0.65rem] font-bold text-mist/60 hover:text-lime"
                >
                  Show season end
                </button>
              ) : null}
            </div>
            {eventLog.length === 0 ? (
              <p className="mt-2 text-[0.7rem] text-mist/50">
                {playing
                  ? 'Waiting for the next squad-cost change…'
                  : playMode === 'offseason'
                    ? 'Play offseason: 1 Jun 2024 → 31 Aug 2024.'
                    : 'Play season: 1 Aug 2024 → 31 Jul 2025.'}
              </p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                {eventLog.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2 border-b border-white/5 py-1.5 text-[0.75rem]"
                  >
                    <span className="min-w-0 text-cream">{e.headline}</span>
                    <span className="shrink-0 tabular-nums text-mist/55">
                      {formatSeasonDate(e.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <p className="text-[0.7rem] leading-relaxed text-mist/50">{PL_FINANCES.disclaimer}</p>
      <p className="text-[0.65rem] leading-relaxed text-mist/40">
        Dimmed “away” bars are still on the books (e.g. loan share of wages). Event holds freeze the
        clock for 1s so the stack can animate. Scrub to jump; pause/resume keeps your place.
      </p>
    </div>
  )
}
