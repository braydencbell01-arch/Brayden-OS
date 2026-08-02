export type FantasyPosition = 'GKP' | 'DEF' | 'MID' | 'FWD'
export type DraftMode = 'snake' | 'auction'
export type ScoringPreset = 'classic' | 'offense' | 'clean_sheet'
/** Survival = weekly club pick LMS. H2H = American FF draft league. */
export type FantasyGameMode = 'survival' | 'h2h'

export type LeaguePhase =
  | 'lobby'
  | 'draft_setup'
  | 'drafting'
  | 'regular'
  | 'semifinals'
  | 'finals'
  | 'complete'

export type SurvivalPickResult = 'W' | 'D' | 'L' | 'bye' | 'pending'

export type SurvivalPick = {
  gw: number
  /** FPL team id from the catalog. */
  teamId: number
  result?: SurvivalPickResult
  survived?: boolean
}

export type SurvivalSettings = {
  /** Losses allowed before elimination (1 = classic last man standing). */
  lives: number
  /** When true, a draw keeps you alive (“must not lose”). */
  drawCountsAsSurvive: boolean
  startGw: number
  endGw: number
  /** If a picked club does not play that GW, survive (true) or count as a loss. */
  byeCountsAsSurvive: boolean
}

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
  draftQueue?: number[]
  /** Injured reserve stash. IR players are not counted in roster length. */
  ir?: number[]
  auctionBudget?: number
  /** When on, picks fire automatically on your turn (season-proj best fit). */
  autodraft: boolean
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  /** Survival mode: weekly club picks (each club at most once). */
  survivalPicks?: SurvivalPick[]
  survivalLivesRemaining?: number
  eliminatedAtGw?: number
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
  status: 'pending' | 'veto_pending' | 'accepted' | 'rejected' | 'canceled' | 'vetoed'
  createdAt: number
  resolvedAt?: number
  acceptedAt?: number
  vetoDeadlineAt?: number
  /** Member ids voting to veto. Trade parties cannot vote. */
  vetoVotes?: string[]
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

export type ActivityEvent = {
  id: string
  at: number
  type: string
  message: string
  memberId?: string
}

export type FantasyLeague = {
  id: string
  inviteCode: string
  syncBlobId?: string
  name: string
  competition: 'premier-league'
  /** Defaults to survival for new leagues; older saves normalize to h2h. */
  gameMode: FantasyGameMode
  createdAt: number
  updatedAt: number
  commissionerId: string
  teamCount: number
  rosterSpots: number
  starterSpots: number
  draftMode: DraftMode
  scoringPreset: ScoringPreset
  survival: SurvivalSettings
  /** Survival GWs where picks are locked (no further changes). */
  survivalLockedGws: number[]
  /** Survival GWs that have been scored against club results. */
  survivalScoredGws: number[]
  activity: ActivityEvent[]
  tradeVetoHours: number
  autoScore: boolean
  lineupLockedGws: number[]
  auctionBudget: number
  auctionNomPlayerId?: number
  auctionHighBid?: number
  auctionHighBidderId?: string
  auctionBidDeadlineAt?: number
  auctionNominatingMemberId?: string
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
/** Survival lobbies can be larger than H2H (no weekly matchup pairing). */
export const ALLOWED_SURVIVAL_TEAM_COUNTS = [2, 4, 6, 8, 10, 12, 16, 20] as const
export const ALLOWED_SURVIVAL_LIVES = [1, 2, 3] as const
/** Fantasy-football depth: 11 starters + 7 bench. */
export const DEFAULT_ROSTER_SPOTS = 18
export const DEFAULT_STARTER_SPOTS = 11
export const DEFAULT_DRAFT_CLOCK_SECONDS = 90
export const ALLOWED_DRAFT_CLOCKS = [30, 60, 90, 120] as const
export const SEASON_GWS = 38
export const PLAYOFF_START_GW = 29
export const SEMI_GWS = [29, 30, 31, 32, 33] as const
export const FINAL_GWS = [34, 35, 36, 37, 38] as const
export const MAX_IR_SLOTS = 2
export const DEFAULT_TRADE_VETO_HOURS = 24
export const DEFAULT_AUCTION_BUDGET = 200
export const ACTIVITY_LIMIT = 80
export const DEFAULT_GAME_MODE: FantasyGameMode = 'survival'

export function defaultSurvivalSettings(overrides?: Partial<SurvivalSettings>): SurvivalSettings {
  return {
    lives: 1,
    drawCountsAsSurvive: true,
    startGw: 1,
    endGw: SEASON_GWS,
    byeCountsAsSurvive: true,
    ...overrides,
  }
}

/** Max on full roster (must sum to DEFAULT_ROSTER_SPOTS). */
export const POSITION_LIMITS: Record<FantasyPosition, number> = {
  GKP: 2,
  DEF: 6,
  MID: 6,
  FWD: 4,
}

/**
 * American-style XI:
 * - 1 GKP
 * - 3-5 DEF
 * - 2-4 MID rigid slots
 * - 1-2 FWD rigid slots
 * - exactly 1 FLEX, and FLEX must be MID or FWD
 *
 * STARTER_MIN/MAX describe the rigid positional bands; lineup validation applies
 * STARTER_FLEX_SLOTS on top, so effective caps are MID 5 and FWD 3.
 */
export const STARTER_MIN: Record<FantasyPosition, number> = {
  GKP: 1,
  DEF: 3,
  MID: 2,
  FWD: 1,
}

export const STARTER_MAX: Record<FantasyPosition, number> = {
  GKP: 1,
  DEF: 5,
  MID: 4,
  FWD: 2,
}

export const STARTER_FLEX_SLOTS = 1
export const FLEX_POSITIONS: FantasyPosition[] = ['MID', 'FWD']
