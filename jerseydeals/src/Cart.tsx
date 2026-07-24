import { useEffect } from 'react'
import { track } from './analytics'
import { FREE_SHIPPING_THRESHOLD } from './config'
import { cartCount, cartSubtotal, type CartState } from './cart'
import { formatPrice, shortTitle } from './listings'

export function CartDrawer({
  open,
  cart,
  onClose,
  onChangeQty,
  onRemove,
  onClear,
}: {
  open: boolean
  cart: CartState
  onClose: () => void
  onChangeQty: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClear: () => void
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  const count = cartCount(cart)
  const subtotal = cartSubtotal(cart)
  const currency = cart.lines[0]?.currency || 'USD'
  const showShipGoal = FREE_SHIPPING_THRESHOLD > 0
  const shipProgress = showShipGoal ? Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD) : 1
  const shipRemaining = showShipGoal ? Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal) : 0

  return (
    <div className="fixed inset-0 z-[55] flex justify-end" role="dialog" aria-modal aria-label="Shopping cart">
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.lines.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-2xl font-bold uppercase text-navy">Cart is empty</p>
              <p className="mt-2 text-sm text-muted">
                Browse the inventory, add a kit, then checkout securely on Square.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 inline-flex bg-crimson px-5 py-3 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream"
              >
                Keep shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.lines.map((line) => (
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
                      {formatPrice(line.price, line.currency)}
                    </p>
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
              ))}
            </ul>
          )}
        </div>

        {cart.lines.length > 0 ? (
          <div className="border-t border-navy/10 bg-white px-5 py-4">
            {showShipGoal ? (
              <div className="mb-4">
                {shipRemaining > 0 ? (
                  <p className="text-xs text-muted">
                    Add {formatPrice(shipRemaining, currency)} more toward free shipping ($
                    {FREE_SHIPPING_THRESHOLD}+).
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-navy">You&apos;ve hit the free-shipping goal.</p>
                )}
                <div className="mt-2 h-1.5 overflow-hidden bg-mist" aria-hidden>
                  <div className="h-full bg-crimson transition-all" style={{ width: `${shipProgress * 100}%` }} />
                </div>
              </div>
            ) : (
              <p className="mb-4 text-xs font-semibold text-navy">Shipping is free on Square checkout.</p>
            )}
            <div className="flex items-baseline justify-between">
              <p className="font-brand text-sm font-bold uppercase tracking-[0.14em] text-navy">Subtotal</p>
              <p className="font-display text-2xl font-bold text-navy">{formatPrice(subtotal, currency)}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Checkout opens Square&apos;s secure payment page
              {cart.lines.length > 1 ? ' for each kit (one secure link per item). Your bag stays here if you come back.' : '.'}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {cart.lines.length === 1 ? (
                <a
                  href={cart.lines[0]!.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    track('cart_checkout', { items: 1, mode: 'single' })
                    onClose()
                  }}
                  className="flex w-full items-center justify-center bg-crimson px-4 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream transition hover:bg-crimson-hot"
                >
                  Checkout on Square
                </a>
              ) : (
                cart.lines.map((line, index) => (
                  <a
                    key={line.id}
                    href={line.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      track('cart_checkout', { items: cart.lines.length, mode: 'line', index })
                    }}
                    className="flex w-full items-center justify-between gap-3 border border-navy/15 bg-navy px-4 py-3 font-brand text-xs font-bold uppercase tracking-[0.14em] text-cream transition hover:bg-navy-deep"
                  >
                    <span className="truncate">
                      Checkout {index + 1}/{cart.lines.length}
                    </span>
                    <span>{formatPrice(line.price, line.currency)}</span>
                  </a>
                ))
              )}
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
  )
}
