/** First-time buyer offer signup state (GitHub Pages has no backend). */

export const FIRST_BUYER_DISCOUNT = 0.1
export const OFFER_STORAGE_KEY = 'jerseydeals.offer.v1'
export const PURCHASED_STORAGE_KEY = 'jerseydeals.purchased.v1'
export const BUYER_EMAIL_STORAGE_KEY = 'jerseydeals.buyerEmail.v1'

export type OfferState = {
  /** @deprecated Prefer wallet activeId — kept for migration / Square snippet sync. */
  activated: boolean
  email: string
  /** True once the shopper entered email on the welcome popup. */
  claimed?: boolean
  activatedAt?: number
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readOffer(): OfferState {
  if (!canUseStorage()) return { activated: false, email: '', claimed: false }
  try {
    const raw = window.localStorage.getItem(OFFER_STORAGE_KEY)
    if (!raw) return { activated: false, email: readBuyerEmail(), claimed: false }
    const parsed = JSON.parse(raw) as OfferState
    return {
      activated: Boolean(parsed.activated),
      email: String(parsed.email || readBuyerEmail() || '').trim().toLowerCase(),
      claimed: Boolean(parsed.claimed) || Boolean(parsed.activated),
      activatedAt: parsed.activatedAt,
    }
  } catch {
    return { activated: false, email: readBuyerEmail(), claimed: false }
  }
}

export function writeOffer(state: OfferState) {
  if (!canUseStorage()) return
  const next: OfferState = {
    activated: Boolean(state.activated),
    email: String(state.email || '').trim().toLowerCase(),
    claimed: Boolean(state.claimed),
    activatedAt: state.activatedAt,
  }
  window.localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(next))
  if (next.email) writeBuyerEmail(next.email)
  window.dispatchEvent(new CustomEvent('jerseydeals:offer', { detail: next }))
}

/** @deprecated Use claimFirstBuyerOffer / activateOfferAtCheckout from offers.ts */
export function activateOffer(email: string) {
  const cleaned = email.trim().toLowerCase()
  writeOffer({ activated: true, email: cleaned, claimed: true, activatedAt: Date.now() })
  return readOffer()
}

export function readBuyerEmail() {
  if (!canUseStorage()) return ''
  return (window.localStorage.getItem(BUYER_EMAIL_STORAGE_KEY) || '').trim().toLowerCase()
}

export function writeBuyerEmail(email: string) {
  if (!canUseStorage()) return
  const cleaned = email.trim().toLowerCase()
  window.localStorage.setItem(BUYER_EMAIL_STORAGE_KEY, cleaned)
}

export function hasPurchased() {
  if (!canUseStorage()) return false
  return window.localStorage.getItem(PURCHASED_STORAGE_KEY) === '1'
}

export function markPurchased() {
  if (!canUseStorage()) return
  window.localStorage.setItem(PURCHASED_STORAGE_KEY, '1')
  const email = readBuyerEmail() || readOffer().email
  writeOffer({ activated: false, email, claimed: true, activatedAt: undefined })
  window.dispatchEvent(new CustomEvent('jerseydeals:purchased'))
}

/** Apply 10% off for display / totals. */
export function applyFirstBuyerDiscount(price: number | null | undefined) {
  if (price == null || Number.isNaN(price)) return null
  return Math.round(price * (1 - FIRST_BUYER_DISCOUNT) * 100) / 100
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

type PurchasersFile = { emails?: string[] }

/** Best-effort prior-purchase check against synced Square order emails. */
export async function emailHasPriorPurchase(email: string): Promise<boolean> {
  const cleaned = email.trim().toLowerCase()
  if (!cleaned) return false
  try {
    const base = import.meta.env.BASE_URL || '/'
    const res = await fetch(`${base}purchasers.json`, { cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json()) as PurchasersFile
    const set = new Set((data.emails || []).map((e) => String(e).trim().toLowerCase()))
    return set.has(cleaned)
  } catch {
    return false
  }
}

/** Capture ?purchase=1 / ?purchased=1 return from Square Payment Links. */
export function capturePurchaseReturnFromUrl() {
  if (typeof window === 'undefined') return false
  try {
    const url = new URL(window.location.href)
    const flag = url.searchParams.get('purchase') || url.searchParams.get('purchased')
    if (flag === '1' || flag === 'true') {
      markPurchased()
      url.searchParams.delete('purchase')
      url.searchParams.delete('purchased')
      // Keep ?sold= for soldOut capture (called separately); only strip purchase flags here.
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}
