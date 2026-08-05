import { amountToFreeShipping, FREE_SHIPPING_THRESHOLD, freeShippingProgress } from './shipping'
import { formatPrice } from './listings'

export function FreeShippingBar({
  subtotal,
  currency = 'USD',
  className = '',
}: {
  subtotal: number
  currency?: string
  className?: string
}) {
  const remaining = amountToFreeShipping(subtotal)
  const progress = freeShippingProgress(subtotal)
  const unlocked = remaining <= 0 && subtotal > 0

  return (
    <div
      className={`border-t border-navy/10 bg-cream/95 px-3 py-1.5 shadow-[0_-6px_18px_rgba(6,16,28,0.1)] backdrop-blur ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-brand text-[0.62rem] font-bold uppercase tracking-[0.12em] text-navy">
            {unlocked
              ? 'Free shipping unlocked'
              : subtotal > 0
                ? `${formatPrice(remaining, currency)} away from free shipping`
                : `Free shipping on orders $${FREE_SHIPPING_THRESHOLD}+`}
          </p>
          <p className="shrink-0 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-muted">
            {formatPrice(Math.max(0, subtotal), currency)} / ${FREE_SHIPPING_THRESHOLD}
          </p>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-navy/10" aria-hidden>
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              unlocked ? 'bg-crimson' : 'bg-navy'
            }`}
            style={{ width: `${Math.max(subtotal > 0 ? 4 : 0, progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
