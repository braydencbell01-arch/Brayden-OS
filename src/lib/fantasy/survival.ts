import { pushActivity } from './activity'
import type {
  FantasyLeague,
  FantasyMember,
  SurvivalPick,
  SurvivalPickResult,
  SurvivalSettings,
} from './types'
import { defaultSurvivalSettings, SEASON_GWS } from './types'

export type ClubCatalogTeam = { id: number; name: string; short: string }

export function isSurvivalLeague(league: FantasyLeague): boolean {
  return league.gameMode === 'survival'
}

export function normalizeSurvivalSettings(raw?: Partial<SurvivalSettings> | null): SurvivalSettings {
  const base = defaultSurvivalSettings(raw ?? undefined)
  const lives = Math.min(3, Math.max(1, Math.round(base.lives) || 1))
  const startGw = Math.min(SEASON_GWS, Math.max(1, Math.round(base.startGw) || 1))
  const endGw = Math.min(SEASON_GWS, Math.max(startGw, Math.round(base.endGw) || SEASON_GWS))
  return {
    lives,
    drawCountsAsSurvive: base.drawCountsAsSurvive !== false,
    startGw,
    endGw,
    byeCountsAsSurvive: base.byeCountsAsSurvive !== false,
  }
}

export function usedSurvivalTeamIds(member: FantasyMember, beforeGw?: number): Set<number> {
  const used = new Set<number>()
  for (const pick of member.survivalPicks ?? []) {
    if (beforeGw != null && pick.gw >= beforeGw) continue
    used.add(pick.teamId)
  }
  return used
}

export function pickForGw(member: FantasyMember, gw: number): SurvivalPick | undefined {
  return (member.survivalPicks ?? []).find((p) => p.gw === gw)
}

export function isMemberAlive(member: FantasyMember): boolean {
  return member.eliminatedAtGw == null
}

export function aliveMembers(league: FantasyLeague): FantasyMember[] {
  return league.members.filter(isMemberAlive)
}

export function survivalStandings(league: FantasyLeague): FantasyMember[] {
  return [...league.members].sort((a, b) => {
    const aAlive = isMemberAlive(a) ? 0 : 1
    const bAlive = isMemberAlive(b) ? 0 : 1
    if (aAlive !== bAlive) return aAlive - bAlive
    const aLives = a.survivalLivesRemaining ?? league.survival.lives
    const bLives = b.survivalLivesRemaining ?? league.survival.lives
    if (bLives !== aLives) return bLives - aLives
    const aGws = (a.survivalPicks ?? []).filter((p) => p.survived).length
    const bGws = (b.survivalPicks ?? []).filter((p) => p.survived).length
    if (bGws !== aGws) return bGws - aGws
    return a.name.localeCompare(b.name)
  })
}

export function resultSurvives(result: SurvivalPickResult, settings: SurvivalSettings): boolean {
  if (result === 'W') return true
  if (result === 'D') return settings.drawCountsAsSurvive
  if (result === 'bye') return settings.byeCountsAsSurvive
  if (result === 'pending') return true
  return false
}

export function setSurvivalPick(
  league: FantasyLeague,
  memberId: string,
  gw: number,
  teamId: number,
  teams: ClubCatalogTeam[],
): FantasyLeague {
  if (!isSurvivalLeague(league)) throw new Error('This league is not Survival mode')
  if (league.phase !== 'regular') throw new Error('Season has not started')
  if (league.survivalScoredGws.includes(gw)) throw new Error(`GW ${gw} is already scored`)
  if (league.survivalLockedGws.includes(gw)) throw new Error(`GW ${gw} picks are locked`)
  if (gw < league.survival.startGw || gw > league.survival.endGw) {
    throw new Error(`GW ${gw} is outside this survival season`)
  }
  if (gw !== league.currentGw) {
    throw new Error(`Picks are only open for GW ${league.currentGw}`)
  }

  const member = league.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Manager not found')
  if (!isMemberAlive(member)) throw new Error('You are eliminated')

  const team = teams.find((t) => t.id === teamId)
  if (!team) throw new Error('Unknown Premier League club')

  if (usedSurvivalTeamIds(member).has(teamId) && pickForGw(member, gw)?.teamId !== teamId) {
    throw new Error(`${team.short} was already used — each club once`)
  }

  const nextPicks = [...(member.survivalPicks ?? []).filter((p) => p.gw !== gw), { gw, teamId }]
  const nextMembers = league.members.map((m) =>
    m.id === memberId ? { ...m, survivalPicks: nextPicks } : m,
  )

  return pushActivity(
    {
      ...league,
      members: nextMembers,
      updatedAt: Date.now(),
    },
    'survival_pick',
    `${member.name} picked ${team.short} for GW ${gw}`,
    memberId,
  )
}

export function lockSurvivalGw(league: FantasyLeague, gw: number): FantasyLeague {
  if (!isSurvivalLeague(league)) throw new Error('This league is not Survival mode')
  if (league.phase !== 'regular') throw new Error('Season has not started')
  if (league.survivalLockedGws.includes(gw)) return league
  return pushActivity(
    {
      ...league,
      survivalLockedGws: [...league.survivalLockedGws, gw].sort((a, b) => a - b),
      updatedAt: Date.now(),
    },
    'survival_lock',
    `GW ${gw} picks locked`,
  )
}

