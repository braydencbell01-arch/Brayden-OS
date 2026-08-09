import { useMemo, useState } from 'react'
import { CHARACTERS, RARITY_LABEL, getCharacter } from './characters'
import { CHEST_META, type ChestRarity } from './progression'
import {
  buyShopOffer,
  getShopOffers,
  loadProfile,
  loadShopBoughtToday,
} from './storage'
import { BattleCard } from './BattleCard'

const CHEST_ORDER: ChestRarity[] = ['common', 'rare', 'epic', 'legendary']

export function ShopScreen() {
  const [gold, setGold] = useState(() => loadProfile().gold)
  const [bought, setBought] = useState(() => loadShopBoughtToday())
  const [toast, setToast] = useState<string | null>(null)
  const offers = useMemo(() => getShopOffers(), [])

  const cardOffers = offers.filter((o) => o.kind === 'card')
  const chestOffers = offers.filter((o) => o.kind === 'chest')

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2000)
  }

  function buy(id: string) {
    const res = buyShopOffer(id)
    flash(res.message)
    if (res.ok) {
      setBought(loadShopBoughtToday())
      setGold(loadProfile().gold)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Shop
        </h1>
        <p className="text-sm font-semibold text-white/70">
          Daily offers refresh at midnight · {gold} gold
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
          Card deals
        </p>
        <ul className="mb-4 grid grid-cols-3 gap-2">
          {cardOffers.map((o) => {
            const c = o.charId ? getCharacter(o.charId) : null
            const owned = bought.includes(o.id)
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={owned}
                  onClick={() => buy(o.id)}
                  className="w-full rounded-xl p-2 text-left disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg,#3a2418,#1f140e)',
                    boxShadow: 'inset 0 1px 0 #c9a22744',
                  }}
                >
                  <BattleCard character={c ?? null} size="collection" />
                  <p className="mt-1 truncate text-center text-[0.7rem] font-extrabold text-white">
                    {c?.name}
                  </p>
                  <p className="text-center text-[0.6rem] font-bold text-white/65">
                    {o.copies}× · {c ? RARITY_LABEL[c.rarity] : ''}
                  </p>
                  <p className="mt-1 text-center text-xs font-extrabold text-[#f5d76e]">
                    {owned ? 'Bought' : `${o.priceGold}g`}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>

        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
          Chests
        </p>
        <ul className="flex flex-col gap-2">
          {CHEST_ORDER.map((rarity) => {
            const offer = chestOffers.find((o) => o.chest === rarity)
            if (!offer) return null
            const meta = CHEST_META[rarity]
            const owned = bought.includes(offer.id)
            return (
              <li key={offer.id}>
                <button
                  type="button"
                  disabled={owned}
                  onClick={() => buy(offer.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg,#3a2418,#1f140e)',
                    boxShadow: `inset 0 1px 0 ${meta.color}55`,
                  }}
                >
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-2xl font-black"
                    style={{ background: meta.color, color: '#1a1410' }}
                  >
                    ▣
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-white">{meta.label}</p>
                    <p className="text-xs font-semibold text-white/60">
                      Cards + gold · {CHARACTERS.length} possible drops
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-[#f5d76e]">
                    {owned ? 'Bought' : `${offer.priceGold}g`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <p className="rounded-lg bg-black/85 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/40">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  )
}
