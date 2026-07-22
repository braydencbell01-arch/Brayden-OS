import type { LeagueId } from '../lib/leagues'
import type { TeamRoster } from '../lib/stats/types'
import { PlayerAvatar } from './PlayerAvatar'
import type { PlayerNavRef } from './PlayerProfileScreen'

export function TeamRosterPanel({
  data,
  loading,
  error,
  leagueId,
  teamId,
  teamName,
  onOpenPlayer,
}: {
  data: TeamRoster | null
  loading: boolean
  error: string | null
  leagueId: LeagueId
  teamId?: string
  teamName?: string
  onOpenPlayer?: (player: PlayerNavRef) => void
}) {
  if (loading && !data) {
    return <p className="text-sm text-mist/70">Loading roster…</p>
  }

  if (error && !data) {
    return <p className="text-sm text-mist/80">{error}</p>
  }

  if (!data || data.groups.length === 0) {
    return <p className="text-sm text-mist/70">No roster available for this club yet.</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
        {data.seasonLabel}
      </p>

      {data.groups.map((group) => (
        <section key={group.id} aria-label={group.label} className="flex flex-col gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
            {group.label}
            <span className="ml-2 text-mist/50">{group.players.length}</span>
          </p>
          <ul className="flex flex-col gap-1.5">
            {group.players.map((player) => {
              const clickable = Boolean(onOpenPlayer)
              return (
                <li key={player.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() =>
                      onOpenPlayer?.({
                        id: player.id,
                        leagueId,
                        name: player.name,
                        shortName: player.shortName,
                        photoUrl: player.photoUrl,
                        jersey: player.jersey,
                        position: player.positionAbbrev,
                        teamId,
                        teamName,
                      })
                    }
                    className={`flex w-full items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-2 text-left outline-none transition ${
                      clickable
                        ? 'hover:border-lime/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime'
                        : 'cursor-default'
                    }`}
                  >
                    <PlayerAvatar
                      name={player.name}
                      photoUrl={player.photoUrl}
                      jersey={player.jersey}
                      size="sm"
                    />
                    <span className="w-8 shrink-0 font-display text-lg tracking-wide text-mist/70 tabular-nums">
                      {player.jersey || '—'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-semibold ${
                          clickable ? 'text-cream underline-offset-2 hover:underline' : 'text-cream'
                        }`}
                      >
                        {player.name}
                      </span>
                      <span className="block truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                        {player.positionLabel}
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-lime/80">
                      {player.positionAbbrev !== '—' ? player.positionAbbrev : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
