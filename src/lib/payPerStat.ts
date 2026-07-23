/**
 * Pay-per-stat estimates using FPL cost (£m) as a transparent proxy —
 * not Transfermarkt market value. Labelled clearly in UI.
 */

export type PayPerStat = {
  costMillions: number
  goals: number
  assists: number
  totalPoints: number
  perGoal: number | null
  perAssist: number | null
  perPoint: number | null
  perGoalAssist: number | null
  label: string
  disclaimer: string
}

export function computePayPerStat(input: {
  cost: number
  goals?: number
  assists?: number
  totalPoints?: number
  name?: string
}): PayPerStat {
  const goals = Math.max(0, input.goals ?? 0)
  const assists = Math.max(0, input.assists ?? 0)
  const totalPoints = Math.max(0, input.totalPoints ?? 0)
  const ga = goals + assists
  const costMillions = input.cost

  return {
    costMillions,
    goals,
    assists,
    totalPoints,
    perGoal: goals > 0 ? costMillions / goals : null,
    perAssist: assists > 0 ? costMillions / assists : null,
    perPoint: totalPoints > 0 ? (costMillions * 1_000_000) / totalPoints : null,
    perGoalAssist: ga > 0 ? costMillions / ga : null,
    label: `${input.name || 'Player'} value efficiency`,
    disclaimer:
      'Estimate from Fantasy Premier League price (£m), not Transfermarkt market value.',
  }
}

export function formatMillions(value: number): string {
  if (value >= 10) return `£${value.toFixed(1)}m`
  if (value >= 1) return `£${value.toFixed(2)}m`
  return `£${(value * 1000).toFixed(0)}k`
}

export function formatPounds(value: number): string {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(2)}m`
  if (value >= 1_000) return `£${(value / 1_000).toFixed(1)}k`
  return `£${Math.round(value)}`
}
