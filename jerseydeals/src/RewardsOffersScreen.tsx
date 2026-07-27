import { leaveRewardsOffers } from './rewardsMember'

/** Member offers screen — blank until offers exist. */
export function RewardsOffersScreen() {
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
      <main className="flex flex-1 flex-col" aria-label="Rewards offers" />
    </div>
  )
}
