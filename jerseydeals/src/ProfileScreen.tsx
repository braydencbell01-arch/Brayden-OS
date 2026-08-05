import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { track } from './analytics'
import { CONTACT_EMAIL, FAMILY_NOTE } from './config'
import { HeartIcon } from './FavoriteControls'
import { useFavoriteClubIds, goToFavoritesScreen } from './favorites'
import {
  formatOfferExpiresLabel,
  getOfferDef,
  OFFERS_EVENT,
  ensureRewardsOffers,
  listOpenOffers,
  type WalletOffer,
} from './offers'
import { leaveProfileScreen } from './profile'
import { submitRewardsJoin } from './RewardsJoinForm'
import {
  goToRewardsOffers,
  isRewardsMember,
  readRewardsMember,
  useRewardsMember,
  type RewardsMember,
} from './rewardsMember'

function memberContact(member: RewardsMember | null) {
  if (!member) return ''
  return member.email || member.phone || ''
}

function ProfileJoinForm() {
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
      const result = await submitRewardsJoin({ email, phone, source: 'profile' })
      if (result.ok) {
        setEmail('')
        setPhone('')
        track('profile_join_rewards', {})
      } else {
        setMessage(result.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted"
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
            className="w-full border border-navy/15 bg-white px-3 py-3 text-base text-navy outline-none placeholder:text-muted focus:ring-2 focus:ring-crimson/30"
          />
        </div>
        <div>
          <label
            htmlFor={phoneId}
            className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted"
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
            className="w-full border border-navy/15 bg-white px-3 py-3 text-base text-navy outline-none placeholder:text-muted focus:ring-2 focus:ring-crimson/30"
          />
        </div>
      </div>
      <p className="text-xs text-muted">Free to join. Email, phone, or both.</p>
      {message ? <p className="text-sm text-crimson">{message}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex bg-crimson px-6 py-3 font-brand text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot disabled:opacity-60"
      >
        {busy ? 'Joining…' : 'Join Rewards Club'}
      </button>
    </form>
  )
}

function OfferPreview({ offer }: { offer: WalletOffer }) {
  const def = getOfferDef(offer.id)
  if (!def) return null
  const expiresLabel = formatOfferExpiresLabel(def.expiresAt)
  return (
    <li className="border border-navy/10 bg-white px-4 py-3">
      <p className="font-brand text-sm font-bold uppercase tracking-[0.08em] text-navy">
        {def.title}
      </p>
      <p className="mt-1 text-xs text-muted">
        {offer.status === 'activated' ? 'Ready at checkout' : def.activateHint}
        {expiresLabel ? ` · ${expiresLabel}` : ''}
      </p>
    </li>
  )
}

/** Shopper profile — membership, offers, favorites, and account shortcuts. */
export function ProfileScreen({
  cartCount,
  onGoToCart,
  onShopInventory,
}: {
  cartCount: number
  onGoToCart: () => void
  onShopInventory: () => void
}) {
  const member = useRewardsMember()
  const favoriteIds = useFavoriteClubIds()
  const [offers, setOffers] = useState<WalletOffer[]>(() => listOpenOffers())

  useEffect(() => {
    ensureRewardsOffers()
    const sync = () => setOffers(listOpenOffers())
    sync()
    window.addEventListener(OFFERS_EVENT, sync)
    return () => window.removeEventListener(OFFERS_EVENT, sync)
  }, [])

  const openOffers = useMemo(() => offers.slice(0, 4), [offers])
  const joinedLabel = member?.at
    ? new Date(member.at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="fixed inset-0 z-[70] flex min-h-dvh flex-col bg-chalk text-navy">
      <header className="flex items-center justify-between border-b border-navy/10 bg-cream px-5 py-4">
        <p className="inline-flex items-center gap-2 font-brand text-sm font-bold uppercase leading-none tracking-[0.14em] text-navy">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 19.5c1.4-3.2 3.7-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
          </svg>
          <span className="leading-none">Profile</span>
        </p>
        <button
          type="button"
          onClick={() => leaveProfileScreen()}
          className="font-brand text-xs font-bold uppercase tracking-[0.14em] text-navy transition hover:text-crimson"
        >
          Back
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6" aria-label="Jersey Deals profile">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
          <section>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Rewards Club
            </p>
            {member ? (
              <div className="mt-3 border border-navy/10 bg-cream px-5 py-5">
                <p className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                  You’re a member
                </p>
                <p className="mt-2 font-brand text-sm leading-relaxed text-navy/75">
                  Signed up on this device
                  {memberContact(member) ? ` as ${memberContact(member)}` : ''}
                  {joinedLabel ? ` · joined ${joinedLabel}` : ''}.
                </p>
                <p className="mt-3 text-sm text-muted">{FAMILY_NOTE}</p>
                <button
                  type="button"
                  onClick={() => {
                    track('profile_see_offers', {})
                    leaveProfileScreen()
                    window.setTimeout(() => goToRewardsOffers(), 40)
                  }}
                  className="mt-5 inline-flex bg-crimson px-6 py-3 font-brand text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot"
                >
                  See my offers
                </button>
              </div>
            ) : (
              <div className="mt-3 border border-navy/10 bg-cream px-5 py-5">
                <p className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                  Join Rewards Club
                </p>
                <p className="mt-2 font-brand text-sm leading-relaxed text-navy/75">
                  Unlock member offers, sale alerts, and first dibs on restocks. Free — no card
                  needed.
                </p>
                <div className="mt-5">
                  <ProfileJoinForm />
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
                My offers
              </p>
              <button
                type="button"
                onClick={() => {
                  track('profile_offers_all', {})
                  leaveProfileScreen()
                  window.setTimeout(() => goToRewardsOffers(), 40)
                }}
                className="font-brand text-[0.65rem] font-bold uppercase tracking-[0.14em] text-crimson"
              >
                View all
              </button>
            </div>
            {openOffers.length === 0 ? (
              <p className="mt-3 font-brand text-sm text-muted">
                No open offers yet
                {member
                  ? ' — check back after drops and welcome deals.'
                  : ' — join Rewards Club or claim the first-time buyer offer.'}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {openOffers.map((offer) => (
                  <OfferPreview key={offer.id} offer={offer} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Your shop
            </p>
            <ul className="mt-3 divide-y divide-navy/10 border border-navy/10 bg-white">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    track('profile_favorites', { count: favoriteIds.length })
                    leaveProfileScreen()
                    window.setTimeout(() => goToFavoritesScreen(), 40)
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-mist"
                >
                  <span className="inline-flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-[0.1em] text-navy">
                    <HeartIcon
                      filled={favoriteIds.length > 0}
                      className={`h-4 w-4 ${favoriteIds.length > 0 ? 'text-crimson' : ''}`}
                    />
                    Favorite teams
                  </span>
                  <span className="tabular-nums text-sm text-muted">{favoriteIds.length}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    track('profile_cart', { items: cartCount })
                    leaveProfileScreen()
                    window.setTimeout(() => onGoToCart(), 40)
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-mist"
                >
                  <span className="font-brand text-sm font-bold uppercase tracking-[0.1em] text-navy">
                    Cart
                  </span>
                  <span className="tabular-nums text-sm text-muted">{cartCount}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    track('profile_shop', {})
                    leaveProfileScreen()
                    window.setTimeout(() => onShopInventory(), 40)
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-mist"
                >
                  <span className="font-brand text-sm font-bold uppercase tracking-[0.1em] text-navy">
                    Browse full inventory
                  </span>
                  <span className="text-sm text-crimson" aria-hidden>
                    →
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <section>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Help &amp; orders
            </p>
            <ul className="mt-3 space-y-3 font-brand text-sm text-navy/80">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Jersey Deals order help')}`}
                  onClick={() => track('profile_contact', {})}
                  className="font-semibold text-navy underline decoration-crimson/40 underline-offset-4 hover:decoration-crimson"
                >
                  Email {CONTACT_EMAIL}
                </a>
                <p className="mt-1 text-xs text-muted">Order questions, sizing, or restock requests.</p>
              </li>
              <li>
                <p className="font-semibold text-navy">Shipping</p>
                <p className="mt-1 text-xs text-muted">
                  10% shipping under $100 · free shipping at $100+. Real photos and sizes from our
                  inventory.
                </p>
              </li>
              <li>
                <p className="font-semibold text-navy">Checkout</p>
                <p className="mt-1 text-xs text-muted">
                  Pay securely on Square Payment Links. Member offers activate in My offers before
                  you checkout.
                </p>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
