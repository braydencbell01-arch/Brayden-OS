/**
 * Pitch layout helpers for formation strings like "3-4-2-1".
 * Attack is toward the top of the pitch (low y); GK at the bottom (high y).
 */

export function parseFormationRows(formation: string): number[] {
  const rows = formation
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 6)
  const total = rows.reduce((sum, n) => sum + n, 0)
  if (total !== 10) return [4, 4, 2]
  return rows
}

function laneScore(abbrev: string): number {
  const a = abbrev.toUpperCase()
  if (a.includes('L') && !a.includes('R')) return -1
  if (a.includes('R') && !a.includes('L')) return 1
  return 0
}

function isGoalkeeper(abbrev: string): boolean {
  const a = abbrev.toUpperCase()
  return a === 'G' || a === 'GK'
}

/** 0 = defense … n-1 = furthest forward for an n-line formation. */
function preferredRowIndex(abbrev: string, rowCount: number): number {
  const a = abbrev.toUpperCase()
  if (/^(CD|CB|LB|RB|LWB|RWB|SW)/.test(a) || a === 'D') return 0
  if (/^(ST|F|SS)$/.test(a) || a === 'A') return Math.max(0, rowCount - 1)
  if (/^(CF|AM|CAM)/.test(a)) return Math.max(0, rowCount - 2)
  if (/^(LM|RM|CM|DM|M|W|LW|RW)/.test(a)) {
    // Prefer central mid band; for 4-line shapes use the second row.
    return rowCount >= 4 ? 1 : Math.min(1, rowCount - 1)
  }
  return Math.min(1, rowCount - 1)
}

export type PitchablePlayer = {
  id: string
  positionAbbrev: string
  formationPlace: number
}

/**
 * Assign x/y (0–100) for players in a formation.
 */
export function layoutPlayersOnPitch<T extends PitchablePlayer>(
  formation: string,
  players: T[],
): Array<T & { x: number; y: number }> {
  if (players.length === 0) return []

  const rowSizes = parseFormationRows(formation)
  const gk =
    players.find((player) => isGoalkeeper(player.positionAbbrev)) || players[0]
  const outfield = players
    .filter((player) => player.id !== gk.id)
    .slice()
    .sort((a, b) => a.formationPlace - b.formationPlace || a.id.localeCompare(b.id))

  const buckets: T[][] = rowSizes.map(() => [])
  for (const player of outfield) {
    const idx = Math.min(
      rowSizes.length - 1,
      Math.max(0, preferredRowIndex(player.positionAbbrev, rowSizes.length)),
    )
    buckets[idx].push(player)
  }

  // Rebalance to match formation widths.
  for (let i = 0; i < buckets.length; i += 1) {
    while (buckets[i].length > rowSizes[i]) {
      const extra = buckets[i].pop()!
      const target =
        buckets.findIndex((bucket, index) => index !== i && bucket.length < rowSizes[index])
      if (target >= 0) buckets[target].push(extra)
      else break
    }
  }
  for (let i = 0; i < buckets.length; i += 1) {
    while (buckets[i].length < rowSizes[i]) {
      const donor = buckets.findIndex(
        (bucket, index) => index !== i && bucket.length > rowSizes[index],
      )
      if (donor < 0) break
      buckets[i].push(buckets[donor].pop()!)
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
    // Defense is row 0 → near GK (high y); last row is attack (low y).
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
