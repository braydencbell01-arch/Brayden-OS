/**
 * Pitch layout helpers for formation strings like "4-3-3".
 * Attack is toward the top of the pitch (low y); GK at the bottom (high y).
 *
 * Prefer Opta `formationPlace` slot maps (ESPN / Stats Perform numbering).
 * Fall back to position abbreviations when the formation is unknown.
 */

import { OPTA_FORMATION_SLOTS } from './optaFormationSlots'

export function parseFormationRows(formation: string): number[] {
  const rows = formation
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 6)
  const total = rows.reduce((sum, n) => sum + n, 0)
  if (total !== 10) return [4, 4, 2]
  return rows
}

/** Normalize "4-3-3", "433", "4–3–3" into lookup keys. */
export function normalizeFormationKey(formation: string): string {
  const trimmed = formation.trim()
  const digits = trimmed.replace(/[^0-9]/g, '')
  if (!digits) return trimmed
  const hyphenated = trimmed
    .replace(/[–—−]/g, '-')
    .replace(/[^0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return hyphenated || digits
}

function formationSlotMap(
  formation: string,
): Record<number, [number, number]> | null {
  const key = normalizeFormationKey(formation)
  const digits = key.replace(/[^0-9]/g, '')
  const map = OPTA_FORMATION_SLOTS[key] || OPTA_FORMATION_SLOTS[digits]
  return map ?? null
}

/** Left→right ordering within a pitch row (LB … CB … RB). */
function laneScore(abbrev: string): number {
  const a = abbrev.toUpperCase()
  if (/^(LB|LWB|LF|LW|LAM|AML|LM|LCM|LDM|CD-L|CB-L|LCB)$/.test(a)) return -2
  if (/^(RB|RWB|RF|RW|RAM|AMR|RM|RCM|RDM|CD-R|CB-R|RCB)$/.test(a)) return 2
  if (/^(CD-L|CB-L|LCB)$/.test(a)) return -1
  if (/^(CD-R|CB-R|RCB)$/.test(a)) return 1
  if (a.includes('L') && !a.includes('R')) return -1
  if (a.includes('R') && !a.includes('L')) return 1
  return 0
}

function isGoalkeeper(abbrev: string): boolean {
  const a = abbrev.toUpperCase()
  return a === 'G' || a === 'GK'
}

/**
 * 0 = defense … n-1 = furthest forward for an n-line formation.
 * Aligns with `positionGroupFromAbbrev` so CDM/DM stay midfield, LW/RW attack, CF forward.
 */
function preferredRowIndex(abbrev: string, rowCount: number): number {
  const a = abbrev.toUpperCase()
  if (isGoalkeeper(a)) return 0
  if (
    /^(CD|CB|LB|RB|LWB|RWB|SW)/.test(a) ||
    a === 'D' ||
    (/^D/.test(a) && !/^(DM|CDM|LDM|RDM)/.test(a))
  ) {
    return 0
  }
  if (/^(ST|F|SS|CF|RCF|LCF)$/.test(a) || a === 'A' || /^S/.test(a)) {
    return Math.max(0, rowCount - 1)
  }
  if (/^(LW|RW|LWF|RWF|LF|RF|W)$/.test(a)) {
    return Math.max(0, rowCount - 1)
  }
  if (/^(AM|CAM|LAM|RAM|AML|AMR|CF)/.test(a)) {
    return Math.max(0, rowCount - 2)
  }
  if (/^(CDM|LDM|RDM|DM)/.test(a)) {
    return rowCount >= 4 ? 1 : 0
  }
  if (/^(LM|RM|CM|M)/.test(a)) {
    return rowCount >= 4 ? Math.min(2, rowCount - 1) : Math.min(1, rowCount - 1)
  }
  return Math.min(1, rowCount - 1)
}

export type PitchablePlayer = {
  id: string
  positionAbbrev: string
  formationPlace: number
}

function layoutByOptaSlots<T extends PitchablePlayer>(
  slots: Record<number, [number, number]>,
  players: T[],
): Array<T & { x: number; y: number }> | null {
  const placed: Array<T & { x: number; y: number }> = []
  const missing: T[] = []

  for (const player of players) {
    const xy = slots[player.formationPlace]
    if (!xy) {
      missing.push(player)
      continue
    }
    placed.push({ ...player, x: xy[0], y: xy[1] })
  }

  // Most used XI should usually hit every Opta slot; if more than two miss, fall back.
  if (missing.length > 2 || placed.length < 8) return null

  if (missing.length > 0) {
    const used = new Set(placed.map((p) => p.formationPlace))
    const freeSlots = Object.entries(slots)
      .map(([place, xy]) => ({ place: Number(place), xy }))
      .filter((entry) => !used.has(entry.place))
    missing.forEach((player, index) => {
      const slot = freeSlots[index]
      if (!slot) return
      placed.push({ ...player, x: slot.xy[0], y: slot.xy[1] })
    })
  }

  return placed.length > 0 ? placed : null
}

/**
 * Abbreviation-based fallback when Opta slots are unavailable.
 * Places by line preference without destructive rebalancing that scrambles roles.
 */
function layoutByAbbrevFallback<T extends PitchablePlayer>(
  formation: string,
  players: T[],
): Array<T & { x: number; y: number }> {
  if (players.length === 0) return []

  const rowSizes = parseFormationRows(formation)
  const gk =
    players.find((player) => isGoalkeeper(player.positionAbbrev)) ||
    players.find((player) => player.formationPlace === 1) ||
    players[0]
  const outfield = players
    .filter((player) => player.id !== gk.id)
    .slice()
    .sort(
      (a, b) =>
        a.formationPlace - b.formationPlace || a.id.localeCompare(b.id),
    )

  const buckets: T[][] = rowSizes.map(() => [])
  for (const player of outfield) {
    const idx = Math.min(
      rowSizes.length - 1,
      Math.max(0, preferredRowIndex(player.positionAbbrev, rowSizes.length)),
    )
    buckets[idx].push(player)
  }

  // Soft rebalance: only move extras from overfull rows into underfull ones.
  for (let i = 0; i < buckets.length; i += 1) {
    while (buckets[i].length > rowSizes[i]) {
      const target = buckets.findIndex(
        (bucket, index) => index !== i && bucket.length < rowSizes[index],
      )
      if (target < 0) break
      const extra = buckets[i].pop()!
      buckets[target].push(extra)
    }
  }

  const sortLane = (list: T[]) =>
    list
      .slice()
      .sort(
        (a, b) =>
          laneScore(a.positionAbbrev) - laneScore(b.positionAbbrev) ||
          a.formationPlace - b.formationPlace,
      )

  const placed: Array<T & { x: number; y: number }> = []
  const bandCount = rowSizes.length + 1

  buckets.forEach((bucket, rowIndex) => {
    const row = sortLane(bucket)
    const bandFromAttack = rowSizes.length - rowIndex
    const y = (bandFromAttack / bandCount) * 76 + 10
    row.forEach((player, index) => {
      const x = row.length === 1 ? 50 : ((index + 0.5) / row.length) * 82 + 9
      placed.push({ ...player, x, y })
    })
  })

  placed.push({ ...gk, x: 50, y: 91 })
  return placed
}

/**
 * Assign x/y (0–100) for players in a formation.
 */
export function layoutPlayersOnPitch<T extends PitchablePlayer>(
  formation: string,
  players: T[],
): Array<T & { x: number; y: number }> {
  if (players.length === 0) return []

  const slots = formationSlotMap(formation)
  if (slots) {
    const opta = layoutByOptaSlots(slots, players)
    if (opta) return opta
  }

  return layoutByAbbrevFallback(formation, players)
}

/** Next free Opta / sequential place for filler XI players. */
export function nextOpenFormationPlaces(
  formation: string,
  usedPlaces: Iterable<number>,
  count: number,
): number[] {
  const used = new Set(
    [...usedPlaces].filter((n) => Number.isFinite(n) && n > 0),
  )
  const slots = formationSlotMap(formation)
  const candidates = slots
    ? Object.keys(slots)
        .map(Number)
        .sort((a, b) => a - b)
    : Array.from({ length: 11 }, (_, i) => i + 1)

  const open: number[] = []
  for (const place of candidates) {
    if (used.has(place)) continue
    open.push(place)
    if (open.length >= count) return open
  }
  let next = 12
  while (open.length < count) {
    if (!used.has(next)) open.push(next)
    next += 1
  }
  return open
}
