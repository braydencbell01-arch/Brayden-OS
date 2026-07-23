/**
 * Storefront + contact config for Jersey Deals.
 * Set VITE_SQUARE_STORE_URL when the Square Online store is live.
 */
export const SQUARE_STORE_URL = (import.meta.env.VITE_SQUARE_STORE_URL as string | undefined)?.trim() || ''

/** Fallback / live inventory channel until Square catalog is primary. */
export const EBAY_SELLER = 'jerseydealsofficial'
export const EBAY_SELLER_URL = `https://www.ebay.com/usr/${EBAY_SELLER}`
export const EBAY_SHOP_URL = `https://www.ebay.com/sch/i.html?_ssn=${EBAY_SELLER}&_sop=10`

export const EBAY_YOUTH_URL = `${EBAY_SHOP_URL}&_nkw=youth`
export const EBAY_SALE_URL = `https://www.ebay.com/sch/i.html?_ssn=${EBAY_SELLER}&_udhi=25&_sop=15`
export const EBAY_NEWEST_URL = EBAY_SHOP_URL

/** Restock / newsletter mailto (static Pages has no backend). */
export const CONTACT_EMAIL = 'braydencbell01@gmail.com'

/** Optional GA4 measurement ID — leave empty to skip. */
export const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_ID as string | undefined)?.trim() || ''

/** Sale urgency copy — update when the promo window changes. */
export const SALE_HEADLINE = 'Shop the sale'
export const SALE_URGENCY = 'Under $25 · while stock lasts'

export const FAMILY_NOTE = 'Family-run shop — real photos, sizes, and shipping from our inventory.'
