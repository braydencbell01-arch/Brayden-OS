import { applyDraftPick, setDraftOrder, startDraft } from './draft'
import { buildRegularSeasonMatchups, resolveSeriesWinners, seedPlayoffs } from './schedule'
import { estimateGwPoints } from './scoring'
import type { FantasyPlayer } from './types'
import {
  ALLOWED_TEAM_COUNTS,
  DEFAULT_ROSTER_SPOTS,
  DEFAULT_STARTER_SPOTS,
  PLAYOFF_START_GW,
  POSITION_LIMITS,
  SEASON_GWS,
  type FantasyLeague,
  type FantasyMember,
  type FantasyPosition,
  type TradeOffer,
} from './types'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export function createLeague(input: {
  name: string
  commissionerId: string
  commissionerName: string
  teamCount: number
  rosterSpots?: number
  currentGw?: number
}): FantasyLeague {
  if (!ALLOWED_TEAM_COUNTS.includes(input.teamCount as (typeof ALLOWED_TEAM_COUNTS)[number])) {
    throw new Error('Team count must be 4, 6, 8, 10, or 12')
  }
  const now = Date.now()
  const commissioner: FantasyMember = {
    id: input.commissionerId,
    name: input.commissionerName.trim() || 'Commissioner',
    joinedAt: now,
    isCommissioner: true,
    draftSlot: null,
    roster: [],
    starters: [],
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }

  return {
    id: uid('lg'),
    inviteCode: inviteCode(),
    name: input.name.trim() || 'FPL League',
    competition: 'premier-league',
    createdAt: now,
    updatedAt: now,
    commissionerId: input.commissionerId,
    teamCount: input.teamCount,
    rosterSpots: input.rosterSpots ?? DEFAULT_ROSTER_SPOTS,
    starterSpots: DEFAULT_STARTER_SPOTS,
    phase: 'lobby',
    members: [commissioner],
    draftOrder: [],
    draftPicks: [],
    draftPickIndex: 0,
    trades: [],
    matchups: [],
    playoffs: [],
    playerGwPoints: {},
    currentGw: input.currentGw ?? 1,
    playoffStartGw: PLAYOFF_START_GW,
    seasonGws: SEASON_GWS,
  }
}

export function joinLeague(
  league: FantasyLeague,
  memberId: string,
  name: string,
): FantasyLeague {
  if (league.members.some((m) => m.id === memberId)) return league
  if (league.members.length >= league.teamCount) {
    throw new Error('League is full')
  }
  if (league.phase !== 'lobby' && league.phase !== 'draft_setup') {
    throw new Error('Draft already started — joining is closed')
  }
  const member: FantasyMember = {
    id: memberId,
    name: name.trim() || 'Manager',
    joinedAt: Date.now(),
    isCommissioner: false,
    draftSlot: null,
    roster: [],
    starters: [],
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }
  return {
    ...league,
    members: [...league.members, member],
    updatedAt: Date.now(),
  }
}

export function randomizeDraftOrder(league: FantasyLeague): FantasyLeague {
  const ids = league.members.map((m) => m.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
  }
  return setDraftOrder(league, ids)
}

export function beginDraft(league: FantasyLeague): FantasyLeague {
  return startDraft(league)
}

export function draftPlayer(league: FantasyLeague, memberId: string, playerId: number): FantasyLeague {
  const next = applyDraftPick(league, memberId, playerId)
  if (next.phase === 'regular' && next.matchups.length === 0) {
    return {
      ...next,
      matchups: buildRegularSeasonMatchups(next.members, next.playoffStartGw),
    }
  }
  return next
}

function countPos(roster: number[], players: Map<number, FantasyPlayer>, pos: FantasyPosition) {
  return roster.reduce((n, id) => {
    const p = players.get(id)
    return p?.pos === pos ? n + 1 : n
  }, 0)
}

