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
  lineups: MatchLineupSide[]
  live: boolean
  elapsedMinutes: number
}

export type MatchLineupPlayer = {
  id: string
  name: string
  shortName: string
  jersey?: string
  photoUrl: string
  positionAbbrev: string
  starter: boolean
  rating: number | null
  teamId: string
  teamName: string
  leagueId: LeagueId
}

export type MatchLineupSide = {
  teamId: string
  teamName: string
  homeAway: 'home' | 'away'
  starters: MatchLineupPlayer[]
  bench: MatchLineupPlayer[]
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
  note?: string
}

export type PlayerClubStint = {
  teamId: string
  teamName: string
  logoUrl?: string
  seasons: string
}

export type PlayerSeasonStatLine = {
  label: string
  value: string
}

export type PlayerRecentMatchRating = {
  eventId: string
  rating: number
  goals: number
  assists: number
  starter: boolean
}

export type PlayerProfile = {
  id: string
  name: string
  shortName: string
  photoUrl: string
  jersey?: string
  age?: number
  height?: string
  weight?: string
  citizenship?: string
  position?: string
  positionAbbrev?: string
  teamId?: string
  teamName?: string
  teamLogoUrl?: string
  leagueId: LeagueId
  seasonStats: PlayerSeasonStatLine[]
  averageRating: number | null
  recentRatings: PlayerRecentMatchRating[]
  clubHistory: PlayerClubStint[]
  fetchedAt: number
}
