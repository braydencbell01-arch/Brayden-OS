export type FantasyPosition = 'GKP' | 'DEF' | 'MID' | 'FWD'

export type LeaguePhase =
  | 'lobby'
  | 'draft_setup'
  | 'drafting'
  | 'regular'
  | 'semifinals'
  | 'finals'
  | 'complete'

export type FantasyPlayer = {
  id: number
  code: number
  webName: string
  firstName: string
  secondName: string
  pos: FantasyPosition
  elementType: number
  teamId: number
  teamShort: string
  teamName: string
  cost: number
  form: number
  ppg: number
  totalPoints: number
  eventPoints: number
  epNext: number
  epThis: number
  status: string
  chance: number
  weekProjection: number
  seasonProjection: number
  restOfSeasonProjection: number
  selectedBy: number
  photo: string
}

export type FantasyMember = {
  id: string
  name: string
  joinedAt: number
  isCommissioner: boolean
  draftSlot: number | null
  roster: number[]
  starters: number[]
  /** When on, picks fire automatically on your turn (season-proj best fit). */
  autodraft: boolean
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
}

export type DraftPick = {
  overall: number
  round: number
  slot: number
  memberId: string
  playerId: number
  at: number
  auto?: boolean
}

export type TradeOffer = {
  id: string
  fromMemberId: string
  toMemberId: string
  offerPlayerIds: number[]
  requestPlayerIds: number[]
  status: 'pending' | 'accepted' | 'rejected' | 'canceled'
  createdAt: number
  resolvedAt?: number
}

export type WaiverClaim = {
  id: string
  memberId: string
  addPlayerId: number
  dropPlayerId: number | null
  status: 'pending' | 'successful' | 'failed' | 'canceled'
  createdAt: number
  resolvedAt?: number
  failReason?: string
}

export type MatchupSide = {
  memberId: string
  points: number
  starterIds: number[]
}

export type WeeklyMatchup = {
  id: string
  gw: number
  home: MatchupSide
  away: MatchupSide
  kind: 'regular' | 'semifinal' | 'final'
  seriesId?: string
  scored?: boolean
}

export type PlayoffSeries = {
  id: string
  kind: 'semifinal' | 'final'
  seedA: number
  seedB: number
  memberAId: string
  memberBId: string
  gws: number[]
  winnerId?: string
}

export type FantasyLeague = {
  id: string
  inviteCode: string
  syncBlobId?: string
  name: string
  competition: 'premier-league'
  createdAt: number
  updatedAt: number
  commissionerId: string
  teamCount: number
  rosterSpots: number
  starterSpots: number
  /** Seconds on the clock per draft pick (FF-style). */
  draftClockSeconds: number
  /** When the current pick expires and autodraft fires. */
  draftPickDeadlineAt?: number
  phase: LeaguePhase
  members: FantasyMember[]
  draftOrder: string[]
  draftPicks: DraftPick[]
  draftPickIndex: number
  draftStartedAt?: number
  trades: TradeOffer[]
  /** Rolling waiver priority — successful claim moves manager to the end. */
  waiverOrder: string[]
  waiverClaims: WaiverClaim[]
  /** Recently dropped players that must be claimed via waivers. */
  waiverPool: number[]
  matchups: WeeklyMatchup[]
  playoffs: PlayoffSeries[]
  playerGwPoints: Record<string, Record<string, number>>
  currentGw: number
  playoffStartGw: number
  seasonGws: number
}

export type FantasyIdentity = {
  memberId: string
  displayName: string
}

export type FantasyStoreState = {
  identity: FantasyIdentity
  leagues: Record<string, FantasyLeague>
  activeLeagueId: string | null
}

export const ALLOWED_TEAM_COUNTS = [4, 6, 8, 10, 12] as const
/** Fantasy-football depth: 11 starters + 7 bench. */
export const DEFAULT_ROSTER_SPOTS = 18
export const DEFAULT_STARTER_SPOTS = 11
export const DEFAULT_DRAFT_CLOCK_SECONDS = 90
export const ALLOWED_DRAFT_CLOCKS = [30, 60, 90, 120] as const
export const SEASON_GWS = 38
export const PLAYOFF_START_GW = 29
export const SEMI_GWS = [29, 30, 31, 32, 33] as const
export const FINAL_GWS = [34, 35, 36, 37, 38] as const

/** Max on full roster (must sum to DEFAULT_ROSTER_SPOTS). */
export const POSITION_LIMITS: Record<FantasyPosition, number> = {
  GKP: 2,
  DEF: 6,
  MID: 6,
  FWD: 4,
}

/** Starter formation bands (must be able to sum to 11). */
export const STARTER_MIN: Record<FantasyPosition, number> = {
  GKP: 1,
  DEF: 3,
  MID: 2,
  FWD: 1,
}

export const STARTER_MAX: Record<FantasyPosition, number> = {
  GKP: 1,
  DEF: 5,
  MID: 5,
  FWD: 3,
}
