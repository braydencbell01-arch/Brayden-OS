import { useId, type ReactNode } from 'react'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-lime/80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ProfileAccordion({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const panelId = useId()

  return (
    <div className="overflow-hidden border border-white/10 bg-pitch/40">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cream sm:text-base">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Chevron open={open} />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-white/10 px-3 pb-3 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  )
}
