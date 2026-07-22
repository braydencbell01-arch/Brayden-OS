import type { LeaderCategory, LeagueLeaders } from '../lib/stats/types'

function LeadersTable({ category }: { category: LeaderCategory }) {
  return (
    <div>
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        {category.label}
      </p>
      <ol className="flex flex-col gap-1.5">
        {category.leaders.map((leader) => (
          <li
            key={`${category.id}-${leader.id}`}
            className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <span className="font-display text-lg tracking-wide text-mist/70 tabular-nums">
              {leader.rank}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cream">{leader.name}</p>
              {leader.teamName ? (
                <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                  {leader.teamName}
                </p>
              ) : null}
            </div>
            <span className="font-display text-xl tracking-wide text-lime tabular-nums">
              {category.id === 'team-gd' && leader.value > 0 ? `+${leader.value}` : leader.value}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function LeagueStatsPanel({
  data,
  loading,
  error,
}: {
  data: LeagueLeaders | null
  loading: boolean
  error: string | null
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
      <p className="text-sm text-mist/75">
        Season leaders · <span className="text-cream/90">{data.seasonLabel}</span>
      </p>

      {players.length > 0 ? (
        <section aria-label="Player leaders" className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist/70">Players</p>
          {players.map((category) => (
            <LeadersTable key={category.id} category={category} />
          ))}
        </section>
      ) : null}

      {teams.length > 0 ? (
        <section aria-label="Team leaders" className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist/70">Teams</p>
          {teams.map((category) => (
            <LeadersTable key={category.id} category={category} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
