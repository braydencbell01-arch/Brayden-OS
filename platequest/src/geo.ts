/** Town search (Nominatim) + route/population rarity for road-trip scoring. */

export type Place = {
  id: string
  label: string
  lat: number
  lon: number
}

/** Approximate geographic centers for passenger-plate jurisdictions. */
export const STATE_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  AL: { lat: 32.8, lon: -86.8 },
  AK: { lat: 64.2, lon: -149.5 },
  AZ: { lat: 34.3, lon: -111.7 },
  AR: { lat: 34.9, lon: -92.4 },
  CA: { lat: 37.2, lon: -119.5 },
  CO: { lat: 39.0, lon: -105.5 },
  CT: { lat: 41.6, lon: -72.7 },
  DE: { lat: 39.0, lon: -75.5 },
  FL: { lat: 28.1, lon: -81.7 },
  GA: { lat: 32.7, lon: -83.4 },
  HI: { lat: 20.8, lon: -156.3 },
  ID: { lat: 44.4, lon: -114.7 },
  IL: { lat: 40.0, lon: -89.2 },
  IN: { lat: 39.9, lon: -86.3 },
  IA: { lat: 42.0, lon: -93.5 },
  KS: { lat: 38.5, lon: -98.3 },
  KY: { lat: 37.5, lon: -85.3 },
  LA: { lat: 31.1, lon: -92.0 },
  ME: { lat: 45.3, lon: -69.2 },
  MD: { lat: 39.0, lon: -76.8 },
  MA: { lat: 42.3, lon: -71.8 },
  MI: { lat: 44.3, lon: -85.4 },
  MN: { lat: 46.3, lon: -94.3 },
  MS: { lat: 32.7, lon: -89.7 },
  MO: { lat: 38.4, lon: -92.5 },
  MT: { lat: 47.0, lon: -109.6 },
  NE: { lat: 41.5, lon: -99.8 },
  NV: { lat: 39.3, lon: -116.6 },
  NH: { lat: 43.7, lon: -71.6 },
  NJ: { lat: 40.2, lon: -74.7 },
  NM: { lat: 34.4, lon: -106.1 },
  NY: { lat: 42.9, lon: -75.5 },
  NC: { lat: 35.6, lon: -79.4 },
  ND: { lat: 47.5, lon: -100.5 },
  OH: { lat: 40.3, lon: -82.8 },
  OK: { lat: 35.6, lon: -97.5 },
  OR: { lat: 44.0, lon: -120.5 },
  PA: { lat: 40.9, lon: -77.8 },
  RI: { lat: 41.7, lon: -71.6 },
  SC: { lat: 33.9, lon: -80.9 },
  SD: { lat: 44.4, lon: -100.2 },
  TN: { lat: 35.9, lon: -86.0 },
  TX: { lat: 31.5, lon: -99.3 },
  UT: { lat: 39.3, lon: -111.7 },
  VT: { lat: 44.1, lon: -72.7 },
  VA: { lat: 37.5, lon: -78.9 },
  WA: { lat: 47.4, lon: -120.5 },
  WV: { lat: 38.6, lon: -80.6 },
  WI: { lat: 44.5, lon: -89.7 },
  WY: { lat: 43.0, lon: -107.6 },
  DC: { lat: 38.9, lon: -77.0 },
}

function toRad(d: number) {
  return (d * Math.PI) / 180
}

/** Great-circle distance in miles. */
export function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Shortest distance from point P to segment AB (approx on sphere via local projection). */
export function distanceToSegmentMiles(
  p: { lat: number; lon: number },
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const ax = a.lon
  const ay = a.lat
  const bx = b.lon
  const by = b.lat
  const px = p.lon
  const py = p.lat
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 < 1e-12) return haversineMiles(p, a)
  let t = (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  const closest = { lat: ay + t * aby, lon: ax + t * abx }
  return haversineMiles(p, closest)
}

type NominatimHit = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type?: string
  class?: string
}

export async function searchTowns(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('limit', '6')
  url.searchParams.set('countrycodes', 'us')
  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error('Town search failed')
  const data = (await res.json()) as NominatimHit[]
  return data.map((h) => ({
    id: String(h.place_id),
    label: h.display_name,
    lat: Number(h.lat),
    lon: Number(h.lon),
  }))
}

