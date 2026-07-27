import { useEffect, useRef, type PointerEvent } from 'react'
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
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const lastXRef = useRef(0)
  const resumeTimer = useRef<number | null>(null)
  const halfWidthRef = useRef(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const measure = () => {
      halfWidthRef.current = track.scrollWidth / 2
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(track)

    let raf = 0
    const tick = () => {
      if (!prefersReduced && !pausedRef.current && !draggingRef.current && halfWidthRef.current > 0) {
        offsetRef.current += 0.55
        if (offsetRef.current >= halfWidthRef.current) {
          offsetRef.current -= halfWidthRef.current
        }
        track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [])

  function pauseAuto(ms = 3200) {
    pausedRef.current = true
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => {
      pausedRef.current = false
    }, ms)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    draggingRef.current = true
    movedRef.current = false
    pausedRef.current = true
    lastXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const dx = e.clientX - lastXRef.current
    lastXRef.current = e.clientX
    if (Math.abs(dx) > 2) movedRef.current = true
    const half = halfWidthRef.current || 1
    offsetRef.current -= dx
    if (offsetRef.current < 0) offsetRef.current += half
    if (offsetRef.current >= half) offsetRef.current -= half
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    draggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    pauseAuto()
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
          Tap a collection to get started.
        </p>
      </div>

      <div
        className="collections-rail-viewport mt-6 cursor-grab overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (draggingRef.current) {
            draggingRef.current = false
            pauseAuto()
          }
        }}
      >
        <div ref={trackRef} className="collections-marquee-track flex w-max gap-4 px-5 md:gap-5 md:px-8 will-change-transform">
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
                pauseAuto()
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
