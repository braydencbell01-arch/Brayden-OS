import { applyDraftPick, setDraftOrder, startDraft, tickDraftClock } from './draft'
import { ensureLegalStarters, suggestStarters, validateStarters } from './lineup'
import { buildRegularSeasonMatchups, resolveSeriesWinners, seedPlayoffs } from './schedule'
import { estimateGwPoints } from './scoring'
import type { FantasyPlayer } from './types'
import {
  ALLOWED_DRAFT_CLOCKS,
  ALLOWED_TEAM_COUNTS,
  DEFAULT_DRAFT_CLOCK_SECONDS,
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
import { canAddPosition } from './lineup'
import {
  cancelWaiverClaim,
  dropToWaivers,
  processWaiverClaims,
  submitWaiverClaim,
} from './waivers'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

function blankMember(
  id: string,
  name: string,
  isCommissioner: boolean,
  now: number,
): FantasyMember {
  return {
    id,
    name: name.trim() || (isCommissioner ? 'Commissioner' : 'Manager'),
    joinedAt: now,
    isCommissioner,
    draftSlot: null,
    roster: [],
    starters: [],
    autodraft: false,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }
}

/** Migrate older local/cloud leagues to FF-style defaults. */
export function normalizeLeague(raw: FantasyLeague): FantasyLeague {
  const members = (raw.members ?? []).map((m) => ({
    ...m,
    autodraft: Boolean(m.autodraft),
    roster: m.roster ?? [],
    starters: m.starters ?? [],
    wins: m.wins ?? 0,
    losses: m.losses ?? 0,
    ties: m.ties ?? 0,
    pointsFor: m.pointsFor ?? 0,
    pointsAgainst: m.pointsAgainst ?? 0,
  }))

  return {
    ...raw,
    members,
    rosterSpots: raw.rosterSpots || DEFAULT_ROSTER_SPOTS,
    starterSpots: raw.starterSpots || DEFAULT_STARTER_SPOTS,
    draftClockSeconds: raw.draftClockSeconds || DEFAULT_DRAFT_CLOCK_SECONDS,
    waiverOrder: raw.waiverOrder ?? members.map((m) => m.id),
    waiverClaims: raw.waiverClaims ?? [],
    waiverPool: raw.waiverPool ?? [],
    trades: raw.trades ?? [],
    matchups: raw.matchups ?? [],
    playoffs: raw.playoffs ?? [],
    draftPicks: raw.draftPicks ?? [],
    draftOrder: raw.draftOrder ?? [],
    playerGwPoints: raw.playerGwPoints ?? {},
    playoffStartGw: raw.playoffStartGw || PLAYOFF_START_GW,
    seasonGws: raw.seasonGws || SEASON_GWS,
  }
}

export function createLeague(input: {
  name: string
  commissionerId: string
  commissionerName: string
  teamCount: number
  rosterSpots?: number
  draftClockSeconds?: number
  currentGw?: number
}): FantasyLeague {
  if (!ALLOWED_TEAM_COUNTS.includes(input.teamCount as (typeof ALLOWED_TEAM_COUNTS)[number])) {
    throw new Error('Team count must be 4, 6, 8, 10, or 12')
  }
  const clock = input.draftClockSeconds ?? DEFAULT_DRAFT_CLOCK_SECONDS
  if (!ALLOWED_DRAFT_CLOCKS.includes(clock as (typeof ALLOWED_DRAFT_CLOCKS)[number])) {
    throw new Error('Invalid draft clock')
  }
  const now = Date.now()
  const commissioner = blankMember(input.commissionerId, input.commissionerName, true, now)

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
    draftClockSeconds: clock,
    phase: 'lobby',
    members: [commissioner],
    draftOrder: [],
    draftPicks: [],
    draftPickIndex: 0,
    trades: [],
    waiverOrder: [commissioner.id],
    waiverClaims: [],
    waiverPool: [],
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
  const member = blankMember(memberId, name, false, Date.now())
  return {
    ...league,
    members: [...league.members, member],
    waiverOrder: [...league.waiverOrder, member.id],
    updatedAt: Date.now(),
  }
}

export function setMemberAutodraft(
  league: FantasyLeague,
  memberId: string,
  autodraft: boolean,
): FantasyLeague {
  return {
    ...league,
    members: league.members.map((m) => (m.id === memberId ? { ...m, autodraft } : m)),
    updatedAt: Date.now(),
  }
}

export function setDraftClockSeconds(league: FantasyLeague, seconds: number): FantasyLeague {
  if (!ALLOWED_DRAFT_CLOCKS.includes(seconds as (typeof ALLOWED_DRAFT_CLOCKS)[number])) {
    throw new Error('Clock must be 30, 60, 90, or 120 seconds')
  }
  if (league.phase === 'drafting') {
    throw new Error('Cannot change clock during a live draft')
  }
  return { ...league, draftClockSeconds: seconds, updatedAt: Date.now() }
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

export function draftPlayer(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  return applyDraftPick(league, memberId, playerId, { catalog })
}

export function runDraftTick(
  league: FantasyLeague,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  return tickDraftClock(league, catalog)
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
  if (league.waiverPool.includes(playerId)) {
    throw new Error('Player is on waivers — submit a waiver claim')
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

    if (!canAddPosition(roster, player.pos, POSITION_LIMITS, catalog)) {
      throw new Error(`Max ${POSITION_LIMITS[player.pos]} ${player.pos} on roster`)
    }

    roster = [...roster, playerId]
    const starters = ensureLegalStarters(m.starters, roster, league.starterSpots, catalog)
    return { ...m, roster, starters }
  })

  // Instant FA drop goes to waivers (FF-style)
  let waiverPool = [...league.waiverPool]
  if (dropPlayerId != null && !waiverPool.includes(dropPlayerId)) {
    waiverPool.push(dropPlayerId)
  }

  return { ...league, members, waiverPool, updatedAt: Date.now() }
}

export function setStarters(
  league: FantasyLeague,
  memberId: string,
  starterIds: number[],
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const members = league.members.map((m) => {
    if (m.id !== memberId) return m
    const err = validateStarters(starterIds, m.roster, league.starterSpots, catalog)
    if (err) throw new Error(err)
    return { ...m, starters: starterIds }
  })
  return { ...league, members, updatedAt: Date.now() }
}

export function autoSetStarters(
  league: FantasyLeague,
  memberId: string,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const member = league.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Manager not found')
  const starters = suggestStarters(member.roster, league.starterSpots, catalog)
  return setStarters(league, memberId, starters, catalog)
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

  if (trade.offerPlayerIds.some((id) => !from.roster.includes(id))) {
    throw new Error('Trade is stale — offered players are no longer on the proposer roster')
  }
  if (trade.requestPlayerIds.some((id) => !to.roster.includes(id))) {
    throw new Error('Trade is stale — requested players are no longer on the recipient roster')
  }

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

  from.starters = ensureLegalStarters(from.starters, from.roster, league.starterSpots, catalog)
  to.starters = ensureLegalStarters(to.starters, to.roster, league.starterSpots, catalog)

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

export function scoreGameweek(
  league: FantasyLeague,
  gw: number,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  // Process waivers before locking weekly scores (FF weekly wire)
  let working = processWaiverClaims(league, catalog)

  const matchups = working.matchups.map((mu) => {
    if (mu.gw !== gw) return mu
    const homeMember = working.members.find((m) => m.id === mu.home.memberId)
    const awayMember = working.members.find((m) => m.id === mu.away.memberId)
    const homeRoster = homeMember?.roster ?? []
    const awayRoster = awayMember?.roster ?? []
    const homeRaw = homeMember?.starters ?? []
    const awayRaw = awayMember?.starters ?? []
    const homeStarters =
      validateStarters(homeRaw, homeRoster, working.starterSpots, catalog) === null
        ? homeRaw
        : suggestStarters(homeRoster, working.starterSpots, catalog)
    const awayStarters =
      validateStarters(awayRaw, awayRoster, working.starterSpots, catalog) === null
        ? awayRaw
        : suggestStarters(awayRoster, working.starterSpots, catalog)

    const homePts = sidePoints(homeStarters, gw, working, catalog)
    const awayPts = sidePoints(awayStarters, gw, working, catalog)

    return {
      ...mu,
      scored: true,
      home: { memberId: mu.home.memberId, points: homePts, starterIds: homeStarters },
      away: { memberId: mu.away.memberId, points: awayPts, starterIds: awayStarters },
    }
  })

  const stats = new Map(
    working.members.map((m) => [
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
    ...working,
    members: [...stats.values()],
    matchups,
    currentGw: Math.max(working.currentGw, gw),
    updatedAt: Date.now(),
  }

  if (gw === next.playoffStartGw - 1 && next.phase === 'regular' && next.playoffs.length === 0) {
    next = seedPlayoffs(next)
  }

  if (next.phase === 'semifinals' || next.phase === 'finals') {
    next = resolveSeriesWinners(next)
  }

  return next
}

export {
  setDraftOrder,
  startDraft,
  submitWaiverClaim,
  cancelWaiverClaim,
  processWaiverClaims,
  dropToWaivers,
  buildRegularSeasonMatchups,
}
