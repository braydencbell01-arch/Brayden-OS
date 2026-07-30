/**
 * Pure helpers for sold-inventory reconcile / cross-platform qty rules.
 * Keep these free of network I/O so unit tests can lock the invariants.
 */

/** OPEN Payment Link orders stay unpaid until a card actually captures. */
export function orderLooksLikePaidCandidate(order) {
  const state = String(order?.state || '').toUpperCase()
  if (state === 'COMPLETED') return true
  if (state !== 'OPEN') return false
  // Failed card attempts still create tenders but leave amount due.
  const due = order?.net_amount_due_money?.amount
  if (due !== 0 && due !== '0') return false
  return Array.isArray(order?.tenders) && order.tenders.length > 0
}

/** Square payment statuses that mean money actually captured. */
export function paymentStatusIsCaptured(status) {
  const s = String(status || '').toUpperCase()
  return s === 'COMPLETED' || s === 'APPROVED'
}

/**
 * OPEN orders require a captured payment — tenders alone are not enough
 * (FAILED cards still leave a tender on the order).
 */
export function openOrderHasCapturedPayment(order, paymentStatusById = {}) {
  if (!orderLooksLikePaidCandidate(order)) return false
  if (String(order?.state || '').toUpperCase() === 'COMPLETED') return true
  for (const tender of order?.tenders || []) {
    const paymentId = tender?.payment_id || tender?.id
    if (!paymentId) continue
    if (paymentStatusIsCaptured(paymentStatusById[paymentId])) return true
  }
  return false
}

export function remainingAfterSale(currentQty, soldQty) {
  const current = Math.max(0, Math.floor(Number(currentQty) || 0))
  const sold = Math.max(0, Math.floor(Number(soldQty) || 0))
  return Math.max(0, current - sold)
}

/**
 * Full delist only for hard removals (ended/unsellable/qty0) or when no stock remains.
 * Multi-qty unit sales must decrement, never wipe the listing while qty remains.
 */
export function shouldFullDelist({ forceRemoval = false, remainingQty = 0 } = {}) {
  if (forceRemoval) return true
  return Number(remainingQty) <= 0
}

/**
 * Cross-platform must never raise Square stock from eBay.
 * Allow set when Square qty is unknown (create) or eBay available is strictly lower.
 */
export function maySetSquareQtyFromEbay(currentSquareQty, ebayQty) {
  if (currentSquareQty == null || !Number.isFinite(Number(currentSquareQty))) return true
  const ebay = Number(ebayQty)
  if (!Number.isFinite(ebay)) return false
  return ebay < Number(currentSquareQty)
}

/**
 * An applied-sale ledger row is still valid unless a later physical count raised
 * stock above qtyAfter (the cross-platform restore bug).
 */
export function appliedSaleStillSettled(row, lastPhysicalAt, lastPhysicalQty) {
  if (!row?.appliedAt) return false
  if (!lastPhysicalAt || lastPhysicalAt <= row.appliedAt) return true
  if (lastPhysicalQty == null || !Number.isFinite(Number(row.qtyAfter))) return false
  return !(Number(lastPhysicalQty) > Number(row.qtyAfter))
}
