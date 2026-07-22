import { LEAGUE_LABELS } from './leagues'
import type { LeagueId, Match, MatchStatus } from './types'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function atTime(day: Date, hours: number, minutes: number) {
  const x = startOfDay(day)
  x.setHours(hours, minutes, 0, 0)
  return x
}

function shortName(name: string) {
  const parts = name.split(' ')
  if (parts.length === 1) return name.slice(0, 3).toUpperCase()
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

type Seed = {
  id: number
  leagueId: LeagueId
  home: string
  away: string
  hour: number
  minute: number
  status: MatchStatus
  elapsed: number | null
  homeGoals: number | null
  awayGoals: number | null
}

const SEEDS: Seed[] = [
  {
    id: 9001,
    leagueId: 'premier-league',
    home: 'Arsenal',
    away: 'Chelsea',
    hour: 12,
    minute: 30,
    status: 'finished',
    elapsed: 90,
    homeGoals: 2,
    awayGoals: 1,
  },
  {
    id: 9002,
    leagueId: 'premier-league',
    home: 'Liverpool',
    away: 'Manchester City',
    hour: 15,
    minute: 0,
    status: 'live',
    elapsed: 67,
    homeGoals: 1,
    awayGoals: 1,
  },
  {
    id: 9003,
    leagueId: 'la-liga',
    home: 'Real Madrid',
    away: 'Barcelona',
    hour: 16,
    minute: 15,
    status: 'live',
    elapsed: 34,
    homeGoals: 0,
    awayGoals: 2,
  },
  {
    id: 9004,
    leagueId: 'bundesliga',
    home: 'Bayern Munich',
    away: 'Dortmund',
    hour: 14,
    minute: 30,
    status: 'halftime',
    elapsed: 45,
    homeGoals: 1,
    awayGoals: 0,
  },
  {
    id: 9005,
    leagueId: 'serie-a',
    home: 'Inter',
    away: 'Milan',
    hour: 18,
    minute: 45,
    status: 'scheduled',
    elapsed: null,
    homeGoals: null,
    awayGoals: null,
  },
  {
    id: 9006,
    leagueId: 'ligue-1',
    home: 'PSG',
    away: 'Marseille',
    hour: 20,
    minute: 0,
    status: 'scheduled',
    elapsed: null,
    homeGoals: null,
    awayGoals: null,
  },
]

function statusLabel(status: MatchStatus, elapsed: number | null): string {
  switch (status) {
    case 'live':
      return elapsed != null ? `${elapsed}'` : 'LIVE'
    case 'halftime':
      return 'HT'
    case 'finished':
      return 'FT'
    case 'postponed':
      return 'PPD'
    case 'cancelled':
      return 'CANC'
    case 'scheduled':
      return 'NS'
    default:
      return '—'
  }
}

function toMatch(seed: Seed, day: Date): Match {
  const kickoff = atTime(day, seed.hour, seed.minute)
  return {
    id: seed.id,
    leagueId: seed.leagueId,
    leagueName: LEAGUE_LABELS[seed.leagueId],
    kickoff: kickoff.toISOString(),
    status: seed.status,
    statusLabel: statusLabel(seed.status, seed.elapsed),
    elapsed: seed.elapsed,
    home: {
      id: seed.id * 10 + 1,
      name: seed.home,
      shortName: shortName(seed.home),
    },
    away: {
      id: seed.id * 10 + 2,
      name: seed.away,
      shortName: shortName(seed.away),
    },
    score: {
      home: seed.homeGoals,
      away: seed.awayGoals,
    },
  }
}

/** Demo fixtures for local UI without an API key. Live rows slowly tick. */
export function getMockFixtures(date: Date, leagueId?: LeagueId | null): Match[] {
  const today = startOfDay(new Date())
  const day = startOfDay(date)
  const isToday = day.getTime() === today.getTime()

  // Only seed "today" and the next two days so the calendar feels alive.
  const dayOffset = Math.round((day.getTime() - today.getTime()) / 86_400_000)
  if (dayOffset < 0 || dayOffset > 2) return []

  const tick = Math.floor(Date.now() / 30_000)

  let matches = SEEDS.map((seed) => {
    const match = toMatch(seed, day)
    if (!isToday) {
      // Upcoming days: everything scheduled, no scores.
      return {
        ...match,
        status: 'scheduled' as const,
        statusLabel: 'NS',
        elapsed: null,
        score: { home: null, away: null },
        kickoff: atTime(day, seed.hour, seed.minute).toISOString(),
      }
    }

    if (match.status === 'live' || match.status === 'halftime') {
      const bumpedElapsed =
        match.status === 'live' ? Math.min(90, (seed.elapsed ?? 1) + (tick % 8)) : match.elapsed
      const homeBump = tick % 11 === 0 ? 1 : 0
      const awayBump = tick % 17 === 0 ? 1 : 0
      return {
        ...match,
        elapsed: bumpedElapsed,
        statusLabel: statusLabel(match.status, bumpedElapsed),
        score: {
          home: (seed.homeGoals ?? 0) + homeBump,
          away: (seed.awayGoals ?? 0) + awayBump,
        },
      }
    }
    return match
  })

  if (leagueId) {
    matches = matches.filter((m) => m.leagueId === leagueId)
  }

  return matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}
