import type { FinanceBlock, FinanceClub } from './types'
import raw from './seasonTimelines2425.json'

export type SeasonEvent = {
  id: string
  date: string
  kind: string
  headline: string
  addBlock?: FinanceBlock
  removeBlockId?: string
  patchBlock?: Partial<FinanceBlock> & { id: string }
  setAgents?: number
  setCoaching?: number
}

export type ClubSeasonTimeline = {
  clubId: string
  openingBlocks: FinanceBlock[]
  events: SeasonEvent[]
  footballRevenueGbp?: number
  playerTradingGbp?: number
  revenueGbp: number
  greenThresholdGbp: number
  redThresholdGbp: number
  uefaThresholdGbp: number | null
  uefa: boolean
  espnTeamId?: string
  name: string
  short: string
  agentFeesGbp: number
  coachingStaffGbp: number
  source?: 'accounts' | 'estimate'
}

export type SeasonTimelinesFile = {
  season: string
  seasonStart: string
  seasonEnd: string
  durationMs: number
  clubs: Record<string, ClubSeasonTimeline>
}

export const SEASON_TIMELINES = raw as SeasonTimelinesFile

const MS_DAY = 86_400_000

export function parseIsoDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function formatSeasonDate(iso: string): string {
  const t = parseIsoDate(iso)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(t)
}

export function isoFromProgress(progress: number, startIso: string, endIso: string): string {
  const start = parseIsoDate(startIso)
  const end = parseIsoDate(endIso)
  const t = start + Math.min(1, Math.max(0, progress)) * (end - start)
  const day = Math.round(t / MS_DAY) * MS_DAY
  const dt = new Date(day)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function sortBlocks(blocks: FinanceBlock[]): FinanceBlock[] {
  return [...blocks].sort((a, b) => b.amountGbp - a.amountGbp)
}

function applyEvent(blocks: Map<string, FinanceBlock>, event: SeasonEvent) {
  if (event.addBlock) {
    blocks.set(event.addBlock.id, { ...event.addBlock })
  }
  if (event.removeBlockId) {
    blocks.delete(event.removeBlockId)
  }
  if (event.patchBlock) {
    const cur = blocks.get(event.patchBlock.id)
    if (cur) {
      blocks.set(event.patchBlock.id, {
        ...cur,
        ...event.patchBlock,
        amountGbp: event.patchBlock.amountGbp ?? cur.amountGbp,
      })
    }
  }
  if (event.setAgents != null) {
    for (const [id, b] of blocks) {
      if (b.kind === 'agents') {
        blocks.set(id, { ...b, amountGbp: event.setAgents })
      }
    }
  }
  if (event.setCoaching != null) {
    for (const [id, b] of blocks) {
      if (b.kind === 'coaching') {
        blocks.set(id, { ...b, amountGbp: event.setCoaching })
      }
    }
  }
}

export function clubStateAtDate(timeline: ClubSeasonTimeline, asOfIso: string): FinanceClub {
  const blocks = new Map<string, FinanceBlock>()
  for (const b of timeline.openingBlocks) {
    blocks.set(b.id, { ...b })
  }
  for (const event of timeline.events) {
    if (event.date <= asOfIso) applyEvent(blocks, event)
  }
  const list = sortBlocks([...blocks.values()])
  const squadCostGbp = list.reduce((s, b) => s + b.amountGbp, 0)
  return {
    id: timeline.clubId,
    short: timeline.short,
    name: timeline.name,
    espnTeamId: timeline.espnTeamId,
    footballRevenueGbp: timeline.footballRevenueGbp,
    playerTradingGbp: timeline.playerTradingGbp,
    revenueGbp: timeline.revenueGbp,
    agentFeesGbp: timeline.agentFeesGbp,
    coachingStaffGbp: timeline.coachingStaffGbp,
    uefa: timeline.uefa,
    source: timeline.source,
    greenThresholdGbp: timeline.greenThresholdGbp,
    redThresholdGbp: timeline.redThresholdGbp,
    uefaThresholdGbp: timeline.uefaThresholdGbp,
    squadCostGbp,
    blocks: list,
  }
}

export function eventsFiredBetween(
  timeline: ClubSeasonTimeline,
  prevIso: string | null,
  nextIso: string,
): SeasonEvent[] {
  return timeline.events.filter((e) => {
    if (e.date > nextIso) return false
    if (prevIso == null) return e.date <= nextIso && e.date >= SEASON_TIMELINES.seasonStart
    return e.date > prevIso && e.date <= nextIso
  })
}
