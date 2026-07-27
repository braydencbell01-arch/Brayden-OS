import { useEffect, useId, useState, type FormEvent } from 'react'
import { track } from './analytics'
import { captureEmail } from './emailCapture'
import {
  emailHasPriorPurchase,
  hasPurchased,
  isValidEmail,
  markPurchased,
  readBuyerEmail,
  readOffer,
  writeBuyerEmail,
} from './offer'
import { claimFirstBuyerOffer } from './offers'

type Mode = 'offer' | 'email-gate'

export function FirstBuyerOfferModal({
  open,
  mode,
  onClose,
  onActivated,
  onEmailSaved,
}: {
  open: boolean
  mode: Mode
  onClose: () => void
  onActivated: () => void
  onEmailSaved: (email: string) => void
}) {
  const inputId = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail(readBuyerEmail() || readOffer().email || '')
    setError('')
    setBusy(false)
    // Prefer position:fixed lock over overflow:hidden — safer on iOS Safari.
    const previousOverflow = document.body.style.overflow
    const previousPosition = document.body.style.position
    const previousTop = document.body.style.top
    const previousWidth = document.body.style.width
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.position = previousPosition
      document.body.style.top = previousTop
      document.body.style.width = previousWidth
      window.scrollTo(0, scrollY)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const isOffer = mode === 'offer'

  function dismiss() {
    if (isOffer) track('offer_dismissed', {})
    onClose()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const cleaned = email.trim().toLowerCase()
    if (!isValidEmail(cleaned)) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      const prior = await emailHasPriorPurchase(cleaned)
      if (prior) {
        markPurchased()
        writeBuyerEmail(cleaned)
        onEmailSaved(cleaned)
        setError(
          isOffer
            ? 'This email already has a purchase — the first-time 10% offer isn’t available.'
            : '',
        )
        if (!isOffer) {
          onClose()
        } else {
          // Close offer popup for returning buyers after a beat
          window.setTimeout(() => onClose(), 1600)
        }
        track('offer_blocked_prior_purchase', { mode })
        return
      }

      writeBuyerEmail(cleaned)
      onEmailSaved(cleaned)
      void captureEmail(cleaned, isOffer ? 'first_buyer_offer' : 'checkout_gate')

      if (isOffer) {
        if (hasPurchased()) {
          setError('The first-time offer is only for new buyers.')
          return
        }
        claimFirstBuyerOffer(cleaned)
        track('offer_claimed', { offer: 'first10' })
        onActivated()
      } else {
        track('checkout_email_saved', {})
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-navy-deep/70"
        aria-label={isOffer ? 'Dismiss offer' : 'Close'}
        onClick={dismiss}
      />
      <div className="relative w-full max-w-md border border-white/10 bg-navy-deep p-6 text-cream shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center text-cream/70 hover:text-cream"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="font-brand text-[0.65rem] font-bold uppercase tracking-[0.22em] text-crimson">
          {isOffer ? 'First-time buyer offer' : 'Email required'}
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-none tracking-wide text-white">
          {isOffer ? '10% off all items' : 'Add your email to checkout'}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-cream/80">
          {isOffer
            ? 'Enter your email to claim 10% off your first order. You’ll find it in My offers — activate it at checkout when you’re ready.'
            : 'We need your email before you can buy. It only takes a second.'}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3" noValidate>
          <div>
            <label htmlFor={inputId} className="mb-1.5 flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cream/85">
              Email
              <span className="text-crimson" aria-hidden>
                *
              </span>
              <span className="normal-case tracking-normal text-crimson">mandatory</span>
            </label>
            <input
              id={inputId}
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full border border-white/20 bg-navy px-3 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-crimson"
            />
          </div>
          {error ? <p className="text-xs text-crimson-hot">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center bg-crimson px-4 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.16em] text-cream transition hover:bg-crimson-hot disabled:opacity-60"
          >
            {busy ? 'Checking…' : isOffer ? 'Claim offer' : 'Continue to checkout'}
          </button>
        </form>
      </div>
    </div>
  )
}
