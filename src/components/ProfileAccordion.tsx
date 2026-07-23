import { useId, type ReactNode } from 'react'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-mist/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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

/**
 * Section disclosure for profiles — hairline dividers only (no nested card frames).
 */
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
    <div className="border-b border-white/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-3.5 text-left outline-none transition hover:text-lime focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-semibold text-cream">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Chevron open={open} />
      </button>

      {open ? (
        <div id={panelId} className="pb-4 pt-0.5">
          {children}
        </div>
      ) : null}
    </div>
  )
}
