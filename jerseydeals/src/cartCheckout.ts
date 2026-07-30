/**
 * Create / resolve a Square Payment Link for every line in the cart (Checkout all).
 *
 * Resolution order:
 * 1) Dedicated cart API / email API worker (`POST /cart-checkout`) — any size
 * 2) Prefetched 2-item combo links in `cart-combo-links.json` — pairs only
 * 3) Single-item static Payment Links (handled by Cart.tsx fast path)
 */
import { track } from './analytics'

export type CartCheckoutRequest = {
  variationIds: string[]
  /** Apply catalog first-time buyer 10% when true. */
  first10?: boolean
  /** Omit Payment Link shipping charge when a free-shipping offer is active. */
  freeShipping?: boolean
}

export type CartCheckoutResult =
  | { ok: true; url: string; paymentLinkId?: string; source?: string }
  | { ok: false; message: string }

type ComboFile = {
  pairs?: Record<string, { url?: string; paymentLinkId?: string }>
  pairsFirst10?: Record<string, { url?: string; paymentLinkId?: string }>
}

function apiBaseUrl() {
  const dedicated = (import.meta.env.VITE_JERSEYDEALS_CART_CHECKOUT_URL as string | undefined)?.trim()
  if (dedicated) return dedicated
  return (import.meta.env.VITE_JERSEYDEALS_EMAIL_API_URL as string | undefined)?.trim() || ''
}

function apiSecret() {
  return (import.meta.env.VITE_JERSEYDEALS_EMAIL_API_SECRET as string | undefined)?.trim() || ''
}

export function cartCheckoutApiConfigured() {
  return Boolean(apiBaseUrl())
}

function checkoutEndpoint() {
  const base = apiBaseUrl().replace(/\/$/, '')
  if (!base) return ''
  return `${base}/cart-checkout`
}

function comboKey(ids: string[]) {
  return [...ids].map(String).sort().join('|')
}

async function lookupPrefetchedPair(
  ids: string[],
  first10: boolean,
): Promise<CartCheckoutResult | null> {
  if (ids.length !== 2) return null
  try {
    const base = import.meta.env.BASE_URL || '/'
    const res = await fetch(`${base}cart-combo-links.json`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as ComboFile
    const key = comboKey(ids)
    const row = (first10 ? data.pairsFirst10?.[key] : data.pairs?.[key]) || data.pairs?.[key]
    if (!row?.url) return null
    return { ok: true, url: row.url, paymentLinkId: row.paymentLinkId, source: 'combo' }
  } catch {
    return null
  }
}

async function createViaApi(req: CartCheckoutRequest, ids: string[]): Promise<CartCheckoutResult> {
  const endpoint = checkoutEndpoint()
  if (!endpoint) {
    return {
      ok: false,
      message: 'Multi-item checkout isn’t available right now. Try again shortly.',
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const secret = apiSecret()
  if (secret) headers['X-JD-Collect-Secret'] = secret

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'cart_checkout',
        variationIds: ids,
        first10: Boolean(req.first10),
        freeShipping: Boolean(req.freeShipping),
        site: 'Jersey Deals',
        product: 'Jersey Deals',
      }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      url?: string
      paymentLinkId?: string
      error?: string
    }
    if (!res.ok || !data.ok || !data.url) {
      const message = (data.error || `Checkout failed (${res.status})`).slice(0, 180)
      track('cart_checkout_all_fail', { status: res.status, items: ids.length })
      return { ok: false, message }
    }
    track('cart_checkout_all_ok', { items: ids.length, first10: Boolean(req.first10), source: 'api' })
    return { ok: true, url: data.url, paymentLinkId: data.paymentLinkId, source: 'api' }
  } catch {
    track('cart_checkout_all_fail', { status: 0, items: ids.length })
    return {
      ok: false,
      message: 'Couldn’t start checkout. Check your connection and try again.',
    }
  }
}

/** Build one Square Payment Link that includes every cart variation. */
export async function createCartCheckoutLink(
  req: CartCheckoutRequest,
): Promise<CartCheckoutResult> {
  const ids = [...new Set(req.variationIds.map((id) => String(id || '').trim()).filter(Boolean))]
  if (ids.length === 0) {
    return { ok: false, message: 'Your cart is empty.' }
  }

  // Prefetched pair links work offline / without the email API (not for free-shipping override).
  if (ids.length === 2 && !req.freeShipping) {
    const prefetched = await lookupPrefetchedPair(ids, Boolean(req.first10))
    if (prefetched?.ok) {
      track('cart_checkout_all_ok', {
        items: 2,
        first10: Boolean(req.first10),
        source: 'combo',
      })
      return prefetched
    }
  }

  if (cartCheckoutApiConfigured()) {
    return createViaApi(req, ids)
  }

  if (ids.length === 2) {
    return {
      ok: false,
      message: 'That 2-kit checkout link isn’t ready yet. Try again in a minute, or checkout one kit.',
    }
  }

  return {
    ok: false,
    message:
      'Checkout all for 3+ kits isn’t available right now. Remove a kit or try two at a time.',
  }
}
