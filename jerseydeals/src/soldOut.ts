/** Client-side sold-out filter — hides kits the moment we know they sold. */

const STORAGE_KEY = 'jerseydeals.soldOut.v1'
const SESSION_KEY = 'jerseydeals.soldOut.session.v1'

export type SoldOutItem = {
  variationId: string
  itemId?: string
  title?: string
  ebayId?: string
  soldAt?: string
}

function canStore() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function canSession() {
  try {
    return typeof sessionStorage !== 'undefined'
  } catch {
    return false
  }
}

function writeIds(key: 'local' | 'session', ids: string[]) {
  const unique = [...new Set(ids.map(String).filter(Boolean))].slice(0, 500)
  const payload = JSON.stringify({ ids: unique, updatedAt: Date.now() })
  if (key === 'local' && canStore()) localStorage.setItem(STORAGE_KEY, payload)
  if (key === 'session' && canSession()) sessionStorage.setItem(SESSION_KEY, payload)
}

function readIds(key: 'local' | 'session'): string[] {
  try {
    const raw =
      key === 'local'
        ? canStore()
          ? localStorage.getItem(STORAGE_KEY)
          : null
        : canSession()
          ? sessionStorage.getItem(SESSION_KEY)
          : null
    if (!raw) return []
    const parsed = JSON.parse(raw) as { ids?: string[] }
    return Array.isArray(parsed.ids) ? parsed.ids.map(String) : []
  } catch {
    return []
  }
}

export function readLocalSoldOutIds(): string[] {
  return [...new Set([...readIds('local'), ...readIds('session')])]
}

/** Remember IDs sold this session (e.g. ?sold= return). Survives until tab closes. */
export function rememberSoldOutIds(ids: string[]) {
  const next = [...new Set([...readIds('session'), ...ids.map(String).filter(Boolean)])]
  writeIds('session', next)
  // Mirror into localStorage but fetchSoldOutIds will prune stale local-only IDs.
  writeIds('local', [...new Set([...readIds('local'), ...next])])
}

/** Capture ?sold=VARIATION_ID (and purchase flags) from Square return URLs.
 * Multi-item checkout may pass comma/pipe-separated IDs: ?sold=ID1,ID2
 */
export function captureSoldReturnFromUrl() {
  if (typeof window === 'undefined') return [] as string[]
  try {
    const url = new URL(window.location.href)
    const raw = [
      url.searchParams.get('sold'),
      url.searchParams.get('item'),
      url.searchParams.get('variation'),
    ]
      .filter(Boolean)
      .map(String)
    const sold = raw
      .flatMap((value) => value.split(/[,|]/))
      .map((value) => value.trim())
      .filter(Boolean)
    if (sold.length) {
      rememberSoldOutIds(sold)
      url.searchParams.delete('sold')
      url.searchParams.delete('item')
      url.searchParams.delete('variation')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
    return sold
  } catch {
    return []
  }
}

/**
 * Authoritative remote sold-out list + this-session IDs.
 * Drops stale localStorage IDs so restocked kits become visible again.
 */
export async function fetchSoldOutIds(baseUrl: string): Promise<string[]> {
  const sessionIds = readIds('session')
  try {
    const res = await fetch(`${baseUrl}sold-out.json`, { cache: 'no-store' })
    if (!res.ok) return [...new Set([...sessionIds, ...readIds('local')])]
    const data = (await res.json()) as { items?: SoldOutItem[] }
    const remote: string[] = []
    for (const item of data.items || []) {
      if (item.variationId) remote.push(item.variationId)
      if (item.itemId) remote.push(item.itemId)
    }
    const next = [...new Set([...remote, ...sessionIds])]
    writeIds('local', next)
    return next
  } catch {
    return [...new Set([...sessionIds, ...readIds('local')])]
  }
}

export function isListingSoldOut(
  listing: { id?: string; itemId?: string },
  soldIds: Set<string>,
) {
  if (!soldIds.size) return false
  if (listing.id && soldIds.has(listing.id)) return true
  if (listing.itemId && soldIds.has(listing.itemId)) return true
  return false
}
