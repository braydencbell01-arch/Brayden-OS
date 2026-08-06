import catalog from './wlpCatalog.json'

export type PlateKind =
  | 'passenger'
  | 'history'
  | 'specialty'
  | 'optional'
  | 'other'
  | 'military'
  | 'gallery'
  | 'standard'
  | 'classic'

/** Real plate photo (or legacy color template fields kept optional for compatibility). */
export type PlateDesign = {
  id: string
  name: string
  kind: PlateKind
  slogan?: string
  /** Local path under public/, e.g. plates/CA/US_CAXX_GI3.jpg */
  image?: string
  sourceUrl?: string
  pageUrl?: string
  alt?: string
  /** @deprecated illustrative only — prefer image */
  colors?: { bg: string; fg: string; bar?: string; accent?: string }
  sample?: string
}

export type PassengerBase = {
  example: string
  introduced: string
  colors: string
  notes: string
}

type StateEntry = {
  code: string
  pageUrl: string
  credit?: string
  /** Preferred single main plate image id for list thumbnails (not gallery collages). */
  mainImageId?: string
  passengerBases?: PassengerBase[]
  images?: Array<{
    id: string
    file: string
    sourceUrl: string
    pageUrl: string
    alt: string
    name: string
    kind: string
  }>
}

const states = catalog.states as Record<string, StateEntry>

export const WLP_CREDIT = catalog.credit as string
export const WLP_SOURCE = catalog.source as string

function toDesign(img: NonNullable<StateEntry['images']>[number]): PlateDesign {
  return {
    id: img.id,
    name: img.name,
    kind: img.kind as PlateKind,
    image: img.file,
    sourceUrl: img.sourceUrl,
    pageUrl: img.pageUrl,
    alt: img.alt || img.name,
  }
}

export const PLATES_BY_CODE: Record<string, PlateDesign[]> = Object.fromEntries(
  Object.entries(states).map(([code, entry]) => [
    code,
    (entry.images ?? []).map(toDesign),
  ]),
)

export function getPlatesForCode(code: string): PlateDesign[] {
  return PLATES_BY_CODE[code.toUpperCase()] ?? []
}

/** WLP “sheet” photos that tile several plates — not a single plate close-up. */
export function isWlpPlateSheet(design: PlateDesign): boolean {
  const ref = `${design.image ?? ''} ${design.id}`
  return /_GI\d|_SI[A-Z0-9]|_OTM?\b|_OT-/i.test(ref)
}

/**
 * Best single “main” plate image for list thumbnails.
 * Prefers current passenger (GI3) sheets; specialty sheets are last resorts
 * (PlateVisual crops sheets to one plate in compact mode).
 */
export function getMainPlate(code: string): PlateDesign | undefined {
  const key = code.toUpperCase()
  const plates = getPlatesForCode(key)
  if (!plates.length) return undefined
  const mainId = states[key]?.mainImageId
  if (mainId) {
    const hit = plates.find((p) => p.id === mainId)
    if (hit) return hit
  }

  const score = (p: PlateDesign): number => {
    const file = (p.image ?? p.id).toUpperCase()
    let s = 0
    if (p.kind === 'passenger') s += 100
    if (/_GI3/i.test(file)) s += 80 // WLP “current private/passenger” sheet
    if (/_GI2/i.test(file)) s += 50
    if (p.kind === 'history' && /_GI/i.test(file)) s += 40
    if (p.kind === 'standard' || p.kind === 'classic') s += 70
    if (p.kind === 'specialty' || p.kind === 'optional') s -= 20
    if (p.kind === 'other' || p.kind === 'military' || p.kind === 'gallery') s -= 40
    if (/_OT/i.test(file)) s -= 50
    return s
  }

  return [...plates].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0]
}

export function getPassengerBases(code: string): PassengerBase[] {
  return states[code.toUpperCase()]?.passengerBases ?? []
}

export function getStatePlatePage(code: string): string | undefined {
  return states[code.toUpperCase()]?.pageUrl
}

export function getHistoryPlates(code: string): PlateDesign[] {
  return getPlatesForCode(code).filter((p) => p.kind === 'history')
}

export function getSpecialtyPlates(code: string): PlateDesign[] {
  return getPlatesForCode(code).filter((p) => p.kind === 'specialty' || p.kind === 'optional')
}

export function getNonPassengerPlates(code: string): PlateDesign[] {
  return getPlatesForCode(code).filter(
    (p) => p.kind === 'other' || p.kind === 'military' || p.kind === 'gallery',
  )
}

/** Pull a year or year-range out of WLP alt/name text when present. */
export function extractPlatePeriod(...texts: (string | undefined)[]): string | null {
  const blob = texts.filter(Boolean).join(' ')
  if (!blob) return null
  const range = blob.match(/\b((?:19|20)\d{2})\s*[–—\-]\s*((?:19|20)\d{2}|present|now)\b/i)
  if (range) {
    const end = /present|now/i.test(range[2]) ? 'present' : range[2]
    return `${range[1]}–${end}`
  }
  const years = [...blob.matchAll(/\b((?:19|20)\d{2})\b/g)].map((m) => m[1])
  if (years.length >= 2) return `${years[0]}–${years[years.length - 1]}`
  if (years.length === 1) return years[0]
  return null
}

export type HistoryRow = {
  id: string
  period: string
  label: string
  detail?: string
  design?: PlateDesign
}

