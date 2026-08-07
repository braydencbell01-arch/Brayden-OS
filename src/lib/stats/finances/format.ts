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
  // Scale so the Red 115% line is the chart ceiling when SCR ≤ 115%.
  // At exactly 115%, stack top and the 115% line meet at the top of the chart.
  // Above 115%, the chart grows with squad cost and the red line sits lower.
  return Math.max(club.redThresholdGbp, club.squadCostGbp)
}

export function scrRatio(club: FinanceClub): number {
  if (club.revenueGbp <= 0) return 0
  return club.squadCostGbp / club.revenueGbp
}

/** Distinct segment colors (Bucks-style variety, pitch-friendly). */
const PLAYER_PALETTE = [
  '#1d4f91',
  '#c43c3c',
  '#3d9b6e',
  '#d4a017',
  '#5b4fc9',
  '#2a8f9e',
  '#c45c2a',
  '#6b8f3d',
  '#8b5a8c',
  '#3a6ea5',
  '#b85c6e',
  '#4a7c59',
  '#9a6b2f',
  '#5c6bc0',
  '#00897b',
  '#af5a3c',
]

export function blockFill(kind: string, index: number): string {
  if (kind === 'agents') return '#c9a227'
  if (kind === 'coaching') return '#5a7a94'
  return PLAYER_PALETTE[index % PLAYER_PALETTE.length]
}

export function axisTicks(scaleMax: number, step = 10_000_000): number[] {
  const ticks: number[] = []
  for (let v = 0; v <= scaleMax; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] < scaleMax * 0.98) ticks.push(Math.round(scaleMax / step) * step)
  return ticks
}