export function addFreeAgent(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  dropPlayerId: number | null,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  if (league.phase === 'lobby' || league.phase === 'draft_setup' || league.phase === 'drafting') {
    throw new Error('Free agency opens after the draft')
  }
  const owned = new Set(league.members.flatMap((m) => m.roster))
  if (owned.has(playerId)) throw new Error('Player is on a roster')

  const player = catalog.get(playerId)
  if (!player) throw new Error('Unknown player')

  const members = league.members.map((m) => {
    if (m.id !== memberId) return m
    let roster = [...m.roster]
    if (roster.length >= league.rosterSpots) {
      if (!dropPlayerId) throw new Error('Roster full — drop a player to add a free agent')
      if (!roster.includes(dropPlayerId)) throw new Error('Drop player is not on your roster')
      roster = roster.filter((id) => id !== dropPlayerId)
    } else if (dropPlayerId) {
      if (!roster.includes(dropPlayerId)) throw new Error('Drop player is not on your roster')
      roster = roster.filter((id) => id !== dropPlayerId)
    }

    const nextPosCount = countPos(roster, catalog, player.pos) + 1
    if (nextPosCount > POSITION_LIMITS[player.pos]) {
      throw new Error(`Max ${POSITION_LIMITS[player.pos]} ${player.pos} on roster`)
    }

    roster = [...roster, playerId]
    const starters = m.starters.filter((id) => roster.includes(id))
    return { ...m, roster, starters }
  })

  return { ...league, members, updatedAt: Date.now() }
}

export function setStarters(
  league: FantasyLeague,
  memberId: string,
  starterIds: number[],
): FantasyLeague {
  if (starterIds.length > league.starterSpots) {
    throw new Error(`Start exactly ${league.starterSpots} or fewer`)
  }
  const members = league.members.map((m) => {
    if (m.id !== memberId) return m
    if (starterIds.some((id) => !m.roster.includes(id))) {
      throw new Error('Starters must be on your roster')
    }
    return { ...m, starters: starterIds.slice(0, league.starterSpots) }
  })
  return { ...league, members, updatedAt: Date.now() }
}

export function proposeTrade(
  league: FantasyLeague,
  fromMemberId: string,
  toMemberId: string,
  offerPlayerIds: number[],
  requestPlayerIds: number[],
): FantasyLeague {
  if (fromMemberId === toMemberId) throw new Error('Cannot trade with yourself')
  const from = league.members.find((m) => m.id === fromMemberId)
  const to = league.members.find((m) => m.id === toMemberId)
  if (!from || !to) throw new Error('Manager not found')
  if (offerPlayerIds.some((id) => !from.roster.includes(id))) {
    throw new Error('You can only offer your own players')
  }
  if (requestPlayerIds.some((id) => !to.roster.includes(id))) {
    throw new Error('Requested players must be on their roster')
  }
  if (offerPlayerIds.length === 0 && requestPlayerIds.length === 0) {
    throw new Error('Trade needs at least one player')
  }

  const trade: TradeOffer = {
    id: uid('tr'),
    fromMemberId,
    toMemberId,
    offerPlayerIds,
    requestPlayerIds,
    status: 'pending',
    createdAt: Date.now(),
  }
  return { ...league, trades: [trade, ...league.trades], updatedAt: Date.now() }
}

