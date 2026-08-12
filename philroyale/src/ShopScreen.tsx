import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BattleCard } from './BattleCard'
import { ChestArt } from './ChestOpen'
import { GemIcon, GoldIcon } from './CurrencyBar'
import { CharacterModel } from './characters/CharacterModel'
import { RARITY_LABEL, getCharacter, type Rarity } from './characters'
import {
  PHIL_EMOTE_SRC,
  shopEmotes,
  type EmoteAnim,
  type EmoteDef,
} from './emoteCatalog'
import { CHEST_META, type ChestRarity } from './progression'
import {
  GEM_PACKS,
  GOLD_WITH_GEMS_PACKS,
  REAL_MONEY_OFFERS,
  loadShopCheckoutUrl,
  type RealMoneyOffer,
} from './shopCatalog'
import {
  beginUsdCheckout,
  buyEmote,
  buyGoldWithGems,
  buyShopOffer,
  claimPaidShopSku,
  copiesToUpgrade,
  getShopOffers,
  loadCardProgress,
  loadOwnedEmotes,
  loadShopBoughtToday,
} from './storage'

const CHEST_ORDER: ChestRarity[] = ['common', 'rare', 'epic', 'legendary']

const RARITY_TEXT: Record<Rarity, string> = {
  common: '#dfe6ee',
  rare: '#ffb347',
  epic: '#d48af0',
  legendary: '#fff3a8',
}

const QUILT_BG = {
  backgroundColor: '#1a6b8a',
  backgroundImage: `
    linear-gradient(45deg, #145a75 25%, transparent 25%),
    linear-gradient(-45deg, #145a75 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #145a75 75%),
    linear-gradient(-45deg, transparent 75%, #145a75 75%),
    linear-gradient(135deg, #2a8fad 25%, transparent 25%),
    linear-gradient(-135deg, #2a8fad 25%, transparent 25%)
  `,
  backgroundSize: '28px 28px',
  backgroundPosition: '0 0, 0 14px, 14px -14px, -14px 0, 7px 7px, 7px 21px',
}

function msUntilMidnight(): number {
  const now = new Date()
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  return end.getTime() - now.getTime()
}

function msUntilEmoteMarketEnd(): number {
  const now = new Date()
  const day = now.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const end = new Date(now)
  end.setDate(now.getDate() + daysUntilMonday)
  end.setHours(0, 0, 0, 0)
  return end.getTime() - now.getTime()
}