/**
 * Approx. 2023 Census resident population (used for plate-sighting rarity).
 * Lower population → plates are harder to find on the road.
 */
export const STATE_POPULATION: Record<string, number> = {
  AL: 5_108_468,
  AK: 733_406,
  AZ: 7_431_344,
  AR: 3_067_732,
  CA: 38_965_193,
  CO: 5_877_610,
  CT: 3_617_176,
  DE: 1_031_890,
  FL: 22_610_726,
  GA: 11_029_227,
  HI: 1_435_138,
  ID: 1_964_726,
  IL: 12_549_798,
  IN: 6_862_199,
  IA: 3_207_004,
  KS: 2_940_546,
  KY: 4_526_154,
  LA: 4_573_749,
  ME: 1_395_722,
  MD: 6_180_253,
  MA: 7_001_399,
  MI: 10_037_261,
  MN: 5_737_915,
  MS: 2_939_690,
  MO: 6_196_156,
  MT: 1_132_812,
  NE: 1_978_379,
  NV: 3_194_176,
  NH: 1_402_054,
  NJ: 9_290_841,
  NM: 2_114_371,
  NY: 19_571_216,
  NC: 10_835_491,
  ND: 783_926,
  OH: 11_785_935,
  OK: 4_053_824,
  OR: 4_233_358,
  PA: 12_961_683,
  RI: 1_095_962,
  SC: 5_373_555,
  SD: 919_318,
  TN: 7_126_489,
  TX: 30_503_301,
  UT: 3_417_734,
  VT: 647_464,
  VA: 8_715_698,
  WA: 7_812_880,
  WV: 1_770_071,
  WI: 5_910_955,
  WY: 584_057,
  DC: 678_972,
}

/**
 * Rough state bounding boxes (lat/lon). Used so “drive through / drive by”
 * measures distance to the state itself, not only its geographic centroid.
 */
export const STATE_BBOX: Record<
  string,
  { minLat: number; maxLat: number; minLon: number; maxLon: number }
