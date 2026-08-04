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
  startOfDay,
} from '../lib/dates'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import { leagueFormatLabel, leagueHasKnockout, leagueShowsCurrentLeader, soccerSeasonDateBounds, type League } from '../lib/leagues'
import {
  leagueFormTable,
  matchesForLeague,
  nextMatchForLeague,
  type Match,
} from '../lib/matches'
import { leagueAccentColor } from '../lib/stats/branding'
import { currentSeasonStartYear, isBetweenCompetitionEditions } from '../lib/stats/seasonDefaults'
import { useLeagueKnockoutBracket } from '../lib/stats/useLeagueKnockoutBracket'
import { useLeagueLogo } from '../lib/stats/useLeagueLogo'
import { useLeagueOverviewFacts } from '../lib/stats/useLeagueOverviewFacts'
import { useLeaguePlayerStats } from '../lib/stats/useLeaguePlayerStats'
import { useLeagueStandings } from '../lib/stats/useLeagueStandings'
import { useTodayKey } from '../lib/useToday'
import { EntityLogo } from './EntityLogo'
import { FavoriteStar } from './FavoriteStar'
import { LeagueFormTable } from './LeagueFormTable'
import { LeagueKnockoutBracket } from './LeagueKnockoutBracket'
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

type LeagueTab = 'overview' | 'matches' | 'table' | 'knockout' | 'stats'
type OverviewSection = 'form'

const TABS: Array<{
  id: LeagueTab
  label: string
  needsStandings?: boolean
  needsKnockout?: boolean
}> = [
  { id: 'overview', label: 'Overview' },
  { id: 'matches', label: 'Fixtures' },
  { id: 'table', label: 'Table', needsStandings: true },
  { id: 'knockout', label: 'Knockout', needsKnockout: true },
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
  })

  const leagueFavorited = favorites.isLeagueFavorite(league.id)
  const isInternational = league.kind === 'international'
  const isContinental = league.kind === 'continental'
  const isDomesticCup = league.kind === 'domestic' && league.format !== 'league'
  const showTimeline = isInternational || isContinental || isDomesticCup
  const formatLabel = leagueFormatLabel(league.format)
  const showCurrentLeader = leagueShowsCurrentLeader(league)

  const standings = useLeagueStandings(league.id, league.hasStandings)
  const showKnockout = leagueHasKnockout(league)
  const knockoutEnabled = tab === 'knockout' && showKnockout
  const knockout = useLeagueKnockoutBracket(league.id, knockoutEnabled)
  // Warm player boards for the top-scorer metric on Overview.
  const playerStats = useLeaguePlayerStats(league.id, true)

  const overviewFacts = useLeagueOverviewFacts(league.id)

  const betweenEditions = isBetweenCompetitionEditions(
    league.id,
    standings.selectedSeason ?? overviewFacts.data?.seasonYear ?? null,
  )

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

  const currentLeader = standings.rows[0] ?? null
  const teamCount = standings.rows.length
  const standingsGroupCount = new Set(standings.rows.map((row) => row.group || '')).size
  // Multi-group tables have no single table leader.
  const leaderForDisplay =
    showCurrentLeader && standingsGroupCount <= 1 ? currentLeader : null
  const mostTitles = overviewFacts.data?.mostTitles ?? null

  const { logoUrl } = useLeagueLogo(league.id)
  const accent = leagueAccentColor(league.id)

  const visibleTabs = useMemo(
    () =>
      TABS.filter((entry) => {
        if (entry.needsStandings) return league.hasStandings
        if (entry.needsKnockout) return showKnockout
        return true
      }),
    [league.hasStandings, showKnockout],
  )

  useEffect(() => {
    if (!visibleTabs.some((entry) => entry.id === tab)) {
      setTab('overview')
    }
  }, [tab, visibleTabs])

  useEffect(() => {
    setTab('overview')
    setOpenOverview({ form: true })
  }, [league.id])

  const toggleOverview = (section: OverviewSection) => {
    setOpenOverview((current) => ({ ...current, [section]: !current[section] }))
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

  /** Prefetch the full current season window so Fixtures is not stuck on the Match Day ±window. */
  useEffect(() => {
    if (!onNeedPastRange) return
    const year = currentSeasonStartYear(league.id)
    const { from, to } = soccerSeasonDateBounds(year)
    const today = startOfDay(new Date())
    const pastDays = Math.max(
      CALENDAR_INITIAL_PAST_DAYS,
      Math.ceil((today.getTime() - from.getTime()) / 86_400_000),
    )
    setPastHorizonDays(pastDays)
    void onNeedPastRange(from, to > today ? to : today)
  }, [league.id, onNeedPastRange])

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
              <ProfileMetric
                label="Teams"
                value={
                  league.hasStandings
                    ? standings.loading
                      ? '…'
                      : teamCount || MISSING_SHORT
                    : MISSING_SHORT
                }
              />
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
                label="Most titles"
                value={
                  overviewFacts.loading ? (
                    '…'
                  ) : mostTitles ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTeam({
                          id: mostTitles.teamId,
                          name: mostTitles.name,
                          shortName: mostTitles.shortName,
                          leagueId: league.id,
                          kind: isInternational ? 'national' : 'club',
                        })
                      }
                      className="profile-link text-lg font-semibold text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    >
                      {mostTitles.shortName}
                    </button>
                  ) : (
                    MISSING_SHORT
                  )
                }
              />
              {showCurrentLeader ? (
                <ProfileMetric
                  label="Current leader"
                  value={
                    betweenEditions || !league.hasStandings ? (
                      MISSING_SHORT
                    ) : standings.loading ? (
                      '…'
                    ) : leaderForDisplay ? (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenTeam({
                            id: leaderForDisplay.teamId,
                            name: leaderForDisplay.team,
                            shortName: leaderForDisplay.shortName,
                            leagueId: league.id,
                            kind: isInternational ? 'national' : 'club',
                          })
                        }
                        className="profile-link text-lg font-semibold text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                      >
                        {leaderForDisplay.shortName}
                      </button>
                    ) : (
                      MISSING_SHORT
                    )
                  }
                />
              ) : null}
              <ProfileMetric label="Format" value={formatLabel || MISSING_SHORT} />
            </ProfileMetricsRow>

            {showTimeline ? (
              <div className="mt-2">
                <LeagueSeasonTimeline leagueId={league.id} />
              </div>
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
          <div className="flex flex-col gap-2">
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
                  showDate
                  nextMatchId={nextMatch?.id}
                  onOpenTeam={onOpenTeam}
                  onOpenPlayer={onOpenPlayer}
                  favoriteLeagueIds={favorites.leagueIds}
                  favoriteTeamIds={favorites.teamIds}
                  emptyLabel="No matches yet."
                />
              )}
            </div>
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

        {tab === 'knockout' && showKnockout ? (
          <LeagueKnockoutBracket
            data={knockout.data}
            loading={knockout.loading}
            error={knockout.error}
            leagueId={league.id}
            seasons={knockout.seasons}
            seasonsLoading={knockout.seasonsLoading}
            selectedSeason={knockout.selectedSeason}
            onSelectSeason={knockout.selectSeason}
            onOpenTeam={onOpenTeam}
            teamKind={isInternational ? 'national' : 'club'}
          />
        ) : null}

        {tab === 'stats' ? (
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
        ) : null}
      </div>
    </ProfileShell>
  )
}
