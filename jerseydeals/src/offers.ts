/**
 * Rewards / welcome offers wallet (client-side).
 * Offers are claimed into My offers, then activated at checkout, then removed after use.
 */

import { inferLeague } from './listings'
import {
  hasMarkedFirst10Claimed,
  hasPurchased,
  markFirst10Claimed,
  readBuyerEmail,
  readOffer,
  writeOffer,
} from './offer'
import { isRewardsMember } from './rewardsMember'

export const OFFERS_STORAGE_KEY = 'jerseydeals.offers.v1'
export const OFFERS_EVENT = 'jerseydeals:offers'

export type OfferId = 'first10' | 'pl5'

export type OfferStatus = 'available' | 'activated' | 'used'

export type WalletOffer = {
  id: OfferId
  status: OfferStatus
  claimedAt: string
  activatedAt?: string
  usedAt?: string
}

export type OffersWallet = {
  offers: WalletOffer[]
  /** Offer currently activated for checkout (at most one). */
  activeId: OfferId | null
}

export type OfferDefinition = {
  id: OfferId
  title: string
  detail: string
  /** Shown on My offers cards. */
  activateHint: string
}

export const OFFER_DEFS: Record<OfferId, OfferDefinition> = {
  first10: {
    id: 'first10',
    title: '10% off your first order',
    detail: 'Welcome offer for first-time buyers on any kit.',
    activateHint: 'Activate at checkout',
  },
  pl5: {
    id: 'pl5',
    title: '$5 off a Premier League jersey',
    detail: 'Rewards Club offer — save $5 on a Premier League kit.',
    activateHint: 'Activate at checkout',
  },
}

function canStore() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function emptyWallet(): OffersWallet {
  return { offers: [], activeId: null }
}

function notify() {
  try {
    window.dispatchEvent(new Event(OFFERS_EVENT))
  } catch {
    /* ignore */
  }
}

export function isPremierLeagueTitle(title: string) {
  return inferLeague(title)?.id === 'premier-league'
}

function migrateFromLegacyOffer(wallet: OffersWallet): OffersWallet {
  const legacy = readOffer()
  // Old flow set activated:true on popup submit — treat as claimed, not checkout-active.
  if ((legacy.activated || legacy.claimed) && !hasPurchased()) {
    const hasFirst = wallet.offers.some((o) => o.id === 'first10')
    if (!hasFirst) {
      wallet.offers.push({
        id: 'first10',
        status: 'available',
        claimedAt: new Date().toISOString(),
      })
      try {
        localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(wallet))
      } catch {
        /* ignore */
      }
    }
    if (legacy.activated) {
      writeOffer({
        activated: false,
        email: legacy.email || readBuyerEmail(),
        claimed: true,
        activatedAt: undefined,
      })
    }
  }
  return wallet
}

export function readOffersWallet(): OffersWallet {
  if (!canStore()) return emptyWallet()
  let wallet = emptyWallet()
  try {
    const raw = localStorage.getItem(OFFERS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as OffersWallet
      if (parsed && Array.isArray(parsed.offers)) {
        wallet = {
          offers: parsed.offers.filter((o) => o?.id === 'first10' || o?.id === 'pl5'),
          activeId:
            parsed.activeId === 'first10' || parsed.activeId === 'pl5' ? parsed.activeId : null,
        }
      }
    }
  } catch {
    wallet = emptyWallet()
  }
  wallet = migrateFromLegacyOffer(wallet)
  return wallet
}

export function writeOffersWallet(wallet: OffersWallet) {
  if (!canStore()) return
  try {
    localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(wallet))
  } catch {
    /* ignore */
  }
  notify()
}

/** Offers still usable (not used). */
export function listOpenOffers(): WalletOffer[] {
  return readOffersWallet().offers.filter((o) => o.status !== 'used')
}

export function getActiveCheckoutOffer(): WalletOffer | null {
  const wallet = readOffersWallet()
  if (!wallet.activeId) return null
  return wallet.offers.find((o) => o.id === wallet.activeId && o.status !== 'used') || null
}

export function hasClaimedFirstBuyerOffer() {
  if (hasMarkedFirst10Claimed()) return true
  const legacy = readOffer()
  if (legacy.claimed) {
    markFirst10Claimed()
    return true
  }
  if (readOffersWallet().offers.some((o) => o.id === 'first10')) {
    markFirst10Claimed()
    return true
  }
  return false
}

export function claimOffer(id: OfferId) {
  const wallet = readOffersWallet()
  const existing = wallet.offers.find((o) => o.id === id)
  if (existing) {
    if (id === 'first10') markFirst10Claimed()
    if (existing.status === 'used') return existing
    return existing
  }
  const row: WalletOffer = {
    id,
    status: 'available',
    claimedAt: new Date().toISOString(),
  }
  wallet.offers.push(row)
  writeOffersWallet(wallet)
  if (id === 'first10') markFirst10Claimed()
  return row
}

/** Popup signup — claim 10% into My offers (does not apply until checkout activate). */
export function claimFirstBuyerOffer(email: string) {
  const cleaned = email.trim().toLowerCase()
  markFirst10Claimed()
  writeOffer({
    activated: false,
    email: cleaned,
    claimed: true,
    activatedAt: undefined,
  })
  return claimOffer('first10')
}

