/** Flat shipping rate charged on every Jersey Deals / Square checkout. */
export const SHIPPING_PERCENT = 0.05

/** Shipping dollars for a merchandise subtotal (2-decimal money). */
export function shippingForSubtotal(subtotal: number) {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0
  return Math.round(subtotal * SHIPPING_PERCENT * 100) / 100
}

/** Merchandise + shipping. */
export function totalWithShipping(subtotal: number) {
  return Math.round((subtotal + shippingForSubtotal(subtotal)) * 100) / 100
}
