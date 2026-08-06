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

export function getMainPlate(code: string): PlateDesign | undefined {
  const key = code.toUpperCase()
  const plates = getPlatesForCode(key)
  if (!plates.length) return undefined
  const mainId = states[key]?.mainImageId
  if (mainId) {
    const hit = plates.find((p) => p.id === mainId)
    if (hit) return hit
  }
  // Avoid WLP gallery collage sheets (GI*) when picking a fallback thumbnail.
  const singles = plates.filter((p) => !/_GI\d/i.test(p.image ?? p.id))
  const pool = singles.length ? singles : plates
  return (
    pool.find((p) => p.kind === 'passenger') ??
    pool.find((p) => p.kind === 'specialty') ??
    pool.find((p) => p.kind === 'history') ??
    pool[0]
  )
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
 * Uses passenger-base history when present (newest = most common); otherwise
 * ranks catalog photos with passenger / standard preferred.
 */
export function getCommonPlates(code: string, limit = 10): CommonPlateRow[] {
  const key = code.toUpperCase()
  const bases = getPassengerBases(key)
  if (bases.length) {
    const recent = [...bases].reverse().slice(0, limit)
    const percents = assignPercents(recent.length)
    const plates = getPlatesForCode(key)
    const passenger = plates.find((p) => p.kind === 'passenger')
    return recent.map((b, i) => ({
      id: `base-${b.introduced}-${b.example}`,
      label: `${b.introduced} series`,
      detail: [b.example, b.colors, b.notes].filter(Boolean).join(' · '),
      percent: percents[i] ?? 0,
      design: i === 0 ? passenger ?? getMainPlate(key) : undefined,
    }))
  }

  const plates = getPlatesForCode(key)
  const ranked = [...plates].sort((a, b) => {
    const rank = (k: PlateKind) =>
      k === 'passenger' || k === 'standard' || k === 'classic'
        ? 0
        : k === 'specialty' || k === 'optional'
          ? 1
          : k === 'history'
            ? 3
            : 2
    const d = rank(a.kind) - rank(b.kind)
    if (d !== 0) return d
    return a.name.localeCompare(b.name)
  })
  const top = ranked.slice(0, limit)
  const percents = assignPercents(top.length)
  return top.map((design, i) => ({
    id: design.id,
    label: design.name,
    detail: design.kind,
    percent: percents[i] ?? 0,
    design,
  }))
}
