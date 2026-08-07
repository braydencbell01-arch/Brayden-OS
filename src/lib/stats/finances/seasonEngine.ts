import type { FinanceBlock, FinanceClub } from './types'
import raw from './seasonTimelines2425.json'

export type SeasonEvent = {
  id: string
  date: string
  kind: string
  headline: string
  addBlock?: FinanceBlock
  removeBlockId?: string
  /** Snapshot for reversing removals / offseason. */
  removedBlock?: FinanceBlock
  patchBlock?: Partial<FinanceBlock> & { id: string }
  /** Previous patch snapshot for reverse (optional). */
  prevPatch?: Partial<FinanceBlock> & { id: string }
  setAgents?: number
  setCoaching?: number
  /** Loan out: keep bar, mark away + reduce cost. */
  loanBlockId?: string
  loanAmountGbp?: number
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

export type PlayMode = 'season' | 'offseason'

export const SEASON_TIMELINES = raw as SeasonTimelinesFile

/** In-season: 1 Aug 2024 → 31 Jul 2025 */
export const SEASON_RANGE = {
  start: '2024-08-01',
  end: '2025-07-31',
  durationMs: 60_000,
} as const

/** Summer offseason / window: 1 Jun 2024 → 31 Aug 2024 */
export const OFFSEASON_RANGE = {
  start: '2024-06-01',
  end: '2024-08-31',
  durationMs: 60_000,
} as const

export function rangeForMode(mode: PlayMode) {
  return mode === 'offseason' ? OFFSEASON_RANGE : SEASON_RANGE
}

const MS_DAY = 86_400_000
const SEASON_OPEN = '2024-08-01'

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
  const dt = new Date(Math.min(Math.max(day, start), end))
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function progressFromIso(iso: string, startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso)
  const end = parseIsoDate(endIso)
  if (end <= start) return 0
  return Math.min(1, Math.max(0, (parseIsoDate(iso) - start) / (end - start)))
}

function sortBlocks(blocks: FinanceBlock[]): FinanceBlock[] {
  return [...blocks].sort((a, b) => b.amountGbp - a.amountGbp)
}

/** Normalize raw JSON events: loans keep a dimmed bar. */
export function normalizeTimeline(timeline: ClubSeasonTimeline): ClubSeasonTimeline {
  const openingById = new Map(timeline.openingBlocks.map((b) => [b.id, b]))
  const events = timeline.events.map((e) => {
    const isLoan =
      e.kind === 'loan' ||
      (/loan/i.test(e.headline) && (e.kind === 'departure' || !!e.removeBlockId))
    if (isLoan) {
      const id = e.loanBlockId || e.removeBlockId
      if (!id) return e
      const src =
        e.removedBlock ||
        openingById.get(id) ||
        timeline.events.find((x) => x.addBlock?.id === id)?.addBlock
      const full = src?.amountGbp ?? 8_000_000
      return {
        ...e,
        kind: 'loan',
        loanBlockId: id,
        removeBlockId: undefined,
        loanAmountGbp: Math.round(full * 0.4),
        removedBlock: src ? { ...src } : e.removedBlock,
      } satisfies SeasonEvent
    }
    if (e.removeBlockId && !e.removedBlock) {
      const snap = openingById.get(e.removeBlockId)
      if (snap) return { ...e, removedBlock: { ...snap } }
    }
    return e
  })
  return { ...timeline, events }
}

function applyEvent(blocks: Map<string, FinanceBlock>, event: SeasonEvent) {
  if (event.addBlock) {
    blocks.set(event.addBlock.id, { ...event.addBlock, away: false })
  }
  if (event.kind === 'loan' && event.loanBlockId) {
    const cur = blocks.get(event.loanBlockId) || event.removedBlock
    if (cur) {
      blocks.set(event.loanBlockId, {
        ...cur,
        away: true,
        amountGbp: event.loanAmountGbp ?? Math.round(cur.amountGbp * 0.4),
      })
    }
    return
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
      if (b.kind === 'agents') blocks.set(id, { ...b, amountGbp: event.setAgents })
    }
  }
  if (event.setCoaching != null) {
    for (const [id, b] of blocks) {
      if (b.kind === 'coaching') blocks.set(id, { ...b, amountGbp: event.setCoaching })
    }
  }
}

function reverseEvent(blocks: Map<string, FinanceBlock>, event: SeasonEvent) {
  if (event.kind === 'loan' && event.loanBlockId) {
    const snap = event.removedBlock
    if (snap) {
      blocks.set(event.loanBlockId, { ...snap, away: false })
    } else {
      const cur = blocks.get(event.loanBlockId)
      if (cur) {
        blocks.set(event.loanBlockId, {
          ...cur,
          away: false,
          amountGbp: Math.round(cur.amountGbp / 0.4),
        })
      }
    }
    return
  }
  if (event.addBlock) {
    blocks.delete(event.addBlock.id)
  }
  if (event.removeBlockId && event.removedBlock) {
    blocks.set(event.removeBlockId, { ...event.removedBlock, away: false })
  } else if (event.removeBlockId) {
    // can't restore without snapshot
  }
  if (event.setAgents != null) {
    // approximate: leave as-is when reversing offseason pre-open (rare)
  }
}

