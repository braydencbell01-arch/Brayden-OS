import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MISSING_LONG } from '../lib/display'
import {
  getLeague,
  inferSoccerSeasonStartYear,
  isInternationalLeague,
  confederationForNationalTeam,
  teamSubtitleLeagueId,
  type LeagueId,
} from '../lib/leagues'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import {
  matchesForTeam,
  mergeTeamMatches,
  nextMatchForTeam,
  recentFormMatchesForTeam,
  teamResult,
  teamSeasonCompetitionIds,
  type Match,
  type TeamFormResult,
} from '../lib/matches'
import { formatSeasonShortLabel } from '../lib/stats/espn'
import {
  addDays,
  CALENDAR_INITIAL_PAST_DAYS,
  CALENDAR_PAST_CHUNK_DAYS,
  formatKickoffTime,
  formatMatchDayHeading,
  startOfDay,
} from '../lib/dates'
import { useTodayKey } from '../lib/useToday'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { useTeamClubFacts } from '../lib/stats/useTeamClubFacts'
import { useMostUsedStartingXi } from '../lib/stats/useMostUsedStartingXi'
import { useTeamRoster } from '../lib/stats/useTeamRoster'
import { useTeamSchedule } from '../lib/stats/useTeamSchedule'
import { useTeamSeasons } from '../lib/stats/useTeamSeasons'
import { useTeamStatLeaders } from '../lib/stats/useTeamStatLeaders'
import { useTeamTransfers } from '../lib/stats/useTeamTransfers'
import { teamAccentFromFacts } from '../lib/stats/teamFacts'
import { transferKindLabel } from '../lib/stats/teamTransfers'
import { teamLogoUrl, withAlpha } from '../lib/stats/branding'
import { EntityLogo } from './EntityLogo'
import { FavoriteStar } from './FavoriteStar'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { ProfileAccordion } from './ProfileAccordion'
import { ProfileShell } from './ProfileShell'
import { StandingsTable } from './StandingsTable'
import { TeamRosterPanel } from './TeamRosterPanel'
import { TeamSeasonXiPitch } from './TeamSeasonXiPitch'
import { TeamStatLeadersPanel } from './TeamStatLeadersPanel'

const OVERVIEW_PREVIEW = 5

type TeamTab = 'overview' | 'matches' | 'table' | 'stats' | 'squad'
type OverviewSection =
  | 'competitions'
  | 'nextOpponent'
  | 'form'
  | 'transfers'
  | 'trophies'
  | 'stadium'

const TABS: Array<{ id: TeamTab; label: string; clubsOnly?: boolean }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'matches', label: 'Matches' },
  { id: 'table', label: 'Table', clubsOnly: true },
  { id: 'stats', label: 'Stats' },
  { id: 'squad', label: 'Squad' },
]

function FormScoreBox({
  result,
  score,
}: {
  result: TeamFormResult
  score: string
}) {
  const base =
    result === 'W'
      ? 'bg-lime/85 text-ink'
      : result === 'D'
        ? 'bg-white/20 text-cream'
        : 'bg-red-500/75 text-cream'

  return (
    <span
      className={`inline-flex min-w-[2.4rem] items-center justify-center px-1.5 py-1 text-[0.7rem] font-bold tabular-nums ${base}`}
      title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
    >
      {score}
    </span>
  )
}

