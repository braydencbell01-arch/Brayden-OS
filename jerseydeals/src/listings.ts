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
}

export type ListingsPayload = {
  syncedAt: string
  seller: string
  sellerUrl: string
  shopUrl: string
  count: number
  listings: Listing[]
}

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

export function isYouthListing(item: Listing) {
  return /youth|yth|boys|girls|9-12|yrs/i.test(`${item.title} ${item.tag} ${item.note}`)
}

export function isSaleListing(item: Listing, maxPrice = 25) {
  return item.price != null && item.price <= maxPrice
}

export function pickFeatured(listings: Listing[], count = 6) {
  return listings.slice(0, count)
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
