const WANTED_KEY = 'platequest.wanted'
const HISTORY_KEY = 'platequest.spotHistory'
const WANTED_HITS_KEY = 'platequest.wantedHits'

export type SpotEvent = {
  code: string
  at: string
  source: 'camera' | 'manual'
}

export function loadWanted(): string[] {
  try {
    const raw = localStorage.getItem(WANTED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((x): x is string => typeof x === 'string').map((c) => c.toUpperCase()))]
      : []
  } catch {
    return []
  }
}

export function saveWanted(codes: string[]) {
  try {
    localStorage.setItem(
      WANTED_KEY,
      JSON.stringify([...new Set(codes.map((c) => c.toUpperCase()))]),
    )
  } catch {
    /* ignore */
  }
}

export function toggleWanted(code: string, current = loadWanted()): string[] {
  const c = code.toUpperCase()
  const next = current.includes(c) ? current.filter((x) => x !== c) : [...current, c]
  saveWanted(next)
  return next
}

export function clearWantedCode(code: string, current = loadWanted()): string[] {
  const next = current.filter((c) => c !== code.toUpperCase())
  saveWanted(next)
  return next
}

export function loadWantedHitCount(): number {
  try {
    const raw = localStorage.getItem(WANTED_HITS_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

/** Record that a previously wanted plate was spotted. */
export function recordWantedHit(code: string) {
  const c = code.toUpperCase()
  try {
    const raw = localStorage.getItem(WANTED_HITS_KEY)
    const prev: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const list = Array.isArray(prev) ? prev : []
    if (!list.includes(c)) {
      localStorage.setItem(WANTED_HITS_KEY, JSON.stringify([...list, c]))
    }
  } catch {
    /* ignore */
  }
}

export function loadSpotHistory(): SpotEvent[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is SpotEvent =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as SpotEvent).code === 'string' &&
        typeof (e as SpotEvent).at === 'string',
    )
  } catch {
    return []
  }
}

export function appendSpotHistory(code: string, source: SpotEvent['source']): SpotEvent[] {
  const event: SpotEvent = {
    code: code.toUpperCase(),
    at: new Date().toISOString(),
    source,
  }
  const prev = loadSpotHistory()
  const next = [event, ...prev].slice(0, 100)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
