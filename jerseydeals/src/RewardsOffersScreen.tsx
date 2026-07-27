import { leaveRewardsOffers } from './rewardsMember'
import {
  OFFER_DEFS,
  OFFERS_EVENT,
  ensureRewardsOffers,
  listOpenOffers,
  type WalletOffer,
} from './offers'
import { useEffect, useState } from 'react'

function OfferCard({ offer }: { offer: WalletOffer }) {
  const def = OFFER_DEFS[offer.id]
  return (
    <article className="border border-navy/10 bg-cream px-5 py-5">
      <p className="font-display text-xl font-bold uppercase tracking-wide text-navy">{def.title}</p>
      <p className="mt-2 font-brand text-sm leading-relaxed text-navy/75">{def.detail}</p>
      <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-crimson">
        {offer.status === 'activated' ? 'Activated for checkout' : def.activateHint}
      </p>
    </article>
  )
}

/** Member offers screen. */
export function RewardsOffersScreen() {
  const [offers, setOffers] = useState<WalletOffer[]>(() => listOpenOffers())

  useEffect(() => {
    ensureRewardsOffers()
    const sync = () => setOffers(listOpenOffers())
    sync()
    window.addEventListener(OFFERS_EVENT, sync)
    return () => window.removeEventListener(OFFERS_EVENT, sync)
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex min-h-dvh flex-col bg-chalk text-navy">
      <header className="flex items-center justify-between border-b border-navy/10 bg-cream px-5 py-4">
        <p className="font-brand text-sm font-bold uppercase tracking-[0.14em] text-navy">
          My offers
        </p>
        <button
          type="button"
          onClick={() => leaveRewardsOffers()}
          className="font-brand text-xs font-bold uppercase tracking-[0.14em] text-navy transition hover:text-crimson"
        >
          Back
        </button>
      </header>
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6" aria-label="Rewards offers">
        {offers.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
              No offers yet
            </p>
            <p className="mt-2 max-w-sm font-brand text-sm text-navy/70">
              Join Rewards Club or claim the first-time buyer welcome offer to fill this list.
            </p>
          </div>
        ) : (
          <ul className="mx-auto flex w-full max-w-lg flex-col gap-3">
            {offers.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
