import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function ProfileShell({
  onBack,
  backLabel = 'Back',
  reduce,
  children,
}: {
  onBack: () => void
  /** Destination-aware label, e.g. "Home" or "Arsenal". */
  backLabel?: string
  reduce: boolean | null
  children: ReactNode
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.5), transparent 55%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-screen pt-screen md:max-w-xl md:px-6">
        <div className="sticky top-0 z-30 -mx-5 mb-7 border-b border-white/10 bg-pitch-deep/90 px-5 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-md md:-mx-6 md:px-6">
          <motion.button
            type="button"
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            onClick={onBack}
            className="inline-flex min-h-11 w-fit items-center gap-2 pr-3 text-sm font-semibold text-mist transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
          >
            <span aria-hidden>←</span> Back to {backLabel}
          </motion.button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ProfileHeader({
  eyebrow,
  title,
  meta,
  star,
  reduce,
  trailing,
}: {
  eyebrow?: ReactNode
  title: string
  meta?: ReactNode
  star?: ReactNode
  reduce: boolean | null
  trailing?: ReactNode
}) {
  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-white/10 pb-5"
    >
      <div className="flex items-start gap-3">
        {star}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">{eyebrow}</div>
          ) : null}
          <h1 className="mt-1.5 font-display text-[clamp(2.4rem,9vw,3.5rem)] leading-[0.92] tracking-[0.03em] text-cream">
            {title}
          </h1>
          {meta ? <div className="mt-2 text-sm text-mist/80">{meta}</div> : null}
        </div>
        {trailing}
      </div>
    </motion.header>
  )
}

export function ProfileMetric({
  label,
  value,
  accent = false,
}: {
  label: string
  value: ReactNode
  accent?: boolean
}) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/55">{label}</p>
      <div
        className={`mt-1 font-display text-3xl tracking-wide tabular-nums ${
          accent ? 'text-star' : 'text-cream'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export function ProfileMetricsRow({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4 border border-white/10 px-3 py-3.5">
      {children}
    </div>
  )
}
