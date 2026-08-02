import type { FavoriteTeam } from '../lib/favorites'
import { MISSING_LONG, MISSING_SHORT, missingShort } from '../lib/display'
import { isInternationalLeague } from '../lib/leagues'
import type { MatchLineupPlayer, MatchLineupSide } from '../lib/stats/types'
import { ratingColorStyle } from '../lib/stats/ratingColor'
import { PlayerAvatar } from './PlayerAvatar'

function LineupPlayerCard({
  player,
  onOpenPlayer,
}: {
  player: MatchLineupPlayer
  onOpenPlayer?: (player: MatchLineupPlayer) => void
}) {
  const position = missingShort(player.positionAbbrev)
  const jersey = player.jersey ? missingShort(player.jersey) : null

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
      <span
        className={[
          'line-clamp-2 min-h-[2rem] text-[0.65rem] font-semibold leading-tight text-cream',
          onOpenPlayer ? 'profile-link' : '',
        ].join(' ')}
      >
        {missingShort(player.shortName)}
      </span>
      <span
        className={`font-display text-lg leading-none tracking-wide tabular-nums ${
          player.rating == null ? 'text-mist/50' : ''
        }`}
        style={ratingColorStyle(player.rating)}
      >
        {player.rating != null ? player.rating.toFixed(1) : MISSING_SHORT}
      </span>
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
        {position}
        {jersey ? ` · ${jersey}` : ''}
      </span>
    </button>
  )
}

function SideBlock({
  side,
  onOpenPlayer,
  onOpenTeam,
}: {
  side: MatchLineupSide
  onOpenPlayer?: (player: MatchLineupPlayer) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  const empty = side.starters.length === 0 && side.bench.length === 0
  const leagueId = side.starters[0]?.leagueId || side.bench[0]?.leagueId
  const canOpenTeam = Boolean(onOpenTeam && side.teamId && leagueId)
  const teamName = missingShort(side.teamName)

  return (
    <div>
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
        {canOpenTeam ? (
          <button
            type="button"
            onClick={() =>
              onOpenTeam?.({
                id: side.teamId,
                name: side.teamName,
                shortName: side.teamName,
                leagueId: leagueId!,
                kind: isInternationalLeague(leagueId!) ? 'national' : 'club',
              })
            }
            className="profile-link text-left transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            {teamName}
          </button>
        ) : (
          teamName
        )}
        <span className="ml-2 text-mist/55">{side.homeAway}</span>
        {side.formation ? (
          <span className="ml-2 text-cream/90">{missingShort(side.formation)}</span>
        ) : null}
      </p>
      {empty ? (
        <p className="text-xs text-mist/65">{MISSING_LONG}</p>
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
                Substitutes
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
  onOpenTeam,
}: {
  lineups: MatchLineupSide[]
  onOpenPlayer?: (player: MatchLineupPlayer) => void
  onOpenTeam?: (team: FavoriteTeam) => void
}) {
  if (lineups.length === 0) {
    return <p className="text-xs text-mist/65">{MISSING_LONG}</p>
  }

  const home = lineups.find((side) => side.homeAway === 'home')
  const away = lineups.find((side) => side.homeAway === 'away')

  if (!home && !away) {
    return <p className="text-xs text-mist/65">{MISSING_LONG}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {home ? (
        <SideBlock side={home} onOpenPlayer={onOpenPlayer} onOpenTeam={onOpenTeam} />
      ) : null}
      {away ? (
        <SideBlock side={away} onOpenPlayer={onOpenPlayer} onOpenTeam={onOpenTeam} />
      ) : null}
    </div>
  )
}
