import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function ProfileShell({
  onBack,
  reduce,
  children,
}: {
  onBack: () => void
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
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-25" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-screen md:max-w-xl md:px-6">
        <div className="sticky top-0 z-30 -mx-5 mb-5 bg-pitch-deep/90 px-5 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-md md:-mx-6 md:px-6">
          <motion.button
            type="button"
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            onClick={onBack}
            className="inline-flex min-h-11 w-fit items-center gap-2 pr-3 text-sm font-semibold text-mist transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-deep"
          >
            <span aria-hidden>←</span> Back
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
    >
      <div className="flex items-start gap-3">
        {star}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-lime/90">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="mt-1.5 font-display text-[clamp(2.25rem,8.5vw,3.25rem)] leading-[0.92] tracking-[0.03em] text-cream">
            {title}
          </h1>
          {meta ? <div className="mt-2 text-sm leading-snug text-mist/75">{meta}</div> : null}
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
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/50">{label}</p>
      <div
        className={`mt-1 font-display text-[1.65rem] tracking-wide tabular-nums sm:text-3xl ${
          accent ? 'text-star' : 'text-cream'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

/** Compact KPI strip under the hero — divider only, no nested card frame. */
export function ProfileMetricsRow({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-white/10 pt-4">
      {children}
    </div>
  )
}

/** Quiet fact list for club/player details — no outer card chrome. */
export function ProfileFactList({
  rows,
}: {
  rows: Array<[string, ReactNode]>
}) {
  if (rows.length === 0) return null
  return (
    <dl>
      {rows.map(([label, value], index) => (
        <div
          key={`${label}-${index}`}
          className={`flex items-baseline justify-between gap-4 py-2.5 ${
            index > 0 ? 'border-t border-white/[0.06]' : 'border-t border-white/10'
          }`}
        >
          <dt className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/50">
            {label}
          </dt>
          <dd className="min-w-0 text-right text-sm font-semibold text-cream">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
