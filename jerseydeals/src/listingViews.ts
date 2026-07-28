/** Per-listing view timestamps (last week) for Trending. */

import type { Listing } from './listings'

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

/**
 * Stable-ish keys for a listing so views survive Square id churn and
 * match across duplicate rows (sku / itemId / id).
 */
export function listingViewKeys(item: Pick<Listing, 'id' | 'sku' | 'itemId'>): string[] {
  const keys: string[] = []
  if (item.sku?.trim()) keys.push(`sku:${item.sku.trim()}`)
  if (item.itemId?.trim()) keys.push(`item:${item.itemId.trim()}`)
  if (item.id?.trim()) keys.push(item.id.trim())
  return [...new Set(keys)]
}

function primaryViewKey(item: Pick<Listing, 'id' | 'sku' | 'itemId'> | string): string {
  if (typeof item === 'string') return item.trim()
  return listingViewKeys(item)[0] || item.id
}

function pruneMap(map: ViewMap, cutoff: number) {
  for (const key of Object.keys(map)) {
    map[key] = (map[key] || []).filter((t) => t >= cutoff)
    if (!map[key].length) delete map[key]
  }
}

/** Record a product view and prune stamps older than 7 days. */
export function recordListingView(item: Pick<Listing, 'id' | 'sku' | 'itemId'> | string) {
  const primary = primaryViewKey(item)
  if (!primary) return
  const now = Date.now()
  const cutoff = now - WEEK_MS
  const map = readMap()
  pruneMap(map, cutoff)
  map[primary] = [...(map[primary] || []), now]
  writeMap(map)
}

/** View counts in the rolling last-7-days window (keyed by view keys). */
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

/** Total last-week views for one listing across id / sku / item aliases. */
export function viewsForListing(
  item: Pick<Listing, 'id' | 'sku' | 'itemId'>,
  viewCounts: Record<string, number>,
): number {
  let total = 0
  for (const key of listingViewKeys(item)) {
    total += viewCounts[key] || 0
  }
  return total
}