export function clubStateAtDate(timeline: ClubSeasonTimeline, asOfIso: string): FinanceClub {
  const tl = normalizeTimeline(timeline)
  const blocks = new Map<string, FinanceBlock>()
  for (const b of tl.openingBlocks) {
    blocks.set(b.id, { ...b, away: false })
  }

  if (asOfIso >= SEASON_OPEN) {
    for (const event of tl.events) {
      if (event.date <= asOfIso) applyEvent(blocks, event)
    }
  } else {
    // Before Aug 1: undo events that happen after asOf up through season open.
    for (const event of [...tl.events].reverse()) {
      if (event.date > asOfIso && event.date <= SEASON_OPEN) {
        reverseEvent(blocks, event)
      }
    }
  }

  const list = sortBlocks([...blocks.values()])
  const squadCostGbp = list.reduce((s, b) => s + b.amountGbp, 0)
  return {
    id: tl.clubId,
    short: tl.short,
    name: tl.name,
    espnTeamId: tl.espnTeamId,
    footballRevenueGbp: tl.footballRevenueGbp,
    playerTradingGbp: tl.playerTradingGbp,
    revenueGbp: tl.revenueGbp,
    agentFeesGbp: tl.agentFeesGbp,
    coachingStaffGbp: tl.coachingStaffGbp,
    uefa: tl.uefa,
    source: tl.source,
    greenThresholdGbp: tl.greenThresholdGbp,
    redThresholdGbp: tl.redThresholdGbp,
    uefaThresholdGbp: tl.uefaThresholdGbp,
    squadCostGbp,
    blocks: list,
  }
}

export function eventsInRange(
  timeline: ClubSeasonTimeline,
  startIso: string,
  endIso: string,
): SeasonEvent[] {
  const tl = normalizeTimeline(timeline)
  return tl.events.filter((e) => e.date >= startIso && e.date <= endIso)
}

export function eventsFiredBetween(
  timeline: ClubSeasonTimeline,
  prevIso: string | null,
  nextIso: string,
  rangeStart: string,
): SeasonEvent[] {
  const tl = normalizeTimeline(timeline)
  return tl.events.filter((e) => {
    if (e.date < rangeStart || e.date > nextIso) return false
    if (prevIso == null) return e.date <= nextIso && e.date >= rangeStart
    return e.date > prevIso && e.date <= nextIso
  })
}

/** Diverse palette — assigned stably by id; greedy avoid adjacent clashes at assign time. */
export const BLOCK_PALETTE = [
  '#1d4f91',
  '#c43c3c',
  '#2f9e6b',
  '#d4a017',
  '#6b3fa0',
  '#0d9488',
  '#c45c2a',
  '#3b6ea5',
  '#b85c6e',
  '#5c6b2f',
  '#8b4513',
  '#2563eb',
  '#be123c',
  '#047857',
  '#a16207',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#4d7c0f',
  '#9f1239',
  '#115e59',
  '#92400e',
]

function colorDistance(a: string, b: string): number {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
}

export function assignStableColors(blockIds: string[]): Map<string, string> {
  const map = new Map<string, string>()
  const usedIndex = new Set<number>()
  // Prefer high distance from previous AND next-to-be-assigned neighbor when possible.
  const ordered = [...blockIds]
  for (let i = 0; i < ordered.length; i++) {
    const id = ordered[i]
    let hash = 0
    for (let c = 0; c < id.length; c++) hash = (hash * 31 + id.charCodeAt(c)) >>> 0
    let bestIdx = hash % BLOCK_PALETTE.length
    let bestScore = -1
    const prevColor = i > 0 ? map.get(ordered[i - 1]) : null
    for (let t = 0; t < BLOCK_PALETTE.length; t++) {
      const idx = (hash + t) % BLOCK_PALETTE.length
      const color = BLOCK_PALETTE[idx]
      const distPrev = prevColor ? colorDistance(color, prevColor) : 400
      // Prefer unused palette slots; keep neighbours visually far apart.
      const reusePenalty = usedIndex.has(idx) ? 80 : 0
      const score = distPrev - reusePenalty
      if (score > bestScore) {
        bestScore = score
        bestIdx = idx
      }
    }
    map.set(id, BLOCK_PALETTE[bestIdx])
    usedIndex.add(bestIdx)
  }
  return map
}

export function blockFillStable(
  colors: Map<string, string> | null,
  block: FinanceBlock,
  fallbackIndex: number,
): string {
  if (block.kind === 'agents') return '#c9a227'
  if (block.kind === 'coaching') return '#5a7a94'
  return colors?.get(block.id) ?? BLOCK_PALETTE[fallbackIndex % BLOCK_PALETTE.length]
}
