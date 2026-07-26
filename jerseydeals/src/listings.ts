import { matchesInclusive } from './inclusiveSearch'

export type Listing = {
  id: string
  title: string
  price: number | null
  currency: string
  url: string
  /** Square Payment Link checkout when Online shipping isn't configured */
  checkoutUrl?: string
  /** Square Payment Link with first-time buyer 10% discount applied */
  checkoutUrlDiscounted?: string
  /** Square Online product page (supports store cart when shipping is enabled) */
  productUrl?: string
  image: string
  /** All product photos; first entry is the main/cover image. */
  images?: string[]
  quantity: number
  tag: string
  note: string
  size?: string
  brand?: string
  source?: 'ebay' | 'square' | string
  itemId?: string
  sku?: string
  category?: string
  /** Buyer-facing condition from eBay (New / Used). */
  condition?: string
  /** Exact eBay ConditionDisplayName when available. */
  conditionEbay?: string
  conditionId?: string
  /** Plain-text listing description (from eBay / Square). */
  description?: string
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
    const hasCents = Math.abs(price % 1) > 1e-9
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: hasCents ? 2 : 0,
      minimumFractionDigits: hasCents ? 2 : 0,
    }).format(price)
  } catch {
    return `$${price}`
  }
}

/** Prefer Payment Link checkout when present (Square Online shipping workaround). */
export function listingBuyUrl(item: Listing, opts?: { discounted?: boolean }) {
  if (opts?.discounted) {
    const discounted = (item.checkoutUrlDiscounted || '').trim()
    if (discounted) return discounted
  }
  return (item.checkoutUrl || item.url || '').trim()
}

function slugifyListingTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Square Online PDP URL when we know the catalog item id. */
export function listingProductPageUrl(item: Listing, storeUrl: string) {
  if (item.productUrl && item.productUrl.trim()) return item.productUrl.trim()
  if (item.url && /\/product\//i.test(item.url)) return item.url.trim()
  if (!item.itemId || !storeUrl) return ''
  const slug = slugifyListingTitle(item.title) || 'item'
  return `${storeUrl.replace(/\/$/, '')}/product/${slug}/${item.itemId}`
}

export function shortTitle(title: string) {
  return title
    // Keep youth sizing visible after we strip the word "Youth": "Youth XL" → "YthXL".
    .replace(/\bYouth\s*(XXL|XL|XS|[SML])\b/gi, (_m, size: string) => `Yth${String(size).toUpperCase()}`)
    .replace(/\b(Men'?s|Women'?s|Youth|Boys|Girls)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*·\s*/g, ' · ')
    .trim()
}

/** Prefer stored eBay/Square condition; fall back to title inference. */
export function conditionLabel(
  titleOrItem: string | { title?: string; condition?: string; conditionEbay?: string },
): string {
  if (titleOrItem && typeof titleOrItem === 'object') {
    const stored = (titleOrItem.conditionEbay || titleOrItem.condition || '').trim()
    if (stored) {
      if (/^new\b/i.test(stored)) return 'New'
      if (/used|pre-?owned|worn/i.test(stored)) return 'Used'
      return stored
    }
    return conditionLabel(titleOrItem.title || '')
  }
  const title = String(titleOrItem || '')
  if (/\b(used|pre-?owned|worn)\b/i.test(title)) return 'Used'
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

/** Inventory price toggles — keep ranges aligned with typical kit pricing. */
export const PRICE_FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'under-25', label: '$25 & under', max: 25 },
  { id: '25-40', label: '$26–$40', min: 25, max: 40 },
  { id: '40-plus', label: '$40+', min: 40 },
] as const

export type PriceFilterId = (typeof PRICE_FILTERS)[number]['id']

