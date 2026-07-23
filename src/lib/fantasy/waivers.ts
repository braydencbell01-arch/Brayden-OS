import { canAddPosition, ensureLegalStarters, ownedPlayerIds } from './lineup'
import type { FantasyLeague, FantasyPlayer, WaiverClaim } from './types'
import { POSITION_LIMITS } from './types'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function submitWaiverClaim(
  league: FantasyLeague,
  memberId: string,
  addPlayerId: number,
  dropPlayerId: number | null,
): FantasyLeague {
  if (league.phase === 'lobby' || league.phase === 'draft_setup' || league.phase === 'drafting') {
    throw new Error('Waivers open after the draft')
  }
  const member = league.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Manager not found')

  const owned = ownedPlayerIds(league.members)
  if (owned.has(addPlayerId)) throw new Error('Player is already rostered')

  const needsDrop = member.roster.length >= league.rosterSpots
  if (needsDrop && dropPlayerId == null) {
    throw new Error('Roster full — choose someone to drop')
  }
  if (dropPlayerId != null && !member.roster.includes(dropPlayerId)) {
    throw new Error('Drop must be on your roster')
  }

  // Cancel prior pending claim from same manager for same add
  const waiverClaims = league.waiverClaims.map((c) =>
    c.memberId === memberId && c.status === 'pending' && c.addPlayerId === addPlayerId
      ? { ...c, status: 'canceled' as const, resolvedAt: Date.now() }
      : c,
  )

  const claim: WaiverClaim = {
    id: uid('wv'),
    memberId,
    addPlayerId,
    dropPlayerId,
    status: 'pending',
    createdAt: Date.now(),
  }

  return {
    ...league,
    waiverClaims: [claim, ...waiverClaims],
    updatedAt: Date.now(),
  }
}

export function cancelWaiverClaim(
  league: FantasyLeague,
  memberId: string,
  claimId: string,
): FantasyLeague {
  return {
    ...league,
    waiverClaims: league.waiverClaims.map((c) =>
      c.id === claimId && c.memberId === memberId && c.status === 'pending'
        ? { ...c, status: 'canceled', resolvedAt: Date.now() }
        : c,
    ),
    updatedAt: Date.now(),
  }
}

/**
 * Process pending claims in waiver priority order (FF rolling list).
 * Successful claim → manager moves to end of waiverOrder.
 * Priority is re-evaluated after each claim so one manager cannot
 * win multiple adds before rolling to the back of the queue.
 * Dropped players enter the waiver pool.
 */
export function processWaiverClaims(
  league: FantasyLeague,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const pending = league.waiverClaims.filter((c) => c.status === 'pending')

  let members = league.members.map((m) => ({
    ...m,
    roster: [...m.roster],
    starters: [...m.starters],
  }))
  let waiverOrder = [...league.waiverOrder]
  let waiverPool = [...league.waiverPool]
  const claimUpdates = new Map<string, WaiverClaim>()
  const remaining = [...pending]

  const owned = () => ownedPlayerIds(members)
  const rankOf = (memberId: string) => {
    const i = waiverOrder.indexOf(memberId)
    return i === -1 ? 999 : i
  }

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const aRank = rankOf(a.memberId)
      const bRank = rankOf(b.memberId)
      if (aRank !== bRank) return aRank - bRank
      return a.createdAt - b.createdAt
    })
    const claim = remaining.shift()!

    const member = members.find((m) => m.id === claim.memberId)
    const player = catalog.get(claim.addPlayerId)
    if (!member || !player) {
      claimUpdates.set(claim.id, {
        ...claim,
        status: 'failed',
        resolvedAt: Date.now(),
        failReason: 'Invalid claim',
      })
      continue
    }
    if (owned().has(claim.addPlayerId)) {
      claimUpdates.set(claim.id, {
        ...claim,
        status: 'failed',
        resolvedAt: Date.now(),
        failReason: 'Player already taken',
      })
      continue
    }

    let roster = [...member.roster]
    if (roster.length >= league.rosterSpots) {
      if (claim.dropPlayerId == null || !roster.includes(claim.dropPlayerId)) {
        claimUpdates.set(claim.id, {
          ...claim,
          status: 'failed',
          resolvedAt: Date.now(),
          failReason: 'Valid drop required',
        })
        continue
      }
      roster = roster.filter((id) => id !== claim.dropPlayerId)
      if (!waiverPool.includes(claim.dropPlayerId)) waiverPool.push(claim.dropPlayerId)
    } else if (claim.dropPlayerId != null) {
      if (!roster.includes(claim.dropPlayerId)) {
        claimUpdates.set(claim.id, {
          ...claim,
          status: 'failed',
          resolvedAt: Date.now(),
          failReason: 'Drop not on roster',
        })
        continue
      }
      roster = roster.filter((id) => id !== claim.dropPlayerId)
      if (!waiverPool.includes(claim.dropPlayerId)) waiverPool.push(claim.dropPlayerId)
    }

    if (!canAddPosition(roster, player.pos, POSITION_LIMITS, catalog)) {
      claimUpdates.set(claim.id, {
        ...claim,
        status: 'failed',
        resolvedAt: Date.now(),
        failReason: `${player.pos} roster limit`,
      })
      continue
    }

    roster.push(claim.addPlayerId)
    waiverPool = waiverPool.filter((id) => id !== claim.addPlayerId)
    members = members.map((m) =>
      m.id === member.id
        ? {
            ...m,
            roster,
            starters: ensureLegalStarters(m.starters, roster, league.starterSpots, catalog),
          }
        : m,
    )

    waiverOrder = [...waiverOrder.filter((id) => id !== member.id), member.id]
    claimUpdates.set(claim.id, {
      ...claim,
      status: 'successful',
      resolvedAt: Date.now(),
    })
  }

  return {
    ...league,
    members,
    waiverOrder,
    waiverPool,
    waiverClaims: league.waiverClaims.map((c) => claimUpdates.get(c.id) ?? c),
    updatedAt: Date.now(),
  }
}

export function dropToWaivers(
  league: FantasyLeague,
  memberId: string,
  playerId: number,
  catalog: Map<number, FantasyPlayer>,
): FantasyLeague {
  const member = league.members.find((m) => m.id === memberId)
  if (!member?.roster.includes(playerId)) throw new Error('Player not on your roster')

  const members = league.members.map((m) => {
    if (m.id !== memberId) return m
    const roster = m.roster.filter((id) => id !== playerId)
    return {
      ...m,
      roster,
      starters: ensureLegalStarters(m.starters, roster, league.starterSpots, catalog),
    }
  })
  const waiverPool = league.waiverPool.includes(playerId)
    ? league.waiverPool
    : [...league.waiverPool, playerId]

  return { ...league, members, waiverPool, updatedAt: Date.now() }
}
