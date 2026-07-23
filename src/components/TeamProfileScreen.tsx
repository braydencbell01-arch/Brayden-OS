import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MISSING_LONG } from '../lib/display'
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
import { teamXgForName } from '../lib/stats/fotmob'
import { useLeagueExpectedGoals } from '../lib/stats/useLeagueExpectedGoals'
import { useTeamClubFacts } from '../lib/stats/useTeamClubFacts'
import { useTeamRoster } from '../lib/stats/useTeamRoster'
import { useTeamSchedule } from '../lib/stats/useTeamSchedule'
import { useTeamStatLeaders } from '../lib/stats/useTeamStatLeaders'
import { FavoriteStar } from './FavoriteStar'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { ProfileAccordion } from './ProfileAccordion'
import { ProfileHeader, ProfileMetric, ProfileMetricsRow, ProfileShell } from './ProfileShell'
import { StandingsTable } from './StandingsTable'
import { TeamSeasonStory } from './TeamSeasonStory'
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
  /** Kept for callers; earlier-results loading is tracked locally. */
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
    team.kind === 'national' ||
    (team.kind == null && isInternationalLeague(team.leagueId))
  const standings = useLeagueStandings(team.leagueId)
  const todayKey = useTodayKey()
  const [openSection, setOpenSection] = useState<
    'table' | 'upcoming' | 'recent' | 'roster' | 'leaders' | null
  >(null)
  const [pastHorizonDays, setPastHorizonDays] = useState(CALENDAR_INITIAL_PAST_DAYS)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const recentScrollRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const rosterEnabled = openSection === 'roster'
  const leadersEnabled = true
  const roster = useTeamRoster(team.leagueId, team.id, rosterEnabled)
  const leaders = useTeamStatLeaders(team.leagueId, team.id, !isNational && leadersEnabled)
  const schedule = useTeamSchedule(team.id, team.leagueId, true)
  const expectedGoals = useLeagueExpectedGoals(team.leagueId, !isNational)

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
  const teamXg = useMemo(
    () =>
      expectedGoals.data
        ? teamXgForName(expectedGoals.data.teamsXg, displayName)
        : null,
    [expectedGoals.data, displayName],
  )
  const teamPlayerXg = useMemo(() => {
    if (!expectedGoals.data) return []
    const needle = displayName.toLowerCase().replace(/^afc\s+|^fc\s+/, '')
    return expectedGoals.data.playersXg
      .filter((row) => {
        const teamName = (row.teamName || '').toLowerCase().replace(/^afc\s+|^fc\s+/, '')
        if (!teamName) return false
        if (teamName === needle) return true
        // Require a long enough token so "City" / "United" don't steal another club's board.
        if (needle.length < 6) return false
        return teamName.includes(needle) || needle.includes(teamName)
      })
      .slice(0, 5)
  }, [expectedGoals.data, displayName])

  const competitionIds = useMemo(() => {
    const ids = new Set<LeagueId>()
    ids.add(team.leagueId)
    for (const match of teamMatches) {
      if (match.home.id === team.id || match.away.id === team.id) {
        ids.add(match.leagueId)
      }
    }
    return [...ids]
  }, [team.id, team.leagueId, teamMatches])

  const topScorers = useMemo(() => {
    const goalsBoard =
      leaders.data?.categories.find((category) =>
        /goal/i.test(category.id) || /goal/i.test(category.label),
      ) || leaders.data?.categories[0]
    return goalsBoard?.leaders.slice(0, 3) ?? []
  }, [leaders.data])

  const toggle = (section: 'table' | 'upcoming' | 'recent' | 'roster' | 'leaders') => {
    setOpenSection((current) => (current === section ? null : section))
  }

  const [pastExhausted, setPastExhausted] = useState(false)
  const pendingPastCountRef = useRef<number | null>(null)
  const matchCountRef = useRef(0)
  matchCountRef.current = teamMatches.length

  useEffect(() => {
    setPastExhausted(false)
    pendingPastCountRef.current = null
    setPastHorizonDays(CALENDAR_INITIAL_PAST_DAYS)
  }, [team.id])

  useEffect(() => {
    const pending = pendingPastCountRef.current
    if (pending == null) return
    if (teamMatches.length > pending) pendingPastCountRef.current = null
  }, [teamMatches.length])

  const loadEarlierResults = useCallback(() => {
    if (!onNeedPastRange || loadingMoreRef.current || pastExhausted) return
    loadingMoreRef.current = true
    setLoadingEarlier(true)
    const beforeCount = matchCountRef.current
    pendingPastCountRef.current = beforeCount
    const next = pastHorizonDays + CALENDAR_PAST_CHUNK_DAYS
    setPastHorizonDays(next)
    const today = startOfDay(new Date())
    void Promise.resolve(onNeedPastRange(addDays(today, -next), today)).finally(() => {
      loadingMoreRef.current = false
      setLoadingEarlier(false)
      // Wait for parent merge to commit; only exhaust if count never grew.
      window.setTimeout(() => {
        if (
          pendingPastCountRef.current === beforeCount &&
          matchCountRef.current <= beforeCount
        ) {
          setPastExhausted(true)
        }
        if (pendingPastCountRef.current === beforeCount) {
          pendingPastCountRef.current = null
        }
      }, 450)
    })
  }, [onNeedPastRange, pastExhausted, pastHorizonDays])

  const onRecentScroll = () => {
    const scroller = recentScrollRef.current
    if (!scroller || openSection !== 'recent') return
    const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (remaining < 120) loadEarlierResults()
  }

  const factRows = useMemo(() => {
    const club = facts.data
    const rows: Array<[string, string]> = []

    rows.push([isNational ? 'Competition' : 'League', club?.leagueName || league.name])

    if (!isNational) {
      rows.push(['Country', club?.country || league.country])
      if (club?.city) rows.push(['City', club.city])
    }

    if (club?.stadium) rows.push(['Stadium', club.stadium])
    if (club?.nickname) rows.push(['Nickname', club.nickname])
    if (club?.foundedYear) rows.push(['Founded', String(club.foundedYear)])

    if (club?.trophyCount != null) {
      rows.push([
        'Trophies',
        `${club.trophyCount}${club.trophySource ? ' · major titles' : ''}`,
      ])
    } else if (!isNational && !facts.loading) {
      rows.push(['Trophies', MISSING_LONG])
    }

    if (!isNational && (homeAway.home.played > 0 || homeAway.away.played > 0)) {
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
        trailing={
          facts.data?.logoUrl ? (
            <img
              src={facts.data.logoUrl}
              alt=""
              className="h-14 w-14 object-contain sm:h-16 sm:w-16"
              loading="lazy"
            />
          ) : undefined
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
            {isNational
              ? ' · International'
              : standing
                ? ` · #${standing.rank}${
                    standing.group ? ` · ${standing.group}` : ''
                  } · ${standing.points} pts`
                : ''}
          </>
        }
      />

      {!isNational && standing?.group ? (
        <p className="mt-4 border border-lime/30 bg-lime/10 px-3 py-2 text-sm font-semibold text-lime">
          {standing.group}
        </p>
      ) : null}

      {!isNational ? (
        <ProfileMetricsRow>
          <ProfileMetric
            label="Pos"
            value={standings.loading && !standing ? '…' : standing ? `#${standing.rank}` : '—'}
          />
          <ProfileMetric
            label="Pts"
            value={standings.loading && !standing ? '…' : standing ? standing.points : '—'}
            accent
          />
          <ProfileMetric
            label="GD"
            value={
              standings.loading && !standing
                ? '…'
                : standing
                  ? standing.goalDiff > 0
                    ? `+${standing.goalDiff}`
                    : String(standing.goalDiff)
                  : '—'
            }
          />
          <ProfileMetric
            label="Record"
            value={
              <span className="block truncate text-lg font-semibold leading-8 text-cream">
                {standing
                  ? `${standing.won}W-${standing.drawn}D-${standing.lost}L`
                  : '—'}
              </span>
            }
          />
          <ProfileMetric
            label="xG"
            value={
              <span className="block truncate text-lg font-semibold leading-8 text-cream">
                {expectedGoals.loading && !teamXg
                  ? '…'
                  : teamXg
                    ? teamXg.xg.toFixed(1)
                    : '—'}
              </span>
            }
          />
          <ProfileMetric
            label="G − xG"
            value={
              <span className="block truncate text-lg font-semibold leading-8 text-cream">
                {teamXg?.overperformance != null
                  ? `${teamXg.overperformance > 0 ? '+' : ''}${teamXg.overperformance.toFixed(1)}`
                  : '—'}
              </span>
            }
          />
        </ProfileMetricsRow>
      ) : null}

      {competitionIds.length > 1 ? (
        <div className="mt-4" aria-label="Competitions">
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
            Competitions
          </p>
          <div className="flex flex-wrap gap-2">
            {competitionIds.map((id) => {
              const item = getLeague(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenLeague(id)}
                  className={`border px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
                    id === team.leagueId
                      ? 'border-lime/45 bg-lime/15 text-lime'
                      : 'border-white/12 bg-white/[0.03] text-mist/80 hover:border-lime/35 hover:text-lime'
                  }`}
                >
                  {item.short}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <section className="mt-6" aria-label={isNational ? 'Team facts' : 'Club facts'}>
        {facts.loading && factRows.length <= 2 ? (
          <p className="text-sm text-mist/70">
            {isNational ? 'Loading team facts…' : 'Loading club facts…'}
          </p>
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
          <p className="mt-2 text-xs text-mist/55">
            {isNational
              ? 'Some team details could not be loaded.'
              : 'Some club details could not be loaded.'}
          </p>
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

        <div className="mt-4">
          <TeamSeasonStory
            matches={teamMatches}
            teamId={team.id}
            teamName={displayName}
          />
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
              {!isNational && nextOpponent.standing
                ? ` · #${nextOpponent.standing.rank}${
                    nextOpponent.standing.group ? ` · ${nextOpponent.standing.group}` : ''
                  } · ${nextOpponent.standing.points} pts`
                : nextOpponent.standing?.group
                  ? ` · ${nextOpponent.standing.group}`
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

        {!isNational && (topScorers.length > 0 || leaders.loading) ? (
          <div className="mt-5 border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
                Top scorers
              </p>
              <button
                type="button"
                onClick={() => toggle('leaders')}
                className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/60 transition hover:text-lime"
              >
                All leaders
              </button>
            </div>
            {leaders.loading && topScorers.length === 0 ? (
              <p className="mt-2 text-sm text-mist/70">Loading scorers…</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {topScorers.map((leader) => (
                  <li key={leader.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPlayer({
                          id: leader.id,
                          leagueId: team.leagueId,
                          name: leader.name,
                          shortName: leader.shortName,
                          jersey: leader.jersey,
                          teamId: leader.teamId || team.id,
                          teamName: leader.teamName || displayName,
                        })
                      }
                      className="profile-link min-w-0 truncate text-left font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {leader.name}
                    </button>
                    <span className="shrink-0 tabular-nums text-lime">{leader.displayValue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {teamPlayerXg.length > 0 ? (
          <div className="mt-5 border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
              Squad xG leaders
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {teamPlayerXg.map((row) => (
                <li
                  key={row.fotmobPlayerId}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate font-semibold text-cream">{row.name}</span>
                  <span className="shrink-0 tabular-nums text-lime">
                    {row.xg.toFixed(1)} xG
                    {row.goals != null ? ` · ${row.goals} G` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-col gap-3">
        {league.hasStandings ? (
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
              seasons={standings.seasons}
              seasonsLoading={standings.seasonsLoading}
              selectedSeason={standings.selectedSeason}
              onSelectSeason={standings.selectSeason}
            />
          </ProfileAccordion>
        ) : null}

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
          ) : (error || schedule.error) && recentGrouped.length === 0 ? (
            <div>
              <p className="text-sm text-mist/80">{error || schedule.error}</p>
            </div>
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
                  disabled={loadingEarlier || pastExhausted || !onNeedPastRange}
                  className="w-full border border-dashed border-white/15 bg-white/[0.03] px-3 py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-50"
                >
                  {loadingEarlier
                    ? 'Loading earlier…'
                    : pastExhausted
                      ? 'No earlier results in range'
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
            seasons={leaders.seasons}
            seasonsLoading={leaders.seasonsLoading}
            selectedSeason={leaders.selectedSeason}
            onSelectSeason={leaders.selectSeason}
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
            seasons={roster.seasons}
            seasonsLoading={roster.seasonsLoading}
            selectedSeason={roster.selectedSeason}
            onSelectSeason={roster.selectSeason}
            onOpenPlayer={onOpenPlayer}
          />
        </ProfileAccordion>
      </div>
    </ProfileShell>
  )
}
