import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  buildCalendarDays,
  CALENDAR_RADIUS_DAYS,
  isSameDay,
  startOfDay,
  toDateKey,
} from '../lib/dates'

export function CalendarStrip({
  selected,
  onSelect,
  onJumpToToday,
  favoriteDateKeys,
  reduce,
}: {
  selected: Date
  onSelect: (date: Date) => void
  onJumpToToday: () => void
  favoriteDateKeys: Set<string>
  reduce: boolean | null
}) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const days = useMemo(() => buildCalendarDays(today, CALENDAR_RADIUS_DAYS), [today])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const isSelectedToday = isSameDay(selected, today)

  useEffect(() => {
    const scroller = scrollerRef.current
    const selectedBtn = selectedRef.current
    if (!scroller || !selectedBtn) return
    const left = selectedBtn.offsetLeft - scroller.clientWidth / 2 + selectedBtn.clientWidth / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [selected])

  return (
    <section aria-label="Match calendar" className="relative">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Calendar</p>
          <p className="mt-1 text-sm text-mist/80">
            Swipe for match days · yellow = favorites
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-display text-2xl tracking-wide text-cream/90">
            {selected.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </p>
          <button
            type="button"
            onClick={onJumpToToday}
            disabled={isSelectedToday}
            className={[
              'rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] transition outline-none',
              'focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep',
              isSelectedToday
                ? 'cursor-default border-white/10 text-mist/40'
                : 'border-lime/50 bg-lime/15 text-lime hover:bg-lime hover:text-ink',
            ].join(' ')}
            aria-label="Jump to today"
          >
            Today
          </button>
        </div>
      </div>

      <motion.div
        ref={scrollerRef}
        initial={reduce ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 snap-x snap-mandatory"
        role="listbox"
        aria-label="Select a date"
      >
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
              <span className="mt-1 block font-display text-3xl leading-none tracking-wide">{dayNum}</span>
              {isToday ? (
                <span
                  className={`mt-1 block text-[0.6rem] font-bold uppercase tracking-[0.12em] ${active ? 'text-ink/80' : 'text-lime'}`}
                >
                  Today
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
      </motion.div>
    </section>
  )
}
