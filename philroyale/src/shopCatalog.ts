import type { ChestRarity } from './progression'

export type RealMoneyOffer = {
  id: string
  title: string
  subtitle: string
  priceUsd: number
  gold: number
  gems: number
  chest?: ChestRarity
  charId?: string
  copies?: number
  /** Hours until offer expires (from midnight local). */
  endsHours: number
}

export type GemPack = {
  id: string
  gems: number
  priceUsd: number
}

export type GoldWithGemsPack = {
  id: string
  gold: number
  gems: number
}

export type ShopCheckoutMap = {
  updatedAt: string | null
  locationId: string | null
  skus: Record<
    string,
    { url: string; paymentLinkId?: string; cents: number; name: string }
  >
}

export const REAL_MONEY_OFFERS: RealMoneyOffer[] = [
  {
    id: 'royale-starter',
    title: 'Royale Starter',
    subtitle: 'Jump-start your deck!',
    priceUsd: 4.99,
    gold: 500,
    gems: 80,
    chest: 'rare',
    charId: 'jeremy',
    copies: 5,
    endsHours: 36,
  },
  {
    id: 'royale-mega',
    title: 'Mega Phil Bundle',
    subtitle: 'Legendary value pack',
    priceUsd: 11.99,
    gold: 2000,
    gems: 500,
    chest: 'epic',
    charId: 'phil',
    copies: 10,
    endsHours: 48,
  },
]

export const GEM_PACKS: GemPack[] = [
  { id: 'gems-80', gems: 80, priceUsd: 0.99 },
  { id: 'gems-500', gems: 500, priceUsd: 4.99 },
  { id: 'gems-1200', gems: 1200, priceUsd: 9.99 },
  { id: 'gems-2500', gems: 2500, priceUsd: 19.99 },
  { id: 'gems-6500', gems: 6500, priceUsd: 49.99 },
  { id: 'gems-14000', gems: 14000, priceUsd: 99.99 },
]

export const GOLD_WITH_GEMS_PACKS: GoldWithGemsPack[] = [
  { id: 'gold-1k', gold: 1000, gems: 60 },
  { id: 'gold-10k', gold: 10000, gems: 500 },
  { id: 'gold-100k', gold: 100000, gems: 4500 },
]

export function getRealMoneyOffer(id: string): RealMoneyOffer | undefined {
  return REAL_MONEY_OFFERS.find((o) => o.id === id)
}

export function getGemPack(id: string): GemPack | undefined {
  return GEM_PACKS.find((p) => p.id === id)
}

export function getGoldWithGemsPack(id: string): GoldWithGemsPack | undefined {
  return GOLD_WITH_GEMS_PACKS.find((p) => p.id === id)
}

export function isUsdShopSku(id: string): boolean {
  return !!getRealMoneyOffer(id) || !!getGemPack(id)
}

/** Live Square checkout URL for a USD shop SKU (from deploy-time payment links). */
export async function loadShopCheckoutUrl(skuId: string): Promise<string | null> {
  try {
    const base = import.meta.env.BASE_URL || './'
    const path = `${base.endsWith('/') ? base : `${base}/`}shop-checkout.json`
    const res = await fetch(path, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as ShopCheckoutMap
    const link = data.skus?.[skuId]?.url?.trim()
    return link || null
  } catch {
    return null
  }
}
