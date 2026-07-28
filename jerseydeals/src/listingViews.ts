/** Per-listing view timestamps (last week) for Trending. */

const VIEWS_KEY = 'jerseydeals.listingViews.v1'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type ViewMap = Record<string, number[]>

function readMap(): ViewMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(VIEWS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ViewMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map: ViewMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode
  }
}

/** Record a product view and prune stamps older than 7 days. */
export function recordListingView(id: string) {
  if (!id) return
  const now = Date.now()
  const cutoff = now - WEEK_MS
  const map = readMap()
  const next = [...(map[id] || []).filter((t) => t >= cutoff), now]
  map[id] = next
  // Drop empty / stale keys
  for (const key of Object.keys(map)) {
    map[key] = (map[key] || []).filter((t) => t >= cutoff)
    if (!map[key].length) delete map[key]
  }
  writeMap(map)
}

/** View counts in the rolling last-7-days window. */
export function listingViewCountsLastWeek(): Record<string, number> {
  const now = Date.now()
  const cutoff = now - WEEK_MS
  const map = readMap()
  const out: Record<string, number> = {}
  for (const [id, stamps] of Object.entries(map)) {
    const n = (stamps || []).filter((t) => t >= cutoff).length
    if (n > 0) out[id] = n
  }
  return out
}
