import { useId, useState, type FormEvent } from 'react'
import { track } from './analytics'
import { captureEmail, isValidEmail } from './emailCapture'
import {
  goToRewardsOffers,
  isRewardsMember,
  readRewardsMember,
  useRewardsMember,
  writeRewardsMember,
  type RewardsMember,
} from './rewardsMember'

function isValidPhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

function memberContact(member: RewardsMember | null) {
  if (!member) return ''
  return member.email || member.phone || ''
}

async function submitRewardsJoin(input: {
  email: string
  phone: string
  source: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isRewardsMember()) return { ok: true }

  const cleanedEmail = input.email.trim().toLowerCase()
  const cleanedPhone = input.phone.trim()
  const hasEmail = Boolean(cleanedEmail)
  const hasPhone = Boolean(cleanedPhone)

  if (!hasEmail && !hasPhone) {
    return { ok: false, message: 'Enter an email or phone number.' }
  }
  if (hasEmail && !isValidEmail(cleanedEmail)) {
    return { ok: false, message: 'Enter a valid email address.' }
  }
  if (hasPhone && !isValidPhone(cleanedPhone)) {
    return { ok: false, message: 'Enter a valid phone number.' }
  }

  const leadEmail =
    cleanedEmail || `phone.${cleanedPhone.replace(/\D/g, '')}@rewards.jerseydeals.online`
  const result = await captureEmail(leadEmail, 'rewards_club', {
    ...(cleanedPhone ? { phone: cleanedPhone } : {}),
    ...(cleanedEmail ? { email_entered: cleanedEmail } : { signup_type: 'phone_only' }),
    message: 'Jersey Deals Rewards Club signup',
    place: input.source,
  })
  if (!result.ok) return { ok: false, message: result.message }

  writeRewardsMember({
    email: cleanedEmail || undefined,
    phone: cleanedPhone || undefined,
  })
  track('rewards_club_join', {
    has_email: hasEmail,
    has_phone: hasPhone,
    place: input.source,
  })
  return { ok: true }
}

function SeeOffersButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        track('rewards_see_offers', {})
        goToRewardsOffers()
      }}
      className={className}
    >
      See my offers
    </button>
  )
}

/** Full Rewards Club section form (mid-page). */
export function RewardsSectionJoin({ className = '' }: { className?: string }) {
  const member = useRewardsMember()
  const emailId = useId()
  const phoneId = useId()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (isRewardsMember()) {
      readRewardsMember()
      return
    }
    setMessage('')
    setBusy(true)
    try {
      const result = await submitRewardsJoin({ email, phone, source: 'rewards_section' })
      if (result.ok) {
        setEmail('')
        setPhone('')
      } else {
        setMessage(result.message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (member) {
    return (
      <div
        className={`space-y-4 border border-cream/20 bg-navy-deep/80 px-5 py-6 ${className}`}
        role="status"
      >
        <p className="font-display text-2xl font-bold uppercase tracking-wide text-cream">
          You’re already a Rewards member
        </p>
        <p className="font-brand text-sm leading-relaxed text-cream/80">
          This device is locked to your Rewards Club signup
          {memberContact(member) ? ` (${memberContact(member)})` : ''}. You can’t join again from
          here — watch your inbox or texts for offers.
        </p>
        <SeeOffersButton className="inline-flex bg-crimson px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot" />
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`space-y-3 ${className}`} noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cream/75"
          >
            Email
          </label>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full border border-cream/25 bg-navy-deep px-3 py-3 text-base text-cream outline-none placeholder:text-cream/45 focus:border-crimson"
          />
        </div>
        <div>
          <label
            htmlFor={phoneId}
            className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cream/75"
          >
            Phone
          </label>
          <input
            id={phoneId}
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
            className="w-full border border-cream/25 bg-navy-deep px-3 py-3 text-base text-cream outline-none placeholder:text-cream/45 focus:border-crimson"
          />
        </div>
      </div>
      <p className="text-xs text-cream/65">Email, phone, or both - whatever you prefer.</p>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex bg-crimson px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot disabled:opacity-60"
      >
        {busy ? 'Joining…' : 'Join Rewards Club'}
      </button>
      {message ? <p className="text-sm font-semibold text-crimson-hot">{message}</p> : null}
    </form>
  )
}

/**
 * Compact cream dock at the bottom — replaces the old free-shipping strip
 * as a second Rewards Club signup.
 */
export function RewardsDock({ className = '' }: { className?: string }) {
  const member = useRewardsMember()
  const emailId = useId()
  const phoneId = useId()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (isRewardsMember()) return
    setMessage('')
    setBusy(true)
    try {
      const result = await submitRewardsJoin({ email, phone, source: 'rewards_dock' })
      if (result.ok) {
        setEmail('')
        setPhone('')
      } else {
        setMessage(result.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`border-t border-navy/10 bg-cream/95 px-4 py-3 shadow-[0_-8px_24px_rgba(6,16,28,0.12)] backdrop-blur ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        {member ? (
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <p className="text-center font-brand text-sm font-semibold text-navy sm:text-left">
              You’re already a Rewards member
            </p>
            <SeeOffersButton className="inline-flex w-full items-center justify-center bg-crimson px-5 py-2.5 font-brand text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot sm:w-auto" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-2" noValidate>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={emailId}
                  className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted"
                >
                  Email
                </label>
                <input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full border border-navy/15 bg-white px-3 py-2.5 text-base text-navy outline-none placeholder:text-muted focus:border-crimson"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={phoneId}
                  className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted"
                >
                  Phone
                </label>
                <input
                  id={phoneId}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full border border-navy/15 bg-white px-3 py-2.5 text-base text-navy outline-none placeholder:text-muted focus:border-crimson"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex shrink-0 items-center justify-center bg-crimson px-5 py-2.5 font-brand text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot disabled:opacity-60"
              >
                {busy ? 'Joining…' : 'Join Rewards'}
              </button>
            </div>
            <p className="text-center text-[0.7rem] text-muted sm:text-left">
              Email, phone, or both - whatever you prefer.
            </p>
            {message ? (
              <p className="text-center text-xs font-semibold text-crimson sm:text-left">{message}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  )
}
