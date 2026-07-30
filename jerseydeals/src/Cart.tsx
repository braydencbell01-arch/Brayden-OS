import { useEffect, useId, useState, type FormEvent } from 'react'
import { track } from './analytics'
import { SHIPPING_RATE_LABEL } from './config'
import {
  cartCount,
  cartLineCheckoutUrl,
  cartSubtotal,
  type CartState,
} from './cart'
import { cartCheckoutApiConfigured, createCartCheckoutLink } from './cartCheckout'
import { captureEmail } from './emailCapture'
import { formatPrice, shortTitle } from './listings'
import { isValidEmail, readBuyerEmail, syncPurchasedFromKnownEmail, writeBuyerEmail } from './offer'
import {
  getOfferDef,
  OFFERS_EVENT,
  activateOfferAtCheckout,
  applyOfferUnitPrice,
  checkoutUsesSquareDiscountLink,
  clearCheckoutActivation,
  ensureClaimedFirstBuyerOffer,
  ensureRewardsOffers,
  formatOfferExpiresLabel,
  getActiveCheckoutOffer,
  hasClaimedFirstBuyerOffer,
  listOpenOffers,
  offerEligibleForCart,
  offerGrantsFreeShipping,
  type OfferId,
  type WalletOffer,
} from './offers'
import { isRewardsMember } from './rewardsMember'
import { amountToFreeShipping, shippingForSubtotal, totalWithShipping } from './shipping'

/** Email is only required when the shopper skipped both Rewards join and the 10% popup. */
function needsCheckoutEmailGate() {
  return !isRewardsMember() && !hasClaimedFirstBuyerOffer()
}

