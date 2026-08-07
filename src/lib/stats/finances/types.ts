export type FinanceBlockKind = 'player' | 'agents' | 'coaching'

export type FinanceBlock = {
  id: string
  kind: FinanceBlockKind
  label: string
  amountGbp: number
  wageGbp?: number
  amortGbp?: number
}

export type FinanceClub = {
  id: string
  short: string
  name: string
  revenueGbp: number
  agentFeesGbp: number
  coachingStaffGbp: number
  uefa: boolean
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
