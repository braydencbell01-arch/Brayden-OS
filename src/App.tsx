import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

type LeagueId = 'premier-league' | 'la-liga' | 'bundesliga' | 'serie-a' | 'ligue-1'

type League = {
  id: LeagueId
  name: string
  short: string
  country: string
}

const LEAGUES: League[] = [
  { id: 'premier-league', name: 'Premier League', short: 'EPL', country: 'England' },
  { id: 'la-liga', name: 'La Liga', short: 'ESP', country: 'Spain' },
  { id: 'bundesliga', name: 'Bundesliga', short: 'GER', country: 'Germany' },
  { id: 'serie-a', name: 'Serie A', short: 'ITA', country: 'Italy' },
  { id: 'ligue-1', name: 'Ligue 1', short: 'FRA', country: 'France' },
]

function buildCalendarDays(center: Date, span = 21) {
  const start = new Date(center)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - Math.floor(span / 2))

  return Array.from({ length: span }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return date
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function CalendarStrip({
  selected,
  onSelect,
  reduce,
}: {
  selected: Date
  onSelect: (date: Date) => void
  reduce: boolean | null
}) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const days = useMemo(() => buildCalendarDays(today), [today])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    const todayBtn = todayRef.current
    if (!scroller || !todayBtn) return
    const left = todayBtn.offsetLeft - scroller.clientWidth / 2 + todayBtn.clientWidth / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'auto' })
  }, [days])

  return (
    <section aria-label="Match calendar" className="relative">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Calendar</p>
          <p className="mt-1 text-sm text-mist/80">Swipe for match days</p>
        </div>
        <p className="font-display text-2xl tracking-wide text-cream/90">
          {selected.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </p>
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
          const weekday = day.toLocaleDateString(undefined, { weekday: 'short' })
          const dayNum = day.getDate()

          return (
            <button
              key={day.toISOString()}
              ref={isToday ? todayRef : undefined}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(day)}
              className={[
                'snap-center shrink-0 rounded-2xl px-3 py-3 text-center transition outline-none',
                'min-w-[4.25rem] border focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep',
                active
                  ? 'border-lime bg-lime text-ink shadow-[0_0_0_1px_rgba(200,245,66,0.35)]'
                  : 'border-white/10 bg-white/5 text-cream hover:border-lime/40 hover:bg-white/10',
              ].join(' ')}
            >
              <span className={`block text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${active ? 'text-ink/70' : 'text-mist/70'}`}>
                {weekday}
              </span>
              <span className="mt-1 block font-display text-3xl leading-none tracking-wide">{dayNum}</span>
              {isToday && (
                <span className={`mt-1 block text-[0.6rem] font-bold uppercase tracking-[0.12em] ${active ? 'text-ink/80' : 'text-lime'}`}>
                  Today
                </span>
              )}
            </button>
          )
        })}
      </motion.div>
    </section>
  )
}

function HomeScreen({
  selectedDate,
  onSelectDate,
  onOpenLeague,
  reduce,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onOpenLeague: (id: LeagueId) => void
  reduce: boolean | null
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(20,107,74,0.55), transparent 55%), radial-gradient(ellipse 45% 40% at 100% 20%, rgba(200,245,66,0.12), transparent 50%), radial-gradient(ellipse 40% 35% at 0% 80%, rgba(20,107,74,0.35), transparent 55%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-40" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6 md:max-w-xl md:px-6">
        <header className="mb-8">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-lime"
          >
            Soccer intelligence
          </motion.p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 font-display text-6xl leading-[0.9] tracking-[0.04em] text-cream sm:text-7xl"
          >
            Brayden Stats
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: reduce ? 0 : 0.14 }}
            className="mt-3 max-w-md text-base text-mist/90"
          >
            Player ratings from match stats, and what clubs pay per goal, assist, and more.
          </motion.p>
        </header>

        <CalendarStrip selected={selectedDate} onSelect={onSelectDate} reduce={reduce} />

        <section className="mt-10 flex flex-1 flex-col" aria-label="Leagues">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.2 }}
            className="mb-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime/80">Leagues</p>
            <p className="mt-1 text-sm text-mist/80">Pick a competition to explore</p>
          </motion.div>

          <div className="flex flex-col gap-3">
            {LEAGUES.map((league, i) => (
              <motion.button
                key={league.id}
                type="button"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: reduce ? 0 : 0.22 + i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileTap={reduce ? undefined : { scale: 0.985 }}
                onClick={() => onOpenLeague(league.id)}
                className="group flex w-full items-center justify-between border border-white/10 bg-gradient-to-r from-pitch/80 to-turf/40 px-5 py-4 text-left outline-none transition hover:border-lime/50 hover:from-turf/50 hover:to-pitch/70 focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
              >
                <span>
                  <span className="block font-display text-3xl tracking-[0.06em] text-cream transition group-hover:text-lime sm:text-4xl">
                    {league.name}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium uppercase tracking-[0.16em] text-mist/70">
                    {league.country}
                  </span>
                </span>
                <span className="font-display text-xl tracking-wide text-lime/90 transition group-hover:translate-x-1">
                  {league.short} →
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function LeagueScreen({
  league,
  onBack,
  reduce,
}: {
  league: League
  onBack: () => void
  reduce: boolean | null
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.5), transparent 55%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-10 pt-6 md:max-w-xl md:px-6">
        <motion.button
          type="button"
          initial={reduce ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onBack}
          className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-mist transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
        >
          <span aria-hidden>←</span> Back to home
        </motion.button>

        <motion.header
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-white/10 pb-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">{league.country}</p>
          <h1 className="mt-2 font-display text-6xl tracking-[0.04em] text-cream sm:text-7xl">
            {league.name}
          </h1>
        </motion.header>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reduce ? 0 : 0.15 }}
          className="mt-10 flex flex-1 items-start"
        >
          <p className="text-sm text-mist/70">
            League screen ready — ratings, pay-per-stat, and match insights land here next.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function App() {
  const reduce = useReducedMotion()
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [activeLeagueId, setActiveLeagueId] = useState<LeagueId | null>(null)

  const activeLeague = LEAGUES.find((l) => l.id === activeLeagueId) ?? null

  return (
    <AnimatePresence mode="wait">
      {activeLeague ? (
        <motion.div
          key={activeLeague.id}
          initial={reduce ? false : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: 40 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <LeagueScreen
            league={activeLeague}
            onBack={() => setActiveLeagueId(null)}
            reduce={reduce}
          />
        </motion.div>
      ) : (
        <motion.div
          key="home"
          initial={reduce ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <HomeScreen
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenLeague={setActiveLeagueId}
            reduce={reduce}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
