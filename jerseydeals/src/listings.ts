import { CLUB_CATALOG, LEAGUE_BY_CLUB_ID } from './clubCatalog'
import { matchesInclusive } from './inclusiveSearch'
import { viewsForListing } from './listingViews'
import listingPhotoOverrides from './listingPhotoOverrides.json'

export { CLUB_CATALOG, LEAGUE_BY_CLUB_ID } from './clubCatalog'

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
    // Keep youth sizing readable after we strip the word "Youth": "Youth XL" → "Yth XL".
    .replace(/\bYouth\s*(XXL|XL|XS|[SML])\b/gi, (_m, size: string) => `Yth ${String(size).toUpperCase()}`)
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

/** Women's / ladies kits — rare in current stock; filter still available. */
export function isWomenListing(item: Listing) {
  if (isYouthListing(item)) return false
  return /\bwomen'?s?\b|\bladies\b|\bwmn\b/i.test(`${item.title} ${item.tag} ${item.note}`)
}

/** Title matchers for the current sale rack (hand-picked). */
export const SALE_TITLE_PATTERNS: RegExp[] = [
  /newcastle\s*united/i,
  /tottenham.*22\s*\/\s*23.*training/i,
  /barcelona.*crest\s*t-?shirt/i,
  /\bgermany\b.*22\s*\/\s*23/i,
  /tottenham.*gray\s*strike\s*top/i,
  /real\s*madrid.*purple\s*training/i,
  /manchester\s*united.*24\s*\/\s*25.*third/i,
]

export function isSaleListing(item: Listing, _maxPrice = 25) {
  // Curated sale rack — update SALE_TITLE_PATTERNS when the shop picks new sale kits.
  return SALE_TITLE_PATTERNS.some((pattern) => pattern.test(item.title))
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

export function pickSaleItems(listings: Listing[], count?: number) {
  const sale = listings.filter((item) => isSaleListing(item))
  return count == null ? sale : sale.slice(0, count)
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

/** Local studio covers keyed by Square listing id (survives catalog sync). */
const PHOTO_OVERRIDES = listingPhotoOverrides as Record<string, string | string[]>

/** Prefer hand-edited studio photos first; keep sync galleries after. */
export function applyListingPhotoOverrides(catalog: ListingsPayload): ListingsPayload {
  if (!catalog?.listings?.length) return catalog
  let changed = false
  const listings = catalog.listings.map((item) => {
    const raw = PHOTO_OVERRIDES[item.id]
    if (!raw) return item
    const studio = (Array.isArray(raw) ? raw : [raw])
      .map((path) => resolveListingImageUrl(path))
      .filter(Boolean)
    if (!studio.length) return item
    const studioSet = new Set(studio)
    const rest = listingImages(item).filter((url) => !studioSet.has(url))
    changed = true
    return { ...item, image: studio[0], images: [...studio, ...rest] }
  })
  return changed ? { ...catalog, listings } : catalog
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
  const league = inferLeague(item.title)
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
      league?.name,
      league?.id,
      // Help league / nickname search even when title is short.
      club?.id === 'syracuse' ? 'ncaa college syracuse orange cuse' : '',
      club && LEAGUE_BY_CLUB_ID[club.id]
        ? `${LEAGUE_BY_CLUB_ID[club.id].name} ${LEAGUE_BY_CLUB_ID[club.id].id}`
        : '',
    ],
    rawQuery,
  )
}

export function isSquareCatalog(catalog: ListingsPayload | null | undefined) {
  return catalog?.source === 'square' || Boolean(catalog?.listings?.some((l) => l.source === 'square'))
}


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

export const PREMIER_LEAGUE_CLUB_IDS = new Set(
  Object.entries(LEAGUE_BY_CLUB_ID)
    .filter(([, league]) => league.id === 'premier-league')
    .map(([clubId]) => clubId),
)

export type LeagueInfo = {
  id: string
  name: string
  count: number
}

export function inferLeague(title: string): { id: string; name: string } | null {
  const club = inferClub(title)
  if (!club) return null
  return LEAGUE_BY_CLUB_ID[club.id] ?? null
}

export function leaguesInStock(listings: Listing[]): LeagueInfo[] {
  const map = new Map<string, LeagueInfo>()
  for (const item of listings) {
    const league = inferLeague(item.title)
    if (!league) continue
    const existing = map.get(league.id)
    if (existing) {
      existing.count += 1
      continue
    }
    map.set(league.id, { id: league.id, name: league.name, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function premierLeagueClubsInStock(listings: Listing[]): ClubInfo[] {
  return clubsInStock(listings).filter((club) => PREMIER_LEAGUE_CLUB_IDS.has(club.id))
}

/** Clubs in recent / upcoming UEFA Champions League seasons (not a historic mega-list). */
export const CHAMPIONS_LEAGUE_CLUB_IDS = new Set([
  'real-madrid',
  'barcelona',
  'bayern',
  'paris-saint-germain',
  'manchester-city',
  'liverpool',
  'arsenal',
  'chelsea',
  'inter-milan',
  'ac-milan',
  'atletico-madrid',
  'borussia-dortmund',
  'bayer-leverkusen',
  'napoli',
  'juventus',
  'aston-villa',
  'benfica',
  'sporting-cp',
  'porto',
  'club-brugge',
  'monaco',
  'lille',
  'atalanta',
  'bologna',
  'stuttgart',
  'brest',
  'feyenoord',
  'celtic',
  'dinamo-zagreb',
  'red-star',
  'young-boys',
  'slovan-bratislava',
  'sparta-prague',
  'salzburg',
  'shakhtar',
])
// Note: Newcastle omitted — not in the upcoming UCL season.

export function championsLeagueClubsInStock(listings: Listing[]): ClubInfo[] {
  return clubsInStock(listings).filter((club) => CHAMPIONS_LEAGUE_CLUB_IDS.has(club.id))
}

export function matchesLeagueFilter(item: Listing, leagueId: string) {
  if (leagueId === 'All') return true
  if (leagueId === 'champions-league') {
    const club = inferClub(item.title)
    return Boolean(club && CHAMPIONS_LEAGUE_CLUB_IDS.has(club.id))
  }
  return inferLeague(item.title)?.id === leagueId
}

export function isAdultListing(item: Listing) {
  if (isYouthListing(item)) return false
  if (isWomenListing(item)) return false
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

export function kitType(
  item: Listing,
): 'Home' | 'Away' | 'Third' | 'Pre-match' | 'Training' | 'Apparel' | 'Other' {
  const t = item.title
  if (/pre-?match/i.test(t)) return 'Pre-match'
  if (/\btraining\b|\bstrike\b/i.test(t)) return 'Training'
  if (/\bthird\b/i.test(t)) return 'Third'
  if (/\baway\b/i.test(t)) return 'Away'
  if (/\bhome\b/i.test(t)) return 'Home'
  if (item.tag === 'Training') return 'Training'
  if (isApparelTypeListing(item)) return 'Apparel'
  return 'Other'
}

/**
 * The four (or `count`) listings with the most views in the last week.
 * Sale vs full-price does not matter; empty when nobody has viewed yet.
 */
export function pickTrending(
  listings: Listing[],
  count = 4,
  viewCounts: Record<string, number> = {},
) {
  return [...listings]
    .map((item) => ({ item, views: viewsForListing(item, viewCounts) }))
    .filter((row) => row.views > 0)
    .sort((a, b) => b.views - a.views || a.item.title.localeCompare(b.item.title))
    .slice(0, count)
    .map((row) => row.item)
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