> = {
  AL: { minLat: 30.2, maxLat: 35.0, minLon: -88.5, maxLon: -84.9 },
  AK: { minLat: 51.2, maxLat: 71.4, minLon: -179.1, maxLon: -130.0 },
  AZ: { minLat: 31.3, maxLat: 37.0, minLon: -114.8, maxLon: -109.0 },
  AR: { minLat: 33.0, maxLat: 36.5, minLon: -94.6, maxLon: -89.6 },
  CA: { minLat: 32.5, maxLat: 42.0, minLon: -124.5, maxLon: -114.1 },
  CO: { minLat: 37.0, maxLat: 41.0, minLon: -109.1, maxLon: -102.0 },
  CT: { minLat: 40.9, maxLat: 42.1, minLon: -73.7, maxLon: -71.8 },
  DE: { minLat: 38.4, maxLat: 39.8, minLon: -75.8, maxLon: -75.0 },
  FL: { minLat: 24.5, maxLat: 31.0, minLon: -87.6, maxLon: -80.0 },
  GA: { minLat: 30.4, maxLat: 35.0, minLon: -85.6, maxLon: -80.8 },
  HI: { minLat: 18.9, maxLat: 22.2, minLon: -160.2, maxLon: -154.8 },
  ID: { minLat: 42.0, maxLat: 49.0, minLon: -117.2, maxLon: -111.0 },
  IL: { minLat: 37.0, maxLat: 42.5, minLon: -91.5, maxLon: -87.0 },
  IN: { minLat: 37.8, maxLat: 41.8, minLon: -88.1, maxLon: -84.8 },
  IA: { minLat: 40.4, maxLat: 43.5, minLon: -96.6, maxLon: -90.1 },
  KS: { minLat: 37.0, maxLat: 40.0, minLon: -102.1, maxLon: -94.6 },
  KY: { minLat: 36.5, maxLat: 39.1, minLon: -89.6, maxLon: -81.9 },
  LA: { minLat: 29.0, maxLat: 33.0, minLon: -94.0, maxLon: -89.0 },
  ME: { minLat: 43.1, maxLat: 47.5, minLon: -71.1, maxLon: -66.9 },
  MD: { minLat: 37.9, maxLat: 39.7, minLon: -79.5, maxLon: -75.0 },
  MA: { minLat: 41.2, maxLat: 42.9, minLon: -73.5, maxLon: -69.9 },
  MI: { minLat: 41.7, maxLat: 48.3, minLon: -90.4, maxLon: -82.1 },
  MN: { minLat: 43.5, maxLat: 49.4, minLon: -97.2, maxLon: -89.5 },
  MS: { minLat: 30.2, maxLat: 35.0, minLon: -91.7, maxLon: -88.1 },
  MO: { minLat: 36.0, maxLat: 40.6, minLon: -95.8, maxLon: -89.1 },
  MT: { minLat: 44.4, maxLat: 49.0, minLon: -116.0, maxLon: -104.0 },
  NE: { minLat: 40.0, maxLat: 43.0, minLon: -104.1, maxLon: -95.3 },
  NV: { minLat: 35.0, maxLat: 42.0, minLon: -120.0, maxLon: -114.0 },
  NH: { minLat: 42.7, maxLat: 45.3, minLon: -72.6, maxLon: -70.6 },
  NJ: { minLat: 38.9, maxLat: 41.4, minLon: -75.6, maxLon: -73.9 },
  NM: { minLat: 31.3, maxLat: 37.0, minLon: -109.1, maxLon: -103.0 },
  NY: { minLat: 40.5, maxLat: 45.0, minLon: -79.8, maxLon: -71.9 },
  NC: { minLat: 33.8, maxLat: 36.6, minLon: -84.3, maxLon: -75.5 },
  ND: { minLat: 45.9, maxLat: 49.0, minLon: -104.1, maxLon: -96.6 },
  OH: { minLat: 38.4, maxLat: 42.0, minLon: -84.8, maxLon: -80.5 },
  OK: { minLat: 33.6, maxLat: 37.0, minLon: -103.0, maxLon: -94.4 },
  OR: { minLat: 42.0, maxLat: 46.3, minLon: -124.6, maxLon: -116.5 },
  PA: { minLat: 39.7, maxLat: 42.3, minLon: -80.5, maxLon: -74.7 },
  RI: { minLat: 41.1, maxLat: 42.0, minLon: -71.9, maxLon: -71.1 },
  SC: { minLat: 32.0, maxLat: 35.2, minLon: -83.4, maxLon: -78.5 },
  SD: { minLat: 42.5, maxLat: 45.9, minLon: -104.1, maxLon: -96.4 },
  TN: { minLat: 35.0, maxLat: 36.7, minLon: -90.3, maxLon: -81.6 },
  TX: { minLat: 25.8, maxLat: 36.5, minLon: -106.6, maxLon: -93.5 },
  UT: { minLat: 37.0, maxLat: 42.0, minLon: -114.1, maxLon: -109.0 },
  VT: { minLat: 42.7, maxLat: 45.0, minLon: -73.4, maxLon: -71.5 },
  VA: { minLat: 36.5, maxLat: 39.5, minLon: -83.7, maxLon: -75.2 },
  WA: { minLat: 45.5, maxLat: 49.0, minLon: -124.8, maxLon: -116.9 },
  WV: { minLat: 37.2, maxLat: 40.6, minLon: -82.6, maxLon: -77.7 },
  WI: { minLat: 42.5, maxLat: 47.1, minLon: -92.9, maxLon: -86.8 },
  WY: { minLat: 41.0, maxLat: 45.0, minLon: -111.1, maxLon: -104.1 },
  DC: { minLat: 38.79, maxLat: 38.99, minLon: -77.12, maxLon: -76.91 },
}

/** Miles from a point to the closest point on/inside a lat-lon bounding box. */
export function distanceToBBoxMiles(
  p: { lat: number; lon: number },
  box: { minLat: number; maxLat: number; minLon: number; maxLon: number },
): number {
  const lat = Math.min(box.maxLat, Math.max(box.minLat, p.lat))
  const lon = Math.min(box.maxLon, Math.max(box.minLon, p.lon))
  if (lat === p.lat && lon === p.lon) return 0
  return haversineMiles(p, { lat, lon })
}

/** Sample points along the straight-line corridor (including endpoints). */
export function sampleRoute(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  count = 48,
): { lat: number; lon: number }[] {
  const n = Math.max(2, count)
  const out: { lat: number; lon: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    out.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lon: start.lon + (end.lon - start.lon) * t,
    })
  }
  return out
}

