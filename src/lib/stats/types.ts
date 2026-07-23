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
  /** Real player headshot (preferred). */
  photoUrl: string
  /** Kit graphic used when the headshot is missing. */
  jerseyUrl?: string
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
  goalsFor: number
  goalsAgainst: number
  note?: string
}

export type LeaderEntry = {
  rank: number
  id: string
  name: string
  shortName: string
  jersey?: string
  teamId?: string
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

/** One row: the #1 player for a single league stat category. */
export type LeaguePlayerStatTop = {
  categoryId: string
  label: string
  player: LeaderEntry
}

export type LeaguePlayerStatsOverview = {
  leagueId: LeagueId
  season: number
  seasonLabel: string
  rows: LeaguePlayerStatTop[]
  fetchedAt: number
}

export type TeamRosterPlayer = {
  id: string
  name: string
  shortName: string
  jersey?: string
  positionAbbrev: string
  positionLabel: string
  photoUrl: string
}

export type TeamRosterGroup = {
  id: string
  label: string
  players: TeamRosterPlayer[]
}

export type TeamRoster = {
  leagueId: LeagueId
  teamId: string
  season: number
  seasonLabel: string
  groups: TeamRosterGroup[]
  fetchedAt: number
}

export type PlayerClubStint = {
  teamId: string
  teamName: string
  logoUrl?: string
  seasons: string
  /** True when ESPN marks this as an active stint. */
  isActive?: boolean
}

/** One club season in a player's career timeline. */
export type PlayerCareerSeason = {
  id: string
  seasonYear: number
  seasonLabel: string
  clubId: string
  clubName: string
  leagueSlug: string
  leagueName: string
  matchesPlayed: number
  goals: number
  assists: number
  averageRating: number | null
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
  /** Opponent club/nation display name when known. */
  opponent?: string
  /** Short opponent code when known (e.g. WHU). */
  opponentAbbrev?: string
  /** Kickoff / match date ISO string. */
  date?: string
  /** Player's side: home or away. */
  homeAway?: 'home' | 'away'
}

/** Opaque cursor for paginating recent match ratings across seasons. */
export type PlayerRatingsCursor = {
  seasons: number[]
  seasonIndex: number
  page: number
  pageCount: number
  done: boolean
}

export type PlayerProfile = {
  id: string
  name: string
  shortName: string
  photoUrl: string
  jerseyUrl?: string
  jersey?: string
  age?: number
  height?: string
  weight?: string
  citizenship?: string
  /**
   * Country shown near the player name: active national team if capped,
   * otherwise citizenship / country of origin they would represent.
   */
  represents: string | null
  /** Whether `represents` comes from a national-team stint. */
  representsNationalTeam: boolean
  position?: string
  positionAbbrev?: string
  teamId?: string
  teamName?: string
  teamLogoUrl?: string
  leagueId: LeagueId
  seasonStats: PlayerSeasonStatLine[]
  averageRating: number | null
  recentRatings: PlayerRecentMatchRating[]
  /** Club sides only (no national teams). */
  clubHistory: PlayerClubStint[]
  /** National / country teams only. */
  nationalHistory: PlayerClubStint[]
  /** Label for the season stats block, e.g. "2025-26 English Premier League". */
  seasonStatsLabel?: string
  fetchedAt: number
}