export function CartDrawer({
  open,
  cart,
  onClose,
  onChangeQty,
  onRemove,
  onClear,
  onRequestCheckout,
}: {
  open: boolean
  cart: CartState
  onClose: () => void
  onChangeQty: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  /** Gate checkout behind email / offer rules. Return true if checkout may proceed. */
  onRequestCheckout: () => boolean
}) {
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [savedEmail, setSavedEmail] = useState(() => readBuyerEmail())
  const [openOffers, setOpenOffers] = useState<WalletOffer[]>(() => listOpenOffers())
  const [activeOffer, setActiveOffer] = useState(() => getActiveCheckoutOffer())
  const [offerMessage, setOfferMessage] = useState('')
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  function syncOffers() {
    ensureRewardsOffers()
    // Non-members who claimed the 10% popup still keep that offer activatable in cart.
    ensureClaimedFirstBuyerOffer()
    if (cart.lines.length === 0 && getActiveCheckoutOffer()) {
      clearCheckoutActivation()
    }
    setOpenOffers(listOpenOffers())
    setActiveOffer(getActiveCheckoutOffer())
  }

  useEffect(() => {
    if (cart.lines.length === 0 && getActiveCheckoutOffer()) {
      clearCheckoutActivation()
      setOpenOffers(listOpenOffers())
      setActiveOffer(null)
      setOfferMessage('')
    }
  }, [cart.lines.length])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setEmail(readBuyerEmail())
    setSavedEmail(readBuyerEmail())
    setEmailError('')
    setOfferMessage('')
    setCheckoutError('')
    void syncPurchasedFromKnownEmail().finally(() => {
      syncOffers()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onOffers = () => syncOffers()
    const onPurchasedCleared = () => syncOffers()
    document.addEventListener('keydown', onKey)
    window.addEventListener(OFFERS_EVENT, onOffers)
    window.addEventListener('jerseydeals:purchased-cleared', onPurchasedCleared)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
      window.removeEventListener(OFFERS_EVENT, onOffers)
      window.removeEventListener('jerseydeals:purchased-cleared', onPurchasedCleared)
    }
  }, [open, onClose, cart.lines.length])

  if (!open) return null
  const count = cartCount(cart)
  const subtotal = cartSubtotal(cart)
  const activeId = activeOffer?.id ?? null
  const useSquareDiscount = checkoutUsesSquareDiscountLink(activeId)
  const discountedSubtotal = cart.lines.reduce((sum, line) => {
    const price = applyOfferUnitPrice(line.price, { offerId: activeId, title: line.title })
    if (price == null) return sum
    return sum + price * Math.max(1, line.quantity || 1)
  }, 0)
  const currency = cart.lines[0]?.currency || 'USD'
  const freeShip = offerGrantsFreeShipping(activeId)
  const shippingOpts = { freeShippingOffer: freeShip }
  const shipping = shippingForSubtotal(discountedSubtotal, shippingOpts)
  const orderTotal = totalWithShipping(discountedSubtotal, shippingOpts)
  const hasEmail = Boolean(savedEmail)
  const requireEmail = needsCheckoutEmailGate()
  const canCheckout = !requireEmail || hasEmail
  const offerLabel = activeId ? getOfferDef(activeId)?.title || '' : ''

  function lineUsesDiscountLink(line: CartState['lines'][number]) {
    if (!useSquareDiscount) return false
    return Boolean(line.checkoutUrlDiscounted)
  }

  /** Prefer one Square Payment Link for the whole bag; fall back to a single static link. */
  async function checkoutAll() {
    setCheckoutError('')
    if (requireEmail && !hasEmail) {
      setEmailError('Enter your email to checkout.')
      return
    }
    if (!onRequestCheckout()) return
    if (cart.lines.length === 0) return

    const meta = {
      items: cart.lines.length,
      mode: 'checkout_all',
      offer: activeId || '',
      has_email: Boolean(savedEmail || readBuyerEmail()),
      shipping_percent: freeShip ? 0 : 10,
    }

    // Single kit + no free-shipping override → reuse the prebuilt Payment Link (fast path).
    const canUseStaticSingle =
      cart.lines.length === 1 && !freeShip && Boolean(cart.lines[0]?.checkoutUrl)

    if (canUseStaticSingle) {
      const line = cart.lines[0]!
      beginCheckout(cartLineCheckoutUrl(line, lineUsesDiscountLink(line)), 'all', meta)
      return
    }

    if (!cartCheckoutApiConfigured()) {
      if (cart.lines.length === 1) {
        const line = cart.lines[0]!
        beginCheckout(cartLineCheckoutUrl(line, lineUsesDiscountLink(line)), 'all', meta)
        return
      }
      setCheckoutError('Multi-item checkout isn’t available right now. Try again shortly.')
      return
    }

    setCheckoutBusy(true)
    try {
      const result = await createCartCheckoutLink({
        variationIds: cart.lines.map((line) => line.id),
        first10: useSquareDiscount,
        freeShipping: freeShip,
      })
      if (!result.ok) {
        setCheckoutError(result.message)
        return
      }
      beginCheckout(result.url, 'all', meta)
    } finally {
      setCheckoutBusy(false)
    }
  }

  async function saveEmail(event: FormEvent) {
    event.preventDefault()
    setEmailError('')
    const cleaned = email.trim().toLowerCase()
    if (!isValidEmail(cleaned)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailBusy(true)
    try {
      writeBuyerEmail(cleaned)
      setSavedEmail(cleaned)
      void captureEmail(cleaned, 'cart_checkout_gate')
      track('checkout_email_saved', { source: 'cart' })
    } finally {
      setEmailBusy(false)
    }
  }

  function onActivateOffer(id: OfferId) {
    setOfferMessage('')
    if (cart.lines.length === 0) {
      setOfferMessage('Add something to your cart to activate an offer.')
      return
    }
    const eligible = offerEligibleForCart(
      id,
      cart.lines.map((l) => l.title),
    )
    if (!eligible.ok) {
      setOfferMessage(eligible.message)
      return
    }
    const result = activateOfferAtCheckout(id)
    if (!result.ok) {
      setOfferMessage(result.message)
      return
    }
    syncOffers()
    track('offer_activated_checkout', { offer: id })
    if (id === 'pl5') {
      void captureEmail(savedEmail || readBuyerEmail() || 'offers@jerseydeals.online', 'offer_activate_pl5', {
        offer: 'pl5',
        note: '$5 off Premier League jersey activated at checkout',
      })
    }
  }

  function beginCheckout(href: string, lineId: string, meta: Record<string, unknown>) {
    if (requireEmail && !hasEmail) {
      setEmailError('Enter your email to checkout.')
      return
    }
    if (!onRequestCheckout()) return
    track('cart_checkout', {
      ...meta,
      line_id: lineId,
      offer: activeId || '',
      has_email: Boolean(savedEmail || readBuyerEmail()),
      shipping_percent: 10,
    })
    // Keep the line until Square return (?purchase= / ?sold=) confirms payment.
    window.open(href, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal aria-label="Shopping cart">
      <button
        type="button"
        className="absolute inset-0 bg-navy-deep/55"
        aria-label="Close cart"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-4">
          <div>
            <p className="font-brand text-lg font-bold uppercase tracking-[0.08em] text-navy">Your cart</p>
            <p className="text-xs text-muted">
              {count} {count === 1 ? 'item' : 'items'}
              {activeId ? ` · ${offerLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center text-navy transition hover:text-crimson"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            {cart.lines.length === 0 ? (
              <div className="rounded-sm bg-cream py-10 text-center">
                <p className="font-display text-2xl font-bold uppercase text-navy">Your cart is empty</p>
                <p className="mt-2 text-sm text-navy/70">
                  Browse the inventory, add a kit, then checkout securely on Square.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 inline-flex bg-crimson px-5 py-3 font-brand text-xs font-bold uppercase tracking-[0.16em] text-white"
                >
                  Keep shopping
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {cart.lines.map((line) => {
                  const displayPrice = applyOfferUnitPrice(line.price, {
                    offerId: activeId,
                    title: line.title,
                  })
                  const saved =
                    activeId && line.price != null && displayPrice != null && displayPrice < line.price
                  return (
                    <li key={line.id} className="flex gap-3 border border-navy/10 bg-white p-3">
                      <img
                        src={line.image}
                        alt=""
                        className="h-20 w-20 shrink-0 bg-mist object-contain object-center"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold uppercase leading-snug tracking-wide text-navy">
                          {shortTitle(line.title)}
                        </p>
                        {line.size ? (
                          <p className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted">{line.size}</p>
                        ) : null}
                        <p className="mt-1 font-display text-lg font-bold text-navy">
                          {formatPrice(displayPrice, line.currency)}
                          {saved ? (
                            <span className="ml-2 text-sm font-semibold text-muted line-through">
                              {formatPrice(line.price, line.currency)}
                            </span>
                          ) : null}
                        </p>
                        {saved && activeId ? (
                          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-crimson">
                            {getOfferDef(activeId)?.title}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {line.maxQuantity > 1 ? (
                            <label className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                              Qty
                              <select
                                value={line.quantity}
                                onChange={(e) => onChangeQty(line.id, Number(e.target.value))}
                                className="border border-navy/15 bg-cream px-2 py-1 text-navy"
                              >
                                {Array.from({ length: line.maxQuantity }, (_, i) => i + 1).map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <span className="text-[0.65rem] uppercase tracking-[0.12em] text-muted">Qty 1</span>
                          )}
                          <button
                            type="button"
                            onClick={() => onRemove(line.id)}
                            className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-crimson"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {openOffers.length > 0 ? (
              <div className="mt-4 border border-navy/10 bg-chalk px-3 py-3">
                <p className="font-brand text-xs font-bold uppercase tracking-[0.14em] text-navy">
                  My offers
                </p>
                <ul className="mt-2 space-y-2">
                  {openOffers.map((offer) => {
                    const def = getOfferDef(offer.id)
                    if (!def) return null
                    const isActive = activeId === offer.id
                    const expiresLabel = formatOfferExpiresLabel(def.expiresAt)
                    return (
                      <li
                        key={offer.id}
                        className="flex items-center justify-between gap-3 border border-navy/10 bg-cream px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy">{def.title}</p>
                          <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                            {isActive ? 'Active on this checkout' : def.activateHint}
                          </p>
                          {expiresLabel ? (
                            <p className="mt-0.5 text-[0.65rem] text-muted">{expiresLabel}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={isActive}
                          onClick={() => onActivateOffer(offer.id)}
                          className="shrink-0 bg-crimson px-3 py-2 font-brand text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-crimson-hot disabled:bg-navy disabled:opacity-80"
                        >
                          {isActive ? 'Activated' : 'Activate'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {offerMessage ? (
                  <p className="mt-2 text-xs font-semibold text-crimson">{offerMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {cart.lines.length > 0 ? (
            <div className="border-t border-navy/10 bg-white px-5 py-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">Subtotal</p>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-navy">
                      {formatPrice(discountedSubtotal, currency)}
                    </p>
                    {activeId && discountedSubtotal !== subtotal ? (
                      <p className="text-xs text-muted line-through">{formatPrice(subtotal, currency)}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">Shipping</p>
                  <p className="text-sm font-semibold text-navy">
                    {shipping <= 0 ? 'FREE' : formatPrice(shipping, currency)}
                  </p>
                </div>
                <p className="text-[0.65rem] text-muted">
                  {freeShip
                    ? 'Free shipping offer activated on this bag.'
                    : shipping <= 0
                      ? 'Free shipping unlocked on this bag.'
                      : `${SHIPPING_RATE_LABEL}. ${formatPrice(amountToFreeShipping(discountedSubtotal), currency)} away from free shipping.`}
                </p>
                <div className="flex items-baseline justify-between border-t border-navy/10 pt-2">
                  <p className="font-brand text-sm font-bold uppercase tracking-[0.14em] text-navy">Total</p>
                  <p className="font-display text-2xl font-bold text-navy">
                    {formatPrice(orderTotal, currency)}
                  </p>
                </div>
              </div>

              {requireEmail ? (
                <form onSubmit={saveEmail} className="mt-4 space-y-2" noValidate>
                  <label
                    htmlFor={emailId}
                    className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-navy"
                  >
                    Email for checkout
                    <span className="text-crimson" aria-hidden>
                      *
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={emailId}
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setEmailError('')
                      }}
                      placeholder="you@email.com"
                      className="min-w-0 flex-1 border border-navy/15 bg-cream px-3 py-2.5 text-base text-navy outline-none placeholder:text-muted focus:border-crimson"
                    />
                    <button
                      type="submit"
                      disabled={emailBusy}
                      className="shrink-0 border border-navy/20 bg-navy px-3 py-2.5 font-brand text-[0.65rem] font-bold uppercase tracking-[0.12em] text-cream transition hover:bg-navy-deep disabled:opacity-60"
                    >
                      {hasEmail && email.trim().toLowerCase() === savedEmail
                        ? 'Saved'
                        : emailBusy
                          ? '…'
                          : 'Save'}
                    </button>
                  </div>
                  {emailError ? <p className="text-xs font-semibold text-crimson">{emailError}</p> : null}
                  {hasEmail && !emailError ? (
                    <p className="text-xs text-navy">Checkout unlocked for {savedEmail}</p>
                  ) : (
                    <p className="text-xs font-semibold text-crimson">Email is required before checkout.</p>
                  )}
                </form>
              ) : savedEmail ? (
                <p className="mt-4 text-xs text-navy">Checking out as {savedEmail}</p>
              ) : null}

              {activeId === 'first10' ? (
                <p className="mt-2 text-xs font-semibold text-navy">
                  10% first-time offer applied at Square checkout.
                </p>
              ) : null}
              {activeId === 'pl5' ? (
                <p className="mt-2 text-xs font-semibold text-navy">
                  $5 Premier League offer activated — we&apos;ll confirm the discount on your order.
                </p>
              ) : null}
              {freeShip ? (
                <p className="mt-2 text-xs font-semibold text-navy">
                  Free shipping on first order activated — we&apos;ll confirm it on your order.
                </p>
              ) : null}
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Checkout all opens one Square payment page for everything in your bag.
                {freeShip
                  ? ' Free shipping offer is active for this first order.'
                  : ' Free shipping at $100+ merchandise; otherwise 10% shipping applies on Payment Links.'}{' '}
                Items stay in your bag until payment is confirmed.
              </p>
              {checkoutError ? (
                <p className="mt-2 text-xs font-semibold text-crimson">{checkoutError}</p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!canCheckout || checkoutBusy}
                  onClick={() => void checkoutAll()}
                  className="flex w-full items-center justify-center bg-crimson px-4 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream transition hover:bg-crimson-hot disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {checkoutBusy
                    ? 'Preparing checkout…'
                    : `Checkout all · ${formatPrice(orderTotal, currency)}`}
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted hover:text-crimson"
                >
                  Clear cart
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
