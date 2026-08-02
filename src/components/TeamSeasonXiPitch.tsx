import { missingShort } from '../lib/display'
import { pitchSurname } from '../lib/displayNames'
import type { LeagueId } from '../lib/leagues'
import type { LeagueSeasonOption, MostUsedStartingXi } from '../lib/stats/types'
import { ratingColorStyle } from '../lib/stats/ratingColor'
import { PlayerAvatar } from './PlayerAvatar'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { SeasonPicker } from './SeasonPicker'

export function TeamSeasonXiPitch({
  data,
  loading,
  error,
  seasons,
  seasonsLoading,
  selectedSeason,
  selectedKey,
  onSelectSeason,
  onOpenPlayer,
  leagueId,
  teamId,
  teamName,
}: {
  data: MostUsedStartingXi | null
  loading: boolean
  error: string | null
  seasons: LeagueSeasonOption[]
  seasonsLoading?: boolean
  selectedSeason: number | null
  selectedKey?: string | null
  onSelectSeason: (year: number, option: LeagueSeasonOption) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  leagueId: LeagueId
  teamId: string
  teamName: string
}) {
  return (
    <section className="border border-white/10 bg-pitch/40" aria-label="Lineup">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cream">Lineup</p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/60">
            All competitions
          </p>
        </div>
        <div className="w-[9.5rem] shrink-0">
          <SeasonPicker
            seasons={seasons}
            selectedSeason={selectedSeason}
            selectedKey={selectedKey}
            loading={seasonsLoading}
            onSelect={onSelectSeason}
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 px-3 pt-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
          {data?.formation ? missingShort(data.formation) : 'Formation'}
        </p>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-lime/85">
          Most used starting 11
        </p>
      </div>

      <div className="px-3 pb-3 pt-2">
        {loading && !data?.players.length ? (
          <p className="py-10 text-center text-sm text-mist/70">Loading starting 11…</p>
        ) : error && !data?.players.length ? (
          <p className="py-10 text-center text-sm text-mist/70">{error}</p>
        ) : !data?.players.length ? (
          <p className="py-10 text-center text-sm text-mist/70">
            No starting XI data for this season yet.
          </p>
        ) : (
          <div
            className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden border border-lime/25 bg-[linear-gradient(180deg,#0d4a36_0%,#0a3a2a_48%,#083024_100%)]"
            role="img"
            aria-label={`Most used ${data.formation} starting eleven`}
          >
            <div className="pointer-events-none absolute inset-[6%] border border-white/25" aria-hidden />
            <div
              className="pointer-events-none absolute left-1/2 top-[6%] h-[18%] w-[34%] -translate-x-1/2 border border-white/20"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-[6%] left-1/2 h-[18%] w-[34%] -translate-x-1/2 border border-white/20"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-[6%] top-1/2 border-t border-white/20"
              aria-hidden
            />

            {data.players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() =>
                  onOpenPlayer({
                    id: player.id,
                    leagueId,
                    name: player.name,
                    shortName: player.shortName,
                    photoUrl: player.photoUrl,
                    jersey: player.jersey,
                    teamId,
                    teamName,
                    position: player.positionAbbrev,
                  })
                }
                className="absolute flex w-[4.4rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-lime"
                style={{ left: `${player.x}%`, top: `${player.y}%` }}
              >
                <span className="relative">
                  <PlayerAvatar
                    name={player.name}
                    photoUrl={player.photoUrl}
                    jersey={player.jersey}
                    size="sm"
                  />
                  {player.avgRating != null ? (
                    <span
                      className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-pitch-deep px-0.5 text-[0.55rem] font-bold tabular-nums"
                      style={ratingColorStyle(player.avgRating)}
                    >
                      {player.avgRating.toFixed(1)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[0.6rem] font-semibold leading-tight text-cream">
                  {missingShort(pitchSurname(player.name, player.shortName))}
                </span>
                {player.goals > 0 || player.assists > 0 ? (
                  <span className="mt-0.5 flex items-center gap-1 text-[0.55rem] font-semibold text-mist/80">
                    {player.goals > 0 ? <span>G {player.goals}</span> : null}
                    {player.assists > 0 ? <span>A {player.assists}</span> : null}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {data && data.matchesSampled > 0 ? (
          <p className="mt-2 text-center text-[0.6rem] text-mist/45">
            Based on {data.matchesSampled} competitive match
            {data.matchesSampled === 1 ? '' : 'es'}
            {data.formation ? ` in ${data.formation}` : ''}
            {' · G/A from season stats'}
          </p>
        ) : null}
      </div>
    </section>
  )
}
