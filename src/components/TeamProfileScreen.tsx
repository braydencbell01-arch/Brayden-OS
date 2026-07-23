import { useCallback, useMemo, useRef, useState } from 'react'
import { getLeague, isInternationalLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import {
  formatSideRecord,
  groupMatchesByDate,
  homeAwayRecordForTeam,
  mergeTeamMatches,
  nextMatchForTeam,
  recentFormForTeam,
  splitTeamFixtures,
  type Match,
  type TeamFormResult,
} from '../lib/matches'
import {
  addDays,
  CALENDAR_INITIAL_PAST_DAYS,
  CALENDAR_PAST_CHUNK_DAYS,
  formatMatchDayHeading,
  startOfDay,
} from '../lib/dates'
import { useTodayKey } from '../lib/useToday'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { seasonSnapshotFacts } from '../lib/stats/teamFacts'
import { useTeamClubFacts } from '../lib/stats/useTeamClubFacts'
import { useTeamRoster } from '../lib/stats/useTeamRoster'
import { useTeamSchedule } from '../lib/stats/useTeamSchedule'
import { useTeamStatLeaders } from '../lib/stats/useTeamStatLeaders'
import { FavoriteStar } from './FavoriteStar'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { ProfileAccordion } from './ProfileAccordion'
import { ProfileHeader, ProfileShell } from './ProfileShell'
import { StandingsTable } from './StandingsTable'
import { TeamRosterPanel } from './TeamRosterPanel'
import { TeamStatLeadersPanel } from './TeamStatLeadersPanel'

function FormDot({ result }: { result: TeamFormResult }) {
  const styles =
    result === 'W'
      ? 'bg-lime text-ink'
      : result === 'D'
        ? 'bg-white/20 text-cream'
        : 'bg-white/10 text-mist/80'

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center text-[0.7rem] font-bold ${styles}`}
      title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
    >
      {result}
    </span>
  )
}

export function TeamProfileScreen({
  team,
  matches,
  loading,
  error,
  refreshing,
  favorites,
  onBack,
  onOpenTeam,
  onOpenPlayer,
  onOpenLeague,
  onNeedPastRange,
  reduce,
}: {
  team: FavoriteTeam
  matches: Match[]
  loading: boolean
  error: string | null
  refreshing?: boolean
  favorites: FavoritesApi
  onBack: () => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  onOpenLeague: (id: LeagueId) => void
  /** Expand the shared fixture cache further into the past for infinite Recent. */
  onNeedPastRange?: (from: Date, to: Date) => void | Promise<unknown>
  reduce: boolean | null
}) {
  const league = getLeague(team.leagueId)
  const isNational =
    team.kind === 'national' || isInternationalLeague(team.leagueId)
  const standings = useLeagueStandings(team.leagueId)
  const todayKey = useTodayKey()
  const [openSection, setOpenSection] = useState<
    'table' | 'upcoming' | 'recent' | 'roster' | 'leaders' | null
  >(null)
  const [pastHorizonDays, setPastHorizonDays] = useState(CALENDAR_INITIAL_PAST_DAYS)
  const recentScrollRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const rosterEnabled = openSection === 'roster'
  const leadersEnabled = openSection === 'leaders'
  const roster = useTeamRoster(team.leagueId, team.id, rosterEnabled)
  const leaders = useTeamStatLeaders(team.leagueId, team.id, leadersEnabled)
  const schedule = useTeamSchedule(team.id, team.leagueId, true)

  const standing = useMemo(
    () => standings.rows.find((row) => row.teamId === team.id) ?? null,
    [standings.rows, team.id],
  )

  const facts = useTeamClubFacts(team.leagueId, team.id, standing?.team || team.name)

  const teamMatches = useMemo(
    () => mergeTeamMatches(matches, schedule.data),
    [matches, schedule.data],
  )

  const form = useMemo(
    () => recentFormForTeam(teamMatches, team.id, 5),
    [teamMatches, team.id],
  )

  const homeAway = useMemo(
    () => homeAwayRecordForTeam(teamMatches, team.id),
    [teamMatches, team.id],
  )

  const { recent, upcoming } = useMemo(
    () => splitTeamFixtures(teamMatches, team.id, todayKey),
    [teamMatches, team.id, todayKey],
  )

  const nextMatch = useMemo(
    () => nextMatchForTeam(teamMatches, team.id, todayKey),
    [teamMatches, team.id, todayKey],
  )

  const nextOpponent = useMemo(() => {
    if (!nextMatch) return null
    const isHome = nextMatch.home.id === team.id
    const opponent = isHome ? nextMatch.away : nextMatch.home
    const opponentStanding =
      standings.rows.find((row) => row.teamId === opponent.id) ?? null
    const opponentForm = recentFormForTeam(teamMatches, opponent.id, 5)
    return {
      match: nextMatch,
      opponent,
      isHome,
      standing: opponentStanding,
      form: opponentForm,
    }
  }, [nextMatch, standings.rows, team.id, teamMatches])

  const upcomingGrouped = useMemo(() => groupMatchesByDate(upcoming), [upcoming])
  const recentGrouped = useMemo(
    () => groupMatchesByDate(recent).slice().reverse(),
    [recent],
  )
  const favorited = favorites.isTeamFavorite(team.id)
  const displayName = standing?.team || team.name
  const fixturesLoading = loading || schedule.loading

  const toggle = (section: 'table' | 'upcoming' | 'recent' | 'roster' | 'leaders') => {
    setOpenSection((current) => (current === section ? null : section))
  }

  const loadEarlierResults = useCallback(() => {
    if (!onNeedPastRange || loadingMoreRef.current) return
    loadingMoreRef.current = true
    const next = pastHorizonDays + CALENDAR_PAST_CHUNK_DAYS
    setPastHorizonDays(next)
    const today = startOfDay(new Date())
    void Promise.resolve(onNeedPastRange(addDays(today, -next), today)).finally(() => {
      loadingMoreRef.current = false
    })
  }, [onNeedPastRange, pastHorizonDays])

  const onRecentScroll = () => {
    const scroller = recentScrollRef.current
    if (!scroller || openSection !== 'recent') return
    const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (remaining < 120) loadEarlierResults()
  }

  const factRows = useMemo(() => {
    const club = facts.data
    const rows: Array<[string, string]> = []

    rows.push(['League', club?.leagueName || league.name])
    rows.push([
      club?.isNational || isNational ? 'Nation' : 'Country',
      club?.country || league.country,
    ])

    if (club?.city) rows.push(['City', club.city])
    if (club?.stadium) rows.push(['Stadium', club.stadium])
    if (club?.nickname) rows.push(['Nickname', club.nickname])
    if (club?.foundedYear) rows.push(['Founded', String(club.foundedYear)])

    if (club?.trophyCount != null) {
      rows.push([
        'Trophies',
        `${club.trophyCount}${club.trophySource ? ' · major titles' : ''}`,
      ])
    } else if (!isNational && !facts.loading) {
      rows.push(['Trophies', 'Not listed'])
    }

    if (club?.standingSummary) {
      rows.push(['Season line', club.standingSummary])
    }

    for (const cell of seasonSnapshotFacts(standing)) {
      if (club?.standingSummary && (cell[0] === 'Table place' || cell[0] === 'Points')) continue
      rows.push(cell)
    }

    if (homeAway.home.played > 0 || homeAway.away.played > 0) {
      rows.push(['Home', formatSideRecord(homeAway.home)])
      rows.push(['Away', formatSideRecord(homeAway.away)])
    }

    return rows
  }, [
    facts.data,
    facts.loading,
    homeAway,
    isNational,
    league.country,
    league.name,
    standing,
  ])

  return (
    <ProfileShell onBack={onBack} reduce={reduce}>
      <ProfileHeader
        reduce={reduce}
        star={
          <FavoriteStar
            active={favorited}
            label={displayName}
            onToggle={() =>
              favorites.toggleTeam({
                id: team.id,
                name: displayName,
                shortName: team.shortName,
                leagueId: team.leagueId,
                kind: isNational ? 'national' : 'club',
              })
            }
          />
        }
        eyebrow={
          <button
            type="button"
            onClick={() => onOpenLeague(team.leagueId)}
            className="profile-link text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            {isNational ? `National team · ${league.name}` : league.name}
          </button>
        }
        title={displayName}
        meta={
          <>
            {team.shortName}
            {facts.data?.country ? ` · ${facts.data.country}` : ` · ${league.country}`}
            {standing
              ? ` · #${standing.rank}${
                  standing.group ? ` · ${standing.group}` : ''
                } · ${standing.points} pts`
              : isNational
                ? ' · International'
                : ''}
          </>
        }
      />

      {standing?.group ? (
        <p className="mt-4 border border-lime/30 bg-lime/10 px-3 py-2 text-sm font-semibold text-lime">
          {standing.group}
        </p>
      ) : null}

      <section className="mt-6" aria-label="Club facts">
        {facts.loading && factRows.length <= 2 ? (
          <p className="text-sm text-mist/70">Loading club facts…</p>
        ) : null}

        <dl className="border border-white/10">
          {factRows.map(([label, value], index) => (
            <div
              key={`${label}-${index}`}
              className={`flex items-baseline justify-between gap-4 px-3.5 py-2.5 ${
                index > 0 ? 'border-t border-white/8' : ''
              }`}
            >
              <dt className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
                {label}
              </dt>
              <dd className="min-w-0 text-right text-sm font-semibold text-cream">{value}</dd>
            </div>
          ))}
        </dl>

        {facts.error ? (
          <p className="mt-2 text-xs text-mist/55">Some club details could not be loaded.</p>
        ) : null}
        {facts.data?.trophyCount != null && facts.data.trophySource ? (
          <p className="mt-2 text-[0.65rem] text-mist/45">
            Trophy total estimated from public records ({facts.data.trophySource}).
          </p>
        ) : null}

        {standing?.note ? <p className="mt-2 text-xs text-mist/60">{standing.note}</p> : null}

        <div className="mt-4">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
            Form
          </p>
          {form.length === 0 ? (
            <p className="text-sm text-mist/70">No finished matches in the loaded window.</p>
          ) : (
            <div className="flex gap-1.5" aria-label="Recent form">
              {form.map((result, index) => (
                <FormDot key={`${result}-${index}`} result={result} />
              ))}
            </div>
          )}
        </div>

        {nextOpponent ? (
          <div className="mt-5 border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
              Next opponent
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  onOpenTeam({
                    id: nextOpponent.opponent.id,
                    name: nextOpponent.opponent.name,
                    shortName: nextOpponent.opponent.shortName,
                    leagueId: nextOpponent.match.leagueId,
                    kind: isInternationalLeague(nextOpponent.match.leagueId)
                      ? 'national'
                      : 'club',
                  })
                }
                className="profile-link text-left text-base font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                {nextOpponent.opponent.name}
              </button>
              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-mist/65">
                {nextOpponent.isHome ? 'Home' : 'Away'}
              </span>
            </div>
            <p className="mt-1 text-xs text-mist/70">
              {formatMatchDayHeading(nextOpponent.match.dateKey)}
              {nextOpponent.standing
                ? ` · #${nextOpponent.standing.rank}${
                    nextOpponent.standing.group ? ` · ${nextOpponent.standing.group}` : ''
                  } · ${nextOpponent.standing.points} pts`
                : ''}
            </p>
            {nextOpponent.form.length > 0 ? (
              <div className="mt-2 flex gap-1" aria-label="Opponent form">
                {nextOpponent.form.map((result, index) => (
                  <FormDot key={`opp-${result}-${index}`} result={result} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <ProfileAccordion
          title="Table"
          subtitle={
            standing?.group ? `${standing.group} · ${league.name}` : league.name
          }
          open={openSection === 'table'}
          onToggle={() => toggle('table')}
        >
          <StandingsTable
            rows={standings.rows}
            loading={standings.loading}
            error={standings.error}
            leagueId={team.leagueId}
            isTeamFavorite={favorites.isTeamFavorite}
            onToggleTeam={favorites.toggleTeam}
            onOpenTeam={onOpenTeam}
            highlightedTeamId={team.id}
            onRetry={() => void standings.reload()}
          />
        </ProfileAccordion>

        <ProfileAccordion
          title="Upcoming Fixtures"
          open={openSection === 'upcoming'}
          onToggle={() => toggle('upcoming')}
        >
          {fixturesLoading && upcomingGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">Loading fixtures…</p>
          ) : (
            <>
              {(error || schedule.error) && upcomingGrouped.length === 0 ? (
                <p className="text-sm text-mist/80">{error || schedule.error}</p>
              ) : null}
              {(error || schedule.error) && upcomingGrouped.length > 0 ? (
                <p className="mb-3 text-sm text-mist/70">{error || schedule.error}</p>
              ) : null}
              {(!error && !schedule.error) || upcomingGrouped.length > 0 ? (
                upcomingGrouped.length === 0 ? (
                  <p className="text-sm text-mist/70">No upcoming matches known yet.</p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {upcomingGrouped.map(({ dateKey, matches: dayMatches }) => (
                      <section key={dateKey} aria-label={formatMatchDayHeading(dateKey)}>
                        <h2 className="mb-2 px-0.5 font-display text-xl tracking-wide text-cream">
                          {formatMatchDayHeading(dateKey)}
                        </h2>
                        <MatchList
                          matches={dayMatches}
                          onOpenTeam={onOpenTeam}
                          onOpenPlayer={onOpenPlayer}
                          onOpenLeague={onOpenLeague}
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
          title="Past Fixtures"
          open={openSection === 'recent'}
          onToggle={() => toggle('recent')}
        >
          {fixturesLoading && recentGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">Loading results…</p>
          ) : recentGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">No recent results in the current window.</p>
          ) : (
            <div
              ref={recentScrollRef}
              onScroll={onRecentScroll}
              className="max-h-[28rem] overflow-y-auto overscroll-contain pr-1"
            >
              <div className="flex flex-col gap-5">
                {recentGrouped.map(({ dateKey, matches: dayMatches }) => (
                  <section key={dateKey} aria-label={formatMatchDayHeading(dateKey)}>
                    <h2 className="mb-2 px-0.5 font-display text-xl tracking-wide text-cream">
                      {formatMatchDayHeading(dateKey)}
                    </h2>
                    <MatchList
                      matches={dayMatches}
                      onOpenTeam={onOpenTeam}
                      onOpenPlayer={onOpenPlayer}
                      onOpenLeague={onOpenLeague}
                      favoriteLeagueIds={favorites.leagueIds}
                      favoriteTeamIds={favorites.teamIds}
                      emptyLabel="No matches"
                    />
                  </section>
                ))}
              </div>

              <div className="sticky bottom-0 mt-4 bg-gradient-to-t from-pitch via-pitch/95 to-transparent pt-3 pb-1">
                <button
                  type="button"
                  onClick={loadEarlierResults}
                  disabled={refreshing || !onNeedPastRange}
                  className="w-full border border-dashed border-white/15 bg-white/[0.03] px-3 py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-50"
                >
                  {refreshing
                    ? 'Loading earlier…'
                    : `Load earlier results · ${pastHorizonDays}+ days`}
                </button>
              </div>
            </div>
          )}
        </ProfileAccordion>

        <ProfileAccordion
          title="Stat Leaders"
          open={openSection === 'leaders'}
          onToggle={() => toggle('leaders')}
        >
          <TeamStatLeadersPanel
            data={leaders.data}
            loading={leaders.loading}
            error={leaders.error}
            leagueId={team.leagueId}
            onOpenPlayer={onOpenPlayer}
          />
        </ProfileAccordion>

        <ProfileAccordion
          title="Squad"
          subtitle={isNational ? 'Current camp / tournament squad' : 'Full roster by position'}
          open={openSection === 'roster'}
          onToggle={() => toggle('roster')}
        >
          <TeamRosterPanel
            data={roster.data}
            loading={roster.loading}
            error={roster.error}
            leagueId={team.leagueId}
            teamId={team.id}
            teamName={displayName}
            favorites={favorites}
            onOpenPlayer={onOpenPlayer}
          />
        </ProfileAccordion>
      </div>
    </ProfileShell>
  )
}
