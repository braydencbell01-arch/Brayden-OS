import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MISSING_SHORT } from '../lib/display'
import {
  addDays,
  CALENDAR_INITIAL_PAST_DAYS,
  CALENDAR_PAST_CHUNK_DAYS,
  formatKickoffTime,
  formatMatchDayHeading,
  startOfDay,
} from '../lib/dates'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import type { League } from '../lib/leagues'
import {
  leagueFormTable,
  matchesForLeague,
  nextMatchForLeague,
  type Match,
} from '../lib/matches'
import { leagueAccentColor, teamLogoUrl } from '../lib/stats/branding'
import { useLeagueLogo } from '../lib/stats/useLeagueLogo'
import { useLeagueOverviewFacts } from '../lib/stats/useLeagueOverviewFacts'
import { useLeaguePlayerStats } from '../lib/stats/useLeaguePlayerStats'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { useTodayKey } from '../lib/useToday'
import { EntityLogo } from './EntityLogo'
import { FavoriteStar } from './FavoriteStar'
import { LeagueFormTable } from './LeagueFormTable'
import { LeaguePlayerStatsPanel } from './LeaguePlayerStatsPanel'
import { LeagueSeasonTimeline } from './LeagueSeasonTimeline'
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

type LeagueTab = 'overview' | 'matches' | 'table' | 'stats'
type OverviewSection = 'form' | 'nextMatch'
type StatsSection = 'player-stats'

const TABS: Array<{ id: LeagueTab; label: string; needsStandings?: boolean }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'matches', label: 'Fixtures' },
  { id: 'table', label: 'Table', needsStandings: true },
  { id: 'stats', label: 'Stats' },
]

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

