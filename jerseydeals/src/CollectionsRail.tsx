import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { LANDING_COLLECTIONS, type CollectionAction } from './collections'

function asset(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${path.replace(/^\//, '')}`
}

const AUTO_SPEED = 0.65
const RESUME_AFTER_MS = 2600

export function CollectionsRail({
  onSelect,
}: {
  onSelect: (action: CollectionAction, id: string, label: string) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const lastXRef = useRef(0)
  const resumeTimer = useRef<number | null>(null)
  const halfWidthRef = useRef(0)

  useEffect(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const apply = () => {
      track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`
    }

    const wrapOffset = () => {
      const half = halfWidthRef.current
      if (half <= 0) return
      // Keep offset in [0, half) without clamping the user’s drag direction.
      while (offsetRef.current < 0) offsetRef.current += half
      while (offsetRef.current >= half) offsetRef.current -= half
    }

    const measure = () => {
      halfWidthRef.current = track.scrollWidth / 2
      wrapOffset()
      apply()
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(track)

    const pauseFromUser = () => {
      pausedRef.current = true
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
      resumeTimer.current = window.setTimeout(() => {
        pausedRef.current = false
      }, RESUME_AFTER_MS)
    }

    const onWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)
      // Only take over when the gesture is clearly horizontal (or Shift+wheel).
      const horizontal = absX > absY || e.shiftKey
      if (!horizontal) return
      e.preventDefault()
      pauseFromUser()
      offsetRef.current += e.shiftKey && absX < absY ? e.deltaY : e.deltaX || e.deltaY
      wrapOffset()
      apply()
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })

    let raf = 0
    const tick = () => {
      if (!prefersReduced && !pausedRef.current && !draggingRef.current && halfWidthRef.current > 0) {
        offsetRef.current += AUTO_SPEED
        wrapOffset()
        apply()
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
      ro?.disconnect()
      viewport.removeEventListener('wheel', onWheel)
    }
  }, [])

  function pauseFromUser() {
    pausedRef.current = true
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => {
      pausedRef.current = false
    }, RESUME_AFTER_MS)
  }

  function wrapOffset() {
    const half = halfWidthRef.current
    if (half <= 0) return
    while (offsetRef.current < 0) offsetRef.current += half
    while (offsetRef.current >= half) offsetRef.current -= half
  }

  function apply() {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Only left-click / primary touch; ignore right-click.
    if (e.button !== 0 && e.pointerType === 'mouse') return
    draggingRef.current = true
    movedRef.current = false
    pausedRef.current = true
    lastXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const dx = e.clientX - lastXRef.current
    lastXRef.current = e.clientX
    if (Math.abs(dx) > 1.5) movedRef.current = true
    // Dragging right (dx > 0) should reveal earlier cards → decrease offset.
    offsetRef.current -= dx
    wrapOffset()
    apply()
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    pauseFromUser()
  }

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
        ref={viewportRef}
        className="collections-rail-viewport mt-6 cursor-grab overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => {
          if (draggingRef.current) onPointerUp(e)
        }}
      >
        <div
          ref={trackRef}
          className="collections-marquee-track flex w-max gap-4 px-5 will-change-transform md:gap-5 md:px-8"
        >
          {loop.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              type="button"
              onClick={(e) => {
                if (movedRef.current) {
                  e.preventDefault()
                  e.stopPropagation()
                  return
                }
                pauseFromUser()
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
      </div>
    </section>
  )
}