/**
 * Shortest distance from the drive corridor to a state (miles).
 * Closest sample on the start→end line to the state's bbox
 * (so “drive right by DC” → ~0, not distance to a far-away centroid alone).
 */
export function distanceStateToRouteMiles(
  code: string,
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
): number {
  const box = STATE_BBOX[code]
  const centroid = STATE_CENTROIDS[code]
  const samples = sampleRoute(start, end)
  let best = Infinity
  for (const s of samples) {
    if (box) best = Math.min(best, distanceToBBoxMiles(s, box))
    else if (centroid) best = Math.min(best, haversineMiles(s, centroid))
  }
  if (centroid) {
    best = Math.min(best, distanceToSegmentMiles(centroid, start, end))
  }
  return Number.isFinite(best) ? best : 3000
}

/** US land neighbors — plates from adjacent states spill onto a corridor more. */
const US_NEIGHBORS: Record<string, string[]> = {
  AL: ['FL', 'GA', 'MS', 'TN'],
  AZ: ['CA', 'CO', 'NM', 'NV', 'UT'],
  AR: ['LA', 'MO', 'MS', 'OK', 'TN', 'TX'],
  CA: ['AZ', 'NV', 'OR'],
  CO: ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'],
  CT: ['MA', 'NY', 'RI'],
  DE: ['MD', 'NJ', 'PA'],
  DC: ['MD', 'VA'],
  FL: ['AL', 'GA'],
  GA: ['AL', 'FL', 'NC', 'SC', 'TN'],
  ID: ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  IL: ['IA', 'IN', 'KY', 'MO', 'WI'],
  IN: ['IL', 'KY', 'MI', 'OH'],
  IA: ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'],
  KS: ['CO', 'MO', 'NE', 'OK'],
  KY: ['IL', 'IN', 'MO', 'OH', 'TN', 'VA', 'WV'],
  LA: ['AR', 'MS', 'TX'],
  ME: ['NH'],
  MD: ['DE', 'DC', 'PA', 'VA', 'WV'],
  MA: ['CT', 'NH', 'NY', 'RI', 'VT'],
  MI: ['IN', 'OH', 'WI'],
  MN: ['IA', 'ND', 'SD', 'WI'],
  MS: ['AL', 'AR', 'LA', 'TN'],
  MO: ['AR', 'IA', 'IL', 'KS', 'KY', 'NE', 'OK', 'TN'],
  MT: ['ID', 'ND', 'SD', 'WY'],
  NE: ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'],
  NV: ['AZ', 'CA', 'ID', 'OR', 'UT'],
  NH: ['MA', 'ME', 'VT'],
  NJ: ['DE', 'NY', 'PA'],
  NM: ['AZ', 'CO', 'OK', 'TX', 'UT'],
  NY: ['CT', 'MA', 'NJ', 'PA', 'VT'],
  NC: ['GA', 'SC', 'TN', 'VA'],
  ND: ['MN', 'MT', 'SD'],
  OH: ['IN', 'KY', 'MI', 'PA', 'WV'],
  OK: ['AR', 'CO', 'KS', 'MO', 'NM', 'TX'],
  OR: ['CA', 'ID', 'NV', 'WA'],
  PA: ['DE', 'MD', 'NJ', 'NY', 'OH', 'WV'],
  RI: ['CT', 'MA'],
  SC: ['GA', 'NC'],
  SD: ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
  TN: ['AL', 'AR', 'GA', 'KY', 'MO', 'MS', 'NC', 'VA'],
  TX: ['AR', 'LA', 'NM', 'OK'],
  UT: ['AZ', 'CO', 'ID', 'NV', 'NM', 'WY'],
  VT: ['MA', 'NH', 'NY'],
  VA: ['DC', 'KY', 'MD', 'NC', 'TN', 'WV'],
  WA: ['ID', 'OR'],
  WV: ['KY', 'MD', 'OH', 'PA', 'VA'],
  WI: ['IL', 'IA', 'MI', 'MN'],
  WY: ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
}

