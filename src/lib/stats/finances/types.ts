export type FinanceBlockKind = 'player' | 'agents' | 'coaching'

export type FinanceBlock = {
  id: string
  kind: FinanceBlockKind
  label: string
  amountGbp: number
  wageGbp?: number
  amortGbp?: number
  /** On loan / not in squad but still a squad-cost hit. */
  away?: boolean
}

export type FinanceClub = {
  id: string
  short: string
  name: string
  espnTeamId?: string
  footballRevenueGbp?: number
  playerTradingGbp?: number
  revenueGbp: number
  agentFeesGbp: number
  coachingStaffGbp: number
  uefa: boolean
  source?: 'accounts' | 'estimate'
  greenThresholdGbp: number
  redThresholdGbp: number
  uefaThresholdGbp: number | null
  squadCostGbp: number
  blocks: FinanceBlock[]
}

export type FinanceCatalog = {
  season: string
  league: string
  currency: string
  usdPerGbp: number
  scrGreenRatio: number
  scrRedRatio: number
  uefaScrRatio: number
  sources: string[]
  disclaimer: string
  clubs: FinanceClub[]
}
