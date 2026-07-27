/**
 * One-time landing-page visitor reset.
 * Bumping GENERATION clears claim / member / email / cart state for every
 * returning browser so the site feels like a first visit again.
 * Inventory sold-out markers are left alone.
 */

export const LANDING_CLIENT_GENERATION = '2026-07-27-email-reset'
const GENERATION_KEY = 'jerseydeals.landingGeneration'

/** Visitor state keys owned by the Jersey Deals landing page. */
const LANDING_STATE_KEYS = [
  'jd_email_signups_v1',
  'jerseydeals.rewardsMember.v1',
  'jerseydeals.offer.v1',
  'jerseydeals.buyerEmail.v1',
  'jerseydeals.purchased.v1',
  'jerseydeals.purchasedSource.v1',
  'jerseydeals.first10Claimed.v1',
  'jerseydeals.offers.v1',
  'jerseydeals.cart.v1',
  'jerseydeals.recent.v1',
]

const LANDING_SESSION_KEYS = ['jerseydeals.offer.dismissed', 'jerseydeals.soldOut.session.v1']

function canStore() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

/** Wipe landing-page visitor state when the generation marker changes. */
export function resetLandingClientStateIfNeeded() {
  if (!canStore()) return false
  try {
    const current = localStorage.getItem(GENERATION_KEY) || ''
    if (current === LANDING_CLIENT_GENERATION) return false

    for (const key of LANDING_STATE_KEYS) {
      localStorage.removeItem(key)
    }
    try {
      for (const key of LANDING_SESSION_KEYS) {
        sessionStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }

    localStorage.setItem(GENERATION_KEY, LANDING_CLIENT_GENERATION)
    return true
  } catch {
    return false
  }
}
