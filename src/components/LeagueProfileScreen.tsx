import { useMemo, useState } from 'react'
import { formatMatchDayHeading, toDateKey } from '../lib/dates'
import { MISSING_SHORT } from '../lib/display'
import { useToday } from '../lib/useToday'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import type { League } from '../lib/leagues'
import {
  groupMatchesByDate,
  leagueFormTable,
  matchesForLeagueFrom,
  recentLeagueResults,
  type Match,
} from '../lib/matches'
import { useLeagueLeaders } from '../lib/stats/useLeagueLeaders'
import { useLeagueExpectedGoals } from '../lib/stats/useLeagueExpectedGoals'
import { useLeaguePlayerStats } from '../lib/stats/useLeaguePlayerStats'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { FavoriteStar } from './FavoriteStar'
import { LeagueExpectedGoalsPanel } from './LeagueExpectedGoalsPanel'
import { LeagueFormTable } from './LeagueFormTable'
import { LeaguePlayerStatsPanel } from './LeaguePlayerStatsPanel'
import { LeagueSeasonTimeline } from './LeagueSeasonTimeline'
import { LeagueStatsPanel } from './LeagueStatsPanel'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { ProfileAccordion } from './ProfileAccordion'
import {
  ProfileHeader,
  ProfileMetric,
  ProfileMetricsRow,
  ProfileShell,
} from './ProfileShell'
import { StandingsTable } from './StandingsTable'

