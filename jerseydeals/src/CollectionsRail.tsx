import { useEffect, useRef } from 'react'
import { LANDING_COLLECTIONS, type CollectionAction } from './collections'

function asset(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${path.replace(/^\//, '')}`
}

const AUTO_SPEED = 0.45
const RESUME_AFTER_MS = 2400

export function CollectionsRail({
  onSelect,
}: {
  onSelect: (action: CollectionAction, id: string, label: string) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const userActiveRef = useRef(false)
  const wrappingRef = useRef(false)
  const seededRef = useRef(false)
  const resumeTimer = useRef<number | null>(null)
  const setWidthRef = useRef(0)
  const suppressClickRef = useRef(false)
  const driftRef = useRef(0)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /** Keep scroll in the middle copy so both directions stay infinite. */
    const normalizeLoop = () => {
      const setW = setWidthRef.current
      if (setW <= 0 || wrappingRef.current) return
      const x = scroller.scrollLeft
      // Wider buffer before wrapping reduces visible jumps / glitches.
      if (x < setW * 0.35) {
        wrappingRef.current = true
        scroller.scrollLeft = x + setW
        wrappingRef.current = false
      } else if (x >= setW * 1.65) {
        wrappingRef.current = true
        scroller.scrollLeft = x - setW
        wrappingRef.current = false
      }
    }

    const measure = () => {
      // Three identical copies → one set is 1/3 of the track.
      setWidthRef.current = Math.max(0, Math.round(scroller.scrollWidth / 3))
      if (setWidthRef.current <= 0) return
      if (!seededRef.current) {
        wrappingRef.current = true
        scroller.scrollLeft = setWidthRef.current
        wrappingRef.current = false
        seededRef.current = true
      } else {
        normalizeLoop()
      }
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(scroller)
    const imgs = scroller.querySelectorAll('img')
    const onImg = () => measure()
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', onImg, { once: true })
    })
    const t1 = window.setTimeout(measure, 80)
    const t2 = window.setTimeout(measure, 400)

    const clearResume = () => {
      if (resumeTimer.current) {
        window.clearTimeout(resumeTimer.current)
        resumeTimer.current = null
      }
    }

    const pauseForUser = () => {
      userActiveRef.current = true
      pausedRef.current = true
      clearResume()
    }

    const scheduleResume = () => {
      userActiveRef.current = false
      pausedRef.current = true
      clearResume()
      resumeTimer.current = window.setTimeout(() => {
        measure()
        pausedRef.current = false
      }, RESUME_AFTER_MS)
    }

    const onScroll = () => {
      if (wrappingRef.current) return
      normalizeLoop()
    }

    const onTouchStart = () => pauseForUser()
    const onTouchEnd = () => scheduleResume()
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pauseForUser()
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      scheduleResume()
    }
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        pauseForUser()
        scheduleResume()
      }
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('touchstart', onTouchStart, { passive: true })
    scroller.addEventListener('touchend', onTouchEnd, { passive: true })
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: true })
    scroller.addEventListener('pointerdown', onPointerDown, { passive: true })
    scroller.addEventListener('pointerup', onPointerUp, { passive: true })
    scroller.addEventListener('pointercancel', onPointerUp, { passive: true })
    scroller.addEventListener('wheel', onWheel, { passive: true })

    let raf = 0
    const tick = () => {
      if (
        !prefersReduced &&
        !pausedRef.current &&
        !userActiveRef.current &&
        setWidthRef.current > 0
      ) {
        driftRef.current += AUTO_SPEED
        if (driftRef.current >= 1) {
          const step = Math.floor(driftRef.current)
          driftRef.current -= step
          wrappingRef.current = true
          scroller.scrollLeft += step
          wrappingRef.current = false
          normalizeLoop()
        }
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      clearResume()
      ro?.disconnect()
      imgs.forEach((img) => img.removeEventListener('load', onImg))
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchend', onTouchEnd)
      scroller.removeEventListener('touchcancel', onTouchEnd)
      scroller.removeEventListener('pointerdown', onPointerDown)
      scroller.removeEventListener('pointerup', onPointerUp)
      scroller.removeEventListener('pointercancel', onPointerUp)
      scroller.removeEventListener('wheel', onWheel)
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

  // Three copies so we can sit in the middle and loop forever either way.
  const loop = [...LANDING_COLLECTIONS, ...LANDING_COLLECTIONS, ...LANDING_COLLECTIONS]

  return (
    <section
      id="collections"
      className="scroll-mt-44 border-y border-navy/10 bg-cream py-4 md:py-5"
      aria-label="Collections"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-navy md:text-3xl">
          Collections
        </h2>
      </div>

      <div
        ref={scrollerRef}
        className="collections-rail mt-3 flex gap-2 overflow-x-auto overflow-y-hidden px-5 pb-0 md:gap-2.5 md:px-8"
        aria-label="Collections carousel"
        style={{ WebkitOverflowScrolling: 'touch' }}
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
            className="group relative h-[7.25rem] w-[6rem] shrink-0 overflow-hidden border border-navy/15 bg-navy text-left outline-none transition hover:border-crimson focus-visible:ring-2 focus-visible:ring-crimson sm:h-[8rem] sm:w-[6.75rem] md:h-[9rem] md:w-[7.5rem]"
          >
            <img
              src={asset(item.image)}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/95 via-navy-deep/30 to-transparent" />
            <span
              className={`relative z-10 flex h-full items-end p-2 font-display text-[0.7rem] font-bold uppercase leading-tight tracking-wide text-cream sm:p-2.5 sm:text-xs md:text-sm ${
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
