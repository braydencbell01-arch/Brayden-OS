import { useEffect, useRef } from 'react'
import { LANDING_COLLECTIONS, type CollectionAction } from './collections'

function asset(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${path.replace(/^\//, '')}`
}

const AUTO_SPEED = 0.55
const RESUME_AFTER_MS = 2800

export function CollectionsRail({
  onSelect,
}: {
  onSelect: (action: CollectionAction, id: string, label: string) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const programmaticRef = useRef(false)
  const resumeTimer = useRef<number | null>(null)
  const halfWidthRef = useRef(0)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const measure = () => {
      // Track is duplicated once for seamless loop.
      halfWidthRef.current = scroller.scrollWidth / 2
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(scroller)

    const pauseFromUser = () => {
      pausedRef.current = true
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
      resumeTimer.current = window.setTimeout(() => {
        pausedRef.current = false
      }, RESUME_AFTER_MS)
    }

    const onScroll = () => {
      if (programmaticRef.current) return
      pauseFromUser()
      const half = halfWidthRef.current
      if (half <= 0) return
      // Keep position inside the first half for an infinite feel.
      if (scroller.scrollLeft >= half) {
        programmaticRef.current = true
        scroller.scrollLeft -= half
        programmaticRef.current = false
      } else if (scroller.scrollLeft <= 0) {
        programmaticRef.current = true
        scroller.scrollLeft += half
        programmaticRef.current = false
      }
    }

    const onWheel = (e: WheelEvent) => {
      // Prefer sideways browsing; convert vertical trackpad/mouse wheel when useful.
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 0) {
        e.preventDefault()
        scroller.scrollLeft += e.deltaY
      }
      pauseFromUser()
    }

    const onPointerDown = () => pauseFromUser()

    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('wheel', onWheel, { passive: false })
    scroller.addEventListener('pointerdown', onPointerDown, { passive: true })
    scroller.addEventListener('touchstart', onPointerDown, { passive: true })

    let raf = 0
    const tick = () => {
      if (!prefersReduced && !pausedRef.current && halfWidthRef.current > 0) {
        programmaticRef.current = true
        scroller.scrollLeft += AUTO_SPEED
        const half = halfWidthRef.current
        if (scroller.scrollLeft >= half) {
          scroller.scrollLeft -= half
        }
        programmaticRef.current = false
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
      ro?.disconnect()
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('wheel', onWheel)
      scroller.removeEventListener('pointerdown', onPointerDown)
      scroller.removeEventListener('touchstart', onPointerDown)
    }
  }, [])

  // Ignore clicks that were actually a drag/swipe across the rail.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let startX = 0
    let startY = 0
    const down = (e: PointerEvent) => {
      startX = e.clientX
      startY = e.clientY
      suppressClickRef.current = false
    }
    const move = (e: PointerEvent) => {
      if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) {
        suppressClickRef.current = true
      }
    }
    scroller.addEventListener('pointerdown', down)
    scroller.addEventListener('pointermove', move)
    return () => {
      scroller.removeEventListener('pointerdown', down)
      scroller.removeEventListener('pointermove', move)
    }
  }, [])

  const loop = [...LANDING_COLLECTIONS, ...LANDING_COLLECTIONS]

  return (
    <section
      id="collections"
      className="scroll-mt-44 border-y-2 border-crimson/25 bg-gradient-to-b from-cream via-cream to-mist py-8 md:py-11"
      aria-label="Collections"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="brand-rule" aria-hidden />
        <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-navy md:text-4xl">
          Collections
        </h2>
        <p className="mt-2 max-w-xl font-brand text-sm text-muted md:text-base">
          Swipe the rail or tap a collection to shop.
        </p>
      </div>

      <div
        ref={scrollerRef}
        className="collections-rail mt-6 flex gap-4 overflow-x-auto overflow-y-hidden px-5 pb-2 md:gap-5 md:px-8"
        tabIndex={0}
        aria-label="Collections carousel"
      >
        {loop.map((item, i) => (
          <button
            key={`${item.id}-${i}`}
            type="button"
            onClick={(e) => {
              if (suppressClickRef.current) {
                e.preventDefault()
                e.stopPropagation()
                return
              }
              onSelect(item.action, item.id, item.label)
            }}
            className="group relative h-[11.5rem] w-[9.5rem] shrink-0 snap-start overflow-hidden border-2 border-navy/15 bg-navy text-left outline-none transition hover:border-crimson focus-visible:ring-2 focus-visible:ring-crimson sm:h-[13.5rem] sm:w-[11rem] md:h-[15rem] md:w-[12.5rem]"
          >
            <img
              src={asset(item.image)}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/40 to-navy/10" />
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
