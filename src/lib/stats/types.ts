import type { LeagueId } from '../leagues'

export type TeamMatchStatLine = {
  key: string
  label: string
  home: string
  away: string
}

export type MatchMoment = {
  id: string
  clock: string
  text: string
  kind: 'goal' | 'card' | 'other'
}

export type MatchDetailStats = {
  matchId: string
  espnEventId: string
  leagueId: LeagueId
  fetchedAt: number
  lines: TeamMatchStatLine[]
  moments: MatchMoment[]
}

export type StandingRow = {
  rank: number
  teamId: string
  team: string
  shortName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalDiff: number
  points: number
  goalsFor: number
  goalsAgainst: number
  note?: string
}

export type LeaderEntry = {
  rank: number
  id: string
  name: string
  shortName: string
  teamName?: string
  value: number
  displayValue: string
}

export type LeaderCategory = {
  id: string
  label: string
  kind: 'player' | 'team'
  leaders: LeaderEntry[]
}

export type LeagueLeaders = {
  leagueId: LeagueId
  season: number
  seasonLabel: string
  categories: LeaderCategory[]
  fetchedAt: number
}
