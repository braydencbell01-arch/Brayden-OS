import {
  FINAL_GWS,
  PLAYOFF_START_GW,
  SEMI_GWS,
  type FantasyLeague,
  type FantasyMember,
  type PlayoffSeries,
  type WeeklyMatchup,
} from './types'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** Circle method round-robin for even N. Returns list of [homeIdx, awayIdx] per round. */
export function roundRobinPairs(n: number): Array<Array<[number, number]>> {
  if (n % 2 !== 0) throw new Error('Need even number of teams')
  const rounds: Array<Array<[number, number]>> = []
  const arr = Array.from({ length: n }, (_, i) => i)
  const fixed = arr[0]!
  let rotating = arr.slice(1)

  for (let r = 0; r < n - 1; r++) {
    const circle = [fixed, ...rotating]
    const pairs: Array<[number, number]> = []
    for (let i = 0; i < n / 2; i++) {
      const a = circle[i]!
      const b = circle[n - 1 - i]!
      pairs.push(r % 2 === 0 ? [a, b] : [b, a])
    }
    rounds.push(pairs)
    rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)]
  }
  return rounds
}

export function buildRegularSeasonMatchups(
  members: FantasyMember[],
  playoffStartGw = PLAYOFF_START_GW,
): WeeklyMatchup[] {
  const n = members.length
  if (n % 2 !== 0) throw new Error('Even number of managers required')
  const order = [...members].sort((a, b) => a.id.localeCompare(b.id))
  const rr = roundRobinPairs(n)
  const matchups: WeeklyMatchup[] = []
  const lastRegular = playoffStartGw - 1

  for (let gw = 1; gw <= lastRegular; gw++) {
    const pairs = rr[(gw - 1) % rr.length]!
    for (const [hi, ai] of pairs) {
      const home = order[hi]!
      const away = order[ai]!
      matchups.push({
        id: uid('mu'),
        gw,
        kind: 'regular',
        home: { memberId: home.id, points: 0, starterIds: [...home.starters] },
        away: { memberId: away.id, points: 0, starterIds: [...away.starters] },
      })
    }
  }
  return matchups
}

export function standingsRank(members: FantasyMember[]): FantasyMember[] {
  return [...members].sort((a, b) => {
    const aw = a.wins + a.ties * 0.5
    const bw = b.wins + b.ties * 0.5
    if (bw !== aw) return bw - aw
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor
    return a.name.localeCompare(b.name)
  })
}

export function seedPlayoffs(league: FantasyLeague): FantasyLeague {
  const ranked = standingsRank(league.members)
  if (ranked.length < 4) {
    throw new Error('Need at least 4 managers for playoffs')
  }
  const s1 = ranked[0]!
  const s2 = ranked[1]!
  const s3 = ranked[2]!
  const s4 = ranked[3]!

  const semiA: PlayoffSeries = {
    id: uid('semi'),
    kind: 'semifinal',
    seedA: 1,
    seedB: 4,
    memberAId: s1.id,
    memberBId: s4.id,
    gws: [...SEMI_GWS],
  }
  const semiB: PlayoffSeries = {
    id: uid('semi'),
    kind: 'semifinal',
    seedA: 2,
    seedB: 3,
    memberAId: s2.id,
    memberBId: s3.id,
    gws: [...SEMI_GWS],
  }

  const matchups: WeeklyMatchup[] = [...league.matchups]
  for (const series of [semiA, semiB]) {
    for (const gw of series.gws) {
      matchups.push({
        id: uid('mu'),
        gw,
        kind: 'semifinal',
        seriesId: series.id,
        home: { memberId: series.memberAId, points: 0, starterIds: [] },
        away: { memberId: series.memberBId, points: 0, starterIds: [] },
      })
    }
  }

  return {
    ...league,
    playoffs: [semiA, semiB],
    matchups,
    phase: 'semifinals',
    updatedAt: Date.now(),
  }
}

export function advanceToFinals(league: FantasyLeague): FantasyLeague {
  const semis = league.playoffs.filter((p) => p.kind === 'semifinal')
  if (semis.length !== 2 || semis.some((s) => !s.winnerId)) {
    throw new Error('Both semifinal series need winners')
  }
  const w1 = semis[0]!
  const w2 = semis[1]!
  // Higher seed hosts conceptually as home
  const aIsHigher = w1.seedA <= w2.seedA
  const final: PlayoffSeries = {
    id: uid('final'),
    kind: 'final',
    seedA: aIsHigher ? w1.seedA : w2.seedA,
    seedB: aIsHigher ? w2.seedA : w1.seedA,
    memberAId: aIsHigher ? w1.winnerId! : w2.winnerId!,
    memberBId: aIsHigher ? w2.winnerId! : w1.winnerId!,
    gws: [...FINAL_GWS],
  }

  const matchups = [...league.matchups]
  for (const gw of final.gws) {
    matchups.push({
      id: uid('mu'),
      gw,
      kind: 'final',
      seriesId: final.id,
      home: { memberId: final.memberAId, points: 0, starterIds: [] },
      away: { memberId: final.memberBId, points: 0, starterIds: [] },
    })
  }

  return {
    ...league,
    playoffs: [...league.playoffs, final],
    matchups,
    phase: 'finals',
    updatedAt: Date.now(),
  }
}

export function seriesAggregate(
  league: FantasyLeague,
  seriesId: string,
): { a: number; b: number; memberAId: string; memberBId: string } | null {
  const series = league.playoffs.find((p) => p.id === seriesId)
  if (!series) return null
  let a = 0
  let b = 0
  for (const mu of league.matchups) {
    if (mu.seriesId !== seriesId) continue
    if (mu.home.memberId === series.memberAId) {
      a += mu.home.points
      b += mu.away.points
    } else {
      a += mu.away.points
      b += mu.home.points
    }
  }
  return { a, b, memberAId: series.memberAId, memberBId: series.memberBId }
}

export function resolveSeriesWinners(league: FantasyLeague): FantasyLeague {
  const playoffs = league.playoffs.map((series) => {
    if (series.winnerId) return series
    const lastGw = series.gws[series.gws.length - 1]!
    if (league.currentGw < lastGw) return series
    const agg = seriesAggregate(league, series.id)
    if (!agg) return series
    const winnerId =
      agg.a === agg.b
        ? series.memberAId // higher seed (A) wins ties
        : agg.a > agg.b
          ? series.memberAId
          : series.memberBId
    return { ...series, winnerId }
  })
  let next: FantasyLeague = { ...league, playoffs, updatedAt: Date.now() }

  if (
    next.phase === 'semifinals' &&
    playoffs.filter((p) => p.kind === 'semifinal').every((p) => p.winnerId)
  ) {
    next = advanceToFinals(next)
  }

  if (
    next.phase === 'finals' &&
    next.playoffs.filter((p) => p.kind === 'final').length > 0 &&
    next.playoffs.filter((p) => p.kind === 'final').every((p) => p.winnerId)
  ) {
    next = { ...next, phase: 'complete', updatedAt: Date.now() }
  }

  return next
}
