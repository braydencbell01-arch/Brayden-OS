import { pushActivity } from './activity'
import { finishDraftIfNeeded, draftedPlayerIds, nextDeadline, snakeMemberForPick } from './draft'
import { canAddPosition } from './lineup'
import type { DraftPick, FantasyLeague, FantasyPlayer } from './types'
import { DEFAULT_AUCTION_BUDGET, DEFAULT_DRAFT_CLOCK_SECONDS, POSITION_LIMITS } from './types'

function draftOrder(league: FantasyLeague): string[] {
  return league.draftOrder.length ? league.draftOrder : league.members.map((m) => m.id)
}

function nominatorForIndex(league: FantasyLeague, pickIndex = league.draftPickIndex): string | undefined {
  return snakeMemberForPick(draftOrder(league), pickIndex)?.memberId
}

function canRosterBidder(
  league: FantasyLeague,
  memberId: string,
  player: FantasyPlayer,
  catalog: Map<number, FantasyPlayer>,
): boolean {
  const member = league.members.find((m) => m.id === memberId)
  if (!member) return false
  if (member.roster.length >= league.rosterSpots) return false
  return canAddPosition(member.roster, player.pos, POSITION_LIMITS, catalog)
}

export function startAuctionDraft(league: FantasyLeague): FantasyLeague {
  if (league.members.length !== league.teamCount) {
    throw new Error(`Need exactly ${league.teamCount} managers before drafting`)
  }
  const now = Date.now()
  const budget = league.auctionBudget || DEFAULT_AUCTION_BUDGET
  const order = draftOrder(league)
  const members = league.members.map((m) => ({
    ...m,
    auctionBudget: budget,
    draftSlot: order.indexOf(m.id) + 1,
  }))
  return pushActivity(
    {
      ...league,
      draftMode: 'auction',
      phase: 'drafting',
      members,
      draftOrder: order,
      draftPicks: [],
      draftPickIndex: 0,
      draftStartedAt: now,
      auctionBudget: budget,
      auctionNominatingMemberId: order[0],
      auctionNomPlayerId: undefined,
      auctionHighBid: undefined,
      auctionHighBidderId: undefined,
      auctionBidDeadlineAt: undefined,
      updatedAt: now,
    },
    'auction_start',
    'Auction draft started',
  )
}

export function nominatePlayer(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  catalog: Map<number, FantasyPlayer>,
  openingBid = 1,
): FantasyLeague {
  if (league.phase !== 'drafting' || league.draftMode !== 'auction') {
    throw new Error('Auction draft is not active')
  }
  if (league.auctionNomPlayerId != null) throw new Error('A player is already nominated')
  const expected = league.auctionNominatingMemberId ?? nominatorForIndex(league)
  if (expected && expected !== memberId) throw new Error('Not your nomination')
  if (draftedPlayerIds(league).has(playerId)) throw new Error('Player already drafted')

  const player = catalog.get(playerId)
  if (!player || player.status === 'u') throw new Error('Unknown player')
  const bid = Math.floor(Number(openingBid))
  if (!Number.isFinite(bid) || bid < 1) throw new Error('Opening bid must be at least 1')
  const member = league.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Manager not found')
  if ((member.auctionBudget ?? league.auctionBudget) < bid) {
    throw new Error('Opening bid exceeds budget')
  }
  if (!canRosterBidder(league, memberId, player, catalog)) {
    throw new Error('Nominated player does not fit your roster')
  }

  const now = Date.now()
  return pushActivity(
    {
      ...league,
      auctionNomPlayerId: playerId,
      auctionHighBid: bid,
      auctionHighBidderId: memberId,
      auctionBidDeadlineAt: nextDeadline(now, league.draftClockSeconds || DEFAULT_DRAFT_CLOCK_SECONDS),
      updatedAt: now,
    },
    'auction_nomination',
    `${member.name} nominated ${player.webName}`,
    memberId,
  )
}

export function placeBid(
  league: FantasyLeague,
  memberId: string,
  amount: number,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  if (league.phase !== 'drafting' || league.draftMode !== 'auction') {
    throw new Error('Auction draft is not active')
  }
  if (league.auctionNomPlayerId == null) throw new Error('No active nomination')
  const bid = Math.floor(amount)
  if (bid <= (league.auctionHighBid ?? 0)) throw new Error('Bid must beat the high bid')
  const player = catalog.get(league.auctionNomPlayerId)
  if (!player) throw new Error('Unknown player')
  const member = league.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Manager not found')
  if ((member.auctionBudget ?? league.auctionBudget) < bid) throw new Error('Bid exceeds budget')
  if (!canRosterBidder(league, memberId, player, catalog)) {
    throw new Error('Player does not fit your roster')
  }

  const now = Date.now()
  return pushActivity(
    {
      ...league,
      auctionHighBid: bid,
      auctionHighBidderId: memberId,
      auctionBidDeadlineAt: nextDeadline(now, league.draftClockSeconds || DEFAULT_DRAFT_CLOCK_SECONDS),
      updatedAt: now,
    },
    'auction_bid',
    `${member.name} bid ${bid} on ${player.webName}`,
    memberId,
  )
}

export function tickAuctionClock(
  league: FantasyLeague,
  catalog: Map<number, FantasyPlayer>,
  now = Date.now(),
): FantasyLeague {
  if (league.phase !== 'drafting' || league.draftMode !== 'auction') return league
  if (league.auctionNomPlayerId == null) return league
  if (!league.auctionBidDeadlineAt || now < league.auctionBidDeadlineAt) return league

  const player = catalog.get(league.auctionNomPlayerId)
  const winnerId = league.auctionHighBidderId
  const price = league.auctionHighBid ?? 0
  if (!player || !winnerId || price <= 0) {
    return {
      ...league,
      auctionNomPlayerId: undefined,
      auctionHighBid: undefined,
      auctionHighBidderId: undefined,
      auctionBidDeadlineAt: undefined,
      updatedAt: now,
    }
  }

  const turn = snakeMemberForPick(draftOrder(league), league.draftPickIndex)
  const pick: DraftPick = {
    overall: league.draftPickIndex + 1,
    round: turn?.round ?? Math.floor(league.draftPickIndex / Math.max(1, league.teamCount)) + 1,
    slot: turn?.slot ?? 1,
    memberId: winnerId,
    playerId: player.id,
    at: now,
  }

  const winner = league.members.find((m) => m.id === winnerId)
  let next: FantasyLeague = {
    ...league,
    members: league.members.map((m) =>
      m.id === winnerId
        ? {
            ...m,
            roster: [...m.roster, player.id],
            auctionBudget: Math.max(0, (m.auctionBudget ?? league.auctionBudget) - price),
          }
        : m,
    ),
    draftPicks: [...league.draftPicks, pick],
    draftPickIndex: league.draftPickIndex + 1,
    auctionNomPlayerId: undefined,
    auctionHighBid: undefined,
    auctionHighBidderId: undefined,
    auctionBidDeadlineAt: undefined,
    auctionNominatingMemberId: nominatorForIndex(league, league.draftPickIndex + 1),
    updatedAt: now,
  }

  next = pushActivity(
    next,
    'auction_award',
    `${winner?.name ?? 'Manager'} won ${player.webName} for ${price}`,
    winnerId,
  )
  return finishDraftIfNeeded(next, catalog)
}
