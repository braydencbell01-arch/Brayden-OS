import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getLeague, isInternationalLeague, type LeagueId } from '../lib/leagues'
import type { FavoriteTeam, FavoritesApi } from '../lib/favorites'
import {
  groupMatchesByDate,
  mergeTeamMatches,
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
import { useNationalTeamSchedule } from '../lib/stats/useNationalTeamSchedule'
import { useTeamRoster } from '../lib/stats/useTeamRoster'
import { FavoriteStar } from './FavoriteStar'
import { MatchList } from './MatchList'
import type { PlayerNavRef } from './PlayerProfileScreen'
import { ProfileAccordion } from './ProfileAccordion'
import { ProfileHeader, ProfileShell } from './ProfileShell'
import { TeamRosterPanel } from './TeamRosterPanel'

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
  onNeedPastRange?: (from: Date, to: Date) => void
  reduce: boolean | null
}) {
  const league = getLeague(team.leagueId)
  const isNational =
    team.kind === 'national' || isInternationalLeague(team.leagueId)
  const standings = useLeagueStandings(team.leagueId)
  const todayKey = useTodayKey()
  const [openSection, setOpenSection] = useState<
    'upcoming' | 'recent' | 'roster' | null
  >('upcoming')
  const [pastHorizonDays, setPastHorizonDays] = useState(CALENDAR_INITIAL_PAST_DAYS)
  const recentScrollRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  const rosterEnabled = openSection === 'roster'
  const roster = useTeamRoster(team.leagueId, team.id, rosterEnabled)
  const nationalSchedule = useNationalTeamSchedule(team.id, team.leagueId, isNational)

  const standing = useMemo(
    () => standings.rows.find((row) => row.teamId === team.id) ?? null,
    [standings.rows, team.id],
  )

  const teamMatches = useMemo(
    () => (isNational ? mergeTeamMatches(matches, nationalSchedule.data) : matches),
    [isNational, matches, nationalSchedule.data],
  )

  const form = useMemo(
    () => recentFormForTeam(teamMatches, team.id, 5),
    [teamMatches, team.id],
  )

  const { recent, upcoming } = useMemo(
    () => splitTeamFixtures(teamMatches, team.id, todayKey),
    [teamMatches, team.id, todayKey],
  )

  const upcomingGrouped = useMemo(() => groupMatchesByDate(upcoming), [upcoming])
  const recentGrouped = useMemo(
    () => groupMatchesByDate(recent).slice().reverse(),
    [recent],
  )
  const favorited = favorites.isTeamFavorite(team.id)
  const displayName = standing?.team || team.name
  const fixturesLoading = loading || (isNational && nationalSchedule.loading)

  const toggle = (section: 'upcoming' | 'recent' | 'roster') => {
    setOpenSection((current) => (current === section ? null : section))
  }

  const loadEarlierResults = useCallback(() => {
    if (!onNeedPastRange || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setPastHorizonDays((current) => {
      const next = current + CALENDAR_PAST_CHUNK_DAYS
      const today = startOfDay(new Date())
      onNeedPastRange(addDays(today, -next), today)
      return next
    })
  }, [onNeedPastRange])

  useEffect(() => {
    if (!refreshing) loadingMoreRef.current = false
  }, [refreshing])

  const onRecentScroll = () => {
    const scroller = recentScrollRef.current
    if (!scroller || openSection !== 'recent') return
    const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (remaining < 120) loadEarlierResults()
  }

  const tableCells = standing
    ? ([
        ['Pos', String(standing.rank)],
        ['P', String(standing.played)],
        ['W', String(standing.won)],
        ['D', String(standing.drawn)],
        ['L', String(standing.lost)],
        ['GD', standing.goalDiff > 0 ? `+${standing.goalDiff}` : String(standing.goalDiff)],
        ['Pts', String(standing.points)],
      ] as const)
    : []

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
            {standing
              ? ` · #${standing.rank}${standing.group ? ` · ${standing.group}` : ''} · ${standing.points} pts`
              : isNational
                ? ' · International'
                : ''}
          </>
        }
      />

      <section className="mt-6" aria-label="Season table line">
        {league.hasStandings && standings.loading && !standing ? (
          <p className="text-sm text-mist/70">Loading table…</p>
        ) : league.hasStandings && standings.error && !standing ? (
          <p className="text-sm text-mist/80">{standings.error}</p>
        ) : standing ? (
          <dl className="grid grid-cols-4 gap-3 border border-white/10 px-3 py-3.5 text-center sm:grid-cols-7">
            {tableCells.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-mist/55">
                  {label}
                </dt>
                <dd className="mt-1 font-display text-2xl tracking-wide text-cream tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-mist/70">
            {isNational
              ? league.hasStandings
                ? 'No group-table row for this side in the current competition window.'
                : 'Friendlies and some tournaments do not publish a live table.'
              : 'No table row yet for this club.'}
          </p>
        )}

        {standing?.note ? <p className="mt-2 text-xs text-mist/60">{standing.note}</p> : null}
        {standing?.group ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-mist/60">
            {standing.group}
          </p>
        ) : null}

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
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <ProfileAccordion
          title="Upcoming games"
          open={openSection === 'upcoming'}
          onToggle={() => toggle('upcoming')}
        >
          {fixturesLoading && upcomingGrouped.length === 0 ? (
            <p className="text-sm text-mist/70">Loading fixtures…</p>
          ) : (
            <>
              {(error || nationalSchedule.error) && upcomingGrouped.length === 0 ? (
                <p className="text-sm text-mist/80">{error || nationalSchedule.error}</p>
              ) : null}
              {(error || nationalSchedule.error) && upcomingGrouped.length > 0 ? (
                <p className="mb-3 text-sm text-mist/70">{error || nationalSchedule.error}</p>
              ) : null}
              {(!error && !nationalSchedule.error) || upcomingGrouped.length > 0 ? (
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
                          favoriteLeagueIds={favorites.leagueIds}
                          favoriteTeamIds={favorites.teamIds}
                          favoritePlayerTeamIds={favorites.favoritePlayerTeamIds}
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
          title="Results"
          subtitle="Scroll for earlier games"
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
                      favoriteLeagueIds={favorites.leagueIds}
                      favoriteTeamIds={favorites.teamIds}
                      favoritePlayerTeamIds={favorites.favoritePlayerTeamIds}
                      emptyLabel="No matches"
                    />
                  </section>
                ))}
              </div>

              {!isNational ? (
                <div className="sticky bottom-0 mt-4 bg-gradient-to-t from-pitch via-pitch/95 to-transparent pt-3 pb-1">
                  <button
                    type="button"
                    onClick={loadEarlierResults}
                    disabled={refreshing}
                    className="w-full border border-dashed border-white/15 bg-white/[0.03] px-3 py-2.5 text-center text-[0.65rem] font-bold uppercase tracking-[0.12em] text-mist/80 transition hover:border-lime/40 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-50"
                  >
                    {refreshing
                      ? 'Loading earlier…'
                      : `Load earlier results · ${pastHorizonDays}+ days`}
                  </button>
                </div>
              ) : null}
            </div>
          )}
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
            onOpenPlayer={onOpenPlayer}
          />
        </ProfileAccordion>
      </div>
    </ProfileShell>
  )
}
