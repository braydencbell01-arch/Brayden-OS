import type { LeagueId } from '../lib/leagues'
import type { FavoriteTeam } from '../lib/favorites'
import type { LeaderCategory, LeaderEntry, LeagueLeaders } from '../lib/stats/types'
import type { PlayerNavRef } from './PlayerProfileScreen'

function LeadersTable({
  category,
  leagueId,
  onOpenPlayer,
  onOpenTeam,
}: {
  category: LeaderCategory
  leagueId: LeagueId
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  const playerClickable = (leader: LeaderEntry) =>
    Boolean(onOpenPlayer && leader.id && /^\d+$/.test(leader.id))

  const teamClickable = (leader: LeaderEntry) => {
    if (category.kind === 'team') return Boolean(onOpenTeam && leader.id)
    return Boolean(onOpenTeam && leader.teamId && leader.teamName)
  }

  return (
    <div>
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        {category.label}
      </p>
      <ol className="flex flex-col gap-1.5">
        {category.leaders.map((leader) => {
          const openPlayer = playerClickable(leader)
          const openTeamName = teamClickable(leader)
          return (
            <li
              key={`${category.id}-${leader.id}`}
              className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <span className="font-display text-lg tracking-wide text-mist/70 tabular-nums">
                {leader.rank}
              </span>
              <div className="min-w-0">
                {category.kind === 'team' ? (
                  openTeamName ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTeam?.({
                          id: leader.id,
                          name: leader.name,
                          shortName: leader.shortName,
                          leagueId,
                        })
                      }
                      className="profile-link block max-w-full truncate text-left text-sm font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {leader.name}
                    </button>
                  ) : (
                    <p className="truncate text-sm font-semibold text-cream">{leader.name}</p>
                  )
                ) : openPlayer ? (
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
                    {leader.name}
                  </button>
                ) : (
                  <p className="truncate text-sm font-semibold text-cream">{leader.name}</p>
                )}
                {category.kind === 'player' && leader.teamName ? (
                  openTeamName ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTeam?.({
                          id: leader.teamId!,
                          name: leader.teamName!,
                          shortName: leader.teamName!,
                          leagueId,
                        })
                      }
                      className="profile-link mt-0.5 block max-w-full truncate text-left text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {leader.teamName}
                    </button>
                  ) : (
                    <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                      {leader.teamName}
                    </p>
                  )
                ) : null}
              </div>
              <span className="font-display text-xl tracking-wide text-lime tabular-nums">
                {category.id === 'team-gd' && leader.value > 0 ? `+${leader.value}` : leader.value}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function LeagueStatsPanel({
  data,
  loading,
  error,
  leagueId,
  onOpenPlayer,
  onOpenTeam,
}: {
  data: LeagueLeaders | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  onOpenPlayer?: (player: PlayerNavRef) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  if (loading && !data) {
    return <p className="text-sm text-mist/70">Loading stats leaders…</p>
  }

  if (error && !data) {
    return <p className="text-sm text-mist/80">{error}</p>
  }

  if (!data || data.categories.length === 0) {
    return <p className="text-sm text-mist/70">No stats leaders available for this league yet.</p>
  }

  const players = data.categories.filter((category) => category.kind === 'player')
  const teams = data.categories.filter((category) => category.kind === 'team')

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
        {data.seasonLabel}
      </p>

      {players.length > 0 ? (
        <section aria-label="Player leaders" className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist/70">Players</p>
          {players.map((category) => (
            <LeadersTable
              key={category.id}
              category={category}
              leagueId={leagueId}
              onOpenPlayer={onOpenPlayer}
              onOpenTeam={onOpenTeam}
            />
          ))}
        </section>
      ) : null}

      {teams.length > 0 ? (
        <section aria-label="Team leaders" className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist/70">Teams</p>
          {teams.map((category) => (
            <LeadersTable
              key={category.id}
              category={category}
              leagueId={leagueId}
              onOpenPlayer={onOpenPlayer}
              onOpenTeam={onOpenTeam}
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}
