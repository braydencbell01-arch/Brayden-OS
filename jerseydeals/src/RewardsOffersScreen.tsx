import { leaveRewardsOffers } from './rewardsMember'
import {
  formatOfferExpiresLabel,
  getOfferDef,
  OFFERS_EVENT,
  ensureRewardsOffers,
  listOpenOffers,
  type WalletOffer,
} from './offers'
import { useEffect, useState } from 'react'
import { SiteFooter } from './SiteFooter'

function OfferCard({ offer }: { offer: WalletOffer }) {
  const def = getOfferDef(offer.id)
  if (!def) return null
  const expiresLabel = formatOfferExpiresLabel(def.expiresAt)
  return (
    <article className="border border-navy/10 bg-cream px-5 py-5">
      <p className="font-display text-xl font-bold uppercase tracking-wide text-navy">{def.title}</p>
      <p className="mt-2 font-brand text-sm leading-relaxed text-navy/75">{def.detail}</p>
      {expiresLabel ? (
        <p className="mt-2 font-brand text-xs text-navy/55">{expiresLabel}</p>
      ) : null}
      <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-crimson">
        {offer.status === 'activated' ? 'Activated for checkout' : def.activateHint}
      </p>
    </article>
  )
}

/** Member offers screen. */
export function RewardsOffersScreen({
  onGoToCart,
  onShopInventory,
  onShopYouth,
}: {
  onGoToCart?: () => void
  onShopInventory: () => void
  onShopYouth?: () => void
}) {
  const [offers, setOffers] = useState<WalletOffer[]>(() => listOpenOffers())

  useEffect(() => {
    ensureRewardsOffers()
    const sync = () => setOffers(listOpenOffers())
    sync()
    window.addEventListener(OFFERS_EVENT, sync)
    return () => window.removeEventListener(OFFERS_EVENT, sync)
  }, [])

  function goToCart() {
    leaveRewardsOffers()
    onGoToCart?.()
  }

  return (
    <div className="fixed inset-0 z-[70] flex min-h-dvh flex-col bg-chalk text-navy">
      <header className="flex items-center justify-between border-b border-navy/10 bg-cream px-5 py-4">
        <p className="font-brand text-sm font-bold uppercase tracking-[0.14em] text-navy">
          My offers
        </p>
        <div className="flex items-center gap-4">
          {onGoToCart ? (
            <button
              type="button"
              onClick={goToCart}
              className="font-brand text-xs font-bold uppercase tracking-[0.14em] text-crimson transition hover:text-crimson-hot"
            >
              Go to cart
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => leaveRewardsOffers()}
            className="font-brand text-xs font-bold uppercase tracking-[0.14em] text-navy transition hover:text-crimson"
          >
            Back
          </button>
        </div>
      </header>
      <main className="flex flex-1 flex-col overflow-y-auto" aria-label="Rewards offers">
        <div className="flex flex-1 flex-col gap-4 px-5 py-6">
          {offers.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              <div>
                <p className="font-display text-2xl font-bold uppercase tracking-wide text-navy">
                  No offers yet
                </p>
                <p className="mt-2 max-w-sm font-brand text-sm text-navy/70">
                  Join Rewards Club or claim the first-time buyer welcome offer to fill this list.
                </p>
              </div>
              {onGoToCart ? (
                <button
                  type="button"
                  onClick={goToCart}
                  className="inline-flex bg-crimson px-6 py-3 font-brand text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot"
                >
                  Go to cart
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <ul className="mx-auto flex w-full max-w-lg flex-col gap-3">
                {offers.map((offer) => (
                  <li key={offer.id}>
                    <OfferCard offer={offer} />
                  </li>
                ))}
              </ul>
              {onGoToCart ? (
                <div className="mx-auto mt-2 w-full max-w-lg">
                  <p className="font-brand text-sm text-navy/70">
                    Activate an offer in your cart at checkout.
                  </p>
                  <button
                    type="button"
                    onClick={goToCart}
                    className="mt-3 inline-flex w-full items-center justify-center bg-crimson px-6 py-3.5 font-brand text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-crimson-hot"
                  >
                    Go to cart
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <SiteFooter
          onInventory={onShopInventory}
          onYouth={onShopYouth ?? onShopInventory}
          onBeforeNavigate={() => leaveRewardsOffers()}
          bottomPadClass="pb-12"
        />
      </main>
    </div>
  )
}
