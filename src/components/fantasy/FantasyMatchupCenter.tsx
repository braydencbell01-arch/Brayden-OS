import { useEffect, useMemo, useState } from 'react'
import { seriesAggregate } from '../../lib/fantasy/schedule'
import { estimateGwPoints } from '../../lib/fantasy/scoring'
import type { FantasyLeague, FantasyMember, FantasyPlayer, WeeklyMatchup } from '../../lib/fantasy/types'
import type { FantasyApi } from '../../lib/fantasy/useFantasy'
import { FantasyButton } from './FantasyChrome'
import { FantasyActivityFeed } from './FantasyActivityFeed'

function memberName(league: FantasyLeague, memberId: string): string {
  return league.members.find((m) => m.id === memberId)?.name ?? memberId
}

function starterIds(sideIds: number[], member: FantasyMember | undefined): number[] {
  return sideIds.length > 0 ? sideIds : (member?.starters ?? [])
}

function projection(
  ids: number[],
  playerMap: Map<number, FantasyPlayer>,
  scoringPreset: FantasyLeague['scoringPreset'],
): number {
  return ids.reduce((sum, id) => {
    const player = playerMap.get(id)
    if (!player) return sum
    return sum + estimateGwPoints(player, false, scoringPreset)
  }, 0)
}

function storedPoints(
  league: FantasyLeague,
  ids: number[],
  gw: number,
  fallback: number,
  scored: boolean | undefined,
): { value: number; hasLive: boolean } {
  if (scored) return { value: fallback, hasLive: true }
  let hasLive = false
  const value = ids.reduce((sum, id) => {
    const stored = league.playerGwPoints[String(id)]?.[String(gw)]
    if (typeof stored === 'number') {
      hasLive = true
      return sum + stored
    }
    return sum
  }, 0)
  return { value, hasLive }
}

