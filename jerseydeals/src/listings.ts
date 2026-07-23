export type Listing = {
  id: string
  title: string
  price: number | null
  currency: string
  url: string
  /** Square Payment Link checkout when Online shipping isn't configured */
  checkoutUrl?: string
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

/** Prefer Payment Link checkout when present (Square Online shipping workaround). */
export function listingBuyUrl(item: Listing) {
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

/** Inventory price toggles — keep ranges aligned with typical kit pricing. */
export const PRICE_FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'under-25', label: 'Under $25', max: 25 },
  { id: '25-40', label: '$25–$40', min: 25, max: 40 },
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

export function listingImages(item: Listing): string[] {
  const fromArray = (item.images || []).filter(Boolean)
  let urls: string[]
  if (fromArray.length > 0) {
    // Main/cover image first, then the rest left-to-right.
    if (item.image && fromArray[0] !== item.image) {
      urls = [item.image, ...fromArray.filter((url) => url !== item.image)]
    } else {
      urls = fromArray
    }
  } else {
    urls = item.image ? [item.image] : []
  }
  return urls.map(resolveListingImageUrl)
}

export function listingSearchText(item: Listing) {
  return [item.title, item.tag, item.brand, item.note, item.size, item.category, item.sku]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function matchesListingQuery(item: Listing, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const hay = listingSearchText(item)
  const tokens = q.split(/\s+/).filter(Boolean)
  return tokens.every((token) => hay.includes(token))
}

export function isSquareCatalog(catalog: ListingsPayload | null | undefined) {
  return catalog?.source === 'square' || Boolean(catalog?.listings?.some((l) => l.source === 'square'))
}


/** Clubs / nations we can detect from listing titles (longer names first). */
export const CLUB_CATALOG = [
  { id: 'manchester-city', name: 'Manchester City', pattern: /manchester\s*city|\bman\s*city\b|\bmcfc\b/i },
  { id: 'manchester-united', name: 'Manchester United', pattern: /manchester\s*united|\bman\s*utd\b|\bmufc\b/i },
  { id: 'paris-saint-germain', name: 'Paris Saint-Germain', pattern: /paris\s*saint[-\s]?germain|\bpsg\b/i },
  { id: 'inter-miami', name: 'Inter Miami', pattern: /inter\s*miami\b/i },
  { id: 'ac-milan', name: 'AC Milan', pattern: /\bac\s*milan\b/i },
  { id: 'borussia-dortmund', name: 'Borussia Dortmund', pattern: /borussia\s*dortmund|\bdortmund\b|\bbvb\b/i },
  { id: 'tottenham', name: 'Tottenham', pattern: /tottenham(?:\s*hotspur)?|\bspurs\b/i },
  { id: 'liverpool', name: 'Liverpool', pattern: /liverpool(?:\s*fc)?|\blfc\b/i },
  { id: 'real-madrid', name: 'Real Madrid', pattern: /real\s*madrid|\brma\b/i },
  { id: 'barcelona', name: 'Barcelona', pattern: /fc\s*barcelona|\bbarcelona\b|\bbarca\b|\bfcb\b/i },
  { id: 'chelsea', name: 'Chelsea', pattern: /chelsea(?:\s*fc)?|\bcfc\b/i },
  { id: 'ajax', name: 'Ajax', pattern: /ajax(?:\s*amsterdam)?/i },
  { id: 'germany', name: 'Germany', pattern: /germany(?:\s*national)?|\bdfb\b/i },
  { id: 'syracuse', name: 'Syracuse', pattern: /syracuse(?:\s*orange)?/i },
  { id: 'arsenal', name: 'Arsenal', pattern: /arsenal(?:\s*fc)?/i },
  { id: 'bayern', name: 'Bayern Munich', pattern: /bayern(?:\s*munich)?/i },
  { id: 'juventus', name: 'Juventus', pattern: /juventus|\bjuve\b/i },
  { id: 'newcastle', name: 'Newcastle', pattern: /newcastle(?:\s*united)?/i },
  { id: 'spain', name: 'Spain', pattern: /\bspain(?:\s*national)?\b|\bla\s*roja\b/i },
  { id: 'argentina', name: 'Argentina', pattern: /\bargentina\b|\balbiceleste\b/i },
  { id: 'mexico', name: 'Mexico', pattern: /\bmexico\b|\bel\s*tri\b/i },
  { id: 'usa', name: 'USA', pattern: /\busa\b|united\s*states|\busmnt\b/i },
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
  return /\bmen'?s\b|\bwomen'?s\b/i.test(item.title) || item.tag === 'Jerseys' || item.tag === 'Training'
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
