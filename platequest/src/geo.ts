/** Town search (Nominatim) + route-distance helpers for road-trip rarity. */

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
 * Score each jurisdiction 1–100 by how far its center is from the road-trip corridor.
 * Near the route → common (low points). Far away → rare (high points).
 * Grades the state plate only — not specialty variants.
 */
export function scorePlatesForRoute(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  codes: string[],
): Record<string, number> {
  const dists = codes.map((code) => {
    const c = STATE_CENTROIDS[code]
    const miles = c ? distanceToSegmentMiles(c, start, end) : 3000
    return { code, miles }
  })
  const min = Math.min(...dists.map((d) => d.miles))
  const max = Math.max(...dists.map((d) => d.miles))
  const span = Math.max(1, max - min)
  const out: Record<string, number> = {}
  for (const d of dists) {
    const t = (d.miles - min) / span
    out[d.code] = Math.max(1, Math.min(100, Math.round(1 + t * 99)))
  }
  return out
}
