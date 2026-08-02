import { useEffect, useId, useRef, useState } from 'react'
import type { LeagueSeasonOption } from '../lib/stats/types'

function optionKey(season: LeagueSeasonOption): string {
  return season.key ?? String(season.year)
}

/** Scrollable season dropdown used across profiles (e.g. 25/26 → pick any year). */
export function SeasonPicker({
  seasons,
  selectedSeason,
  selectedKey,
  loading,
  onSelect,
  emptyLabel = 'No seasons available',
}: {
  seasons: LeagueSeasonOption[]
  selectedSeason: number | null
  /** When set, disambiguates transfer years / cross-club career rows. */
  selectedKey?: string | null
  loading?: boolean
  onSelect: (year: number, option: LeagueSeasonOption) => void
  emptyLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected =
    (selectedKey
      ? seasons.find((season) => optionKey(season) === selectedKey)
      : null) ||
    seasons.find((season) => season.year === selectedSeason) ||
    seasons[0] ||
    null

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (loading && seasons.length === 0) {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">
        Loading seasons…
      </p>
    )
  }

  if (!selected) {
    return (
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-left transition hover:border-lime/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
            Season
          </p>
          <p className="truncate text-sm font-semibold leading-tight text-cream">
            {selected.shortLabel}
            <span className="font-medium text-mist/55"> season</span>
          </p>
        </div>
        <span
          className={`shrink-0 text-lime transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Choose season"
          className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto overscroll-contain border border-white/15 bg-pitch-deep shadow-lg"
        >
          {seasons.map((season) => {
            const active = optionKey(season) === optionKey(selected)
            return (
              <button
                key={optionKey(season)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onSelect(season.year, season)
                  setOpen(false)
                }}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime ${
                  active ? 'bg-lime/15 text-lime' : 'text-cream hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-sm font-semibold">{season.shortLabel}</span>
                <span className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
                  {season.label}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
