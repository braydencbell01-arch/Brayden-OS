/** Percent shipping when under the free-shipping threshold. */
export const SHIPPING_PERCENT = 0.1

/** Merchandise subtotal that unlocks free shipping (USD). */
export const FREE_SHIPPING_THRESHOLD = 100

/** Shipping dollars for a merchandise subtotal (2-decimal money). */
export function shippingForSubtotal(
  subtotal: number,
  opts?: { freeShippingOffer?: boolean },
) {
  if (opts?.freeShippingOffer) return 0
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0
  return Math.round(subtotal * SHIPPING_PERCENT * 100) / 100
}

/** How much more merchandise is needed for free shipping. */
export function amountToFreeShipping(subtotal: number) {
  if (!Number.isFinite(subtotal) || subtotal < 0) return FREE_SHIPPING_THRESHOLD
  return Math.max(0, Math.round((FREE_SHIPPING_THRESHOLD - subtotal) * 100) / 100)
}

/** 0–1 progress toward free shipping. */
export function freeShippingProgress(subtotal: number) {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0
  return Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD)
}

/** Merchandise + shipping. */
export function totalWithShipping(
  subtotal: number,
  opts?: { freeShippingOffer?: boolean },
) {
  return Math.round((subtotal + shippingForSubtotal(subtotal, opts)) * 100) / 100
}
