/**
 * Rewards / welcome offers wallet (client-side).
 * Offers are claimed into My offers, then activated at checkout, then removed after use.
 *
 * Rewards-member offers (auto-appear in My offers) live in
 * `src/rewardsOffersCatalog.json`. Adding one there shows it for members and
 * triggers the once-daily new-offer email — no separate steps.
 */

import rewardsOffersCatalog from './rewardsOffersCatalog.json'
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

/** first10 = welcome popup; other ids come from the Rewards catalog. */
export type OfferId = string

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

type CatalogOffer = {
  id: string
  title: string
  detail: string
  activateHint?: string
  audience?: string
  pricing?: {
    type?: string
    amount?: number
    league?: string
    firstOrderOnly?: boolean
  }
}

const catalogRows: CatalogOffer[] = Array.isArray(rewardsOffersCatalog?.offers)
  ? (rewardsOffersCatalog.offers as CatalogOffer[])
  : []

function catalogDefinition(row: CatalogOffer): OfferDefinition {
  return {
    id: String(row.id || '').trim(),
    title: String(row.title || 'Rewards offer').trim(),
    detail: String(row.detail || '').trim(),
    activateHint: String(row.activateHint || 'Activate at checkout').trim(),
  }
}

/** Offers that auto-appear under My offers for Rewards members. */
export function rewardsMemberCatalogOffers(): CatalogOffer[] {
  return catalogRows.filter((row) => {
    const id = String(row?.id || '').trim()
    if (!id || id === 'first10') return false
    const audience = String(row?.audience || 'rewards').toLowerCase()
    return audience === 'rewards' || audience === 'all'
  })
}

export function rewardsMemberOfferIds(): OfferId[] {
  return rewardsMemberCatalogOffers().map((row) => String(row.id).trim())
}

const catalogDefs: Record<string, OfferDefinition> = Object.fromEntries(
  rewardsMemberCatalogOffers()
    .map((row) => catalogDefinition(row))
    .filter((def) => def.id)
    .map((def) => [def.id, def]),
)

export const OFFER_DEFS: Record<string, OfferDefinition> = {
  first10: {
    id: 'first10',
    title: '10% off your first order',
    detail: 'Welcome offer for first-time buyers on any kit.',
    activateHint: 'Activate at checkout',
  },
  ...catalogDefs,
}

export function getOfferDef(id: OfferId | null | undefined): OfferDefinition | null {
  if (!id) return null
  return OFFER_DEFS[id] || null
}

function isKnownOfferId(id: string) {
  return Boolean(OFFER_DEFS[id])
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
          offers: parsed.offers.filter((o) => o?.id && isKnownOfferId(String(o.id))),
          activeId:
            parsed.activeId && isKnownOfferId(String(parsed.activeId))
              ? String(parsed.activeId)
              : null,
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

/** Rewards members auto-receive every catalog offer under My offers. */
export function ensureRewardsOffers() {
  if (!isRewardsMember()) return
  for (const id of rewardsMemberOfferIds()) {
    claimOffer(id)
  }
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
  const catalogForActivate = rewardsMemberCatalogOffers().find((row) => row.id === id)
  if (
    (catalogForActivate?.pricing?.firstOrderOnly || id === 'freeship1') &&
    hasPurchased()
  ) {
    return { ok: false, message: 'Free shipping on first order is only for new buyers.' }
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
    // First-order perks end once they've ordered, even if unused.
    if (
      (offer.id === 'first10' ||
        offer.id === 'freeship1' ||
        rewardsMemberCatalogOffers().some(
          (row) => row.id === offer.id && row.pricing?.firstOrderOnly,
        )) &&
      offer.status !== 'used'
    ) {
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
  const catalog = rewardsMemberCatalogOffers().find((row) => row.id === opts.offerId)
  const pricing = catalog?.pricing
  if (pricing?.type === 'flat_off' && typeof pricing.amount === 'number') {
    if (pricing.league === 'premier-league' && opts.title && !isPremierLeagueTitle(opts.title)) {
      return price
    }
    return Math.max(0, Math.round((price - pricing.amount) * 100) / 100)
  }
  // Legacy fallback for pl5 if catalog pricing is missing.
  if (opts.offerId === 'pl5') {
    if (opts.title && !isPremierLeagueTitle(opts.title)) return price
    return Math.max(0, Math.round((price - 5) * 100) / 100)
  }
  return price
}

/** True when the activated offer makes shipping free (ignores $100 threshold). */
export function offerGrantsFreeShipping(offerId: OfferId | null | undefined): boolean {
  if (!offerId) return false
  const catalog = rewardsMemberCatalogOffers().find((row) => row.id === offerId)
  return catalog?.pricing?.type === 'free_shipping' || offerId === 'freeship1'
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
  const catalog = rewardsMemberCatalogOffers().find((row) => row.id === id)
  if (catalog?.pricing?.firstOrderOnly || id === 'freeship1') {
    if (hasPurchased()) {
      return { ok: false, message: 'Free shipping on first order is only for new buyers.' }
    }
    return { ok: true }
  }
  if (catalog?.pricing?.league === 'premier-league' || id === 'pl5') {
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
