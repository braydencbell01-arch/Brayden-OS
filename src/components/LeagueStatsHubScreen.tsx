import { useMemo, useState } from 'react'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import type { League } from '../lib/leagues'
import { hasFotmobAdvancedStats } from '../lib/stats/fotmob'
import { useLeagueExpectedGoals } from '../lib/stats/useLeagueExpectedGoals'
import { useLeagueLeaders } from '../lib/stats/useLeagueLeaders'
import { useLeaguePlayerStats } from '../lib/stats/useLeaguePlayerStats'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { LeagueExpectedGoalsPanel } from './LeagueExpectedGoalsPanel'
import { LeaguePlayerStatsPanel } from './LeaguePlayerStatsPanel'
import { LeagueStatsPanel } from './LeagueStatsPanel'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { ProfileAccordion } from './ProfileAccordion'
import { ProfileHeader, ProfileShell } from './ProfileShell'
import { SeasonPicker } from './SeasonPicker'
import { StandingsTable } from './StandingsTable'

type HubSection = 'scoring' | 'players' | 'teams' | 'xg' | 'table'

/**
 * Stats-only competition hub opened from Stats → Leagues.
 * No fixtures / profile chrome — leaders, boards, standings, seasons.
 */
export function LeagueStatsHubScreen({
  league,
  favorites,
  onBack,
  onOpenTeam,
  onOpenPlayer,
  reduce,
}: {
  league: League
  favorites: FavoritesApi
  onBack: () => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  reduce: boolean | null
}) {
  const [openSection, setOpenSection] = useState<HubSection | null>('scoring')
  const playerStats = useLeaguePlayerStats(league.id, true)
  const teamLeaders = useLeagueLeaders(league.id, openSection === 'teams')
  const standings = useLeagueStandings(league.id, league.hasStandings && openSection === 'table')
  const showXg = hasFotmobAdvancedStats(league.id)
  const expectedGoals = useLeagueExpectedGoals(league.id, showXg && openSection === 'xg', {
    withSeasonPicker: true,
  })

  const toggle = (section: HubSection) => {
    setOpenSection((current) => (current === section ? null : section))
  }

  const seasonLabel = useMemo(() => {
    if (playerStats.selectedSeason != null) {
      const match = playerStats.seasons.find((row) => row.year === playerStats.selectedSeason)
      return match?.shortLabel || match?.label || String(playerStats.selectedSeason)
    }
    return playerStats.data?.seasonLabel ?? null
  }, [playerStats.selectedSeason, playerStats.seasons, playerStats.data?.seasonLabel])

  return (
    <ProfileShell onBack={onBack} reduce={reduce}>
      <ProfileHeader
        eyebrow="Competition stats"
        title={league.name}
        meta={
          <span>
            {league.country}
            {seasonLabel ? ` · ${seasonLabel}` : ''}
            {' · leaders, boards & table'}
          </span>
        }
        reduce={reduce}
      />

      <div className="mt-5 border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-mist/60">
          Season
        </p>
        <div className="mt-2">
          <SeasonPicker
            seasons={playerStats.seasons}
            selectedSeason={playerStats.selectedSeason ?? playerStats.data?.season ?? null}
            loading={playerStats.seasonsLoading}
            onSelect={playerStats.selectSeason}
          />
        </div>
        <p className="mt-2 text-[0.65rem] text-mist/55">
          Change the year to reload player boards. Team leaders, xG, and the table each have their
          own season control when opened.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <ProfileAccordion
          title="Goals · Assists · Saves"
          subtitle="Top 5 each — expand for the full board"
          open={openSection === 'scoring'}
          onToggle={() => toggle('scoring')}
        >
          <LeaguePlayerStatsPanel
            data={playerStats.data}
            loading={playerStats.loading}
            error={playerStats.error}
            leagueId={league.id}
            seasons={playerStats.seasons}
            seasonsLoading={playerStats.seasonsLoading}
            selectedSeason={playerStats.selectedSeason}
            onSelectSeason={playerStats.selectSeason}
            onOpenPlayer={onOpenPlayer}
            onOpenTeam={onOpenTeam}
            hideSeasonPicker
            featuredOnly
            previewCount={5}
          />
        </ProfileAccordion>

        <ProfileAccordion
          title="More player stats"
          subtitle="Shots, passes, fouls, cards"
          open={openSection === 'players'}
          onToggle={() => toggle('players')}
        >
          <LeaguePlayerStatsPanel
            data={playerStats.data}
            loading={playerStats.loading}
            error={playerStats.error}
            leagueId={league.id}
            seasons={playerStats.seasons}
            seasonsLoading={playerStats.seasonsLoading}
            selectedSeason={playerStats.selectedSeason}
            onSelectSeason={playerStats.selectSeason}
            onOpenPlayer={onOpenPlayer}
            onOpenTeam={onOpenTeam}
            hideSeasonPicker
            excludeFeatured
            previewCount={5}
          />
        </ProfileAccordion>

        <ProfileAccordion
          title="Team leaders"
          subtitle="Points, goals scored, conceded, difference"
          open={openSection === 'teams'}
          onToggle={() => toggle('teams')}
        >
          <LeagueStatsPanel
            data={
              teamLeaders.data
                ? {
                    ...teamLeaders.data,
                    categories: teamLeaders.data.categories.filter((category) => category.kind === 'team'),
                  }
                : null
            }
            loading={teamLeaders.loading}
            error={teamLeaders.error}
            leagueId={league.id}
            seasons={teamLeaders.seasons}
            seasonsLoading={teamLeaders.seasonsLoading}
            selectedSeason={teamLeaders.selectedSeason}
            onSelectSeason={teamLeaders.selectSeason}
            onOpenPlayer={onOpenPlayer}
            onOpenTeam={onOpenTeam}
          />
        </ProfileAccordion>

        {showXg ? (
          <ProfileAccordion
            title="Expected goals"
            subtitle="xG · xA · club xG"
            open={openSection === 'xg'}
            onToggle={() => toggle('xg')}
          >
            <LeagueExpectedGoalsPanel
              data={expectedGoals.data}
              loading={expectedGoals.loading}
              error={expectedGoals.error}
              seasons={expectedGoals.seasons}
              seasonsLoading={expectedGoals.seasonsLoading}
              selectedSeason={expectedGoals.selectedSeason}
              onSelectSeason={expectedGoals.selectSeason}
            />
          </ProfileAccordion>
        ) : null}

        {league.hasStandings ? (
          <ProfileAccordion
            title="Table"
            subtitle="Full standings for the selected season"
            open={openSection === 'table'}
            onToggle={() => toggle('table')}
          >
            <StandingsTable
              rows={standings.rows}
              loading={standings.loading}
              error={standings.error}
              leagueId={league.id}
              isTeamFavorite={favorites.isTeamFavorite}
              onToggleTeam={favorites.toggleTeam}
              onOpenTeam={onOpenTeam}
              onRetry={standings.reload}
              seasons={standings.seasons}
              seasonsLoading={standings.seasonsLoading}
              selectedSeason={standings.selectedSeason}
              onSelectSeason={standings.selectSeason}
            />
          </ProfileAccordion>
        ) : null}
      </div>
    </ProfileShell>
  )
}

