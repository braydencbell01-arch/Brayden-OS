import { useEffect, useMemo, useRef, useState } from 'react'
import { MISSING_SHORT } from '../lib/display'
import type { FavoriteTeam } from '../lib/favorites'
import type { LeagueId } from '../lib/leagues'
import type {
  KnockoutBracket,
  KnockoutRound,
} from '../lib/stats/knockoutBracket'
import type { LeagueSeasonOption } from '../lib/stats/types'
import { EntityLogo } from './EntityLogo'
import { SeasonPicker } from './SeasonPicker'

const COLUMN_WIDTH = 220
const CARD_GAP = 16
const ROUND_GAP = 48

function scoreDisplay(value: number | null | undefined): string {
  if (value == null) return '–'
  return String(value)
}

function TieCard({
  tie,
  onOpenTeam,
  leagueId,
  teamKind,
}: {
  tie: import('../lib/stats/knockoutBracket').KnockoutTie
  onOpenTeam?: (team: FavoriteTeam) => void
  leagueId: LeagueId
  teamKind: FavoriteTeam['kind']
}) {
  const label = tie.isAggregate || tie.legs.length > 1 ? 'Aggregate' : 'Score'

  return (
    <article className="w-full rounded-xl border border-white/12 bg-cream/[0.04] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-mist/55">
        {label}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {tie.teams.map((team) => {
          const openable = Boolean(
            onOpenTeam && team.id && !team.id.startsWith('tbd-') && team.shortName !== 'TBD',
          )
          return (
            <li key={team.id}>
              {openable ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenTeam?.({
                      id: team.id,
                      name: team.name,
                      shortName: team.shortName,
                      leagueId,
                      kind: teamKind,
                    })
                  }
                  className="flex w-full items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                >
                  <EntityLogo name={team.shortName || team.name} src={team.logoUrl} size="sm" />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      team.winner ? 'text-lime' : 'text-cream'
                    }`}
                  >
                    {team.shortName || team.name || MISSING_SHORT}
                  </span>
                  <span
                    className={`font-display text-lg tabular-nums ${
                      team.winner ? 'text-lime' : 'text-cream/90'
                    }`}
                  >
                    {scoreDisplay(team.score)}
                  </span>
                </button>
              ) : (
                <div className="flex w-full items-center gap-2">
                  <EntityLogo name={team.shortName || team.name} src={team.logoUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cream">
                    {team.shortName || team.name || MISSING_SHORT}
                  </span>
                  <span className="font-display text-lg tabular-nums text-cream/90">
                    {scoreDisplay(team.score)}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {tie.note ? (
        <p className="mt-1.5 line-clamp-2 text-[0.65rem] leading-snug text-mist/55">{tie.note}</p>
      ) : null}
    </article>
  )
}

function RoundColumn({
  round,
  columnRef,
  onOpenTeam,
  leagueId,
  teamKind,
}: {
  round: KnockoutRound
  columnRef?: (el: HTMLDivElement | null) => void
  onOpenTeam?: (team: FavoriteTeam) => void
  leagueId: LeagueId
  teamKind: FavoriteTeam['kind']
}) {
  return (
    <div
      ref={columnRef}
      className="flex shrink-0 flex-col"
      style={{ width: COLUMN_WIDTH }}
      data-round-id={round.typeId}
    >
      <div className="mb-3 min-h-[2.5rem] px-1 text-center">
        <p className="text-sm font-semibold text-cream">{round.shortName}</p>
        {round.dateLabel ? (
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/50">
            {round.dateLabel}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col justify-around" style={{ gap: CARD_GAP }}>
        {round.ties.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-mist/55">
            Ties not drawn yet
          </p>
        ) : (
          round.ties.map((tie) => (
            <TieCard
              key={tie.id}
              tie={tie}
              onOpenTeam={onOpenTeam}
              leagueId={leagueId}
              teamKind={teamKind}
            />
          ))
        )}
      </div>
    </div>
  )
}

/** Lightweight SVG connectors between adjacent round columns. */
function BracketConnectors({
  rounds,
  heights,
}: {
  rounds: KnockoutRound[]
  heights: number[]
}) {
  if (rounds.length < 2) return null

  const width = rounds.length * COLUMN_WIDTH + (rounds.length - 1) * ROUND_GAP
  const height = Math.max(320, ...heights, 0)
  const paths: string[] = []

  for (let r = 0; r < rounds.length - 1; r += 1) {
    const leftCount = Math.max(1, rounds[r].ties.length)
    const rightCount = Math.max(1, rounds[r + 1].ties.length)
    const leftH = heights[r] || height
    const rightH = heights[r + 1] || height
    const header = 44
    const leftColX = r * (COLUMN_WIDTH + ROUND_GAP)
    const rightColX = (r + 1) * (COLUMN_WIDTH + ROUND_GAP)
    const x1 = leftColX + COLUMN_WIDTH
    const x2 = rightColX
    const midX = (x1 + x2) / 2

    for (let i = 0; i < leftCount; i += 1) {
      const target = Math.min(rightCount - 1, Math.floor(i / Math.max(1, leftCount / rightCount)))
      const y1 = header + ((i + 0.5) / leftCount) * (leftH - header)
      const y2 = header + ((target + 0.5) / rightCount) * (rightH - header)
      paths.push(
        `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`,
      )
    }
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 text-white/15"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {paths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export function LeagueKnockoutBracket({
  data,
  loading,
  error,
  leagueId,
  seasons,
  seasonsLoading,
  selectedSeason,
  onSelectSeason,
  onOpenTeam,
  teamKind = 'club',
}: {
  data: KnockoutBracket | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  seasons: LeagueSeasonOption[]
  seasonsLoading?: boolean
  selectedSeason: number | null
  onSelectSeason: (year: number, option: LeagueSeasonOption) => void
  onOpenTeam?: (team: FavoriteTeam) => void
  teamKind?: FavoriteTeam['kind']
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pillScrollerRef = useRef<HTMLDivElement>(null)
  const pillEls = useRef<Map<number, HTMLButtonElement>>(new Map())
  const columnEls = useRef<Map<number, HTMLDivElement>>(new Map())
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null)
  const [columnHeights, setColumnHeights] = useState<number[]>([])

  const rounds = data?.rounds ?? []

  const defaultRoundId = useMemo(() => {
    if (rounds.length === 0) return null
    // Prefer the leftmost round that still has an incomplete real (non-TBD) tie.
    const incomplete = rounds.find((round) =>
      round.ties.some((tie) => !tie.completed && !tie.pairKey.startsWith('tbd-')),
    )
    if (incomplete) return incomplete.typeId
    const withReal = rounds.find((round) =>
      round.ties.some((tie) => !tie.pairKey.startsWith('tbd-')),
    )
    return withReal?.typeId ?? rounds[0].typeId
  }, [rounds])

  const centerRoundPill = (roundId: number) => {
    const scroller = pillScrollerRef.current
    const pill = pillEls.current.get(roundId)
    if (!scroller || !pill) return
    const left = pill.offsetLeft - scroller.clientWidth / 2 + pill.offsetWidth / 2
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }

  const scrollBracketToRound = (roundId: number) => {
    const scroller = scrollerRef.current
    const el = columnEls.current.get(roundId)
    if (!scroller || !el) return
    const left = el.offsetLeft - 16
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }

  useEffect(() => {
    setActiveRoundId(defaultRoundId)
  }, [defaultRoundId, selectedSeason, leagueId])

  useEffect(() => {
    if (activeRoundId == null) return
    // Wait a frame so pill/column refs are mounted after round changes.
    const id = window.requestAnimationFrame(() => {
      centerRoundPill(activeRoundId)
      scrollBracketToRound(activeRoundId)
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeRoundId, rounds.length])

  useEffect(() => {
    const measure = () => {
      setColumnHeights(
        rounds.map((round) => columnEls.current.get(round.typeId)?.offsetHeight ?? 0),
      )
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    for (const el of columnEls.current.values()) ro?.observe(el)
    return () => ro?.disconnect()
  }, [rounds])

  const scrollByPage = (dir: 1 | -1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollBy({
      left: dir * (COLUMN_WIDTH + ROUND_GAP),
      behavior: 'smooth',
    })
  }

  return (
    <section className="overflow-hidden border border-white/10 bg-pitch/30" aria-label="Knockout bracket">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cream">Knockout</p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
            Bracket
          </p>
        </div>
        <div className="w-[9.5rem] shrink-0">
          <SeasonPicker
            seasons={seasons}
            selectedSeason={selectedSeason}
            loading={seasonsLoading}
            onSelect={onSelectSeason}
          />
        </div>
      </div>

      {loading && rounds.length === 0 ? (
        <p className="px-3 py-12 text-center text-sm text-mist/70">Loading bracket…</p>
      ) : error && rounds.length === 0 ? (
        <p className="px-3 py-12 text-center text-sm text-mist/70">{error}</p>
      ) : rounds.length === 0 ? (
        <p className="px-3 py-12 text-center text-sm text-mist/70">
          No knockout rounds for this season yet.
        </p>
      ) : (
        <>
          <div
            ref={pillScrollerRef}
            className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-none"
          >
            {rounds.map((round) => {
              const active = round.typeId === activeRoundId
              return (
                <button
                  key={round.typeId}
                  type="button"
                  ref={(el) => {
                    if (el) pillEls.current.set(round.typeId, el)
                    else pillEls.current.delete(round.typeId)
                  }}
                  onClick={() => setActiveRoundId(round.typeId)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-cream text-pitch'
                      : 'bg-white/10 text-cream/85 hover:bg-white/15'
                  }`}
                >
                  {round.shortName}
                </button>
              )
            })}
          </div>

          <div className="relative">
            <div
              ref={scrollerRef}
              className="overflow-x-auto px-3 pb-4 pt-1 scrollbar-thin"
            >
              <div
                className="relative flex items-stretch"
                style={{ gap: ROUND_GAP, minHeight: 280 }}
              >
                <BracketConnectors rounds={rounds} heights={columnHeights} />
                {rounds.map((round) => (
                  <RoundColumn
                    key={round.typeId}
                    round={round}
                    leagueId={leagueId}
                    teamKind={teamKind}
                    onOpenTeam={onOpenTeam}
                    columnRef={(el) => {
                      if (el) columnEls.current.set(round.typeId, el)
                      else columnEls.current.delete(round.typeId)
                    }}
                  />
                ))}
              </div>
            </div>

            {rounds.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous rounds"
                  onClick={() => scrollByPage(-1)}
                  className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-pitch/90 text-cream shadow-lg backdrop-blur-sm"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next rounds"
                  onClick={() => scrollByPage(1)}
                  className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-pitch/90 text-cream shadow-lg backdrop-blur-sm"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}