function offerEndsMs(hours: number): number {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = start.getTime() + hours * 3600 * 1000
  return Math.max(0, end - Date.now())
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(sec).padStart(2, '0')}s`
}

function useCountdown(getMs: () => number): string {
  const [label, setLabel] = useState(() => formatCountdown(getMs()))
  useEffect(() => {
    const tick = () => setLabel(formatCountdown(getMs()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [getMs])
  return label
}

type RibbonTone = 'gold' | 'blue' | 'green' | 'yellow'

function Ribbon({
  label,
  tone = 'gold',
  timer,
}: {
  label: string
  tone?: RibbonTone
  timer?: string
}) {
  const fill =
    tone === 'blue'
      ? 'linear-gradient(180deg,#5eb8ff,#1e6fd4)'
      : tone === 'green'
        ? 'linear-gradient(180deg,#7dff9a,#1e9a4a)'
        : tone === 'yellow'
          ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
          : 'linear-gradient(180deg,#ffe08a,#b8860b)'

  return (
    <div className="relative mx-auto mb-2 flex w-fit min-w-[8rem] flex-col items-center">
      <div
        className="relative px-6 py-1.5 text-center text-sm font-black uppercase tracking-wide text-[#1a1410] shadow-md"
        style={{
          background: fill,
          clipPath:
            'polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)',
          boxShadow: '0 3px 0 #00000055, inset 0 1px 0 #ffffff66',
        }}
      >
        {label}
      </div>
      {timer ? (
        <p className="mt-1 text-[0.65rem] font-bold text-white/90">{timer}</p>
      ) : null}
    </div>
  )
}

function SubBanner({ label, tone }: { label: string; tone: 'green' | 'yellow' }) {
  const bg =
    tone === 'green'
      ? 'linear-gradient(180deg,#5dff8a,#1a8a3a)'
      : 'linear-gradient(180deg,#ffe08a,#c9a227)'
  return (
    <div
      className="mx-auto mb-2 w-fit rounded-md px-4 py-0.5 text-xs font-black uppercase tracking-wide text-[#1a1410]"
      style={{ background: bg, boxShadow: '0 2px 0 #00000055' }}
    >
      {label}
    </div>
  )
}

function emoteMotion(anim: EmoteAnim) {
  if (anim === 'wiggle') return { rotate: [-6, 6, -6, 6, 0], scale: [1, 1.05, 1] }
  if (anim === 'bob') return { y: [0, -6, 0, -3, 0], scale: [1, 1.04, 1] }
  return { y: [0, -8, 0], scale: [1, 1.06, 1] }
}

function EmoteTile({
  emote,
  owned,
  onBuy,
}: {
  emote: EmoteDef
  owned: boolean
  onBuy: () => void
}) {
  return (
    <button
      type="button"
      disabled={owned}
      onClick={onBuy}
      className="flex flex-col items-center gap-1 disabled:opacity-70"
    >
      <div
        className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-xl bg-white"
        style={{ boxShadow: '0 0 0 3px #1a1410, inset 0 0 0 2px #ffffff' }}
      >
        <motion.div
          className="flex h-full w-full items-center justify-center"
          animate={emoteMotion(emote.anim)}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {emote.kind === 'phil' ? (
            <img src={PHIL_EMOTE_SRC} alt={emote.label} className="h-[85%] w-[85%] object-contain" />
          ) : emote.kind === 'photo' && emote.src ? (
            <img src={emote.src} alt={emote.label} className="h-[90%] w-[90%] object-cover" />
          ) : emote.kind === 'character' && emote.charId ? (
            <div className="h-full w-full scale-110">
              <CharacterModel charId={emote.charId} anim="idle" facing={1} portrait />
            </div>
          ) : emote.emoji ? (
            <span className="text-3xl leading-none">{emote.emoji}</span>
          ) : null}
        </motion.div>
        {owned ? (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-[#1e9a4a] px-1 text-[0.55rem] font-black text-white">
            ✓
          </span>
        ) : null}
      </div>
      <span className="flex items-center gap-0.5 text-[0.65rem] font-extrabold text-white">
        {owned ? (
          'Owned'
        ) : emote.priceGems <= 0 ? (
          'FREE'
        ) : (
          <>
            <GemIcon className="h-3 w-3" />
            {emote.priceGems}
          </>
        )}
      </span>
    </button>
  )
}

function OfferEndsLabel({ hours }: { hours: number }) {
  const label = useCountdown(() => offerEndsMs(hours))
  return <>Ends in {label}</>
}

function RoyaleOfferCard({
  offer,
  onBuy,
}: {
  offer: RealMoneyOffer
  onBuy: () => void
}) {
  const featured = offer.charId ? getCharacter(offer.charId) : null
  return (
    <button
      type="button"
      onClick={onBuy}
      className="relative w-full overflow-hidden rounded-2xl text-left"
      style={{
        background: 'linear-gradient(180deg,#3d2a6a,#1a1038)',
        boxShadow: '0 4px 0 #00000088, inset 0 0 0 3px #f5d76e',
      }}
    >
      <div
        className="absolute left-0 right-0 top-0 py-1 text-center text-xs font-black uppercase tracking-wide text-[#1a1410]"
        style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
      >
        {offer.title}
      </div>
      <div className="flex gap-3 px-3 pb-3 pt-9">
        <div className="flex shrink-0 flex-col items-center gap-1">
          {featured ? (
            <div className="flex items-center gap-1.5">
              <div className="w-[3.05rem] shrink-0">
                <BattleCard character={featured} size="hand" />
              </div>
              {offer.copies ? (
                <span className="rounded-md bg-[#1a1410]/95 px-1.5 py-0.5 text-[0.7rem] font-black text-[#f5d76e] ring-1 ring-[#c9a227]/70">
                  ×{offer.copies}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="relative h-24 w-20">
              <ChestArt rarity={offer.chest ?? 'epic'} size="md" bounce />
            </div>
          )}
          {featured && offer.chest ? (
            <div className="relative h-10 w-10">
              <ChestArt rarity={offer.chest} size="sm" />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white/85">{offer.subtitle}</p>
          <ul className="mt-1 space-y-0.5 text-xs font-semibold text-[#ffe08a]">
            <li>+{offer.gold.toLocaleString()} gold</li>
            <li>+{offer.gems} gems</li>
            {offer.chest ? <li>{CHEST_META[offer.chest].label}</li> : null}
            {offer.charId && offer.copies ? (
              <li>
                {offer.copies}× {featured?.name}
              </li>
            ) : null}
          </ul>
          <p className="mt-2 text-[0.65rem] font-bold text-white/60">
            <OfferEndsLabel hours={offer.endsHours} />
          </p>
        </div>
        <div
          className="flex shrink-0 flex-col items-center justify-center self-center rounded-xl px-3 py-2"
          style={{
            background: 'linear-gradient(180deg,#7dff9a,#1e9a4a)',
            boxShadow: '0 3px 0 #0a4a20',
          }}
        >
          <span className="text-lg font-black text-[#1a1410]">${offer.priceUsd.toFixed(2)}</span>
        </div>
      </div>
    </button>
  )
}

function DailyDealTile({
  offer,
  bought,
  onBuy,
}: {
  offer: ReturnType<typeof getShopOffers>[number]
  bought: boolean
  onBuy: () => void
}) {
  const c = offer.charId ? getCharacter(offer.charId) : null
  const progress = loadCardProgress()
  const level = c ? (progress.levels[c.id] ?? 1) : 1
  const have = c ? (progress.copies[c.id] ?? 0) : 0
  const need = c && level < 10 ? copiesToUpgrade(level, c.rarity) : 0
  const pct = need > 0 ? Math.min(100, (have / need) * 100) : 100

  let priceLabel: React.ReactNode = null
  if (bought) {
    priceLabel = <span className="text-white/50">Bought</span>
  } else if (offer.free) {
    priceLabel = (
      <span className="font-black text-[#7dff9a]">FREE!</span>
    )
  } else if (offer.priceGems != null && offer.priceGems > 0) {
    priceLabel = (
      <span className="flex items-center justify-center gap-0.5 font-black text-[#9ae6ff]">
        <GemIcon className="h-3.5 w-3.5" />
        {offer.priceGems}
      </span>
    )
  } else {
    priceLabel = (
      <span className="flex items-center justify-center gap-0.5 font-black text-[#f5d76e]">
        <GoldIcon className="h-3.5 w-3.5" />
        {offer.priceGold}
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={bought}
      onClick={onBuy}
      className="flex flex-col overflow-hidden rounded-xl disabled:opacity-55"
      style={{
        background: 'linear-gradient(180deg,#2a4a58,#152830)',
        boxShadow: '0 3px 0 #00000066, inset 0 0 0 2px #ffffff33',
      }}
    >
      <div className="px-1.5 pt-1.5">
        <p
          className="truncate text-center text-[0.6rem] font-extrabold uppercase"
          style={{ color: c ? RARITY_TEXT[c.rarity] : '#fff' }}
        >
          {c?.name}
        </p>
        <p className="text-center text-[0.55rem] font-bold text-white/55">
          {c ? RARITY_LABEL[c.rarity] : ''}
        </p>
      </div>
      <div className="mx-2 my-1">
        <BattleCard character={c ?? null} size="collection" />
      </div>
      <p className="text-center text-xs font-black text-white">×{offer.copies}</p>
      {need > 0 ? (
        <div className="mx-2 mb-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[#7dff9a]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-0.5 text-center text-[0.5rem] font-bold text-white/60">
            {have}/{need}
          </p>
        </div>
      ) : null}
      <div
        className="mt-auto border-t border-white/10 py-1.5 text-center text-xs"
        style={{ background: 'linear-gradient(180deg,#1a2830,#0f1820)' }}
      >
        {priceLabel}
      </div>
    </button>
  )
}

export function ShopScreen() {
  const [bought, setBought] = useState(() => loadShopBoughtToday())
  const [ownedEmotes, setOwnedEmotes] = useState(() => loadOwnedEmotes())
  const [toast, setToast] = useState<string | null>(null)

  const offers = useMemo(() => getShopOffers(), [])
  const cardOffers = offers.filter((o) => o.kind === 'card')
  const chestOffers = offers.filter((o) => o.kind === 'chest')

  const dailyRefresh = useCountdown(msUntilMidnight)
  const emoteTimer = useCountdown(msUntilEmoteMarketEnd)

  function refresh() {
    setBought(loadShopBoughtToday())
    setOwnedEmotes(loadOwnedEmotes())
    window.dispatchEvent(new Event('philroyale-profile-changed'))
  }

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paid = params.get('philShopPaid')?.trim()
    if (!paid) return
    const res = claimPaidShopSku(paid)
    flash(res.message)
    if (res.ok) refresh()
    const url = new URL(window.location.href)
    url.searchParams.delete('philShopPaid')
    window.history.replaceState({}, '', url.toString())
  }, [])

  function handle(res: { ok: boolean; message: string }) {
    flash(res.message)
    if (res.ok) refresh()
  }

  async function startUsdPurchase(skuId: string, label: string) {
    const checkoutUrl = await loadShopCheckoutUrl(skuId)
    if (!checkoutUrl) {
      flash(
        `${label} requires real money. Checkout isn’t ready yet — try again after the next deploy.`,
      )
      return
    }
    beginUsdCheckout(skuId)
    flash(`Opening Square checkout for ${label}…`)
    window.location.assign(checkoutUrl)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col" style={QUILT_BG}>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-[max(3.4rem,calc(env(safe-area-inset-top)+2.85rem))]">
        {/* Offers */}
        <section className="mb-5">
          <Ribbon label="Offers" tone="gold" />
          <ul className="flex flex-col gap-3">
            {REAL_MONEY_OFFERS.map((offer) => (
              <li key={offer.id}>
                <RoyaleOfferCard
                  offer={offer}
                  onBuy={() => void startUsdPurchase(offer.id, offer.title)}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Emote Market */}
        <section className="mb-5">
          <Ribbon label="Emote Market" tone="blue" timer={`Ends in ${emoteTimer}`} />
          <div
            className="rounded-2xl p-3"
            style={{
              background: 'linear-gradient(180deg,#1e5080,#0f2840)',
              boxShadow: 'inset 0 0 0 3px #5eb8ff55, 0 4px 0 #00000066',
            }}
          >
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {shopEmotes().map((emote) => (
                <EmoteTile
                  key={emote.id}
                  emote={emote}
                  owned={ownedEmotes.includes(emote.id)}
                  onBuy={() => handle(buyEmote(emote.id))}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Daily Deals */}
        <section className="mb-5">
          <Ribbon label="Daily Deals" tone="gold" timer={`Refresh in ${dailyRefresh}`} />
          <div className="grid grid-cols-3 gap-2">
            {cardOffers.map((o) => (
              <DailyDealTile
                key={o.id}
                offer={o}
                bought={bought.includes(o.id)}
                onBuy={() => handle(buyShopOffer(o.id))}
              />
            ))}
          </div>
        </section>

        {/* Chests */}
        <section className="mb-5">
          <Ribbon label="Chests" tone="gold" />
          <div className="grid grid-cols-2 gap-2">
            {CHEST_ORDER.map((rarity) => {
              const offer = chestOffers.find((o) => o.chest === rarity)
              if (!offer) return null
              const meta = CHEST_META[rarity]
              const owned = bought.includes(offer.id)
              return (
                <button
                  key={offer.id}
                  type="button"
                  disabled={owned}
                  onClick={() => handle(buyShopOffer(offer.id))}
                  className="flex flex-col items-center rounded-xl p-2 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg,#3a2418,#1f140e)',
                    boxShadow: `0 3px 0 #00000066, inset 0 0 0 2px ${meta.color}88`,
                  }}
                >
                  <ChestArt rarity={rarity} size="md" />
                  <p className="mt-1 text-xs font-extrabold text-white">{meta.label}</p>
                  <p className="mt-1 flex items-center gap-0.5 text-sm font-black text-[#f5d76e]">
                    {owned ? (
                      'Bought'
                    ) : (
                      <>
                        <GoldIcon className="h-4 w-4" />
                        {offer.priceGold}
                      </>
                    )}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Currency */}
        <section className="mb-2">
          <Ribbon label="Currency" tone="gold" />
          <SubBanner label="Gems" tone="green" />
          <div className="mb-4 grid grid-cols-3 gap-2">
            {GEM_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() =>
                  void startUsdPurchase(pack.id, `${pack.gems.toLocaleString()} gems`)
                }
                className="flex flex-col items-center rounded-xl py-2"
                style={{
                  background: 'linear-gradient(180deg,#1a4030,#0a2018)',
                  boxShadow: '0 3px 0 #00000066, inset 0 0 0 2px #7dff9a55',
                }}
              >
                <GemIcon className="h-8 w-8" />
                <span className="mt-1 text-sm font-black text-white">{pack.gems.toLocaleString()}</span>
                <span
                  className="mt-1 rounded-md px-2 py-0.5 text-xs font-black text-[#1a1410]"
                  style={{ background: 'linear-gradient(180deg,#7dff9a,#1e9a4a)' }}
                >
                  ${pack.priceUsd.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
          <SubBanner label="Gold" tone="yellow" />
          <div className="grid grid-cols-3 gap-2">
            {GOLD_WITH_GEMS_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => handle(buyGoldWithGems(pack.id))}
                className="flex flex-col items-center rounded-xl py-2"
                style={{
                  background: 'linear-gradient(180deg,#3a3018,#1f1808)',
                  boxShadow: '0 3px 0 #00000066, inset 0 0 0 2px #f5d76e55',
                }}
              >
                <GoldIcon className="h-8 w-8" />
                <span className="mt-1 text-xs font-black text-[#f5d76e]">
                  {pack.gold >= 1000 ? `${pack.gold / 1000}k` : pack.gold}g
                </span>
                <span className="mt-1 flex items-center gap-0.5 text-[0.65rem] font-extrabold text-[#9ae6ff]">
                  <GemIcon className="h-3 w-3" />
                  {pack.gems}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <p className="max-w-sm rounded-lg bg-black/90 px-3 py-2 text-center text-sm font-bold text-white ring-2 ring-[#f5d76e]/50">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  )
}
