import { pushActivity } from './activity'
import { canAddPosition } from './lineup'
import { suggestStarters } from './lineup'
import type { DraftPick, FantasyLeague, FantasyMember, FantasyPlayer } from './types'
import { DEFAULT_DRAFT_CLOCK_SECONDS, POSITION_LIMITS } from './types'
import { buildRegularSeasonMatchups } from './schedule'

/** Snake: round 1 left→right, round 2 right→left, … */
export function snakeMemberForPick(
  draftOrder: string[],
  pickIndex: number,
): { memberId: string; round: number; slot: number; overall: number } | null {
  const n = draftOrder.length
  if (n === 0) return null
  const overall = pickIndex + 1
  const round = Math.floor(pickIndex / n) + 1
  const posInRound = pickIndex % n
  const slotIndex = round % 2 === 1 ? posInRound : n - 1 - posInRound
  const memberId = draftOrder[slotIndex]
  if (!memberId) return null
  return { memberId, round, slot: slotIndex + 1, overall }
}

export function totalDraftPicks(teamCount: number, rosterSpots: number): number {
  return teamCount * rosterSpots
}

export function isDraftComplete(league: FantasyLeague): boolean {
  return league.draftPicks.length >= totalDraftPicks(league.teamCount, league.rosterSpots)
}

export function draftedPlayerIds(league: FantasyLeague): Set<number> {
  return new Set(league.draftPicks.map((p) => p.playerId))
}

export function nextDeadline(now: number, clockSeconds: number): number {
  return now + Math.max(15, clockSeconds) * 1000
}

export function finishDraftIfNeeded(
  league: FantasyLeague,
  catalog?: Map<number, FantasyPlayer>,
): FantasyLeague {
  if (!isDraftComplete(league)) return league

  const members = league.members.map((m) => ({
    ...m,
    starters:
      catalog && catalog.size > 0
        ? suggestStarters(m.roster, league.starterSpots, catalog)
        : m.roster.slice(0, league.starterSpots),
  }))

  // Waiver priority: reverse draft order (last pick gets first claim — classic FF vibe)
  const waiverOrder = [...league.draftOrder].reverse()

  let next: FantasyLeague = {
    ...league,
    members,
    phase: 'regular',
    draftPickDeadlineAt: undefined,
    waiverOrder,
    waiverPool: [],
    updatedAt: Date.now(),
  }

  if (next.matchups.length === 0) {
    next = {
      ...next,
      matchups: buildRegularSeasonMatchups(next.members, next.playoffStartGw),
    }
  }
  return pushActivity(next, 'draft_complete', 'Draft complete')
}

export function applyDraftPick(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  opts: {
    now?: number
    auto?: boolean
    catalog?: Map<number, FantasyPlayer>
  } = {},
): FantasyLeague {
  const now = opts.now ?? Date.now()
  const turn = snakeMemberForPick(league.draftOrder, league.draftPickIndex)
  if (!turn || turn.memberId !== memberId) {
    throw new Error('Not your turn to draft')
  }
  if (draftedPlayerIds(league).has(playerId)) {
    throw new Error('Player already drafted')
  }
  const member = league.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Member not found')
  if (member.roster.length >= league.rosterSpots) {
    throw new Error('Roster is full')
  }

  if (opts.catalog) {
    const player = opts.catalog.get(playerId)
    if (!player) throw new Error('Unknown player')
    if (!canAddPosition(member.roster, player.pos, POSITION_LIMITS, opts.catalog)) {
      throw new Error(`Max ${POSITION_LIMITS[player.pos]} ${player.pos} on roster`)
    }
  }

  const pick: DraftPick = {
    overall: turn.overall,
    round: turn.round,
    slot: turn.slot,
    memberId,
    playerId,
    at: now,
    auto: opts.auto,
  }

  const members = league.members.map((m) =>
    m.id === memberId
      ? { ...m, roster: [...m.roster, playerId], draftQueue: (m.draftQueue ?? []).filter((id) => id !== playerId) }
      : m,
  )

  let next: FantasyLeague = {
    ...league,
    members,
    draftPicks: [...league.draftPicks, pick],
    draftPickIndex: league.draftPickIndex + 1,
    draftPickDeadlineAt: nextDeadline(
      now,
      league.draftClockSeconds || DEFAULT_DRAFT_CLOCK_SECONDS,
    ),
    updatedAt: now,
  }

  next = pushActivity(next, 'draft_pick', `${member.name} drafted player #${playerId}`, memberId)

  return finishDraftIfNeeded(next, opts.catalog)
}