export function applySurvivalGwResults(
  league: FantasyLeague,
  gw: number,
  resultsByTeamId: Record<number, SurvivalPickResult>,
  teams: ClubCatalogTeam[],
): FantasyLeague {
  if (!isSurvivalLeague(league)) throw new Error('This league is not Survival mode')
  if (league.phase !== 'regular' && league.phase !== 'complete') {
    throw new Error('Season has not started')
  }
  if (league.survivalScoredGws.includes(gw)) throw new Error(`GW ${gw} already scored`)

  const teamLabel = (id: number) => teams.find((t) => t.id === id)?.short ?? `#${id}`
  let next: FantasyLeague = {
    ...league,
    survivalLockedGws: league.survivalLockedGws.includes(gw)
      ? league.survivalLockedGws
      : [...league.survivalLockedGws, gw].sort((a, b) => a - b),
    members: league.members.map((member) => {
      if (!isMemberAlive(member)) return member
      const pick = pickForGw(member, gw)
      const lives = member.survivalLivesRemaining ?? league.survival.lives

      if (!pick) {
        // Missed pick counts as a loss.
        const nextLives = lives - 1
        const eliminated = nextLives <= 0
        return {
          ...member,
          survivalLivesRemaining: Math.max(0, nextLives),
          eliminatedAtGw: eliminated ? gw : member.eliminatedAtGw,
          survivalPicks: [
            ...(member.survivalPicks ?? []),
            { gw, teamId: -1, result: 'L', survived: false },
          ],
        }
      }

      const result = resultsByTeamId[pick.teamId] ?? 'bye'
      const survived = resultSurvives(result, league.survival)
      const nextLives = survived ? lives : lives - 1
      const eliminated = nextLives <= 0
      const nextPicks = (member.survivalPicks ?? []).map((p) =>
        p.gw === gw ? { ...p, result, survived } : p,
      )
      return {
        ...member,
        survivalPicks: nextPicks,
        survivalLivesRemaining: Math.max(0, nextLives),
        eliminatedAtGw: eliminated ? gw : member.eliminatedAtGw,
      }
    }),
    survivalScoredGws: [...league.survivalScoredGws, gw].sort((a, b) => a - b),
    updatedAt: Date.now(),
  }

  const eliminated = next.members.filter((m) => m.eliminatedAtGw === gw)
  for (const member of eliminated) {
    const pick = pickForGw(member, gw)
    const detail =
      !pick || pick.teamId < 0
        ? 'missed pick'
        : `${teamLabel(pick.teamId)} ${pick.result ?? 'L'}`
    next = pushActivity(next, 'survival_out', `${member.name} eliminated (${detail})`, member.id)
  }

  const alive = aliveMembers(next)
  const atEnd = gw >= league.survival.endGw
  if (alive.length <= 1 || atEnd) {
    next = {
      ...next,
      phase: 'complete',
      updatedAt: Date.now(),
    }
    if (alive.length === 1) {
      next = pushActivity(
        next,
        'survival_winner',
        `${alive[0].name} wins Survival`,
        alive[0].id,
      )
    } else if (alive.length === 0) {
      next = pushActivity(next, 'survival_complete', `GW ${gw} wiped the board — no survivors`)
    } else {
      const names = alive.map((m) => m.name).join(', ')
      next = pushActivity(next, 'survival_complete', `Season ended with survivors: ${names}`)
    }
  } else {
    const nextGw = Math.min(league.survival.endGw, gw + 1)
    next = {
      ...next,
      currentGw: nextGw,
      updatedAt: Date.now(),
    }
    next = pushActivity(next, 'survival_scored', `GW ${gw} scored — now GW ${nextGw}`)
  }

  return next
}

/** Fill missing bot picks for the current GW with a random unused club that plays. */
export function autoPickSurvivalBots(
  league: FantasyLeague,
  teams: ClubCatalogTeam[],
  playingTeamIds: Set<number>,
): FantasyLeague {
  if (!isSurvivalLeague(league) || league.phase !== 'regular') return league
  const gw = league.currentGw
  if (league.survivalLockedGws.includes(gw) || league.survivalScoredGws.includes(gw)) return league

  let changed = false
  const members = league.members.map((member) => {
    if (!member.id.startsWith('bot_')) return member
    if (!isMemberAlive(member)) return member
    if (pickForGw(member, gw)) return member
    const used = usedSurvivalTeamIds(member)
    const pool = teams.filter(
      (t) => !used.has(t.id) && (playingTeamIds.size === 0 || playingTeamIds.has(t.id)),
    )
    const fallback = teams.filter((t) => !used.has(t.id))
    const choices = pool.length > 0 ? pool : fallback
    if (choices.length === 0) return member
    const team = choices[Math.floor(Math.random() * choices.length)]
    changed = true
    return {
      ...member,
      survivalPicks: [...(member.survivalPicks ?? []), { gw, teamId: team.id }],
    }
  })
  if (!changed) return league
  return { ...league, members, updatedAt: Date.now() }
}

export function startSurvivalSeason(league: FantasyLeague, currentGwHint?: number): FantasyLeague {
  if (!isSurvivalLeague(league)) throw new Error('This league is not Survival mode')
  if (league.phase !== 'lobby') throw new Error('Survival already started')
  if (league.members.length < 2) throw new Error('Need at least 2 managers')

  const settings = normalizeSurvivalSettings(league.survival)
  const hint = currentGwHint ?? league.currentGw
  const startGw =
    hint >= settings.startGw && hint <= settings.endGw ? hint : settings.startGw

  const members = league.members.map((m) => ({
    ...m,
    survivalPicks: m.survivalPicks ?? [],
    survivalLivesRemaining: settings.lives,
    eliminatedAtGw: undefined,
  }))

  return pushActivity(
    {
      ...league,
      survival: settings,
      members,
      phase: 'regular',
      currentGw: startGw,
      survivalLockedGws: [],
      survivalScoredGws: [],
      updatedAt: Date.now(),
    },
    'survival_start',
    `Survival season started at GW ${startGw}`,
    league.commissionerId,
  )
}
