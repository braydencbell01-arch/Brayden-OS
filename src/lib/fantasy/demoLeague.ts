import { pushActivity } from './activity'
import { suggestStarters } from './lineup'
import { buildRegularSeasonMatchups } from './schedule'
import type { FantasyLeague, FantasyMember, FantasyPlayer } from './types'
import {
  DEFAULT_AUCTION_BUDGET,
  DEFAULT_DRAFT_CLOCK_SECONDS,
  DEFAULT_ROSTER_SPOTS,
  DEFAULT_STARTER_SPOTS,
  DEFAULT_TRADE_VETO_HOURS,
  PLAYOFF_START_GW,
  SEASON_GWS,
} from './types'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function takeRoster(players: FantasyPlayer[], offset: number): number[] {
  const ids: number[] = []
  for (let i = offset; ids.length < DEFAULT_ROSTER_SPOTS && i < players.length; i += 4) {
    ids.push(players[i]!.id)
  }
  if (ids.length < DEFAULT_ROSTER_SPOTS) {
    for (const p of players) {
      if (ids.length >= DEFAULT_ROSTER_SPOTS) break
      if (!ids.includes(p.id)) ids.push(p.id)
    }
  }
  return ids
}

export function buildDemoLeague(
  catalog: Map<number, FantasyPlayer> | FantasyPlayer[],
  currentGw = 1,
): FantasyLeague {
  const players = (Array.isArray(catalog) ? catalog : [...catalog.values()]).filter((p) => p.status !== 'u')
  if (players.length < DEFAULT_ROSTER_SPOTS * 4) {
    throw new Error('Demo league needs a loaded player catalog')
  }
  const playerMap = new Map(players.map((p) => [p.id, p]))
  const now = Date.now()
  const names = ['North End Owls', 'Southside Rovers', 'East Bay FC', 'West Park XI']
  const members: FantasyMember[] = names.map((name, i) => {
    const roster = takeRoster(players, i)
    return {
      id: `demo_${i + 1}`,
      name,
      joinedAt: now - (4 - i) * 60 * 60 * 1000,
      isCommissioner: i === 0,
      draftSlot: i + 1,
      roster,
      starters: suggestStarters(roster, DEFAULT_STARTER_SPOTS, playerMap),
      draftQueue: [],
      ir: [],
      auctionBudget: DEFAULT_AUCTION_BUDGET,
      autodraft: i !== 0,
      wins: i === 0 ? 3 : i === 1 ? 2 : 1,
      losses: i === 0 ? 0 : i === 1 ? 1 : 2,
      ties: i === 3 ? 1 : 0,
      pointsFor: 64 - i * 8,
      pointsAgainst: 48 + i * 5,
    }
  })

  const matchups = buildRegularSeasonMatchups(members, PLAYOFF_START_GW)
  const league: FantasyLeague = {
    id: uid('demo'),
    inviteCode: 'DEMO24',
    name: 'BrayStats Demo League',
    competition: 'premier-league',
    createdAt: now,
    updatedAt: now,
    commissionerId: members[0]!.id,
    teamCount: 4,
    rosterSpots: DEFAULT_ROSTER_SPOTS,
    starterSpots: DEFAULT_STARTER_SPOTS,
    draftMode: 'snake',
    scoringPreset: 'classic',
    activity: [],
    tradeVetoHours: DEFAULT_TRADE_VETO_HOURS,
    autoScore: true,
    lineupLockedGws: currentGw > 1 ? [currentGw - 1] : [],
    auctionBudget: DEFAULT_AUCTION_BUDGET,
    draftClockSeconds: DEFAULT_DRAFT_CLOCK_SECONDS,
    phase: 'regular',
    members,
    draftOrder: members.map((m) => m.id),
    draftPicks: [],
    draftPickIndex: DEFAULT_ROSTER_SPOTS * members.length,
    trades: [],
    waiverOrder: members.map((m) => m.id).reverse(),
    waiverClaims: [],
    waiverPool: [],
    matchups: matchups.map((mu, i) =>
      i === 0
        ? {
            ...mu,
            scored: true,
            home: { ...mu.home, points: 42, starterIds: members[0]!.starters },
            away: { ...mu.away, points: 39, starterIds: members[1]!.starters },
          }
        : mu,
    ),
    playoffs: [],
    playerGwPoints: {},
    currentGw,
    playoffStartGw: PLAYOFF_START_GW,
    seasonGws: SEASON_GWS,
  }

  return pushActivity(
    pushActivity(league, 'matchup_result', 'Demo matchup: North End Owls edged Southside Rovers'),
    'demo_loaded',
    'Demo league loaded',
  )
}