function endpointMentionsState(code: string, startLabel: string, endLabel: string): boolean {
  const parts = `${startLabel} | ${endLabel}`.toUpperCase()
  const aliases: Record<string, string[]> = {
    DC: ['D.C.', 'DISTRICT OF COLUMBIA', 'WASHINGTON, DC', ', DC'],
    WV: ['WEST VIRGINIA', ', WV'],
    VA: [', VA'],
    NY: ['NEW YORK', ', NY'],
    NH: ['NEW HAMPSHIRE', ', NH'],
    NJ: ['NEW JERSEY', ', NJ'],
    NM: ['NEW MEXICO', ', NM'],
    NC: ['NORTH CAROLINA', ', NC'],
    ND: ['NORTH DAKOTA', ', ND'],
    SC: ['SOUTH CAROLINA', ', SC'],
    SD: ['SOUTH DAKOTA', ', SD'],
    RI: ['RHODE ISLAND', ', RI'],
    MA: ['MASSACHUSETTS', ', MA'],
    MD: ['MARYLAND', ', MD'],
    ME: ['MAINE', ', ME'],
    MI: ['MICHIGAN', ', MI'],
    MN: ['MINNESOTA', ', MN'],
    MS: ['MISSISSIPPI', ', MS'],
    MO: ['MISSOURI', ', MO'],
    MT: ['MONTANA', ', MT'],
    PA: ['PENNSYLVANIA', ', PA'],
    DE: ['DELAWARE', ', DE'],
    CT: ['CONNECTICUT', ', CT'],
    VT: ['VERMONT', ', VT'],
    AL: ['ALABAMA', ', AL'],
    AK: ['ALASKA', ', AK'],
    AZ: ['ARIZONA', ', AZ'],
    AR: ['ARKANSAS', ', AR'],
    CA: ['CALIFORNIA', ', CA'],
    CO: ['COLORADO', ', CO'],
    FL: ['FLORIDA', ', FL'],
    GA: ['GEORGIA', ', GA'],
    HI: ['HAWAII', ', HI'],
    ID: ['IDAHO', ', ID'],
    IL: ['ILLINOIS', ', IL'],
    IN: ['INDIANA', ', IN'],
    IA: ['IOWA', ', IA'],
    KS: ['KANSAS', ', KS'],
    KY: ['KENTUCKY', ', KY'],
    LA: ['LOUISIANA', ', LA'],
    NE: ['NEBRASKA', ', NE'],
    NV: ['NEVADA', ', NV'],
    OH: ['OHIO', ', OH'],
    OK: ['OKLAHOMA', ', OK'],
    OR: ['OREGON', ', OR'],
    TN: ['TENNESSEE', ', TN'],
    TX: ['TEXAS', ', TX'],
    UT: ['UTAH', ', UT'],
    WA: ['WASHINGTON STATE', ', WA'],
    WI: ['WISCONSIN', ', WI'],
    WY: ['WYOMING', ', WY'],
    PR: ['PUERTO RICO', ', PR'],
    VI: ['VIRGIN ISLANDS', ', VI'],
    GU: ['GUAM', ', GU'],
  }
  const list = aliases[code] ?? [`, ${code}`]
  if (list.some((a) => a && parts.includes(a.toUpperCase()))) return true
  // Bare state name — but not "WEST VIRGINIA" for VA, or "WASHINGTON, DC" for WA.
  if (code === 'VA') {
    return /\bVIRGINIA\b/.test(parts) && !parts.includes('WEST VIRGINIA')
  }
  if (code === 'WA') {
    return /\bWASHINGTON\b/.test(parts) && !parts.includes('WASHINGTON, DC') && !parts.includes('DISTRICT OF COLUMBIA')
  }
  return false
}

/**
 * Absolute rarity from miles-to-corridor (not min-max across HI/Guam).
 * Corridor plates stay cheap; Midwest on an East-Coast trip lands mid/high.
 */
function basePointsFromMiles(miles: number): number {
  if (miles <= 20) return 1
  if (miles <= 60) return 1 + ((miles - 20) / 40) * 5 // 1–6
  if (miles <= 150) return 6 + ((miles - 60) / 90) * 10 // 6–16
  if (miles <= 350) return 16 + ((miles - 150) / 200) * 16 // 16–32
  if (miles <= 700) return 32 + ((miles - 350) / 350) * 18 // 32–50
  if (miles <= 1200) return 50 + ((miles - 700) / 500) * 18 // 50–68
  if (miles <= 2000) return 68 + ((miles - 1200) / 800) * 16 // 68–84
  return 84 + Math.min(16, ((miles - 2000) / 1500) * 16) // 84–100
}

