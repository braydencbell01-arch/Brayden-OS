import type { MatchLineupPlayer, MatchLineupSide } from '../lib/stats/types'
import { PlayerAvatar } from './PlayerAvatar'

function ratingClass(rating: number | null): string {
  if (rating == null) return 'text-mist/50'
  if (rating >= 8) return 'text-lime'
  if (rating >= 6.5) return 'text-star'
  if (rating >= 5) return 'text-cream'
  if (rating >= 3.5) return 'text-mist/80'
  return 'text-red-300/90'
}

function LineupPlayerCard({
  player,
  onOpenPlayer,
}: {
  player: MatchLineupPlayer
  onOpenPlayer?: (player: MatchLineupPlayer) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenPlayer?.(player)}
      className="flex w-[4.75rem] flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-2 text-center outline-none transition hover:border-lime/40 focus-visible:ring-2 focus-visible:ring-lime"
    >
      <PlayerAvatar
        name={player.name}
        photoUrl={player.photoUrl}
        jerseyUrl={player.jerseyUrl}
        jersey={player.jersey}
        size="md"
      />
      <span className="line-clamp-2 min-h-[2rem] text-[0.65rem] font-semibold leading-tight text-cream">
        {player.shortName}
      </span>
      <span className={`font-display text-lg leading-none tracking-wide tabular-nums ${ratingClass(player.rating)}`}>
        {player.rating != null ? player.rating.toFixed(1) : 'N/A'}
      </span>
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
        {player.positionAbbrev && player.positionAbbrev !== '—'
          ? player.positionAbbrev
          : 'Not available'}
        {player.jersey ? ` · ${player.jersey}` : ''}
      </span>
    </button>
  )
}

function SideBlock({
  side,
  onOpenPlayer,
}: {
  side: MatchLineupSide
  onOpenPlayer?: (player: MatchLineupPlayer) => void
}) {
  const empty = side.starters.length === 0 && side.bench.length === 0

  return (
    <div>
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        {side.teamName}
        <span className="ml-2 text-mist/55">{side.homeAway}</span>
      </p>
      {empty ? (
        <p className="text-xs text-mist/65">Not available</p>
      ) : (
        <>
          {side.starters.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                Starting XI
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {side.starters.map((player) => (
                  <LineupPlayerCard key={player.id} player={player} onOpenPlayer={onOpenPlayer} />
                ))}
              </div>
            </div>
          )}
          {side.bench.length > 0 && (
            <div>
              <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
                Used substitutes
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {side.bench.map((player) => (
                  <LineupPlayerCard key={player.id} player={player} onOpenPlayer={onOpenPlayer} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function MatchLineupPanel({
  lineups,
  onOpenPlayer,
}: {
  lineups: MatchLineupSide[]
  onOpenPlayer?: (player: MatchLineupPlayer) => void
}) {
  if (lineups.length === 0) {
    return <p className="text-xs text-mist/65">Not available</p>
  }

  const home = lineups.find((side) => side.homeAway === 'home')
  const away = lineups.find((side) => side.homeAway === 'away')

  if (!home && !away) {
    return <p className="text-xs text-mist/65">Not available</p>
  }

  const homeEmpty = home != null && home.starters.length === 0 && home.bench.length === 0
  const awayEmpty = away != null && away.starters.length === 0 && away.bench.length === 0
  if ((homeEmpty || !home) && (awayEmpty || !away)) {
    return <p className="text-xs text-mist/65">Not available</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {home && <SideBlock side={home} onOpenPlayer={onOpenPlayer} />}
      {away && <SideBlock side={away} onOpenPlayer={onOpenPlayer} />}
    </div>
  )
}
