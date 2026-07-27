import { useEffect, useRef } from 'react'
import { LANDING_COLLECTIONS, type CollectionAction } from './collections'

function asset(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${path.replace(/^\//, '')}`
}

export function CollectionsRail({
  onSelect,
}: {
  onSelect: (action: CollectionAction, id: string, label: string) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const resumeTimer = useRef<number | null>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const id = window.setInterval(() => {
      if (pausedRef.current || !el) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const next = el.scrollLeft + 1.2
      if (next >= max - 1) {
        el.scrollLeft = 0
      } else {
        el.scrollLeft = next
      }
    }, 20)

    return () => window.clearInterval(id)
  }, [])

  function pauseAuto() {
    pausedRef.current = true
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => {
      pausedRef.current = false
    }, 2800)
  }

  const loop = [...LANDING_COLLECTIONS, ...LANDING_COLLECTIONS]

  return (
    <section
      id="collections"
      className="scroll-mt-44 border-y border-navy/10 bg-cream py-8 md:py-10"
      aria-label="Collections"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <p className="eyebrow text-crimson">Collections</p>
        <div className="brand-rule mt-3" aria-hidden />
        <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-navy md:text-4xl">
          Shop by collection
        </h2>
        <p className="mt-2 max-w-xl font-brand text-sm text-muted md:text-base">
          Swipe or let it rotate — tap a collection to jump to matching kits.
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="collections-rail mt-6 flex gap-4 overflow-x-auto px-5 pb-2 md:gap-5 md:px-8"
        onPointerDown={pauseAuto}
        onTouchStart={pauseAuto}
        onWheel={pauseAuto}
      >
        {loop.map((item, i) => (
          <button
            key={`${item.id}-${i}`}
            type="button"
            onClick={() => {
              pauseAuto()
              onSelect(item.action, item.id, item.label)
            }}
            className="group relative h-[11.5rem] w-[9.5rem] shrink-0 overflow-hidden border border-navy/10 bg-navy text-left outline-none transition hover:border-crimson focus-visible:ring-2 focus-visible:ring-crimson sm:h-[13.5rem] sm:w-[11rem] md:h-[15rem] md:w-[12.5rem]"
          >
            <img
              src={asset(item.image)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/35 to-transparent" />
            <span
              className={`relative z-10 flex h-full items-end p-3 font-display text-lg font-bold uppercase tracking-wide text-cream sm:p-4 sm:text-xl ${
                item.id === 'jersey-deals' ? 'text-crimson-hot' : ''
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