export function LeagueProfileScreen({
  league,
  matches,
  loading,
  error,
  favorites,
  onBack,
  onOpenTeam,
  onOpenPlayer,
  onNeedPastRange,
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
  /** Expand the shared fixture cache further into the past for infinite Matches. */
  onNeedPastRange?: (from: Date, to: Date) => void | Promise<unknown>
  reduce: boolean | null
}) {
  const todayKey = useTodayKey()
  const [tab, setTab] = useState<LeagueTab>('overview')
  const [openOverview, setOpenOverview] = useState<Record<OverviewSection, boolean>>({
    form: true,
    nextMatch: true,
  })
  const [openStats, setOpenStats] = useState<Record<StatsSection, boolean>>({
    'player-stats': true,
  })

  const leagueFavorited = favorites.isLeagueFavorite(league.id)
  const isInternational = league.kind === 'international'
  const isDomesticCup = league.kind === 'domestic' && league.format !== 'league'
  const showTimeline = isInternational || isDomesticCup
  const formatLabel =
    league.format === 'supercup' ? 'Super cup' : league.format === 'cup' ? 'Cup' : 'League'

  const standings = useLeagueStandings(league.id, league.hasStandings)
  // Warm player boards for the top-scorer metric on Overview.
  const playerStats = useLeaguePlayerStats(league.id, true)

  const overviewFacts = useLeagueOverviewFacts(league.id)

  const timelineMatches = useMemo(
    () => matchesForLeague(matches, league.id),
    [matches, league.id],
  )

  const nextMatch = useMemo(
    () => nextMatchForLeague(matches, league.id, todayKey),
    [matches, league.id, todayKey],
  )

  const formRows = useMemo(
    () => leagueFormTable(matches, standings.rows, 5),
    [matches, standings.rows],
  )

  const leader = standings.rows[0] ?? null
  const clubCount = standings.rows.length
  const topScorer =
    playerStats.data?.rows.find((row) => /goal/i.test(row.label))?.player ||
    playerStats.data?.rows[0]?.player ||
    null

  const { logoUrl } = useLeagueLogo(league.id)
  const accent = leagueAccentColor(league.id)

  const visibleTabs = useMemo(
    () =>
      TABS.filter((entry) => {
        if (entry.needsStandings) return league.hasStandings
        return true
      }),
    [league.hasStandings],
  )

  useEffect(() => {
    if (!visibleTabs.some((entry) => entry.id === tab)) {
      setTab('overview')
    }
  }, [tab, visibleTabs])

  useEffect(() => {
    setTab('overview')
    setOpenOverview({ form: true, nextMatch: true })
    setOpenStats({ 'player-stats': true })
  }, [league.id])

  const toggleOverview = (section: OverviewSection) => {
    setOpenOverview((current) => ({ ...current, [section]: !current[section] }))
  }

  const toggleStats = (section: StatsSection) => {
    setOpenStats((current) => ({ ...current, [section]: !current[section] }))
  }

  const [pastHorizonDays, setPastHorizonDays] = useState(CALENDAR_INITIAL_PAST_DAYS)
  const [pastExhausted, setPastExhausted] = useState(false)
  const matchesScrollRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const pendingPastCountRef = useRef<number | null>(null)
  const matchCountRef = useRef(0)
  matchCountRef.current = timelineMatches.length
  const centeredNextRef = useRef<string | null>(null)
  const pendingTopLoadRef = useRef<{ height: number; top: number } | null>(null)

  useEffect(() => {
    setPastExhausted(false)
    pendingPastCountRef.current = null
    setPastHorizonDays(CALENDAR_INITIAL_PAST_DAYS)
  }, [league.id])

  useEffect(() => {
    const pending = pendingPastCountRef.current
    if (pending == null) return
    if (timelineMatches.length > pending) pendingPastCountRef.current = null
  }, [timelineMatches.length])

  const loadEarlierResults = useCallback(() => {
    if (!onNeedPastRange || loadingMoreRef.current || pastExhausted) return
    loadingMoreRef.current = true
    const beforeCount = matchCountRef.current
    pendingPastCountRef.current = beforeCount
    const next = pastHorizonDays + CALENDAR_PAST_CHUNK_DAYS
    setPastHorizonDays(next)
    const day = startOfDay(new Date())
    void Promise.resolve(onNeedPastRange(addDays(day, -next), day)).finally(() => {
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
    if (loading || !nextMatch || timelineMatches.length === 0) return
    const anchor = `${league.id}:${nextMatch.id}`
    if (centeredNextRef.current === anchor) return
    const id = window.requestAnimationFrame(() => {
      scrollNextMatchToCenter()
      centeredNextRef.current = anchor
    })
    return () => window.cancelAnimationFrame(id)
  }, [
    tab,
    league.id,
    nextMatch,
    timelineMatches.length,
    loading,
    scrollNextMatchToCenter,
  ])

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
    if (scroller.scrollTop < 120) {
      if (!onNeedPastRange || loadingMoreRef.current || pastExhausted) return
      pendingTopLoadRef.current = {
        height: scroller.scrollHeight,
        top: scroller.scrollTop,
      }
      loadEarlierResults()
    }
  }

  return (
    <ProfileShell onBack={onBack} reduce={reduce} accentColor={accent}>
      <ProfileHeader
        reduce={reduce}
        accentColor={accent}
        star={
          <FavoriteStar
            active={leagueFavorited}
            label={league.name}
            onToggle={() => favorites.toggleLeague(league.id)}
          />
        }
        trailing={
          <EntityLogo name={league.name} src={logoUrl} size="lg" ringColor={accent} />
        }
        eyebrow={league.country}
        title={league.name}
        meta={
          <>
            {league.short}
            {isDomesticCup ? ` · ${formatLabel}` : ''}
            {!overviewFacts.loading && overviewFacts.data?.seasonMatchCount != null
              ? ` · ${overviewFacts.data.seasonMatchCount} matches`
              : ''}
          </>
        }
      />

      <nav
        className="sticky top-[3.35rem] z-20 -mx-5 mt-5 border-b border-white/10 bg-pitch-deep/92 px-5 backdrop-blur-md md:-mx-6 md:px-6"
        aria-label="League sections"
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
            <ProfileMetricsRow>
              <ProfileMetric
                label="Founded"
                value={
                  overviewFacts.loading
                    ? '…'
                    : overviewFacts.data?.foundedYear ?? MISSING_SHORT
                }
              />
              {league.hasStandings ? (
                <ProfileMetric
                  label={isInternational ? 'Teams' : 'Clubs'}
                  value={standings.loading ? '…' : clubCount || MISSING_SHORT}
                />
              ) : (
                <ProfileMetric label="Format" value={formatLabel} />
              )}
              <ProfileMetric
                label="Matches"
                value={
                  overviewFacts.loading
                    ? '…'
                    : overviewFacts.data?.seasonMatchCount ?? MISSING_SHORT
                }
              />
              <ProfileMetric
                label="Champion"
                value={
                  overviewFacts.loading ? (
                    '…'
                  ) : overviewFacts.data?.champion ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTeam({
                          id: overviewFacts.data!.champion!.teamId,
                          name: overviewFacts.data!.champion!.name,
                          shortName: overviewFacts.data!.champion!.shortName,
                          leagueId: league.id,
                          kind: isInternational ? 'national' : 'club',
                        })
                      }
                      className="profile-link text-lg font-semibold text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {overviewFacts.data.champion.shortName}
                    </button>
                  ) : (
                    MISSING_SHORT
                  )
                }
              />
              <ProfileMetric
                label="Leader"
                value={
                  !league.hasStandings ? (
                    MISSING_SHORT
                  ) : standings.loading ? (
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
              <ProfileMetric
                label="Top scorer"
                value={
                  playerStats.loading && !topScorer ? (
                    '…'
                  ) : topScorer ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPlayer({
                          id: topScorer.id,
                          leagueId: league.id,
                          name: topScorer.name,
                          shortName: topScorer.shortName,
                          jersey: topScorer.jersey,
                          teamId: topScorer.teamId,
                          teamName: topScorer.teamName,
                        })
                      }
                      className="profile-link block truncate text-lg font-semibold leading-8 text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {topScorer.shortName || topScorer.name}
                    </button>
                  ) : (
                    MISSING_SHORT
                  )
                }
              />
            </ProfileMetricsRow>

            {showTimeline ? (
              <div className="mt-2">
                <LeagueSeasonTimeline leagueId={league.id} />
              </div>
            ) : null}

            {nextMatch ? (
              <OverviewCard
                title="Next match"
                subtitle={formatMatchDayHeading(nextMatch.dateKey)}
                open={openOverview.nextMatch}
                onToggle={() => toggleOverview('nextMatch')}
              >
                <button
                  type="button"
                  onClick={() => setTab('matches')}
                  className="flex w-full items-center gap-3 text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                >
                  <EntityLogo
                    name={nextMatch.home.name}
                    src={teamLogoUrl(nextMatch.home.id)}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-cream">
                      {nextMatch.home.shortName} vs {nextMatch.away.shortName}
                    </p>
                    <p className="mt-0.5 text-xs text-mist/65">
                      {formatKickoffTime(nextMatch.kickoff)}
                      {nextMatch.venue ? ` · ${nextMatch.venue}` : ''}
                    </p>
                  </div>
                  <EntityLogo
                    name={nextMatch.away.name}
                    src={teamLogoUrl(nextMatch.away.id)}
                    size="md"
                  />
                </button>
                <div className="mt-3 flex justify-center gap-6">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenTeam({
                        id: nextMatch.home.id,
                        name: nextMatch.home.name,
                        shortName: nextMatch.home.shortName,
                        leagueId: league.id,
                        kind: isInternational ? 'national' : 'club',
                      })
                    }
                    className="profile-link text-xs font-semibold text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                  >
                    {nextMatch.home.shortName}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenTeam({
                        id: nextMatch.away.id,
                        name: nextMatch.away.name,
                        shortName: nextMatch.away.shortName,
                        leagueId: league.id,
                        kind: isInternational ? 'national' : 'club',
                      })
                    }
                    className="profile-link text-xs font-semibold text-mist/70 transition hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                  >
                    {nextMatch.away.shortName}
                  </button>
                </div>
              </OverviewCard>
            ) : null}

            {league.hasStandings ? (
              <OverviewCard
                title="Form"
                subtitle="Last 5 results per club"
                open={openOverview.form}
                onToggle={() => toggleOverview('form')}
              >
                {standings.loading && formRows.length === 0 ? (
                  <p className="text-sm text-mist/70">Loading form…</p>
                ) : formRows.length === 0 ? (
                  <p className="text-sm text-mist/70">No form data yet.</p>
                ) : (
                  <LeagueFormTable
                    rows={formRows}
                    leagueId={league.id}
                    onOpenTeam={onOpenTeam}
                  />
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
            aria-label="League match timeline"
          >
            {loading && timelineMatches.length === 0 ? (
              <p className="text-sm text-mist/70">Loading matches…</p>
            ) : error && timelineMatches.length === 0 ? (
              <p className="text-sm text-mist/80">{error}</p>
            ) : (
              <MatchList
                matches={timelineMatches}
                allMatches={timelineMatches}
                nextMatchId={nextMatch?.id}
                onOpenTeam={onOpenTeam}
                onOpenPlayer={onOpenPlayer}
                favoriteLeagueIds={favorites.leagueIds}
                favoriteTeamIds={favorites.teamIds}
                emptyLabel="No matches yet."
              />
            )}
          </div>
        ) : null}

        {tab === 'table' && league.hasStandings ? (
          <StandingsTable
            rows={standings.rows}
            loading={standings.loading}
            error={standings.error}
            leagueId={league.id}
            isTeamFavorite={favorites.isTeamFavorite}
            onToggleTeam={favorites.toggleTeam}
            onOpenTeam={onOpenTeam}
            onRetry={() => void standings.reload()}
            seasons={standings.seasons}
            seasonsLoading={standings.seasonsLoading}
            selectedSeason={standings.selectedSeason}
            onSelectSeason={standings.selectSeason}
          />
        ) : null}

        {tab === 'stats' ? (
          <div className="flex flex-col gap-3">
            <OverviewCard
              title="Player stats"
              subtitle="Scorers, assists, shots, cards, and more"
              open={openStats['player-stats']}
              onToggle={() => toggleStats('player-stats')}
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
              />
            </OverviewCard>
          </div>
        ) : null}
      </div>
    </ProfileShell>
  )
}
