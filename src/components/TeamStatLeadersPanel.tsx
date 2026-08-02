import { SeasonPicker } from './SeasonPicker'
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

export function TeamStatLeadersPanel({
  data,
  loading,
  error,
  leagueId,
  seasons,
  seasonsLoading,
  selectedSeason,
  selectedKey,
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
  selectedKey?: string | null
  onSelectSeason: (year: number, option: LeagueSeasonOption) => void
  onOpenPlayer?: (player: PlayerNavRef) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <SeasonPicker
        seasons={seasons}
        selectedSeason={selectedSeason ?? data?.season ?? null}
        selectedKey={selectedKey}
        loading={seasonsLoading}
        onSelect={onSelectSeason}
      />

      {loading && !data ? (
        <p className="text-sm text-mist/70">Loading stat leaders…</p>
      ) : null}

      {error && !data ? <p className="text-sm text-mist/80">{error}</p> : null}

      {!loading && !error && (!data || data.categories.length === 0) ? (
        <p className="text-sm text-mist/70">No stat leaders available for this team yet.</p>
      ) : null}

      {data && data.categories.length > 0 ? (
        <>
          {loading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">
              Updating…
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
              {data.seasonShortLabel ? `${data.seasonShortLabel} · ` : ''}
              All competitions
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
