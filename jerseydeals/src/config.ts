/**
 * Storefront + contact config for Jersey Deals.
 * Square Online is the primary checkout; eBay remains a secondary channel.
 */
export const SQUARE_STORE_URL =
  (import.meta.env.VITE_SQUARE_STORE_URL as string | undefined)?.trim() ||
  'https://jerseydealsofficial.square.site/'

/** Square Online cart (Weebly path). */
export const SQUARE_CART_URL =
  (import.meta.env.VITE_SQUARE_CART_URL as string | undefined)?.trim() ||
  `${SQUARE_STORE_URL.replace(/\/$/, '')}/s/cart`

/** Secondary marketplace channel. */
export const EBAY_SELLER = 'jerseydealsofficial'
export const EBAY_SELLER_URL = `https://www.ebay.com/usr/${EBAY_SELLER}`
export const EBAY_SHOP_URL = `https://www.ebay.com/sch/i.html?_ssn=${EBAY_SELLER}&_sop=10`

export const EBAY_SALE_URL = `https://www.ebay.com/sch/i.html?_ssn=${EBAY_SELLER}&_udhi=25&_sop=15`

/** Detailed seller ratings shown on the storefront (from eBay). */
export const EBAY_RATINGS = [
  { label: 'Accurate description', score: 4.6 },
  { label: 'Reasonable shipping cost', score: 4.9 },
  { label: 'Shipping speed', score: 5.0 },
  { label: 'Communication', score: 4.6 },
] as const

/** Restock / newsletter mailto (static Pages has no backend). */
export const CONTACT_EMAIL = 'braydencbell01@gmail.com'

/** Optional GA4 measurement ID — leave empty to skip. */
export const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_ID as string | undefined)?.trim() || ''

/** Sale urgency copy — update when the promo window changes. */
export const SALE_HEADLINE = 'Shop the sale'
export const SALE_URGENCY = '$25 & under · while stock lasts'

/** Top promo bar — keep short so it stays one line under the fixed header offset. */
export const PROMO_BAR = 'Live stock · Youth & adult sizes'

/** Soft free-shipping goal shown in the cart drawer. Set to 0 when shipping is already free. */
export const FREE_SHIPPING_THRESHOLD = 0

export const FAMILY_NOTE = 'Family-run shop — real photos, sizes, and shipping from our inventory.'

/** Newsletter incentive copy (mailto signup — no backend list). */
export const NEWSLETTER_INCENTIVE = 'Be first on restocks & sale drops'