function OverviewCard({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <ProfileAccordion title={title} subtitle={subtitle} open={open} onToggle={onToggle}>
      {children}
    </ProfileAccordion>
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
  const standings = useLeagueStandings(team.leagueId, !isNational && league.hasStandings)
  const todayKey = useTodayKey()
  const [tab, setTab] = useState<TeamTab>('overview')
  const [openOverview, setOpenOverview] = useState<Record<OverviewSection, boolean>>({
    competitions: true,
    nextOpponent: true,
    form: true,
    transfers: true,
    trophies: true,
    stadium: true,
  })
  const [showAllTransfers, setShowAllTransfers] = useState(false)
  const [showAllTrophies, setShowAllTrophies] = useState(false)
  const [pastHorizonDays, setPastHorizonDays] = useState(CALENDAR_INITIAL_PAST_DAYS)
  const matchesScrollRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const rosterEnabled = tab === 'squad'
  const leadersEnabled = tab === 'stats' || tab === 'overview'
  const overviewEnabled = tab === 'overview' && !isNational
  const overviewXiEnabled = overviewEnabled
  const roster = useTeamRoster(team.leagueId, team.id, rosterEnabled)
  const leaders = useTeamStatLeaders(team.leagueId, team.id, !isNational && leadersEnabled)
  const schedule = useTeamSchedule(team.id, team.leagueId, true)
  const transfers = useTeamTransfers(team.leagueId, team.id, overviewEnabled)
  const overviewSeasons = useTeamSeasons(
    team.leagueId,
    team.id,
    overviewXiEnabled,
    'all-competitions',
  )
  const mostUsedXi = useMostUsedStartingXi(
    team.leagueId,
    team.id,
    overviewSeasons.selectedSeason,
    overviewXiEnabled,
    overviewSeasons.selectedEspnCode,
  )

  const standing = useMemo(
    () => standings.rows.find((row) => row.teamId === team.id) ?? null,
    [standings.rows, team.id],
  )

  const facts = useTeamClubFacts(team.leagueId, team.id, standing?.team || team.name)

  const teamMatches = useMemo(
    () => mergeTeamMatches(matches, schedule.data),
    [matches, schedule.data],
  )

  const formMatches = useMemo(
    () => recentFormMatchesForTeam(teamMatches, team.id, 5),
    [teamMatches, team.id],
  )

  const timelineMatches = useMemo(
    () => matchesForTeam(teamMatches, team.id),
    [teamMatches, team.id],
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
    return {
      match: nextMatch,
      opponent,
      isHome,
      standing: opponentStanding,
    }
  }, [nextMatch, standings.rows, team.id])

  const favorited = favorites.isTeamFavorite(team.id)
  const displayName = standing?.team || team.name
  const fixturesLoading = loading || schedule.loading
  const countryLine = isNational
    ? confederationForNationalTeam({
        name: team.name,
        shortName: team.shortName,
      }) ||
      facts.data?.country ||
      'International'
    : facts.data?.country || league.country

  const seasonYear =
    standings.selectedSeason ??
    standings.seasons[0]?.year ??
    inferSoccerSeasonStartYear()
  const seasonShortLabel = useMemo(() => {
    const fromStandings = standings.seasons.find((season) => season.year === seasonYear)
    if (fromStandings?.shortLabel) return fromStandings.shortLabel
    return formatSeasonShortLabel(seasonYear)
  }, [standings.seasons, seasonYear])

  const competitionIds = useMemo(
    () => teamSeasonCompetitionIds(team.id, team.leagueId, teamMatches, seasonYear),
    [team.id, team.leagueId, teamMatches, seasonYear],
  )

  const visibleTabs = useMemo(
    () =>
      TABS.filter((entry) => {
        if (entry.id === 'table') return league.hasStandings && !isNational
        return true
      }),
    [isNational, league.hasStandings],
  )

  useEffect(() => {
    if (!visibleTabs.some((entry) => entry.id === tab)) {
      setTab('overview')
    }
  }, [tab, visibleTabs])

  useEffect(() => {
    setTab('overview')
    setShowAllTransfers(false)
    setShowAllTrophies(false)
    setOpenOverview({
      competitions: true,
      nextOpponent: true,
      form: true,
      transfers: true,
      trophies: true,
      stadium: true,
    })
  }, [team.id])

  const trophyWins = facts.data?.trophyWins ?? []
  const visibleTrophies = showAllTrophies
    ? trophyWins
    : trophyWins.slice(0, OVERVIEW_PREVIEW)
  const visibleTransfers = showAllTransfers
    ? transfers.data
    : transfers.data.slice(0, OVERVIEW_PREVIEW)

  const toggleOverview = (section: OverviewSection) => {
    setOpenOverview((current) => ({ ...current, [section]: !current[section] }))
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
    const beforeCount = matchCountRef.current
    pendingPastCountRef.current = beforeCount
    const next = pastHorizonDays + CALENDAR_PAST_CHUNK_DAYS
    setPastHorizonDays(next)
    const today = startOfDay(new Date())
    void Promise.resolve(onNeedPastRange(addDays(today, -next), today)).finally(() => {
      loadingMoreRef.current = false
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

  const centeredNextRef = useRef<string | null>(null)
  const pendingTopLoadRef = useRef<{ height: number; top: number } | null>(null)

  const scrollNextMatchToCenter = useCallback(() => {
    const scroller = matchesScrollRef.current
    if (!scroller) return
    const target = scroller.querySelector<HTMLElement>('[data-next-match="true"]')
    if (!target) return
    const scrollerRect = scroller.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const delta =
      targetRect.top -
      scrollerRect.top -
      scroller.clientHeight / 2 +
      targetRect.height / 2
    scroller.scrollTop += delta
  }, [])

  useEffect(() => {
    if (tab !== 'matches') {
      centeredNextRef.current = null
      return
    }
    if (!nextMatch || timelineMatches.length === 0) return
    // Center once per team/next fixture — don't yank scroll when older results prepend.
    const anchor = `${team.id}:${nextMatch.id}`
    if (centeredNextRef.current === anchor) return
    const id = window.requestAnimationFrame(() => {
      scrollNextMatchToCenter()
      centeredNextRef.current = anchor
    })
    return () => window.cancelAnimationFrame(id)
  }, [tab, team.id, nextMatch, timelineMatches.length, scrollNextMatchToCenter])

  useEffect(() => {
    const pending = pendingTopLoadRef.current
    const scroller = matchesScrollRef.current
    if (!pending || !scroller || tab !== 'matches') return
    const delta = scroller.scrollHeight - pending.height
    if (delta > 0) {
      scroller.scrollTop = pending.top + delta
      pendingTopLoadRef.current = null
    }
  }, [timelineMatches.length, tab])

  const onMatchesScroll = () => {
    const scroller = matchesScrollRef.current
    if (!scroller || tab !== 'matches') return
    // Past matches sit above the next fixture — load more when near the top.
    if (scroller.scrollTop < 120) {
      if (!onNeedPastRange || loadingMoreRef.current || pastExhausted) return
      pendingTopLoadRef.current = {
        height: scroller.scrollHeight,
        top: scroller.scrollTop,
      }
      loadEarlierResults()
    }
  }

  const accent = teamAccentFromFacts(facts.data)

  return (
    <ProfileShell onBack={onBack} reduce={reduce} accentColor={accent}>
      <header className="border-b border-white/10 pb-5">
        <div className="flex items-start gap-3.5">
          <EntityLogo
            name={displayName}
            src={facts.data?.logoUrl}
            size="lg"
            ringColor={accent}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(2rem,8vw,2.85rem)] leading-[0.95] tracking-[0.03em] text-cream">
                  {displayName}
                </h1>
                <p className="mt-1.5 text-sm text-mist/75">{countryLine}</p>
              </div>
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
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenLeague(isNational ? teamSubtitleLeagueId(team) : team.leagueId)
              }
              className="profile-link mt-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-mist/60 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              style={accent ? { color: withAlpha(accent, 0.95) } : undefined}
            >
              {isNational
                ? `National team · ${
                    confederationForNationalTeam({
                      name: team.name,
                      shortName: team.shortName,
                    }) || league.name
                  }`
                : league.name}
              {!isNational && standing
                ? ` · #${standing.rank}${standing.group ? ` · ${standing.group}` : ''}`
                : ''}
            </button>
          </div>
        </div>
      </header>

      <nav
        className="sticky top-[3.35rem] z-20 -mx-5 mt-5 border-b border-white/10 bg-pitch-deep/92 px-5 backdrop-blur-md md:-mx-6 md:px-6"
        aria-label="Team sections"
      >
        <div className="flex gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map((entry) => {
            const active = tab === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`relative shrink-0 px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
                  active ? 'text-cream' : 'text-mist/55 hover:text-mist'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {entry.label}
                {active ? (
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 bg-cream"
                    style={accent ? { background: accent } : undefined}
                    aria-hidden
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="mt-5">
        {tab === 'overview' ? (
          <div className="flex flex-col gap-3">
            <OverviewCard
              title="Competitions"
              subtitle={
                seasonShortLabel ? `${seasonShortLabel} season` : undefined
              }
              open={openOverview.competitions}
              onToggle={() => toggleOverview('competitions')}
            >
              {competitionIds.length === 0 ? (
                <p className="text-sm text-mist/70">No competitions in the loaded window.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {competitionIds.map((id) => {
                    const item = getLeague(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onOpenLeague(id)}
                        className="border border-white/12 bg-white/[0.03] px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/35 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                        title={item.name}
                      >
                        {item.short}
                      </button>
                    )
                  })}
                </div>
              )}
            </OverviewCard>

            {!isNational ? (
              <TeamSeasonXiPitch
                data={mostUsedXi.data}
                loading={mostUsedXi.loading || overviewSeasons.seasonsLoading}
                error={mostUsedXi.error}
                seasons={overviewSeasons.seasons}
                seasonsLoading={overviewSeasons.seasonsLoading}
                selectedSeason={overviewSeasons.selectedSeason}
                selectedKey={overviewSeasons.selectedKey}
                onSelectSeason={overviewSeasons.selectSeason}
                onOpenPlayer={onOpenPlayer}
                leagueId={team.leagueId}
                teamId={team.id}
                teamName={displayName}
              />
            ) : null}

            <OverviewCard
              title="Next opponent"
              subtitle={
                nextOpponent
                  ? formatMatchDayHeading(nextOpponent.match.dateKey)
                  : undefined
              }
              open={openOverview.nextOpponent}
              onToggle={() => toggleOverview('nextOpponent')}
            >
              {fixturesLoading && !nextOpponent ? (
                <p className="text-sm text-mist/70">Loading next match…</p>
              ) : !nextOpponent ? (
                <p className="text-sm text-mist/70">No upcoming opponent yet.</p>
              ) : (
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
                    {getLeague(nextOpponent.match.leagueId).name}
                    {nextOpponent.match.kickoffTimeKnown
                      ? ` · ${formatKickoffTime(nextOpponent.match.kickoff)}`
                      : ''}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <EntityLogo
                        name={displayName}
                        src={facts.data?.logoUrl}
                        size="sm"
                        ringColor={accent}
                      />
                      <span className="truncate text-sm font-semibold text-cream">
                        {displayName}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-mist/60">
                      {nextOpponent.isHome ? 'Home' : 'Away'}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
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
                        className="profile-link truncate text-right text-sm font-semibold text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                      >
                        {nextOpponent.opponent.name}
                      </button>
                      <EntityLogo
                        name={nextOpponent.opponent.name}
                        src={teamLogoUrl(nextOpponent.opponent.id)}
                        size="sm"
                      />
                    </div>
                  </div>
                  {!isNational && nextOpponent.standing ? (
                    <p className="mt-2 text-xs text-mist/65">
                      #{nextOpponent.standing.rank}
                      {nextOpponent.standing.group
                        ? ` · ${nextOpponent.standing.group}`
                        : ''}{' '}
                      · {nextOpponent.standing.points} pts
                    </p>
                  ) : null}
                </div>
              )}
            </OverviewCard>

            <OverviewCard
              title="Form"
              subtitle={formMatches.length > 0 ? 'Last 5' : undefined}
              open={openOverview.form}
              onToggle={() => toggleOverview('form')}
            >
              {formMatches.length === 0 ? (
                <p className="text-sm text-mist/70">
                  No finished matches in the loaded window.
                </p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Recent form">
                  {formMatches.map((match) => {
                    const result = teamResult(match, team.id)
                    if (!result) return null
                    const opponent =
                      match.home.id === team.id ? match.away : match.home
                    const hs = match.home.score
                    const as = match.away.score
                    const score =
                      hs != null && as != null ? `${hs}-${as}` : MISSING_LONG
                    return (
                      <div
                        key={match.id}
                        className="flex w-14 shrink-0 flex-col items-center gap-1.5"
                      >
                        <FormScoreBox result={result} score={score} />
                        <EntityLogo
                          name={opponent.name}
                          src={teamLogoUrl(opponent.id)}
                          size="sm"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </OverviewCard>

            <OverviewCard
              title="Transfers"
              subtitle={
                transfers.data.length > 0
                  ? `${transfers.data.length} recent moves`
                  : undefined
              }
              open={openOverview.transfers}
              onToggle={() => toggleOverview('transfers')}
            >
              {transfers.loading && transfers.data.length === 0 ? (
                <p className="text-sm text-mist/70">Loading transfers…</p>
              ) : transfers.error && transfers.data.length === 0 ? (
                <p className="text-sm text-mist/70">{transfers.error}</p>
              ) : transfers.data.length === 0 ? (
                <p className="text-sm text-mist/70">No recent transfers listed yet.</p>
              ) : (
                <div>
                  <ul className="flex flex-col gap-2">
                    {visibleTransfers.map((row) => {
                      const other =
                        row.direction === 'in'
                          ? row.fromTeamName || 'Unknown'
                          : row.toTeamName || 'Unknown'
                      return (
                        <li
                          key={row.id}
                          className="border-b border-white/8 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <button
                              type="button"
                              disabled={!row.playerId}
                              onClick={() => {
                                if (!row.playerId) return
                                onOpenPlayer({
                                  id: row.playerId,
                                  leagueId: team.leagueId,
                                  name: row.playerName,
                                  shortName: row.playerName,
                                  teamId: team.id,
                                  teamName: displayName,
                                })
                              }}
                              className={`min-w-0 truncate text-left text-sm font-semibold ${
                                row.playerId
                                  ? 'profile-link text-cream transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime'
                                  : 'text-cream'
                              }`}
                            >
                              {row.playerName}
                            </button>
                            <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-lime/80">
                              {transferKindLabel(row)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-mist/65">
                            {formatMatchDayHeading(row.dateKey)}
                            {row.direction === 'in' ? ' · from ' : ' · to '}
                            {other}
                            {row.feeLabel && row.feeLabel !== row.feeType
                              ? ` · ${row.feeLabel}`
                              : ''}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                  {transfers.data.length > OVERVIEW_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setShowAllTransfers((value) => !value)}
                      className="mt-3 w-full border border-white/12 bg-white/[0.03] px-3 py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {showAllTransfers
                        ? 'Show less'
                        : `Show more · ${transfers.data.length - OVERVIEW_PREVIEW} more`}
                    </button>
                  ) : null}
                </div>
              )}
            </OverviewCard>

            <OverviewCard
              title="Trophies"
              subtitle={
                trophyWins.length > 0
                  ? `${trophyWins.length} titles`
                  : facts.data?.trophyCount != null
                    ? `${facts.data.trophyCount} major titles`
                    : undefined
              }
              open={openOverview.trophies}
              onToggle={() => toggleOverview('trophies')}
            >
              {facts.loading && trophyWins.length === 0 ? (
                <p className="text-sm text-mist/70">Loading trophies…</p>
              ) : trophyWins.length > 0 ? (
                <div>
                  <ul className="flex flex-col gap-2">
                    {visibleTrophies.map((row) => (
                      <li
                        key={`${row.competition}-${row.season}-${row.sortYear}`}
                        className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="min-w-0 text-sm font-semibold text-cream">
                          {row.competition}
                        </span>
                        <span className="shrink-0 text-right text-xs text-mist/65">
                          {row.season}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {trophyWins.length > OVERVIEW_PREVIEW ? (
                    <button
                      type="button"
                      onClick={() => setShowAllTrophies((value) => !value)}
                      className="mt-3 w-full border border-white/12 bg-white/[0.03] px-3 py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {showAllTrophies
                        ? 'Show less'
                        : `Show more · ${trophyWins.length - OVERVIEW_PREVIEW} more`}
                    </button>
                  ) : null}
                </div>
              ) : facts.data?.trophyCount != null ? (
                <p className="text-sm text-mist/70">
                  About {facts.data.trophyCount} major titles
                  {facts.data.trophySource
                    ? ` (from ${facts.data.trophySource})`
                    : ''}
                  .
                </p>
              ) : (
                <p className="text-sm text-mist/70">{MISSING_LONG}</p>
              )}
            </OverviewCard>

            {!isNational ? (
              <OverviewCard
                title="Stadium"
                subtitle={facts.data?.stadium || undefined}
                open={openOverview.stadium}
                onToggle={() => toggleOverview('stadium')}
              >
                {facts.loading && !facts.data?.stadium ? (
                  <p className="text-sm text-mist/70">Loading stadium…</p>
                ) : !facts.data?.stadium ? (
                  <p className="text-sm text-mist/70">{MISSING_LONG}</p>
                ) : (
                  <div>
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center border border-white/12 bg-white/[0.04] text-mist/70"
                        aria-hidden
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                          <path
                            d="M3 18h18M5 18V9l7-4 7 4v9M9 18v-4h6v4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-cream">{facts.data.stadium}</p>
                        <p className="mt-0.5 text-xs text-mist/65">
                          {[facts.data.city, facts.data.country].filter(Boolean).join(', ') ||
                            league.country}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                      <div className="min-w-0 text-center">
                        <p className="text-sm font-semibold text-cream">
                          {facts.data.stadiumSurface || MISSING_LONG}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
                          Surface
                        </p>
                      </div>
                      <div className="min-w-0 text-center border-x border-white/10">
                        <p className="text-sm font-semibold tabular-nums text-cream">
                          {facts.data.stadiumCapacity != null
                            ? facts.data.stadiumCapacity.toLocaleString()
                            : MISSING_LONG}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
                          Capacity
                        </p>
                      </div>
                      <div className="min-w-0 text-center">
                        <p className="text-sm font-semibold tabular-nums text-cream">
                          {facts.data.stadiumOpenedYear ?? MISSING_LONG}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
                          Opened
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </OverviewCard>
            ) : null}
          </div>
        ) : null}

        {tab === 'matches' ? (
          <div
            ref={matchesScrollRef}
            onScroll={onMatchesScroll}
            className="max-h-[min(70dvh,40rem)] overflow-y-auto overscroll-contain pr-1"
            aria-label="Team match timeline"
          >
            {fixturesLoading && timelineMatches.length === 0 ? (
              <p className="text-sm text-mist/70">Loading matches…</p>
            ) : (error || schedule.error) && timelineMatches.length === 0 ? (
              <p className="text-sm text-mist/80">{error || schedule.error}</p>
            ) : (
              <MatchList
                matches={timelineMatches}
                allMatches={teamMatches}
                showLeague
                nextMatchId={nextMatch?.id}
                onOpenTeam={onOpenTeam}
                onOpenPlayer={onOpenPlayer}
                onOpenLeague={onOpenLeague}
                favoriteLeagueIds={favorites.leagueIds}
                favoriteTeamIds={favorites.teamIds}
                emptyLabel="No matches yet."
              />
            )}
          </div>
        ) : null}

        {tab === 'table' && league.hasStandings && !isNational ? (
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
        ) : null}

        {tab === 'stats' ? (
          isNational ? (
            <p className="text-sm text-mist/70">
              Club-style season leaders are not available for national teams.
            </p>
          ) : (
            <TeamStatLeadersPanel
              data={leaders.data}
              loading={leaders.loading}
              error={leaders.error}
              leagueId={team.leagueId}
              seasons={leaders.seasons}
              seasonsLoading={leaders.seasonsLoading}
              selectedSeason={leaders.selectedSeason}
              selectedKey={leaders.selectedKey}
              onSelectSeason={leaders.selectSeason}
              onOpenPlayer={onOpenPlayer}
            />
          )
        ) : null}

        {tab === 'squad' ? (
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
            selectedKey={roster.selectedKey}
            onSelectSeason={roster.selectSeason}
            onOpenPlayer={onOpenPlayer}
          />
        ) : null}
      </div>
    </ProfileShell>
  )
}