/** Highest season-projection player that fits roster position caps. */
export function pickAutodraftPlayer(
  member: FantasyMember,
  taken: Set<number>,
  catalog: Map<number, FantasyPlayer>,
): number | null {
  for (const queuedId of member.draftQueue ?? []) {
    const queued = catalog.get(queuedId)
    if (!queued || queued.status === 'u' || taken.has(queued.id)) continue
    if (canAddPosition(member.roster, queued.pos, POSITION_LIMITS, catalog)) {
      return queued.id
    }
  }

  const ranked = [...catalog.values()]
    .filter((p) => !taken.has(p.id) && p.status !== 'u')
    .sort(
      (a, b) =>
        b.seasonProjection - a.seasonProjection ||
        b.totalPoints - a.totalPoints ||
        a.webName.localeCompare(b.webName),
    )

  for (const p of ranked) {
    if (canAddPosition(member.roster, p.pos, POSITION_LIMITS, catalog)) {
      return p.id
    }
  }
  return null
}

export function setDraftOrder(league: FantasyLeague, order: string[]): FantasyLeague {
  if (order.length !== league.members.length) {
    throw new Error('Draft order must include every member')
  }
  const ids = new Set(league.members.map((m) => m.id))
  if (order.some((id) => !ids.has(id))) {
    throw new Error('Draft order has unknown member')
  }
  if (new Set(order).size !== order.length) {
    throw new Error('Draft order has duplicates')
  }

  const members: FantasyMember[] = league.members.map((m) => ({
    ...m,
    draftSlot: order.indexOf(m.id) + 1,
  }))

  return pushActivity({
    ...league,
    members,
    draftOrder: order,
    phase: 'draft_setup',
    updatedAt: Date.now(),
  }, 'draft_order', 'Draft order set')
}

export function startDraft(league: FantasyLeague): FantasyLeague {
  if (league.members.length !== league.teamCount) {
    throw new Error(`Need exactly ${league.teamCount} managers before drafting`)
  }
  if (league.teamCount % 2 !== 0) {
    throw new Error('League size must be even so everyone has a weekly matchup')
  }
  if (league.draftOrder.length !== league.teamCount) {
    throw new Error('Set draft order first')
  }
  const now = Date.now()
  return pushActivity({
    ...league,
    phase: 'drafting',
    draftPicks: [],
    draftPickIndex: 0,
    draftStartedAt: now,
    draftPickDeadlineAt: nextDeadline(
      now,
      league.draftClockSeconds || DEFAULT_DRAFT_CLOCK_SECONDS,
    ),
    updatedAt: now,
  }, 'draft_start', 'Snake draft started')
}

/**
 * Advance draft when clock expires or current manager has autodraft on.
 * Returns same league reference semantics via updatedAt check — caller should
 * skip persist if unchanged.
 */
export function tickDraftClock(
  league: FantasyLeague,
  catalog: Map<number, FantasyPlayer>,
  now = Date.now(),
): FantasyLeague {
  if (league.phase !== 'drafting') return league

  const turn = snakeMemberForPick(league.draftOrder, league.draftPickIndex)
  if (!turn) return league
  const member = league.members.find((m) => m.id === turn.memberId)
  if (!member) return league

  const deadline = league.draftPickDeadlineAt ?? 0
  const shouldAuto = member.autodraft || (deadline > 0 && now >= deadline)
  if (!shouldAuto) return league

  const taken = draftedPlayerIds(league)
  const playerId = pickAutodraftPlayer(member, taken, catalog)
  if (playerId == null) return league

  try {
    return applyDraftPick(league, member.id, playerId, { now, auto: true, catalog })
  } catch {
    return league
  }
}