export function resolveTrade(
  league: FantasyLeague,
  tradeId: string,
  actorId: string,
  decision: 'accepted' | 'rejected' | 'canceled',
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const trade = league.trades.find((t) => t.id === tradeId)
  if (!trade || trade.status !== 'pending') throw new Error('Trade not found')

  if (decision === 'canceled' && actorId !== trade.fromMemberId) {
    throw new Error('Only the proposer can cancel')
  }
  if ((decision === 'accepted' || decision === 'rejected') && actorId !== trade.toMemberId) {
    throw new Error('Only the recipient can accept or reject')
  }

  if (decision !== 'accepted') {
    return {
      ...league,
      trades: league.trades.map((t) =>
        t.id === tradeId ? { ...t, status: decision, resolvedAt: Date.now() } : t,
      ),
      updatedAt: Date.now(),
    }
  }

  const members = league.members.map((m) => ({ ...m, roster: [...m.roster], starters: [...m.starters] }))
  const from = members.find((m) => m.id === trade.fromMemberId)!
  const to = members.find((m) => m.id === trade.toMemberId)!

  for (const id of trade.offerPlayerIds) {
    from.roster = from.roster.filter((x) => x !== id)
    from.starters = from.starters.filter((x) => x !== id)
    to.roster.push(id)
  }
  for (const id of trade.requestPlayerIds) {
    to.roster = to.roster.filter((x) => x !== id)
    to.starters = to.starters.filter((x) => x !== id)
    from.roster.push(id)
  }

  if (from.roster.length > league.rosterSpots || to.roster.length > league.rosterSpots) {
    throw new Error('Trade would exceed roster limit')
  }

  for (const member of [from, to]) {
    for (const pos of Object.keys(POSITION_LIMITS) as FantasyPosition[]) {
      const count = member.roster.reduce((n, id) => (catalog.get(id)?.pos === pos ? n + 1 : n), 0)
      if (count > POSITION_LIMITS[pos]) {
        throw new Error(`Trade breaks ${pos} roster limits`)
      }
    }
  }

  return {
    ...league,
    members,
    trades: league.trades.map((t) =>
      t.id === tradeId ? { ...t, status: 'accepted', resolvedAt: Date.now() } : t,
    ),
    updatedAt: Date.now(),
  }
}

function sidePoints(
  starterIds: number[],
  gw: number,
  league: FantasyLeague,
  catalog: Map<number, FantasyPlayer>,
): number {
  return starterIds.reduce((sum, id) => {
    const stored = league.playerGwPoints[String(id)]?.[String(gw)]
    if (typeof stored === 'number') return sum + stored
    const player = catalog.get(id)
    if (!player) return sum
    return sum + estimateGwPoints(player, true)
  }, 0)
}

/** Score a gameweek's matchups and recompute regular-season W-L from all scored weeks. */
export function scoreGameweek(
  league: FantasyLeague,
  gw: number,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const matchups = league.matchups.map((mu) => {
    if (mu.gw !== gw) return mu
    const homeMember = league.members.find((m) => m.id === mu.home.memberId)
    const awayMember = league.members.find((m) => m.id === mu.away.memberId)
    const homeStarters = homeMember?.starters?.length
      ? homeMember.starters
      : (homeMember?.roster.slice(0, league.starterSpots) ?? [])
    const awayStarters = awayMember?.starters?.length
      ? awayMember.starters
      : (awayMember?.roster.slice(0, league.starterSpots) ?? [])

    const homePts = sidePoints(homeStarters, gw, league, catalog)
    const awayPts = sidePoints(awayStarters, gw, league, catalog)

    return {
      ...mu,
      scored: true,
      home: { memberId: mu.home.memberId, points: homePts, starterIds: homeStarters },
      away: { memberId: mu.away.memberId, points: awayPts, starterIds: awayStarters },
    }
  })

  const stats = new Map(
    league.members.map((m) => [
      m.id,
      {
        ...m,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]),
  )

  for (const mu of matchups) {
    if (mu.kind !== 'regular' || !mu.scored) continue
    const home = stats.get(mu.home.memberId)
    const away = stats.get(mu.away.memberId)
    if (!home || !away) continue

    home.pointsFor += mu.home.points
    home.pointsAgainst += mu.away.points
    away.pointsFor += mu.away.points
    away.pointsAgainst += mu.home.points
    if (mu.home.points > mu.away.points) {
      home.wins += 1
      away.losses += 1
    } else if (mu.away.points > mu.home.points) {
      away.wins += 1
      home.losses += 1
    } else {
      home.ties += 1
      away.ties += 1
    }
  }

  let next: FantasyLeague = {
    ...league,
    members: [...stats.values()],
    matchups,
    currentGw: Math.max(league.currentGw, gw),
    updatedAt: Date.now(),
  }

  if (gw === league.playoffStartGw - 1 && next.phase === 'regular' && next.playoffs.length === 0) {
    next = seedPlayoffs(next)
  }

  if (next.phase === 'semifinals' || next.phase === 'finals') {
    next = resolveSeriesWinners(next)
  }

  return next
}

export { setDraftOrder, startDraft }