export function matchesPriceFilter(item: Listing, filterId: PriceFilterId) {
  if (filterId === 'All') return true
  if (item.price == null || Number.isNaN(item.price)) return false
  if (filterId === 'under-25') return item.price <= 25
  if (filterId === '25-40') return item.price > 25 && item.price <= 40
  if (filterId === '40-plus') return item.price > 40
  return true
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

function resolveListingImageUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${trimmed.replace(/^\//, '')}`
}

/** Single primary photo per listing (cover / first image only). */
export function listingPrimaryImage(item: Listing): string {
  const primary = item.image || item.images?.[0] || ''
  return primary ? resolveListingImageUrl(primary) : ''
}

/** All listing photos with the cover image first (for quick-view galleries). */
export function listingImages(item: Listing): string[] {
  const fromArray = (item.images || []).filter(Boolean)
  let urls: string[]
  if (fromArray.length > 0) {
    if (item.image && fromArray[0] !== item.image) {
      urls = [item.image, ...fromArray.filter((url) => url !== item.image)]
    } else {
      urls = fromArray
    }
  } else {
    urls = item.image ? [item.image] : []
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of urls) {
    const resolved = resolveListingImageUrl(url)
    if (!resolved || seen.has(resolved)) continue
    seen.add(resolved)
    out.push(resolved)
  }
  return out
}

export function listingSearchText(item: Listing) {
  const club = inferClub(item.title)
  return [
    item.title,
    item.tag,
    item.brand,
    item.note,
    item.size,
    item.category,
    item.sku,
    item.description,
    item.condition,
    item.conditionEbay,
    club?.name,
    club?.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function matchesListingQuery(item: Listing, rawQuery: string) {
  if (!rawQuery.trim()) return true
  const club = inferClub(item.title)
  return matchesInclusive(
    [
      item.title,
      item.tag,
      item.brand,
      item.note,
      item.size,
      item.category,
      item.sku,
      item.description,
      item.condition,
      item.conditionEbay,
      club?.name,
      club?.id,
    ],
    rawQuery,
  )
}

export function isSquareCatalog(catalog: ListingsPayload | null | undefined) {
  return catalog?.source === 'square' || Boolean(catalog?.listings?.some((l) => l.source === 'square'))
}


/** Clubs / nations we can detect from listing titles (longer names first). */
export const CLUB_CATALOG = [
  { id: 'manchester-city', name: 'Manchester City', pattern: /manchester\s*city|\bman\s*city\b|\bman\s*c\b|\bmcfc\b/i },
  { id: 'manchester-united', name: 'Manchester United', pattern: /manchester\s*united|\bman\s*utd\b|\bman\s*u\b|\bman\s*united\b|\bmufc\b/i },
  { id: 'paris-saint-germain', name: 'Paris Saint-Germain', pattern: /paris\s*saint[-\s]?germain|\bpsg\b|\bparis\s*sg\b/i },
  { id: 'inter-miami', name: 'Inter Miami', pattern: /inter\s*miami\b/i },
  { id: 'ac-milan', name: 'AC Milan', pattern: /\bac\s*milan\b/i },
  { id: 'borussia-dortmund', name: 'Borussia Dortmund', pattern: /borussia\s*dortmund|\bdortmund\b|\bbvb\b/i },
  { id: 'tottenham', name: 'Tottenham', pattern: /tottenham(?:\s*hotspur)?|\bspurs\b/i },
  { id: 'liverpool', name: 'Liverpool', pattern: /liverpool(?:\s*fc)?|\blfc\b/i },
  { id: 'real-madrid', name: 'Real Madrid', pattern: /real\s*madrid|\brma\b/i },
  { id: 'barcelona', name: 'Barcelona', pattern: /fc\s*barcelona|\bbarcelona\b|\bbarca\b|\bbarça\b|\bfcb\b/i },
  { id: 'chelsea', name: 'Chelsea', pattern: /chelsea(?:\s*fc)?|\bcfc\b/i },
  { id: 'ajax', name: 'Ajax', pattern: /ajax(?:\s*amsterdam)?/i },
  { id: 'germany', name: 'Germany', pattern: /germany(?:\s*national)?|\bdfb\b/i },
  { id: 'syracuse', name: 'Syracuse', pattern: /syracuse(?:\s*orange)?|\bcuse\b/i },
  { id: 'arsenal', name: 'Arsenal', pattern: /arsenal(?:\s*fc)?|\bgunners\b/i },
  { id: 'bayern', name: 'Bayern Munich', pattern: /bayern(?:\s*munich)?|\bbayern\s*m[uü]nchen\b/i },
  { id: 'juventus', name: 'Juventus', pattern: /juventus|\bjuve\b/i },
  { id: 'newcastle', name: 'Newcastle', pattern: /newcastle(?:\s*united)?|\bnufc\b/i },
  { id: 'spain', name: 'Spain', pattern: /\bspain(?:\s*national)?\b|\bla\s*roja\b/i },
  { id: 'argentina', name: 'Argentina', pattern: /\bargentina\b|\balbiceleste\b/i },
  { id: 'mexico', name: 'Mexico', pattern: /\bmexico\b|\bel\s*tri\b/i },
  { id: 'usa', name: 'USA', pattern: /\busa\b|united\s*states|\busmnt\b|\buswnt\b/i },
] as const

export type ClubInfo = {
  id: string
  name: string
  count: number
  image: string
  sample: Listing
}

export function inferClub(title: string): { id: string; name: string } | null {
  for (const club of CLUB_CATALOG) {
    if (club.pattern.test(title)) return { id: club.id, name: club.name }
  }
  return null
}

export function clubsInStock(listings: Listing[]): ClubInfo[] {
  const map = new Map<string, ClubInfo>()
  for (const item of listings) {
    const club = inferClub(item.title)
    if (!club) continue
    const existing = map.get(club.id)
    if (existing) {
      existing.count += 1
      continue
    }
    map.set(club.id, {
      id: club.id,
      name: club.name,
      count: 1,
      image: resolveListingImageUrl(item.image),
      sample: item,
    })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function isAdultListing(item: Listing) {
  if (isYouthListing(item)) return false
  // Everything non-youth counts as men's / adult until women's inventory is added.
  return true
}

/** Inventory Type filter — title-based, not catalog tag. */
export const TYPE_FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'Training', label: 'Training' },
  { id: 'Jerseys', label: 'Jerseys' },
  { id: 'Home kits', label: 'Home kits' },
  { id: 'Away kits', label: 'Away kits' },
  { id: 'Third kits', label: 'Third kits' },
  { id: 'Apparel', label: 'Apparel' },
] as const

export type TypeFilterId = (typeof TYPE_FILTERS)[number]['id']

/** Pre-match, training, or strike tops. */
export function isTrainingTypeListing(item: Listing) {
  const t = item.title
  return /pre-?match/i.test(t) || /\btraining\b/i.test(t) || /\bstrike\b/i.test(t)
}

/** Any listing with “jersey” in the title. */
export function isJerseyTypeListing(item: Listing) {
  return /\bjerseys?\b/i.test(item.title)
}

/** Home kit / home jersey. */
export function isHomeKitListing(item: Listing) {
  return /\bhome\b/i.test(item.title)
}

/** Away kit / away jersey. */
export function isAwayKitListing(item: Listing) {
  return /\baway\b/i.test(item.title)
}

/** Third or fourth kit / jersey. */
export function isThirdKitListing(item: Listing) {
  return /\bthird\b|\bfourth\b|\b4th\b/i.test(item.title)
}

/** Everything outside Training and Jerseys (scarves, tees, towels, etc.). */
export function isApparelTypeListing(item: Listing) {
  return !isTrainingTypeListing(item) && !isJerseyTypeListing(item)
}

export function matchesTypeFilter(item: Listing, filter: TypeFilterId | string) {
  if (filter === 'All') return true
  if (filter === 'Training') return isTrainingTypeListing(item)
  if (filter === 'Jerseys') return isJerseyTypeListing(item)
  if (filter === 'Home kits') return isHomeKitListing(item)
  if (filter === 'Away kits') return isAwayKitListing(item)
  if (filter === 'Third kits') return isThirdKitListing(item)
  if (filter === 'Apparel') return isApparelTypeListing(item)
  // Legacy catalog tags from old deep links.
  if (filter === 'Youth') return isYouthListing(item)
  return item.tag === filter
}

export function kitType(item: Listing): 'Home' | 'Away' | 'Third' | 'Pre-match' | 'Training' | 'Other' {
  const t = item.title
  if (/pre-?match/i.test(t)) return 'Pre-match'
  if (/\btraining\b|\bstrike\b/i.test(t)) return 'Training'
  if (/\bthird\b/i.test(t)) return 'Third'
  if (/\baway\b/i.test(t)) return 'Away'
  if (/\bhome\b/i.test(t)) return 'Home'
  if (item.tag === 'Training') return 'Training'
  return 'Other'
}

export function pickTrending(listings: Listing[], count = 8) {
  const sale = listings.filter((item) => isSaleListing(item))
  const rest = listings.filter((item) => !isSaleListing(item))
  const mixed: Listing[] = []
  const used = new Set<string>()
  const push = (item: Listing | undefined) => {
    if (!item || used.has(item.id)) return
    mixed.push(item)
    used.add(item.id)
  }
  // Prefer variety: sale + brand spread + newest
  for (const item of sale) {
    push(item)
    if (mixed.length >= Math.min(3, count)) break
  }
  for (const brand of ['Nike', 'Adidas', 'Puma']) {
    push(rest.find((item) => item.brand === brand))
    if (mixed.length >= count) break
  }
  for (const item of listings) {
    push(item)
    if (mixed.length >= count) break
  }
  return mixed.slice(0, count)
}

export function listingsMatchingClub(listings: Listing[], clubId: string) {
  const club = CLUB_CATALOG.find((entry) => entry.id === clubId)
  if (!club) return []
  return listings.filter((item) => club.pattern.test(item.title))
}

export const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'name', label: 'Name A–Z' },
] as const

export type SortId = (typeof SORT_OPTIONS)[number]['id']

export function sortListings(listings: Listing[], sort: SortId): Listing[] {
  const copy = [...listings]
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
    case 'price-desc':
      return copy.sort((a, b) => (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.NEGATIVE_INFINITY))
    case 'name':
      return copy.sort((a, b) => shortTitle(a.title).localeCompare(shortTitle(b.title)))
    case 'newest':
      // Catalog sync order is oldest→newest in some feeds; reverse so newest appears first.
      return copy.reverse()
    case 'featured':
    default:
      return copy
  }
}

/** Drop true clones only — same title + price + checkout — so distinct SKUs stay visible. */
export function dedupeListingsByTitle(listings: Listing[]): Listing[] {
  const seen = new Set<string>()
  const out: Listing[] = []
  for (const item of listings) {
    const key = [
      item.title.trim().toLowerCase(),
      item.price ?? '',
      item.checkoutUrl ?? item.productUrl ?? item.url ?? item.id,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

const RECENT_KEY = 'jerseydeals.recent.v1'
const RECENT_MAX = 8

export function readRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

export function pushRecentlyViewed(id: string): string[] {
  if (typeof window === 'undefined') return []
  const next = [id, ...readRecentlyViewed().filter((row) => row !== id)].slice(0, RECENT_MAX)
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
  return next
}
