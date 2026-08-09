import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  maySetSquareQtyFromEbay,
  openOrderHasCapturedPayment,
  orderLooksLikePaidCandidate,
  paymentStatusIsCaptured,
  remainingAfterSale,
  shouldFullDelist,
  appliedSaleStillSettled,
  hasConfirmedSaleSignal,
  massDelistGuard,
  shouldPreserveListingsFile,
} from './sold-inventory-rules.mjs'

describe('orderLooksLikePaidCandidate', () => {
  it('accepts COMPLETED orders', () => {
    assert.equal(orderLooksLikePaidCandidate({ state: 'COMPLETED' }), true)
  })

  it('rejects OPEN with failed-card shape (tender + amount still due)', () => {
    // Regression: Chelsea Torres Youth XL — FAILED payment left a tender.
    const order = {
      state: 'OPEN',
      net_amount_due_money: { amount: 2250, currency: 'USD' },
      tenders: [{ id: 'DNQd0UjuCfETgAMpvub0ytRDpZ7YY', type: 'CARD' }],
    }
    assert.equal(orderLooksLikePaidCandidate(order), false)
  })

  it('accepts OPEN paid Payment Link shape (due 0 + tender)', () => {
    // Regression: Inter Miami Youth XL sales stayed OPEN until fulfilled.
    const order = {
      state: 'OPEN',
      net_amount_due_money: { amount: 0, currency: 'USD' },
      tenders: [{ id: 'X9fBtNYHTFB5ymZCQFpYpYhEtDfZY', type: 'CARD' }],
    }
    assert.equal(orderLooksLikePaidCandidate(order), true)
  })

  it('rejects OPEN with no tenders', () => {
    assert.equal(
      orderLooksLikePaidCandidate({
        state: 'OPEN',
        net_amount_due_money: { amount: 0 },
        tenders: [],
      }),
      false,
    )
  })
})

describe('openOrderHasCapturedPayment', () => {
  it('requires COMPLETED/APPROVED payment for OPEN — not FAILED', () => {
    const order = {
      state: 'OPEN',
      net_amount_due_money: { amount: 0, currency: 'USD' },
      tenders: [{ id: 'pay_failed', payment_id: 'pay_failed', type: 'CARD' }],
    }
    assert.equal(openOrderHasCapturedPayment(order, { pay_failed: 'FAILED' }), false)
    assert.equal(openOrderHasCapturedPayment(order, { pay_failed: 'COMPLETED' }), true)
  })

  it('never treats FAILED tender alone as sold even if due wrongly 0', () => {
    const order = {
      state: 'OPEN',
      net_amount_due_money: { amount: 0 },
      tenders: [{ id: 'pay_failed', type: 'CARD' }],
    }
    assert.equal(openOrderHasCapturedPayment(order, { pay_failed: 'FAILED' }), false)
  })
})

describe('paymentStatusIsCaptured', () => {
  it('accepts COMPLETED and APPROVED only', () => {
    assert.equal(paymentStatusIsCaptured('COMPLETED'), true)
    assert.equal(paymentStatusIsCaptured('APPROVED'), true)
    assert.equal(paymentStatusIsCaptured('FAILED'), false)
    assert.equal(paymentStatusIsCaptured('CANCELED'), false)
    assert.equal(paymentStatusIsCaptured('PENDING'), false)
  })
})

describe('multi-qty decrement vs delist', () => {
  it('decrements when stock remains after a unit sale', () => {
    assert.equal(remainingAfterSale(2, 1), 1)
    assert.equal(shouldFullDelist({ forceRemoval: false, remainingQty: 1 }), false)
  })

  it('full delists only when remaining hits 0 or hard removal', () => {
    assert.equal(remainingAfterSale(1, 1), 0)
    assert.equal(shouldFullDelist({ forceRemoval: false, remainingQty: 0 }), true)
    assert.equal(shouldFullDelist({ forceRemoval: true, remainingQty: 5 }), true)
  })
})

describe('maySetSquareQtyFromEbay', () => {
  it('never raises Square qty from stale eBay available count', () => {
    // Regression: sync restored Miami qty 1 → 2 from eBay after Payment Link sale.
    assert.equal(maySetSquareQtyFromEbay(1, 2), false)
    assert.equal(maySetSquareQtyFromEbay(2, 2), false)
    assert.equal(maySetSquareQtyFromEbay(2, 1), true)
    assert.equal(maySetSquareQtyFromEbay(null, 2), true)
  })
})

describe('appliedSaleStillSettled', () => {
  it('stays settled when no later raising physical count', () => {
    const row = { appliedAt: '2026-07-30T15:50:50Z', qtyAfter: 1 }
    assert.equal(appliedSaleStillSettled(row, '2026-07-29T16:06:31Z', 2), true)
    assert.equal(appliedSaleStillSettled(row, '', null), true)
  })

  it('needs re-apply when sync physical raises stock after apply', () => {
    const row = { appliedAt: '2026-07-30T15:50:50Z', qtyAfter: 1 }
    assert.equal(appliedSaleStillSettled(row, '2026-07-30T16:06:31Z', 2), false)
  })
})

describe('hasConfirmedSaleSignal', () => {
  it('rejects ebay-ended / qty-0 noise without a sale', () => {
    // Regression: Aug 2026 wipe — 60+ kits delisted from ebay-ended alone.
    assert.equal(hasConfirmedSaleSignal({ fromEbayEnded: true }), false)
    assert.equal(hasConfirmedSaleSignal({ fromEbayUnsold: true }), false)
    assert.equal(hasConfirmedSaleSignal({ fromInventoryZero: true }), false)
    assert.equal(hasConfirmedSaleSignal({ fromSquareUnsellable: true }), false)
  })

  it('accepts Square order or eBay SoldList', () => {
    assert.equal(hasConfirmedSaleSignal({ fromSquareOrder: true }), true)
    assert.equal(hasConfirmedSaleSignal({ fromEbaySold: true }), true)
  })
})

describe('massDelistGuard', () => {
  it('blocks wiping most of the catalog in one run', () => {
    assert.equal(massDelistGuard({ beforeCount: 79, removeCount: 60 }).ok, false)
    assert.equal(massDelistGuard({ beforeCount: 79, removeCount: 2 }).ok, true)
    assert.equal(massDelistGuard({ beforeCount: 79, removeCount: 4, maxPerRun: 3 }).ok, false)
  })
})

describe('shouldPreserveListingsFile', () => {
  it('never overwrites a live catalog with empty', () => {
    assert.equal(shouldPreserveListingsFile(79, 0), true)
    assert.equal(shouldPreserveListingsFile(79, 78), false)
    assert.equal(shouldPreserveListingsFile(0, 0), false)
  })
})
