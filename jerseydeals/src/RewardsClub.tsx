import { useId, useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { track } from './analytics'
import { captureEmail, isValidEmail } from './emailCapture'

function fadeUp(reduce: boolean | null, delay = 0) {
  const ease = [0.22, 1, 0.36, 1] as const
  return {
    initial: reduce ? false : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.6, delay: reduce ? 0 : delay, ease },
  }
}

function isValidPhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export function RewardsClub() {
  const reduce = useReducedMotion()
  const emailId = useId()
  const phoneId = useId()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    setOk(false)
    const cleanedEmail = email.trim().toLowerCase()
    const cleanedPhone = phone.trim()
    const hasEmail = Boolean(cleanedEmail)
    const hasPhone = Boolean(cleanedPhone)

    if (!hasEmail && !hasPhone) {
      setMessage('Enter an email or phone number.')
      return
    }
    if (hasEmail && !isValidEmail(cleanedEmail)) {
      setMessage('Enter a valid email address.')
      return
    }
    if (hasPhone && !isValidPhone(cleanedPhone)) {
      setMessage('Enter a valid phone number.')
      return
    }

    setBusy(true)
    try {
      const leadEmail =
        cleanedEmail ||
        `phone.${cleanedPhone.replace(/\D/g, '')}@rewards.jerseydeals.online`
      const result = await captureEmail(leadEmail, 'rewards_club', {
        ...(cleanedPhone ? { phone: cleanedPhone } : {}),
        ...(cleanedEmail ? { email_entered: cleanedEmail } : { signup_type: 'phone_only' }),
        message: 'Jersey Deals Rewards Club signup',
      })
      setOk(result.ok)
      setMessage(
        result.ok
          ? 'You’re in the Rewards Club — watch for special offers.'
          : result.message,
      )
      if (result.ok) {
        track('rewards_club_join', {
          has_email: hasEmail,
          has_phone: hasPhone,
        })
        setEmail('')
        setPhone('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="rewards" className="scroll-mt-44 border-y-2 border-crimson/30 bg-navy py-20 text-cream md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-12 md:items-end md:px-8">
        <motion.div {...fadeUp(reduce)} className="md:col-span-6">
          <p className="eyebrow text-crimson-hot">Members</p>
          <div className="brand-rule mt-3" aria-hidden />
          <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-wide text-cream md:text-5xl">
            Jersey Deals Rewards Club
          </h2>
          <p className="mt-3 max-w-md font-brand text-base leading-relaxed text-cream/80">
            Drop your email or phone for special offers, restocks, and member-only drops. Orders{' '}
            <span className="text-cream">$100+</span> ship free.
          </p>
        </motion.div>

        <motion.form
          {...fadeUp(reduce, 0.08)}
          onSubmit={onSubmit}
          className="space-y-3 md:col-span-6"
          noValidate
        >
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
          <p className="text-xs text-cream/65">Email or phone — whichever you prefer.</p>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex bg-crimson px-7 py-3.5 font-brand text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot disabled:opacity-60"
          >
            {busy ? 'Joining…' : 'Join Rewards Club'}
          </button>
          {message ? (
            <p className={`text-sm font-semibold ${ok ? 'text-cream' : 'text-crimson-hot'}`}>
              {message}
            </p>
          ) : null}
        </motion.form>
      </div>
    </section>
  )
}
