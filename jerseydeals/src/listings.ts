export type Listing = {
  id: string
  title: string
  price: number | null
  currency: string
  url: string
  image: string
  quantity: number
  tag: string
  note: string
  size?: string
  brand?: string
  source?: 'ebay' | 'square' | string
  itemId?: string
  category?: string
}

export type ListingsPayload = {
  syncedAt: string
  source?: 'ebay' | 'square' | string
  seller: string
  sellerUrl: string
  shopUrl: string
  count: number
  listings: Listing[]
}

export const TAG_ORDER = ['Youth', 'Training', 'Jerseys', 'Court / Sideline', 'Apparel'] as const

export const SIZE_ORDER = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'Youth XS',
  'Youth S',
  'Youth M',
  'Youth L',
  'Youth XL',
  'Youth XXL',
  '9-12 YRS',
  'Other',
] as const

export function formatPrice(price: number | null, currency: string) {
  if (price == null || Number.isNaN(price)) return 'See listing'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `$${price}`
  }
}

export function shortTitle(title: string) {
  return title
    .replace(/\b(Men'?s|Women'?s|Youth|Boys|Girls)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Infer a buyer-facing condition chip from listing title copy. */
export function conditionLabel(title: string): 'New' | 'Pre-owned' | 'Authentic' {
  if (/\b(used|pre-?owned|worn)\b/i.test(title)) return 'Pre-owned'
  if (/\b(authentic|player.?issue|match.?worn)\b/i.test(title)) return 'Authentic'
  return 'New'
}

export function listingSize(item: Listing) {
  return item.size || item.note || 'Other'
}

export function isYouthListing(item: Listing) {
  return /youth|yth|boys|girls|9-12|yrs/i.test(`${item.title} ${item.tag} ${item.note}`)
}

export function isSaleListing(item: Listing, maxPrice = 25) {
  return item.price != null && item.price <= maxPrice
}

export function pickFeatured(listings: Listing[], count = 6) {
  const picked: Listing[] = []
  const used = new Set<string>()
  for (const tag of TAG_ORDER) {
    const hit = listings.find((item) => item.tag === tag && !used.has(item.id))
    if (hit) {
      picked.push(hit)
      used.add(hit.id)
    }
    if (picked.length >= count) return picked
  }
  for (const item of listings) {
    if (used.has(item.id)) continue
    picked.push(item)
    used.add(item.id)
    if (picked.length >= count) break
  }
  return picked
}

export function pickNewDrops(listings: Listing[], count = 3) {
  return listings.slice(0, count)
}

export function pickSaleItems(listings: Listing[], count = 4) {
  return listings.filter((item) => isSaleListing(item)).slice(0, count)
}

export function lowestSalePrice(listings: Listing[]) {
  const prices = listings
    .filter((item) => isSaleListing(item) && item.price != null)
    .map((item) => item.price as number)
  if (prices.length === 0) return null
  return Math.min(...prices)
}

export function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a as (typeof SIZE_ORDER)[number])
    const bi = SIZE_ORDER.indexOf(b as (typeof SIZE_ORDER)[number])
    const av = ai === -1 ? 999 : ai
    const bv = bi === -1 ? 999 : bi
    if (av !== bv) return av - bv
    return a.localeCompare(b)
  })
}

export function isSquareCatalog(catalog: ListingsPayload | null | undefined) {
  return catalog?.source === 'square' || Boolean(catalog?.listings?.some((l) => l.source === 'square'))
}
