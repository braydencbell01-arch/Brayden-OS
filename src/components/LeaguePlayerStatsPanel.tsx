import { useEffect, useMemo, useState } from 'react'
import { isInternationalLeague, type LeagueId } from '../lib/leagues'
import { missingShort } from '../lib/display'
import type { FavoriteTeam } from '../lib/favorites'
import type {
  LeaderEntry,
  LeaguePlayerStatBoard,
  LeaguePlayerStatsOverview,
  LeagueSeasonOption,
} from '../lib/stats/types'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { SeasonPicker } from './SeasonPicker'

const FEATURED_CATEGORY_IDS = ['goals', 'assists', 'saves'] as const
const PREVIEW_COUNT = 5

function LeaderRow({
  boardId,
  leader,
  leagueId,
  onOpenPlayer,
  onOpenTeam,
}: {
  boardId: string
  leader: LeaderEntry
  leagueId: LeagueId
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  const playerClickable = Boolean(onOpenPlayer && leader.id && /^\d+$/.test(leader.id))
  const teamClickable = Boolean(onOpenTeam && leader.teamId && leader.teamName)

  return (
    <li
      key={`${boardId}-${leader.id}-${leader.rank}`}
      className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2"
    >
      <span className="font-display text-lg tracking-wide text-mist/70 tabular-nums">{leader.rank}</span>
      <div className="min-w-0">
        {playerClickable ? (
          <button
            type="button"
            onClick={() =>
              onOpenPlayer?.({
                id: leader.id,
                leagueId,
                name: leader.name,
                shortName: leader.shortName,
                jersey: leader.jersey,
                teamId: leader.teamId,
                teamName: leader.teamName,
              })
            }
            className="profile-link block max-w-full truncate text-left text-sm font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            {missingShort(leader.name)}
          </button>
        ) : (
          <p className="truncate text-sm font-semibold text-cream">{missingShort(leader.name)}</p>
        )}
        {leader.teamName ? (
          teamClickable ? (
            <button
              type="button"
              onClick={() =>
                onOpenTeam?.({
                  id: leader.teamId!,
                  name: leader.teamName!,
                  shortName: leader.teamName!,
                  leagueId,
                  kind: isInternationalLeague(leagueId) ? 'national' : 'club',
                })
              }
              className="profile-link mt-0.5 block max-w-full truncate text-left text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              {missingShort(leader.teamName)}
            </button>
          ) : (
            <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
              {missingShort(leader.teamName)}
            </p>
          )
        ) : null}
      </div>
      <span className="font-display text-xl tracking-wide text-lime tabular-nums">
        {missingShort(leader.displayValue)}
      </span>
    </li>
  )
}

function StatBoard({
  board,
  leagueId,
  previewCount,
  defaultExpanded = false,
  onOpenPlayer,
  onOpenTeam,
}: {
  board: LeaguePlayerStatBoard
  leagueId: LeagueId
  previewCount: number
  defaultExpanded?: boolean
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [board.categoryId, board.leaders.length, defaultExpanded])

  const hasMore = board.leaders.length > previewCount
  const visible = expanded || !hasMore ? board.leaders : board.leaders.slice(0, previewCount)

  return (
    <section aria-label={board.label}>
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        {board.label}
      </p>
      <ol className="flex flex-col gap-1.5">
        {visible.map((leader) => (
          <LeaderRow
            key={`${board.categoryId}-${leader.id}-${leader.rank}`}
            boardId={board.categoryId}
            leader={leader}
            leagueId={leagueId}
            onOpenPlayer={onOpenPlayer}
            onOpenTeam={onOpenTeam}
          />
        ))}
      </ol>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime transition hover:text-cream"
        >
          {expanded ? 'Show less' : `More · all ${board.leaders.length}`}
        </button>
      ) : null}
    </section>
  )
}

export function LeaguePlayerStatsPanel({
  data,
  loading,
  error,
  leagueId,
  seasons,
  seasonsLoading,
  selectedSeason,
  onSelectSeason,
  onOpenPlayer,
  onOpenTeam,
  hideSeasonPicker = false,
  previewCount = PREVIEW_COUNT,
  featuredOnly = false,
  excludeFeatured = false,
}: {
  data: LeaguePlayerStatsOverview | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  seasons: LeagueSeasonOption[]
  seasonsLoading: boolean
  selectedSeason: number | null
  onSelectSeason: (year: number) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenTeam?: (team: FavoriteTeam) => void
  hideSeasonPicker?: boolean
  previewCount?: number
  /** Only goals / assists / saves boards. */
  featuredOnly?: boolean
  /** Everything except goals / assists / saves. */
  excludeFeatured?: boolean
}) {
  const boards = useMemo(() => {
    const raw = data?.boards?.length
      ? data.boards
      : (data?.rows ?? []).map((row) => ({
          categoryId: row.categoryId,
          label: row.label,
          leaders: [row.player],
        }))

    const featured = FEATURED_CATEGORY_IDS.map((id) =>
      raw.find((board) => board.categoryId === id),
    ).filter((board): board is LeaguePlayerStatBoard => Boolean(board))

    const rest = raw.filter(
      (board) => !(FEATURED_CATEGORY_IDS as readonly string[]).includes(board.categoryId),
    )

    if (featuredOnly) return featured
    if (excludeFeatured) return rest
    return [...featured, ...rest]
  }, [data, featuredOnly, excludeFeatured])

  return (
    <div className="flex flex-col gap-5">
      {!hideSeasonPicker ? (
        <SeasonPicker
          seasons={seasons}
          selectedSeason={selectedSeason ?? data?.season ?? null}
          loading={seasonsLoading}
          onSelect={onSelectSeason}
        />
      ) : null}

      {loading && !data ? <p className="text-sm text-mist/70">Loading player stats…</p> : null}

      {error && !data ? <p className="text-sm text-mist/80">{error}</p> : null}

      {!loading && !error && (!data || boards.length === 0) ? (
        <p className="text-sm text-mist/70">No player stats available for this league yet.</p>
      ) : null}

      {data && boards.length > 0 ? (
        <>
          {loading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">Updating…</p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
              {data.seasonLabel}
              {previewCount > 0
                ? ` · top ${previewCount} shown · expand for full boards`
                : ` · top ${Math.max(...boards.map((b) => b.leaders.length), 1)} per category`}
            </p>
          )}

          {boards.map((board) => (
            <StatBoard
              key={board.categoryId}
              board={board}
              leagueId={leagueId}
              previewCount={previewCount}
              onOpenPlayer={onOpenPlayer}
              onOpenTeam={onOpenTeam}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}
