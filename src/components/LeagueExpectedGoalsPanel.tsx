import { missingShort } from '../lib/display'
import type { LeagueExpectedGoals } from '../lib/stats/fotmob'
import type { LeagueSeasonOption } from '../lib/stats/types'
import { SeasonPicker } from './SeasonPicker'

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-mist/45">{missingShort(null)}</span>
  const positive = value > 0
  const negative = value < 0
  return (
    <span
      className={`tabular-nums ${
        positive ? 'text-lime' : negative ? 'text-mist/70' : 'text-cream'
      }`}
    >
      {positive ? '+' : ''}
      {value.toFixed(1)}
    </span>
  )
}

export function LeagueExpectedGoalsPanel({
  data,
  loading,
  error,
  seasons,
  seasonsLoading,
  selectedSeason,
  onSelectSeason,
}: {
  data: LeagueExpectedGoals | null
  loading: boolean
  error: string | null
  seasons: LeagueSeasonOption[]
  seasonsLoading: boolean
  selectedSeason: number | null
  onSelectSeason: (year: number) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <SeasonPicker
        seasons={seasons}
        selectedSeason={selectedSeason}
        loading={seasonsLoading}
        onSelect={onSelectSeason}
        emptyLabel="No xG seasons available"
      />

      {loading && !data ? <p className="text-sm text-mist/70">Loading expected goals…</p> : null}

      {error && !data ? <p className="text-sm text-mist/80">{error}</p> : null}

      {!loading && !error && (!data || (data.playersXg.length === 0 && data.teamsXg.length === 0)) ? (
        <p className="text-sm text-mist/70">
          Expected goals are not available for this competition yet.
        </p>
      ) : null}

      {data && (data.playersXg.length > 0 || data.teamsXg.length > 0) ? (
        <>
          {loading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/55">
              Updating…
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
              {data.seasonLabel} · FotMob xG
            </p>
          )}

          {data.playersXg.length > 0 ? (
            <section aria-label="Player expected goals">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
                Players · xG
              </p>
              <ol className="flex flex-col gap-1.5">
                {data.playersXg.map((row) => (
                  <li
                    key={`xg-${row.fotmobPlayerId}-${row.rank}`}
                    className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="font-display text-lg tracking-wide text-mist/70 tabular-nums">
                      {row.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream">
                        {missingShort(row.name)}
                      </p>
                      {row.teamName ? (
                        <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                          {row.teamName}
                          {row.goals != null ? ` · ${row.goals} G` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl tracking-wide text-lime tabular-nums">
                        {row.xg.toFixed(1)}
                      </p>
                      <p className="text-[0.65rem] text-mist/55">
                        G−xG <Delta value={row.overperformance} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {data.playersXa.length > 0 ? (
            <section aria-label="Player expected assists">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
                Players · xA
              </p>
              <ol className="flex flex-col gap-1.5">
                {data.playersXa.map((row) => (
                  <li
                    key={`xa-${row.fotmobPlayerId}-${row.rank}`}
                    className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="font-display text-lg tracking-wide text-mist/70 tabular-nums">
                      {row.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream">
                        {missingShort(row.name)}
                      </p>
                      {row.teamName ? (
                        <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                          {row.teamName}
                          {row.assists != null ? ` · ${row.assists} A` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl tracking-wide text-lime tabular-nums">
                        {row.xa.toFixed(1)}
                      </p>
                      <p className="text-[0.65rem] text-mist/55">
                        A−xA <Delta value={row.overperformance} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {data.teamsXg.length > 0 ? (
            <section aria-label="Team expected goals">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lime/80">
                Clubs · xG
              </p>
              <ol className="flex flex-col gap-1.5">
                {data.teamsXg.map((row) => (
                  <li
                    key={`txg-${row.fotmobTeamId}-${row.rank}`}
                    className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="font-display text-lg tracking-wide text-mist/70 tabular-nums">
                      {row.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream">
                        {missingShort(row.name)}
                      </p>
                      {row.goals != null ? (
                        <p className="truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                          {row.goals} goals scored
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl tracking-wide text-lime tabular-nums">
                        {row.xg.toFixed(1)}
                      </p>
                      <p className="text-[0.65rem] text-mist/55">
                        G−xG <Delta value={row.overperformance} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