function MatchupTeamCard({
  label,
  member,
  ids,
  points,
  projected,
  pointsLabel,
  highlighted,
}: {
  label: string
  member: FantasyMember | undefined
  ids: number[]
  points: number
  projected: number
  pointsLabel: string
  highlighted?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlighted ? 'border-lime/40 bg-lime/10' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist/50">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-cream">{member?.name ?? 'TBD'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-black/20 px-2 py-2">
          <p className="font-display text-3xl text-lime">{points.toFixed(1)}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-mist/45">{pointsLabel}</p>
        </div>
        <div className="rounded-xl bg-black/20 px-2 py-2">
          <p className="font-display text-3xl text-cream">{projected.toFixed(1)}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-mist/45">Projected</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-mist/55">{ids.length} starters counted</p>
    </div>
  )
}

function MatchupSummary({
  league,
  fantasy,
  matchup,
  viewGw,
  primary = false,
}: {
  league: FantasyLeague
  fantasy: FantasyApi
  matchup: WeeklyMatchup
  viewGw: number
  primary?: boolean
}) {
  const home = league.members.find((m) => m.id === matchup.home.memberId)
  const away = league.members.find((m) => m.id === matchup.away.memberId)
  const homeIds = starterIds(matchup.home.starterIds, home)
  const awayIds = starterIds(matchup.away.starterIds, away)
  const homeProjected = projection(homeIds, fantasy.playerMap, league.scoringPreset)
  const awayProjected = projection(awayIds, fantasy.playerMap, league.scoringPreset)
  const homeLive = storedPoints(league, homeIds, viewGw, matchup.home.points, matchup.scored)
  const awayLive = storedPoints(league, awayIds, viewGw, matchup.away.points, matchup.scored)
  const pointsLabel = matchup.scored
    ? 'Scored'
    : homeLive.hasLive || awayLive.hasLive
      ? 'Live'
      : 'Est.'

  if (!primary) {
    return (
      <li className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-cream">{memberName(league, matchup.home.memberId)}</span>
          <span className="font-display text-xl text-lime">
            {(matchup.scored
              ? matchup.home.points
              : homeLive.hasLive
                ? homeLive.value
                : homeProjected
            ).toFixed(1)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-semibold text-cream">{memberName(league, matchup.away.memberId)}</span>
          <span className="font-display text-xl text-cream">
            {(matchup.scored
              ? matchup.away.points
              : awayLive.hasLive
                ? awayLive.value
                : awayProjected
            ).toFixed(1)}
          </span>
        </div>
      </li>
    )
  }

  const series = matchup.seriesId ? league.playoffs.find((p) => p.id === matchup.seriesId) : null
  const aggregate = matchup.seriesId ? seriesAggregate(league, matchup.seriesId) : null
  const myIsHome = home?.id === fantasy.me?.id
  const myPoints = myIsHome
    ? matchup.scored || homeLive.hasLive
      ? homeLive.value
      : homeProjected
    : matchup.scored || awayLive.hasLive
      ? awayLive.value
      : awayProjected
  const oppPoints = myIsHome
    ? matchup.scored || awayLive.hasLive
      ? awayLive.value
      : awayProjected
    : matchup.scored || homeLive.hasLive
      ? homeLive.value
      : homeProjected

  return (
    <section className="rounded-3xl border border-lime/25 bg-black/25 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Your matchup</p>
          <p className="mt-1 text-sm text-mist/65">
            {matchup.kind}
            {matchup.scored ? ' - final' : ' - in progress'}
          </p>
        </div>
        <p className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-mist">
          GW {viewGw} {league.lineupLockedGws.includes(viewGw) ? 'locked' : 'unlocked'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MatchupTeamCard
          label="You"
          member={myIsHome ? home : away}
          ids={myIsHome ? homeIds : awayIds}
          points={myPoints}
          projected={myIsHome ? homeProjected : awayProjected}
          pointsLabel={pointsLabel}
          highlighted
        />
        <MatchupTeamCard
          label="Opponent"
          member={myIsHome ? away : home}
          ids={myIsHome ? awayIds : homeIds}
          points={oppPoints}
          projected={myIsHome ? awayProjected : homeProjected}
          pointsLabel={pointsLabel}
        />
      </div>
      {series && aggregate ? (
        <div className="mt-3 rounded-xl bg-lime/10 px-3 py-2 text-xs text-cream">
          Playoff aggregate: {memberName(league, series.memberAId)} {aggregate.a.toFixed(1)} -{' '}
          {aggregate.b.toFixed(1)} {memberName(league, series.memberBId)}
        </div>
      ) : null}
    </section>
  )
}

export function FantasyMatchupCenter({
  fantasy,
  onOpenBracket,
}: {
  fantasy: FantasyApi
  onOpenBracket?: () => void
}) {
  const league = fantasy.activeLeague!
  const [viewGw, setViewGw] = useState(league.currentGw)

  useEffect(() => {
    setViewGw(league.currentGw)
  }, [league.id, league.currentGw])

  const weekMatchups = useMemo(
    () => league.matchups.filter((matchup) => matchup.gw === viewGw),
    [league.matchups, viewGw],
  )
  const myMatchup = weekMatchups.find(
    (matchup) =>
      matchup.home.memberId === fantasy.identity.memberId ||
      matchup.away.memberId === fantasy.identity.memberId,
  )
  const otherMatchups = myMatchup
    ? weekMatchups.filter((matchup) => matchup.id !== myMatchup.id)
    : weekMatchups

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FantasyButton variant="ghost" disabled={viewGw <= 1} onClick={() => setViewGw((gw) => gw - 1)}>
          &lt;-
        </FantasyButton>
        <span className="text-sm font-semibold text-cream">Gameweek {viewGw}</span>
        <FantasyButton
          variant="ghost"
          disabled={viewGw >= league.seasonGws}
          onClick={() => setViewGw((gw) => gw + 1)}
        >
          -&gt;
        </FantasyButton>
        {league.playoffs.length > 0 ? (
          <FantasyButton variant="ghost" className="ml-auto" onClick={onOpenBracket}>
            Bracket
          </FantasyButton>
        ) : null}
        {fantasy.me?.isCommissioner ? (
          <>
            <FantasyButton
              variant="ghost"
              onClick={() => {
                try {
                  fantasy.runAutos()
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Auto run failed')
                }
              }}
            >
              Run autos
            </FantasyButton>
            <FantasyButton
              onClick={() => {
                try {
                  fantasy.runScoreGw(viewGw)
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Score failed')
                }
              }}
            >
              Score GW
            </FantasyButton>
          </>
        ) : null}
      </div>

      {myMatchup ? (
        <MatchupSummary league={league} fantasy={fantasy} matchup={myMatchup} viewGw={viewGw} primary />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-mist/70">
          No matchup for you in GW {viewGw}. Finish the draft to generate the schedule.
        </p>
      )}

      {otherMatchups.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist/60">
            Other matchups
          </h3>
          <ul className="space-y-2">
            {otherMatchups.map((matchup) => (
              <MatchupSummary
                key={matchup.id}
                league={league}
                fantasy={fantasy}
                matchup={matchup}
                viewGw={viewGw}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <FantasyActivityFeed league={league} compact />
    </div>
  )
}