export function LeagueProfileScreen({
  league,
  matches,
  loading,
  error,
  favorites,
  onBack,
  onOpenTeam,
  onOpenPlayer,
  reduce,
}: {
  league: League
  matches: Match[]
  loading: boolean
  error: string | null
  favorites: FavoritesApi
  onBack: () => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  reduce: boolean | null
}) {
  const today = useToday()
  const leagueMatches = useMemo(
    () => matchesForLeagueFrom(matches, league.id, today),
    [matches, league.id, today],
  )
  const grouped = useMemo(() => groupMatchesByDate(leagueMatches), [leagueMatches])
  const standings = useLeagueStandings(league.id)
  const leagueFavorited = favorites.isLeagueFavorite(league.id)
  const isInternational = league.kind === 'international'

  const recentResults = useMemo(
    () => recentLeagueResults(matches, league.id, 48),
    [matches, league.id],
  )
  const recentGrouped = useMemo(
    () => groupMatchesByDate(recentResults).slice().reverse(),
    [recentResults],
  )
  const formRows = useMemo(
    () => leagueFormTable(matches, standings.rows, 5),
    [matches, standings.rows],
  )

  const [openSection, setOpenSection] = useState<
    'table' | 'form' | 'fixtures' | 'results' | 'player-stats' | 'stats' | 'xg' | null
  >(null)
  const statsEnabled = openSection === 'stats'
  const playerStatsEnabled = openSection === 'player-stats'
  const xgEnabled = openSection === 'xg'
  const leaders = useLeagueLeaders(league.id, statsEnabled)
  const playerStats = useLeaguePlayerStats(league.id, playerStatsEnabled)
  const expectedGoals = useLeagueExpectedGoals(league.id, xgEnabled)

  const toggleSection = (
    section: 'table' | 'form' | 'fixtures' | 'results' | 'player-stats' | 'stats' | 'xg',
  ) => {
    setOpenSection((current) => (current === section ? null : section))
  }

  const leader = standings.rows[0] ?? null
  const clubCount = standings.rows.length

  return (
    <ProfileShell onBack={onBack} reduce={reduce}>
      <ProfileHeader
        reduce={reduce}
        star={
          <FavoriteStar
            active={leagueFavorited}
            label={league.name}
            onToggle={() => favorites.toggleLeague(league.id)}
          />
        }
        eyebrow={league.country}
        title={league.name}
        meta={
          <>
            {league.short}
            {!loading && !error ? ` · ${leagueMatches.length} upcoming games` : ''}
          </>
        }
      />

      <ProfileMetricsRow>
        <ProfileMetric
          label={isInternational ? 'Teams' : 'Clubs'}
          value={standings.loading ? '…' : clubCount || MISSING_SHORT}
        />
        <ProfileMetric label="Upcoming games" value={loading ? '…' : leagueMatches.length} />
        <ProfileMetric
          label="Leader"
          value={
            standings.loading ? (
              '…'
            ) : leader ? (
              <button
                type="button"
                onClick={() =>
                  onOpenTeam({
                    id: leader.teamId,
                    name: leader.team,
                    shortName: leader.shortName,
                    leagueId: league.id,
                    kind: isInternational ? 'national' : 'club',
                  })
                }
                className="profile-link text-lg font-semibold text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                {leader.shortName}
              </button>
            ) : (
              MISSING_SHORT
            )
          }
        />
      </ProfileMetricsRow>

      {isInternational ? (
        <div className="mt-5">
          <LeagueSeasonTimeline leagueId={league.id} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {league.hasStandings ? (
          <ProfileAccordion
            title="Standings"
            open={openSection === 'table'}
            onToggle={() => toggleSection('table')}
          >
            <StandingsTable
              rows={standings.rows}
              loading={standings.loading}
              error={standings.error}
              leagueId={league.id}
              isTeamFavorite={favorites.isTeamFavorite}
              onToggleTeam={favorites.toggleTeam}
              onOpenTeam={onOpenTeam}
              onRetry={() => void standings.reload()}
            />
          </ProfileAccordion>
        ) : null}

        {league.hasStandings ? (
          <ProfileAccordion
            title="Form"
            subtitle="Last 5 results per club"
            open={openSection === 'form'}
            onToggle={() => toggleSection('form')}
          >
            {standings.loading && formRows.length === 0 ? (
              <p className="text-sm text-mist/70">Loading form…</p>
            ) : (
              <LeagueFormTable rows={formRows} leagueId={league.id} onOpenTeam={onOpenTeam} />
            )}
          </ProfileAccordion>
        ) : null}

        <ProfileAccordion
          title="Upcoming games"
          open={openSection === 'fixtures'}
          onToggle={() => toggleSection('fixtures')}
        >
          {loading && grouped.length === 0 ? (
            <p className="text-sm text-mist/70">Loading fixtures…</p>
          ) : (
            <>
              {error && grouped.length === 0 ? (
                <p className="text-sm text-mist/80">{error}</p>
              ) : null}
              {error && grouped.length > 0 ? (
                <p className="mb-3 text-sm text-mist/70">{error}</p>
              ) : null}
              {!error || grouped.length > 0 ? (
                grouped.length === 0 ? (
                  <p className="text-sm text-mist/70">
                    No upcoming {league.name} matches known yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {grouped.map(({ dateKey, matches: dayMatches }) => (
                      <section key={dateKey} aria-label={formatMatchDayHeading(dateKey)}>
                        <div className="mb-2 flex items-baseline justify-between px-0.5">
                          <h2 className="font-display text-xl tracking-wide text-cream">
                            {formatMatchDayHeading(dateKey)}
                          </h2>
                          {dateKey === toDateKey(today) && (
                            <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-lime">
                              Today
                            </span>
                          )}
                        </div>
                        <MatchList
                          matches={dayMatches}
                          onOpenTeam={onOpenTeam}
                          onOpenPlayer={onOpenPlayer}
                          favoriteLeagueIds={favorites.leagueIds}
                          favoriteTeamIds={favorites.teamIds}
                          emptyLabel="No matches"
                        />
                      </section>
                    ))}
                  </div>
                )
              ) : null}
            </>
          )}
        </ProfileAccordion>

        <ProfileAccordion
          title="Recent results"
          open={openSection === 'results'}
          onToggle={() => toggleSection('results')}
        >
          {loading && recentGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">Loading results…</p>
          ) : recentGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">No finished matches in the loaded window yet.</p>
          ) : (
            <div className="flex max-h-[28rem] flex-col gap-5 overflow-y-auto overscroll-contain pr-1">
              {recentGrouped.map(({ dateKey, matches: dayMatches }) => (
                <section key={dateKey} aria-label={formatMatchDayHeading(dateKey)}>
                  <h2 className="mb-2 px-0.5 font-display text-xl tracking-wide text-cream">
                    {formatMatchDayHeading(dateKey)}
                  </h2>
                  <MatchList
                    matches={dayMatches}
                    onOpenTeam={onOpenTeam}
                    onOpenPlayer={onOpenPlayer}
                    favoriteLeagueIds={favorites.leagueIds}
                    favoriteTeamIds={favorites.teamIds}
                    emptyLabel="No matches"
                  />
                </section>
              ))}
            </div>
          )}
        </ProfileAccordion>

        <ProfileAccordion
          title="Player stats"
          subtitle="Top scorers and category boards"
          open={openSection === 'player-stats'}
          onToggle={() => toggleSection('player-stats')}
        >
          <LeaguePlayerStatsPanel
            data={playerStats.data}
            loading={playerStats.loading}
            error={playerStats.error}
            leagueId={league.id}
            onOpenPlayer={onOpenPlayer}
            onOpenTeam={onOpenTeam}
          />
        </ProfileAccordion>

        <ProfileAccordion
          title="Stat leaders"
          subtitle="Players and teams"
          open={openSection === 'stats'}
          onToggle={() => toggleSection('stats')}
        >
          <LeagueStatsPanel
            data={leaders.data}
            loading={leaders.loading}
            error={leaders.error}
            leagueId={league.id}
            onOpenPlayer={onOpenPlayer}
            onOpenTeam={onOpenTeam}
          />
        </ProfileAccordion>

        {expectedGoals.supported ? (
          <ProfileAccordion
            title="Expected goals"
            subtitle="xG · xA · club chance quality"
            open={openSection === 'xg'}
            onToggle={() => toggleSection('xg')}
          >
            <LeagueExpectedGoalsPanel
              data={expectedGoals.data}
              loading={expectedGoals.loading}
              error={expectedGoals.error}
            />
          </ProfileAccordion>
        ) : null}
      </div>
    </ProfileShell>
  )
}
