/** Client-side sold-out filter — hides kits the moment we know they sold. */

const STORAGE_KEY = 'jerseydeals.soldOut.v1'

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

export function readLocalSoldOutIds(): string[] {
  if (!canStore()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { ids?: string[] }
    return Array.isArray(parsed.ids) ? parsed.ids.map(String) : []
  } catch {
    return []
  }
}

export function rememberSoldOutIds(ids: string[]) {
  if (!canStore()) return
  const next = new Set([...readLocalSoldOutIds(), ...ids.map(String).filter(Boolean)])
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ids: [...next].slice(0, 500), updatedAt: Date.now() }),
  )
}

/** Capture ?sold=VARIATION_ID (and purchase flags) from Square return URLs. */
export function captureSoldReturnFromUrl() {
  if (typeof window === 'undefined') return [] as string[]
  try {
    const url = new URL(window.location.href)
    const sold = [
      url.searchParams.get('sold'),
      url.searchParams.get('item'),
      url.searchParams.get('variation'),
    ]
      .filter(Boolean)
      .map(String)
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

export async function fetchSoldOutIds(baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}sold-out.json`, { cache: 'no-store' })
    if (!res.ok) return readLocalSoldOutIds()
    const data = (await res.json()) as { items?: SoldOutItem[] }
    const ids: string[] = []
    for (const item of data.items || []) {
      if (item.variationId) ids.push(item.variationId)
      if (item.itemId) ids.push(item.itemId)
    }
    if (ids.length) rememberSoldOutIds(ids)
    return [...new Set([...ids, ...readLocalSoldOutIds()])]
  } catch {
    return readLocalSoldOutIds()
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