/** Rewards members get the Premier League $5 offer. */
export function ensureRewardsOffers() {
  if (!isRewardsMember()) return
  claimOffer('pl5')
}

/**
 * Keep the first-time 10% offer in the wallet when claimed via the popup,
 * even if the shopper never joined Rewards Club.
 */
export function ensureClaimedFirstBuyerOffer() {
  if (!hasClaimedFirstBuyerOffer()) return
  if (hasPurchased()) return
  claimOffer('first10')
}

export function activateOfferAtCheckout(id: OfferId): { ok: true } | { ok: false; message: string } {
  if (id === 'first10' && hasPurchased()) {
    return { ok: false, message: 'First-order offer is only for new buyers.' }
  }
  const wallet = readOffersWallet()
  const row = wallet.offers.find((o) => o.id === id)
  if (!row || row.status === 'used') {
    return { ok: false, message: 'That offer isn’t available.' }
  }
  // Clear previous activation
  for (const offer of wallet.offers) {
    if (offer.status === 'activated') offer.status = 'available'
    delete offer.activatedAt
  }
  row.status = 'activated'
  row.activatedAt = new Date().toISOString()
  wallet.activeId = id
  writeOffersWallet(wallet)

  // Keep legacy flag in sync for any remaining readers (discounted links use wallet active).
  const email = readBuyerEmail() || readOffer().email
  writeOffer({
    activated: id === 'first10',
    email,
    claimed: true,
    activatedAt: id === 'first10' ? Date.now() : undefined,
  })
  return { ok: true }
}

export function clearCheckoutActivation() {
  const wallet = readOffersWallet()
  for (const offer of wallet.offers) {
    if (offer.status === 'activated') {
      offer.status = 'available'
      delete offer.activatedAt
    }
  }
  wallet.activeId = null
  writeOffersWallet(wallet)
  const email = readBuyerEmail() || readOffer().email
  // Never clear welcome-offer claim — popup must stay suppressed after signup.
  writeOffer({
    activated: false,
    email,
    claimed: hasClaimedFirstBuyerOffer() || readOffer().claimed === true,
  })
}

/** After a confirmed purchase — remove the activated offer (and retire first10). */
export function consumeOffersAfterPurchase() {
  const wallet = readOffersWallet()
  const now = new Date().toISOString()
  const active = wallet.activeId
  for (const offer of wallet.offers) {
    if (offer.id === active || offer.status === 'activated') {
      offer.status = 'used'
      offer.usedAt = now
    }
    // First-order perk ends once they've ordered, even if unused.
    if (offer.id === 'first10' && offer.status !== 'used') {
      offer.status = 'used'
      offer.usedAt = now
    }
  }
  wallet.activeId = null
  writeOffersWallet(wallet)
}

export function applyOfferUnitPrice(
  price: number | null | undefined,
  opts: { offerId: OfferId | null; title?: string },
): number | null {
  if (price == null || Number.isNaN(price)) return null
  if (!opts.offerId) return price
  if (opts.offerId === 'first10') {
    return Math.round(price * 0.9 * 100) / 100
  }
  if (opts.offerId === 'pl5') {
    if (opts.title && !isPremierLeagueTitle(opts.title)) return price
    return Math.max(0, Math.round((price - 5) * 100) / 100)
  }
  return price
}

export function checkoutUsesSquareDiscountLink(offerId: OfferId | null) {
  return offerId === 'first10'
}

export function offerEligibleForCart(
  id: OfferId,
  cartTitles: string[],
): { ok: true } | { ok: false; message: string } {
  if (id === 'first10') {
    if (hasPurchased()) return { ok: false, message: 'First-order offer is only for new buyers.' }
    return { ok: true }
  }
  if (id === 'pl5') {
    const hasPl = cartTitles.some((t) => isPremierLeagueTitle(t))
    if (!hasPl) {
      return { ok: false, message: 'Add a Premier League jersey to use this offer.' }
    }
    return { ok: true }
  }
  return { ok: true }
}

/** Undo a false “purchased” consume so the 10% offer can return to My offers. */
export function restoreFirstBuyerOfferAfterFalsePurchase() {
  if (hasPurchased()) return
  const wallet = readOffersWallet()
  let changed = false
  const row = wallet.offers.find((o) => o.id === 'first10')
  if (row && row.status === 'used') {
    row.status = 'available'
    delete row.usedAt
    delete row.activatedAt
    changed = true
  }
  if (wallet.activeId === 'first10') {
    wallet.activeId = null
    changed = true
  }
  if (changed) writeOffersWallet(wallet)
  // Re-claim into wallet if they signed up via the popup (or legacy claim).
  ensureClaimedFirstBuyerOffer()
}

/** Keep wallet in sync when a purchase is confirmed or a false mark is cleared. */
if (typeof window !== 'undefined') {
  window.addEventListener('jerseydeals:purchased', () => {
    consumeOffersAfterPurchase()
  })
  window.addEventListener('jerseydeals:purchased-cleared', () => {
    restoreFirstBuyerOfferAfterFalsePurchase()
  })
}
