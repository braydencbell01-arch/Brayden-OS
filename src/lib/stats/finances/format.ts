import type { FinanceCatalog, FinanceClub } from './types'
import catalog from './premierLeague2425.json'

export const PL_FINANCES = catalog as FinanceCatalog

export function formatMoneyGbp(amount: number, compact = true): string {
  if (!compact) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(amount)
  }
  const m = amount / 1_000_000
  if (m >= 100) return `£${m.toFixed(0)}m`
  if (m >= 10) return `£${m.toFixed(1)}m`
  if (m >= 1) return `£${m.toFixed(1)}m`
  return `£${(amount / 1_000).toFixed(0)}k`
}

export function formatMoneyUsd(amountGbp: number, usdPerGbp: number, compact = true): string {
  const usd = amountGbp * usdPerGbp
  if (!compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(usd)
  }
  const m = usd / 1_000_000
  if (m >= 100) return `$${m.toFixed(0)}m`
  if (m >= 10) return `$${m.toFixed(1)}m`
  if (m >= 1) return `$${m.toFixed(1)}m`
  return `$${(usd / 1_000).toFixed(0)}k`
}

export function clubScaleMax(club: FinanceClub): number {
  const lineMax = Math.max(
    club.revenueGbp,
    club.redThresholdGbp,
    club.uefaThresholdGbp ?? 0,
    club.squadCostGbp,
  )
  return lineMax * 1.08
}

export function scrRatio(club: FinanceClub): number {
  if (club.revenueGbp <= 0) return 0
  return club.squadCostGbp / club.revenueGbp
}

const PLAYER_PALETTE = [
  '#7dd3a0',
  '#5bbf8a',
  '#3aa872',
  '#2d8f5f',
  '#9ad4b8',
  '#6bc49a',
  '#4a9e78',
  '#88c9a8',
  '#3f7d62',
  '#a8e0c4',
  '#62b890',
  '#4d9a74',
]

export function blockFill(kind: string, index: number): string {
  if (kind === 'agents') return '#e8b84a'
  if (kind === 'coaching') return '#7a9bb8'
  return PLAYER_PALETTE[index % PLAYER_PALETTE.length]
}
