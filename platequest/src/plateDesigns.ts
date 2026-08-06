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
  const plates = getPlatesForCode(code)
  return plates.find((p) => p.kind === 'passenger') ?? plates[0]
}

export function getPassengerBases(code: string): PassengerBase[] {
  return states[code.toUpperCase()]?.passengerBases ?? []
}

export function getStatePlatePage(code: string): string | undefined {
  return states[code.toUpperCase()]?.pageUrl
}
