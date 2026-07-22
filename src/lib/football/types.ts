export type LeagueId =
  | 'premier-league'
  | 'la-liga'
  | 'bundesliga'
  | 'serie-a'
  | 'ligue-1'

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'unknown'

export type MatchTeam = {
  id: number
  name: string
  shortName: string
  logo?: string
}

export type Match = {
  id: number
  leagueId: LeagueId
  leagueName: string
  kickoff: string
  status: MatchStatus
  statusLabel: string
  elapsed: number | null
  home: MatchTeam
  away: MatchTeam
  score: {
    home: number | null
    away: number | null
  }
}

export type FixturesResponse = {
  matches: Match[]
  source: 'live' | 'mock'
  updatedAt: string
}
