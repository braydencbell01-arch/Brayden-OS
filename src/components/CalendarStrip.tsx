import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  addDays,
  buildCalendarRange,
  CALENDAR_FORWARD_CHUNK_DAYS,
  CALENDAR_INITIAL_FORWARD_DAYS,
  CALENDAR_INITIAL_PAST_DAYS,
  CALENDAR_PAST_CHUNK_DAYS,
  isSameDay,
  startOfDay,
  toDateKey,
} from '../lib/dates'
import { useToday } from '../lib/useToday'

export function CalendarStrip({
  selected,
  onSelect,
  onJumpToToday,
  onNeedRange,
  favoriteDateKeys,
  minForwardDays = CALENDAR_INITIAL_FORWARD_DAYS,
  reduce,
}: {
  selected: Date
  onSelect: (date: Date) => void
  onJumpToToday: () => void
  /** Fired when the visible calendar needs fixtures for an expanded past/future span. */
  onNeedRange?: (from: Date, to: Date) => void
  favoriteDateKeys: Set<string>
  /** At least this many days ahead of today (from discovered fixtures / season scan). */
  minForwardDays?: number
  reduce: boolean | null
}) {
  const today = useToday()
  const [pastDays, setPastDays] = useState(CALENDAR_INITIAL_PAST_DAYS)
  const [extraForwardDays, setExtraForwardDays] = useState(0)
  const extendingRef = useRef(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const hasCenteredRef = useRef(false)
  const prevSelectedKeyRef = useRef<string | null>(null)
  const isSelectedToday = isSameDay(selected, today)
  const selectedKey = toDateKey(selected)

  const forwardDays = Math.max(CALENDAR_INITIAL_FORWARD_DAYS, minForwardDays) + extraForwardDays
  const rangeStart = useMemo(() => addDays(today, -pastDays), [today, pastDays])
  const rangeEnd = useMemo(() => addDays(today, forwardDays), [today, forwardDays])
  const days = useMemo(() => buildCalendarRange(rangeStart, rangeEnd), [rangeStart, rangeEnd])

  useEffect(() => {
    onNeedRange?.(rangeStart, rangeEnd)
  }, [onNeedRange, rangeStart, rangeEnd])

  const scrollSelectedIntoView = (behavior: ScrollBehavior) => {
    const scroller = scrollerRef.current
    const selectedBtn = selectedRef.current
    if (!scroller || !selectedBtn) return false
    const left = selectedBtn.offsetLeft - scroller.clientWidth / 2 + selectedBtn.clientWidth / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior })
    return true
  }

  // Center on first paint and when the selected day changes — not when the
  // range grows (discovery / Later), or scrolling ahead yanks back to today.
  useLayoutEffect(() => {
    const selectedChanged = prevSelectedKeyRef.current !== selectedKey
    prevSelectedKeyRef.current = selectedKey
    if (hasCenteredRef.current && !selectedChanged) return

    const behavior: ScrollBehavior =
      hasCenteredRef.current && selectedChanged ? 'smooth' : 'auto'

    if (scrollSelectedIntoView(behavior)) {
      hasCenteredRef.current = true
      return
    }

    const id = window.requestAnimationFrame(() => {
      if (scrollSelectedIntoView('auto')) hasCenteredRef.current = true
    })
    return () => window.cancelAnimationFrame(id)
  }, [selectedKey, days])

  const extendPast = () => {
    if (extendingRef.current) return
    const scroller = scrollerRef.current
    if (!scroller) {
      setPastDays((current) => current + CALENDAR_PAST_CHUNK_DAYS)
      return
    }

    extendingRef.current = true
    const prevWidth = scroller.scrollWidth
    const prevLeft = scroller.scrollLeft
    setPastDays((current) => current + CALENDAR_PAST_CHUNK_DAYS)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const delta = scroller.scrollWidth - prevWidth
        scroller.scrollLeft = prevLeft + delta
        extendingRef.current = false
      })
    })
  }

  const extendForward = () => {
    if (extendingRef.current) return
    extendingRef.current = true
    setExtraForwardDays((current) => current + CALENDAR_FORWARD_CHUNK_DAYS)
    // Forward growth appends to the end; keep scrollLeft so we don't jump.
    requestAnimationFrame(() => {
      extendingRef.current = false
    })
  }

  const handleTodayClick = () => {
    if (!isSelectedToday) {
      onJumpToToday()
      return
    }
    scrollSelectedIntoView('smooth')
  }

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const onScroll = () => {
      // Ignore edge loads until we've centered on today — otherwise scrollLeft≈0
      // on first paint eagerly prepends more April days.
      if (extendingRef.current || !hasCenteredRef.current) return
      if (scroller.scrollLeft < 120) {
        extendPast()
        return
      }
      const remaining = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft
      if (remaining < 160) extendForward()
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [pastDays, extraForwardDays, forwardDays])

  return (
    <section aria-label="Match calendar" className="relative">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Calendar</p>
          <p className="mt-0.5 text-[0.7rem] text-mist/65">Yellow = favorites</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-display text-2xl tracking-wide text-cream/90">
            {selected.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </p>
          <button
            type="button"
            onClick={handleTodayClick}
            className={[
              'rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] transition outline-none',
              'focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep',
              'border-lime/50 bg-lime/15 text-lime hover:bg-lime hover:text-ink',
            ].join(' ')}
            aria-label={isSelectedToday ? 'Center calendar on today' : 'Jump to today'}
          >
            Today
          </button>
        </div>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          ref={scrollerRef}
          className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 snap-x snap-mandatory"
          role="listbox"
          aria-label="Select a date"
        >
        <button
          type="button"
          onClick={extendPast}
          className="snap-center shrink-0 self-stretch border border-dashed border-white/15 bg-white/[0.03] px-3 py-3 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/70 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          aria-label="Load earlier match days"
        >
          Earlier
        </button>

        {days.map((day) => {
          const active = isSameDay(day, selected)
          const isToday = isSameDay(day, today)
          const hasFavoriteMatch = favoriteDateKeys.has(toDateKey(day))
          const weekday = day.toLocaleDateString(undefined, { weekday: 'short' })
          const dayNum = day.getDate()

          return (
            <button
              key={toDateKey(day)}
              ref={active ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(startOfDay(day))}
              className={[
                'snap-center shrink-0 rounded-2xl px-3 py-3 text-center transition outline-none',
                'min-w-[4.25rem] border focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep',
                active
                  ? 'border-lime bg-lime text-ink shadow-[0_0_0_1px_rgba(200,245,66,0.35)]'
                  : 'border-white/10 bg-white/5 text-cream hover:border-lime/40 hover:bg-white/10',
              ].join(' ')}
            >
              <span
                className={`block text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${active ? 'text-ink/70' : 'text-mist/70'}`}
              >
                {weekday}
              </span>
              <span className="mt-1 block font-display text-3xl leading-none tracking-wide">
                {dayNum}
              </span>
              {isToday ? (
                <span className="mt-1 flex items-center justify-center gap-1">
                  <span
                    className={`text-[0.6rem] font-bold uppercase tracking-[0.12em] ${active ? 'text-ink/80' : 'text-lime'}`}
                  >
                    Today
                  </span>
                  {hasFavoriteMatch ? (
                    <span
                      className={[
                        'inline-block h-1.5 w-1.5 rounded-full',
                        active
                          ? 'bg-ink/70'
                          : 'bg-star shadow-[0_0_8px_rgba(255,216,74,0.95)]',
                      ].join(' ')}
                      aria-hidden
                    />
                  ) : null}
                </span>
              ) : hasFavoriteMatch ? (
                <span
                  className={[
                    'mt-2 mx-auto block h-1.5 w-1.5 rounded-full',
                    active
                      ? 'bg-ink/70'
                      : 'bg-star shadow-[0_0_8px_rgba(255,216,74,0.95)]',
                  ].join(' ')}
                  aria-hidden
                />
              ) : (
                <span className="mt-2 block h-1.5" aria-hidden />
              )}
            </button>
          )
        })}

        <button
          type="button"
          onClick={extendForward}
          className="snap-center shrink-0 self-stretch border border-dashed border-white/15 bg-white/[0.03] px-3 py-3 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/70 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          aria-label="Load later match days"
        >
          Later
        </button>
        </div>
      </motion.div>
    </section>
  )
}
