/**
 * Create a Square Payment Link for every line in the cart (multi-item checkout).
 * Uses the Jersey Deals email API worker (SQUARE_ACCESS_TOKEN server-side).
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
  | { ok: true; url: string; paymentLinkId?: string }
  | { ok: false; message: string }

function apiBaseUrl() {
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

/** Build one Square Payment Link that includes every cart variation. */
export async function createCartCheckoutLink(
  req: CartCheckoutRequest,
): Promise<CartCheckoutResult> {
  const ids = [...new Set(req.variationIds.map((id) => String(id || '').trim()).filter(Boolean))]
  if (ids.length === 0) {
    return { ok: false, message: 'Your cart is empty.' }
  }

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
    track('cart_checkout_all_ok', { items: ids.length, first10: Boolean(req.first10) })
    return { ok: true, url: data.url, paymentLinkId: data.paymentLinkId }
  } catch {
    track('cart_checkout_all_fail', { status: 0, items: ids.length })
    return {
      ok: false,
      message: 'Couldn’t start checkout. Check your connection and try again.',
    }
  }
}
