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

function endpointMentionsState(code: string, startLabel: string, endLabel: string): boolean {
  const blob = `${startLabel} | ${endLabel}`.toUpperCase()
  const aliases: Record<string, string[]> = {
    DC: [', DC', 'D.C.', 'DISTRICT OF COLUMBIA', 'WASHINGTON, DC'],
    WV: [', WV', 'WEST VIRGINIA'],
    VA: [', VA', 'VIRGINIA'],
    NY: [', NY', 'NEW YORK'],
    NH: [', NH', 'NEW HAMPSHIRE'],
    NJ: [', NJ', 'NEW JERSEY'],
    NM: [', NM', 'NEW MEXICO'],
    NC: [', NC', 'NORTH CAROLINA'],
    ND: [', ND', 'NORTH DAKOTA'],
    SC: [', SC', 'SOUTH CAROLINA'],
    SD: [', SD', 'SOUTH DAKOTA'],
    RI: [', RI', 'RHODE ISLAND'],
    MA: [', MA', 'MASSACHUSETTS'],
    MD: [', MD', 'MARYLAND'],
    ME: [', ME', 'MAINE'],
    MI: [', MI', 'MICHIGAN'],
    MN: [', MN', 'MINNESOTA'],
    MS: [', MS', 'MISSISSIPPI'],
    MO: [', MO', 'MISSOURI'],
    MT: [', MT', 'MONTANA'],
    PA: [', PA', 'PENNSYLVANIA'],
    DE: [', DE', 'DELAWARE'],
    CT: [', CT', 'CONNECTICUT'],
    VT: [', VT', 'VERMONT'],
  }
  const list = aliases[code] ?? []
  const extras = [`, ${code}`, ` ${code} `]
  return [...list, ...extras].some((a) => a && blob.includes(a.toUpperCase()))
}

/**
 * Score each jurisdiction 1–100 by how rare its plates are on this road trip.
 *
 * Distance = closest approach of the drive to the state (bbox), so places you
 * drive through/by (e.g. DC on a VA→upstate NY trip) score very low.
 *
 * Population only raises rarity for states already away from the route — it
 * cannot make an on-route low-pop place (DC) look rare.
 */
export function scorePlatesForRoute(
  start: { lat: number; lon: number; label?: string },
  end: { lat: number; lon: number; label?: string },
  codes: string[],
): Record<string, number> {
  const startLabel = start.label ?? ''
  const endLabel = end.label ?? ''

  const rows = codes.map((code) => {
    let miles = distanceStateToRouteMiles(code, start, end)
    if (endpointMentionsState(code, startLabel, endLabel)) miles = 0
    const pop = STATE_POPULATION[code] ?? 1_000_000
    return { code, miles, logPop: Math.log10(Math.max(pop, 1)) }
  })

  const minMiles = Math.min(...rows.map((r) => r.miles))
  const maxMiles = Math.max(...rows.map((r) => r.miles))
  const mileSpan = Math.max(1, maxMiles - minMiles)

  const minLog = Math.min(...rows.map((r) => r.logPop))
  const maxLog = Math.max(...rows.map((r) => r.logPop))
  const popSpan = Math.max(0.01, maxLog - minLog)

  const raw = rows.map((r) => {
    const distRarity = (r.miles - minMiles) / mileSpan
    const popRarity = 1 - (r.logPop - minLog) / popSpan
    // Population only applies away from the corridor.
    const rarity = distRarity * (0.55 + 0.45 * popRarity)
    return { code: r.code, rarity }
  })

  const minR = Math.min(...raw.map((r) => r.rarity))
  const maxR = Math.max(...raw.map((r) => r.rarity))
  const span = Math.max(1e-6, maxR - minR)

  const out: Record<string, number> = {}
  for (const r of raw) {
    const t = (r.rarity - minR) / span
    out[r.code] = Math.max(1, Math.min(100, Math.round(1 + t * 99)))
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
  const rows = codes.map((code) => {
    const box = STATE_BBOX[code]
    const centroid = STATE_CENTROIDS[code]
    let miles = 3000
    if (box) miles = distanceToBBoxMiles(here, box)
    else if (centroid) miles = haversineMiles(here, centroid)
    const pop = STATE_POPULATION[code] ?? 1_000_000
    return { code, miles, logPop: Math.log10(Math.max(pop, 1)) }
  })

  const minMiles = Math.min(...rows.map((r) => r.miles))
  const maxMiles = Math.max(...rows.map((r) => r.miles))
  const mileSpan = Math.max(1, maxMiles - minMiles)

  const minLog = Math.min(...rows.map((r) => r.logPop))
  const maxLog = Math.max(...rows.map((r) => r.logPop))
  const popSpan = Math.max(0.01, maxLog - minLog)

  const raw = rows.map((r) => {
    const distRarity = (r.miles - minMiles) / mileSpan
    const popRarity = 1 - (r.logPop - minLog) / popSpan
    const rarity = distRarity * (0.55 + 0.45 * popRarity)
    return { code: r.code, rarity }
  })

  const minR = Math.min(...raw.map((r) => r.rarity))
  const maxR = Math.max(...raw.map((r) => r.rarity))
  const span = Math.max(1e-6, maxR - minR)

  const out: Record<string, number> = {}
  for (const r of raw) {
    const t = (r.rarity - minR) / span
    out[r.code] = Math.max(1, Math.min(100, Math.round(1 + t * 99)))
  }
  return out
}
