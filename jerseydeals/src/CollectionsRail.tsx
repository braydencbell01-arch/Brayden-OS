import { useEffect, useRef } from 'react'
import { LANDING_COLLECTIONS, type CollectionAction } from './collections'

function asset(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${path.replace(/^\//, '')}`
}

const AUTO_SPEED = 0.7
const RESUME_AFTER_MS = 2400

export function CollectionsRail({
  onSelect,
}: {
  onSelect: (action: CollectionAction, id: string, label: string) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const touchingRef = useRef(false)
  const programmaticRef = useRef(false)
  const resumeTimer = useRef<number | null>(null)
  const halfWidthRef = useRef(0)
  const suppressClickRef = useRef(false)
  const driftRef = useRef(0)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const measure = () => {
      halfWidthRef.current = scroller.scrollWidth / 2
    }
    measure()
    // Images loading can change width — remeasure often at first.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(scroller)
    const remeasureId = window.setInterval(measure, 500)
    window.setTimeout(() => window.clearInterval(remeasureId), 4000)

    const scheduleResume = () => {
      pausedRef.current = true
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
      resumeTimer.current = window.setTimeout(() => {
        // Normalize into the first loop copy before auto-rotate continues.
        const half = halfWidthRef.current
        if (half > 0) {
          programmaticRef.current = true
          scroller.scrollLeft = ((scroller.scrollLeft % half) + half) % half
          programmaticRef.current = false
        }
        pausedRef.current = false
        touchingRef.current = false
      }, RESUME_AFTER_MS)
    }

    const onScroll = () => {
      if (programmaticRef.current) return
      pausedRef.current = true
      scheduleResume()
    }

    const onTouchStart = () => {
      touchingRef.current = true
      pausedRef.current = true
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    }

    const onTouchEnd = () => {
      touchingRef.current = false
      scheduleResume()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      touchingRef.current = true
      pausedRef.current = true
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      touchingRef.current = false
      scheduleResume()
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('touchstart', onTouchStart, { passive: true })
    scroller.addEventListener('touchend', onTouchEnd, { passive: true })
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: true })
    scroller.addEventListener('pointerdown', onPointerDown, { passive: true })
    scroller.addEventListener('pointerup', onPointerUp, { passive: true })
    scroller.addEventListener('pointercancel', onPointerUp, { passive: true })

    let raf = 0
    const tick = () => {
      if (
        !prefersReduced &&
        !pausedRef.current &&
        !touchingRef.current &&
        halfWidthRef.current > 0
      ) {
        driftRef.current += AUTO_SPEED
        if (driftRef.current >= 1) {
          const step = Math.floor(driftRef.current)
          driftRef.current -= step
          programmaticRef.current = true
          scroller.scrollLeft += step
          const half = halfWidthRef.current
          if (half > 0 && scroller.scrollLeft >= half) {
            scroller.scrollLeft -= half
          }
          programmaticRef.current = false
        }
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      window.clearInterval(remeasureId)
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
      ro?.disconnect()
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchend', onTouchEnd)
      scroller.removeEventListener('touchcancel', onTouchEnd)
      scroller.removeEventListener('pointerdown', onPointerDown)
      scroller.removeEventListener('pointerup', onPointerUp)
      scroller.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

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
      if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) {
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
        className="collections-rail mt-6 flex gap-4 overflow-x-auto overflow-y-hidden px-5 pb-3 md:gap-5 md:px-8"
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
            className="group relative h-[11.5rem] w-[9.5rem] shrink-0 overflow-hidden border-2 border-navy/15 bg-navy text-left outline-none transition hover:border-crimson focus-visible:ring-2 focus-visible:ring-crimson sm:h-[13.5rem] sm:w-[11rem] md:h-[15rem] md:w-[12.5rem]"
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