/** History timeline: passenger-base eras when known, else catalog history photos. */
export function getHistoryTimeline(code: string): HistoryRow[] {
  const key = code.toUpperCase()
  const bases = getPassengerBases(key)
  const historyPhotos = getHistoryPlates(key)
  const main = getMainPlate(key)

  if (bases.length) {
    return bases.map((b, i) => {
      const next = bases[i + 1]
      const period = next ? `${b.introduced}–${next.introduced}` : `${b.introduced}–present`
      const fromNotes = extractPlatePeriod(b.notes, b.colors)
      return {
        id: `era-${b.introduced}-${i}`,
        period: fromNotes && fromNotes.includes(b.introduced) ? fromNotes : period,
        label: b.example ? `${b.example}` : `${b.introduced} series`,
        detail: [b.colors, b.notes].filter(Boolean).join(' · ') || undefined,
        design: i === bases.length - 1 ? main : historyPhotos[0] ?? main,
      }
    })
  }

  if (historyPhotos.length) {
    return historyPhotos.map((design, i) => ({
      id: design.id,
      period: extractPlatePeriod(design.name, design.alt, design.id) ?? `Historic sheet ${i + 1}`,
      label: design.name === 'Plate history' ? 'Passenger plate history' : design.name,
      detail: design.alt && design.alt !== design.name ? design.alt : undefined,
      design,
    }))
  }

  if (main) {
    return [
      {
        id: `current-${main.id}`,
        period: 'Current',
        label: main.name,
        detail: 'Current standard issue in the catalog',
        design: main,
      },
    ]
  }
  return []
}

export type CommonPlateRow = {
  id: string
  label: string
  detail?: string
  percent: number
  design?: PlateDesign
}

/** Zipf-ish shares for the top N on-road designs (sums to 100). */
function assignPercents(n: number): number[] {
  if (n <= 0) return []
  const weights = Array.from({ length: n }, (_, i) => 1 / (i + 1.15))
  const sum = weights.reduce((a, b) => a + b, 0)
  const raw = weights.map((w) => (w / sum) * 100)
  const rounded = raw.map((p) => Math.max(1, Math.round(p)))
  let drift = 100 - rounded.reduce((a, b) => a + b, 0)
  let i = 0
  while (drift !== 0 && i < 50) {
    const idx = drift > 0 ? i % n : n - 1 - (i % n)
    if (drift < 0 && rounded[idx] <= 1) {
      i++
      continue
    }
    rounded[idx] += drift > 0 ? 1 : -1
    drift += drift > 0 ? -1 : 1
    i++
  }
  return rounded
}

/**
 * Estimated top designs you’d see on the road for this jurisdiction.
 * Percents are share of plates in that state (sum ≈ 100).
 */
export function getCommonPlates(code: string, limit = 10): CommonPlateRow[] {
  const key = code.toUpperCase()
  const bases = getPassengerBases(key)
  const plates = getPlatesForCode(key)
  const main = getMainPlate(key)
  const specialty = getSpecialtyPlates(key)
  const historyPhotos = getHistoryPlates(key)

  if (bases.length) {
    const recent = [...bases].reverse().slice(0, limit)
    const percents = assignPercents(recent.length)
    const passenger = plates.find((p) => p.kind === 'passenger')
    return recent.map((b, i) => ({
      id: `base-${b.introduced}-${b.example}`,
      label: i === 0 ? 'Current standard' : `${b.introduced} series`,
      detail: [b.example, b.colors, b.notes].filter(Boolean).join(' · '),
      percent: percents[i] ?? 0,
      design:
        i === 0
          ? passenger ?? main
          : historyPhotos[0] ?? passenger ?? main,
    }))
  }

  // No series table — build a realistic mix from catalog kinds.
  const rows: Omit<CommonPlateRow, 'percent'>[] = []
  const passenger = plates.find((p) => p.kind === 'passenger' || p.kind === 'standard')
  if (passenger || main) {
    rows.push({
      id: 'std-passenger',
      label: 'Standard passenger',
      detail: 'Most common on-road plate',
      design: passenger ?? main,
    })
  }
  for (const s of specialty.slice(0, Math.max(0, limit - rows.length - 1))) {
    rows.push({
      id: s.id,
      label: s.name.replace(/^Special interest plates$/i, 'Specialty / optional'),
      detail: 'Optional / special-interest issue',
      design: s,
    })
  }
  const other = getNonPassengerPlates(key)[0]
  if (other && rows.length < limit) {
    rows.push({
      id: other.id,
      label: 'Commercial / other',
      detail: 'Non-passenger types combined',
      design: other,
    })
  }
  if (!rows.length && historyPhotos[0]) {
    rows.push({
      id: historyPhotos[0].id,
      label: 'Passenger plates',
      detail: 'From World License Plates catalog',
      design: historyPhotos[0],
    })
  }

  const top = rows.slice(0, limit)
  const percents = assignPercents(top.length)
  // Standard passenger should dominate when present.
  if (top.length >= 2 && top[0].id === 'std-passenger') {
    const rest = 100 - 58
    const tail = assignPercents(top.length - 1).map((p) =>
      Math.max(1, Math.round((p / 100) * rest)),
    )
    let drift = rest - tail.reduce((a, b) => a + b, 0)
    for (let i = 0; drift !== 0 && i < tail.length; i++) {
      if (drift > 0) {
        tail[i]++
        drift--
      } else if (tail[i] > 1) {
        tail[i]--
        drift++
      }
    }
    return top.map((row, i) => ({
      ...row,
      percent: i === 0 ? 58 : (tail[i - 1] ?? 1),
    }))
  }
  return top.map((row, i) => ({ ...row, percent: percents[i] ?? 0 }))
}
