import { useEffect, useId, useRef, useState } from 'react'
import { missingShort } from '../lib/display'
import type { LeagueId } from '../lib/leagues'
import type {
  LeaderCategory,
  LeaderEntry,
  LeagueSeasonOption,
  TeamStatLeaders,
} from '../lib/stats/types'
import type { PlayerNavRef } from './PlayerProfileScreen'

function CategoryLeaders({
  category,
  leagueId,
  onOpenPlayer,
}: {
  category: LeaderCategory
  leagueId: LeagueId
  onOpenPlayer?: (player: PlayerNavRef) => void
}) {
  const isClickable = (leader: LeaderEntry) =>
    Boolean(onOpenPlayer && leader.id && /^\d+$/.test(leader.id))

  return (
    <div>
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        {category.label}
      </p>
      <ol className="flex flex-col gap-1.5">
        {category.leaders.map((leader) => {
          const clickable = isClickable(leader)
          return (
            <li key={`${category.id}-${leader.id}`}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (!clickable) return
                  onOpenPlayer?.({
                    id: leader.id,
                    leagueId,
                    name: leader.name,
                    shortName: leader.shortName,
                    jersey: leader.jersey,
                    teamId: leader.teamId,
                    teamName: leader.teamName,
                  })
                }}
                className={`grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-left outline-none transition ${
                  clickable
                    ? 'hover:border-lime/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime'
                    : 'cursor-default'
                }`}
              >
                <span className="font-display text-lg tracking-wide text-mist/70 tabular-nums">
                  {leader.rank}
                </span>
                <p
                  className={`min-w-0 truncate text-sm font-semibold ${
                    clickable ? 'profile-link text-cream' : 'text-cream'
                  }`}
                >
                  {missingShort(leader.name)}
                </p>
                <span className="font-display text-xl tracking-wide text-lime tabular-nums">
                  {missingShort(leader.displayValue)}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function SeasonPicker({
  seasons,
  selectedSeason,
  loading,
  onSelect,
}: {
  seasons: LeagueSeasonOption[]
  selectedSeason: number | null
  loading: boolean
  onSelect: (year: number) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected =
    seasons.find((season) => season.year === selectedSeason) || seasons[0] || null

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

  if (!selected) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 border border-white/15 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-lime/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
            Season
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-cream">
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
            const active = season.year === selected.year
            return (
              <button
                key={season.year}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onSelect(season.year)
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

export function TeamStatLeadersPanel({
  data,
  loading,
  error,
  leagueId,
  seasons,
  seasonsLoading,
  selectedSeason,
  onSelectSeason,
  onOpenPlayer,
}: {
  data: TeamStatLeaders | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  seasons: LeagueSeasonOption[]
  seasonsLoading: boolean
  selectedSeason: number | null
  onSelectSeason: (year: number) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <SeasonPicker
        seasons={seasons}
        selectedSeason={selectedSeason ?? data?.season ?? null}
        loading={seasonsLoading}
        onSelect={onSelectSeason}
      />

      {loading && !data ? (
        <p className="text-sm text-mist/70">Loading stat leaders…</p>
      ) : null}

      {error && !data ? <p className="text-sm text-mist/80">{error}</p> : null}

      {!loading && !error && (!data || data.categories.length === 0) ? (
        <p className="text-sm text-mist/70">No stat leaders available for this club yet.</p>
      ) : null}

      {data && data.categories.length > 0 ? (
        <>
          {loading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">
              Updating…
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
              {data.seasonShortLabel || data.seasonLabel}
            </p>
          )}

          {error ? <p className="text-sm text-mist/70">{error}</p> : null}

          {data.categories.map((category) => (
            <CategoryLeaders
              key={`${data.season}-${category.id}`}
              category={category}
              leagueId={leagueId}
              onOpenPlayer={onOpenPlayer}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}
