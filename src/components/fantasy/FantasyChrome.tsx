import { motion } from 'framer-motion'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function FantasyShell({
  children,
}: {
  reduce?: boolean | null
  children: ReactNode
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.55), transparent 55%), radial-gradient(ellipse 40% 30% at 100% 20%, rgba(200,245,66,0.1), transparent 50%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 pitch-grid opacity-30" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-screen pt-screen md:max-w-xl md:px-6">
        {children}
      </div>
    </div>
  )
}

export function FantasyTitle({
  eyebrow,
  title,
  reduce,
}: {
  eyebrow?: string
  title: string
  reduce: boolean | null
}) {
  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6"
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 font-display text-[clamp(2.6rem,10vw,3.8rem)] leading-[0.9] tracking-[0.04em] text-cream">
        {title}
      </h1>
    </motion.header>
  )
}

export function FantasyButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const styles =
    variant === 'primary'
      ? 'bg-lime text-ink hover:bg-lime-hot'
      : variant === 'danger'
        ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
        : 'bg-white/5 text-cream hover:bg-white/10'
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function FantasyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-cream outline-none ring-lime placeholder:text-mist/40 focus:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function FantasySelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-cream outline-none ring-lime focus:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case 'lobby':
      return 'Lobby'
    case 'draft_setup':
      return 'Draft setup'
    case 'drafting':
      return 'Live draft'
    case 'regular':
      return 'Regular season'
    case 'semifinals':
      return 'Semifinals'
    case 'finals':
      return 'Finals'
    case 'complete':
      return 'Complete'
    default:
      return phase
  }
}
