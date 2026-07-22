import type { DraftPick, FantasyLeague, FantasyMember } from './types'

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

export function applyDraftPick(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  now = Date.now(),
): FantasyLeague {
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

  const pick: DraftPick = {
    overall: turn.overall,
    round: turn.round,
    slot: turn.slot,
    memberId,
    playerId,
    at: now,
  }

  const members = league.members.map((m) =>
    m.id === memberId ? { ...m, roster: [...m.roster, playerId] } : m,
  )

  const next: FantasyLeague = {
    ...league,
    members,
    draftPicks: [...league.draftPicks, pick],
    draftPickIndex: league.draftPickIndex + 1,
    updatedAt: now,
  }

  if (isDraftComplete(next)) {
    // Auto-set starters to first 11 rostered, then enter regular season
    next.members = next.members.map((m) => ({
      ...m,
      starters: m.roster.slice(0, league.starterSpots),
    }))
    next.phase = 'regular'
  }

  return next
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

  return {
    ...league,
    members,
    draftOrder: order,
    phase: 'draft_setup',
    updatedAt: Date.now(),
  }
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
  return {
    ...league,
    phase: 'drafting',
    draftPicks: [],
    draftPickIndex: 0,
    draftStartedAt: Date.now(),
    updatedAt: Date.now(),
  }
}