function popFactor(code: string): number {
  const pop = STATE_POPULATION[code]
  if (pop == null) return 1.08 // unknown / territory / foreign → slightly rarer
  const logPop = Math.log10(Math.max(pop, 1))
  // CA ~7.59, WY ~5.77 → map to ~0.88 … 1.18
  const t = (7.6 - logPop) / (7.6 - 5.7)
  return 0.88 + Math.max(0, Math.min(1, t)) * 0.3
}

function regionFloor(code: string): number {
  if (code === 'HI' || code === 'AK') return 72
  if (code === 'PR' || code === 'VI' || code === 'GU' || code === 'AS' || code === 'MP') return 70
  if (code.startsWith('CA-') || code.startsWith('MX-')) return 40
  if (code.startsWith('NA-') || code.startsWith('US-')) return 55
  return 1
}

function clampScore(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n)))
}

/**
 * Score each jurisdiction 1–100 by how rare its plates are on this road trip.
 *
 * Factors:
 * 1. Absolute miles from the drive corridor to the state (primary — not relative to HI)
 * 2. Population (small states score a bit higher once off-corridor)
 * 3. Neighbor spill — shares a border with an on-route state → slightly cheaper
 * 4. Region floors — AK/HI/territories/foreign never look “common” on a CONUS trip
 */
export function scorePlatesForRoute(
  start: { lat: number; lon: number; label?: string },
  end: { lat: number; lon: number; label?: string },
  codes: string[],
): Record<string, number> {
  const startLabel = start.label ?? ''
  const endLabel = end.label ?? ''

  const milesByCode = new Map<string, number>()
  for (const code of codes) {
    let miles = distanceStateToRouteMiles(code, start, end)
    if (endpointMentionsState(code, startLabel, endLabel)) miles = 0
    milesByCode.set(code, miles)
  }

  const onRoute = new Set(
    [...milesByCode.entries()].filter(([, m]) => m <= 40).map(([c]) => c),
  )

  const out: Record<string, number> = {}
  for (const code of codes) {
    const miles = milesByCode.get(code) ?? 3000
    let pts = basePointsFromMiles(miles)

    // Population only nudges plates already away from the corridor.
    if (miles > 50) pts *= popFactor(code)

    // Neighbor of an on-route state → more likely on the highway, cheaper.
    const neighbors = US_NEIGHBORS[code] ?? []
    if (miles > 40 && neighbors.some((n) => onRoute.has(n))) {
      pts *= 0.72
    }

    pts = Math.max(pts, regionFloor(code))
    // Endpoint / on-corridor hard floor stays low.
    if (miles <= 20) pts = Math.min(pts, 3)

    out[code] = clampScore(pts)
  }
  return out
}

/**
 * Score each jurisdiction 1–100 by how rare its plates are near `here`.
 * Low = common (nearby / populous); high = rare. Sort ascending for “most common first.”
 */
export function scorePlatesFromLocation(
  here: { lat: number; lon: number },
  codes: string[],
): Record<string, number> {
  const milesByCode = new Map<string, number>()
  for (const code of codes) {
    const box = STATE_BBOX[code]
    const centroid = STATE_CENTROIDS[code]
    let miles = 3000
    if (box) miles = distanceToBBoxMiles(here, box)
    else if (centroid) miles = haversineMiles(here, centroid)
    milesByCode.set(code, miles)
  }

  const nearby = new Set(
    [...milesByCode.entries()].filter(([, m]) => m <= 40).map(([c]) => c),
  )

  const out: Record<string, number> = {}
  for (const code of codes) {
    const miles = milesByCode.get(code) ?? 3000
    let pts = basePointsFromMiles(miles)
    if (miles > 50) pts *= popFactor(code)
    const neighbors = US_NEIGHBORS[code] ?? []
    if (miles > 40 && neighbors.some((n) => nearby.has(n))) pts *= 0.72
    pts = Math.max(pts, regionFloor(code))
    if (miles <= 20) pts = Math.min(pts, 3)
    out[code] = clampScore(pts)
  }
  return out
}
