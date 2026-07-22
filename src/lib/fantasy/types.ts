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
  /** Snake draft slot 1..N once set */
  draftSlot: number | null
  roster: number[]
  starters: number[]
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
  /** Aggregate series id for playoff multi-week matchups */
  seriesId?: string
  /** Set when commissioner runs Score GW for this matchup */
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
  /** Short code people type to join */
  inviteCode: string
  /** jsonblob id for cloud sync (optional) */
  syncBlobId?: string
  name: string
  competition: 'premier-league'
  createdAt: number
  updatedAt: number
  commissionerId: string
  /** Even count only: 4 | 6 | 8 | 10 | 12 */
  teamCount: number
  rosterSpots: number
  starterSpots: number
  phase: LeaguePhase
  members: FantasyMember[]
  draftOrder: string[]
  draftPicks: DraftPick[]
  draftPickIndex: number
  draftStartedAt?: number
  trades: TradeOffer[]
  matchups: WeeklyMatchup[]
  playoffs: PlayoffSeries[]
  /** playerId -> gw -> fantasy points (scored) */
  playerGwPoints: Record<string, Record<string, number>>
  currentGw: number
  /** Regular season ends before this GW (inclusive last regular = playoffStartGw - 1) */
  playoffStartGw: number
  /** Season length in GWs */
  seasonGws: number
}

export type FantasyIdentity = {
  memberId: string
  displayName: string
}

export type FantasyStoreState = {
  identity: FantasyIdentity
  /** league id -> league */
  leagues: Record<string, FantasyLeague>
  activeLeagueId: string | null
}

export const ALLOWED_TEAM_COUNTS = [4, 6, 8, 10, 12] as const
export const DEFAULT_ROSTER_SPOTS = 15
export const DEFAULT_STARTER_SPOTS = 11
export const SEASON_GWS = 38
/** Last 10 matchweeks: 5 semi + 5 final */
export const PLAYOFF_START_GW = 29
export const SEMI_GWS = [29, 30, 31, 32, 33] as const
export const FINAL_GWS = [34, 35, 36, 37, 38] as const

export const POSITION_LIMITS: Record<FantasyPosition, number> = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
}
