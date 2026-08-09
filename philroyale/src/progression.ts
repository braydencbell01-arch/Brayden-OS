import { CHARACTERS, type Rarity } from './characters'

export const MAX_CARD_LEVEL = 10
/** Each level above 1 adds this fraction to HP and damage. */
export const LEVEL_STAT_STEP = 0.05

export type ChestRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type TrophyRoadReward = {
  trophies: number
  arena: string
  label: string
  gold?: number
  chest?: ChestRarity
  /** Unlock this card id permanently */
  unlockCard?: string
  gems?: number
}

export const CHEST_META: Record<
  ChestRarity,
  { label: string; color: string; unlockSec: number; openNowGold: number }
> = {
  common: { label: 'Common Chest', color: '#b8c0cc', unlockSec: 90, openNowGold: 40 },
  rare: { label: 'Rare Chest', color: '#e67e22', unlockSec: 180, openNowGold: 90 },
  epic: { label: 'Epic Chest', color: '#b14fd6', unlockSec: 360, openNowGold: 180 },
  legendary: { label: 'Legendary Chest', color: '#f5d76e', unlockSec: 600, openNowGold: 350 },
}

/** Clash-style trophy road — denser milestones like CR. */
export const TROPHY_ROAD: TrophyRoadReward[] = [
  { trophies: 0, arena: 'Goblin Boot', label: 'Journey begins', gold: 50, unlockCard: 'finley' },
  { trophies: 25, arena: 'Goblin Boot', label: 'Gold pouch', gold: 30 },
  { trophies: 50, arena: 'Goblin Boot', label: 'Unlock Shay', unlockCard: 'shay', gold: 40 },
  { trophies: 75, arena: 'Goblin Boot', label: 'Common Chest', chest: 'common', gold: 25 },
  { trophies: 100, arena: 'Goblin Boot', label: 'Unlock Beans', unlockCard: 'beans', gold: 50 },
  { trophies: 125, arena: 'Goblin Boot', label: 'Common Chest', chest: 'common' },
  { trophies: 150, arena: 'Goblin Boot', label: 'Rare Chest', chest: 'rare', gold: 35 },
  { trophies: 175, arena: 'Goblin Boot', label: 'Gold pouch', gold: 50 },
  { trophies: 200, arena: 'Training Camp', label: 'Arena unlocked!', gold: 100, unlockCard: 'lynne' },
  { trophies: 250, arena: 'Training Camp', label: 'Common Chest', chest: 'common', gold: 40 },
  { trophies: 300, arena: 'Training Camp', label: 'Gold pouch', gold: 60 },
  { trophies: 350, arena: 'Training Camp', label: 'Rare Chest', chest: 'rare' },
  { trophies: 400, arena: 'Training Camp', label: 'Unlock Kathie', unlockCard: 'kathie', gold: 75 },
  { trophies: 450, arena: 'Training Camp', label: 'Common Chest', chest: 'common', gold: 50 },
  { trophies: 500, arena: 'Training Camp', label: 'Epic Chest', chest: 'epic', gold: 40 },
  { trophies: 550, arena: 'Training Camp', label: 'Gold pouch', gold: 70 },
  { trophies: 600, arena: 'Sundae Strip', label: 'Arena unlocked!', gold: 150, unlockCard: 'mike' },
  { trophies: 625, arena: 'Sundae Strip', label: 'Unlock Scott', unlockCard: 'scott', gold: 60 },
  { trophies: 650, arena: 'Sundae Strip', label: 'Unlock Football Huck', unlockCard: 'footballHuck', gold: 70 },
  { trophies: 675, arena: 'Sundae Strip', label: 'Rare Chest', chest: 'rare', gold: 50 },
  { trophies: 750, arena: 'Sundae Strip', label: 'Common Chest', chest: 'common', gold: 60 },
  { trophies: 825, arena: 'Sundae Strip', label: 'Gold pouch', gold: 80 },
  { trophies: 900, arena: 'Sundae Strip', label: 'Unlock Todd', unlockCard: 'todd', gold: 100 },
  { trophies: 950, arena: 'Sundae Strip', label: 'Epic Chest', chest: 'epic' },
  { trophies: 1000, arena: 'Sundae Strip', label: 'Legendary Chest', chest: 'legendary', gold: 75 },
  { trophies: 1100, arena: 'Sundae Strip', label: 'Rare Chest', chest: 'rare', gold: 70 },
  { trophies: 1200, arena: 'Bone Bridge', label: 'Arena unlocked!', gold: 200, unlockCard: 'dan' },
  { trophies: 1300, arena: 'Bone Bridge', label: 'Common Chest', chest: 'common', gold: 80 },
  { trophies: 1400, arena: 'Bone Bridge', label: 'Epic Chest', chest: 'epic', gold: 80 },
  { trophies: 1500, arena: 'Bone Bridge', label: 'Gold pouch', gold: 100 },
  { trophies: 1600, arena: 'Bone Bridge', label: 'Unlock Pete', unlockCard: 'pete', gold: 125 },
  { trophies: 1700, arena: 'Bone Bridge', label: 'Rare Chest', chest: 'rare', gold: 90 },
  { trophies: 1800, arena: 'Bone Bridge', label: 'Epic Chest', chest: 'epic', gold: 100 },
  { trophies: 1900, arena: 'Bone Bridge', label: 'Gold pouch', gold: 110 },
  { trophies: 2000, arena: 'Royal Yard', label: 'Arena unlocked!', gold: 250, unlockCard: 'jeremy' },
  { trophies: 2150, arena: 'Royal Yard', label: 'Rare Chest', chest: 'rare', gold: 100 },
  { trophies: 2300, arena: 'Royal Yard', label: 'Epic Chest', chest: 'epic', gold: 120 },
  { trophies: 2450, arena: 'Royal Yard', label: 'Common Chest', chest: 'common', gold: 90 },
  { trophies: 2600, arena: 'Royal Yard', label: 'Unlock Phil', unlockCard: 'phil', gold: 200 },
  { trophies: 2800, arena: 'Royal Yard', label: 'Legendary Chest', chest: 'legendary', gold: 120 },
  { trophies: 3000, arena: 'Royal Yard', label: 'Epic Chest', chest: 'epic', gold: 150 },
  { trophies: 3200, arena: 'Royal Yard', label: 'Gold pouch', gold: 160 },
  { trophies: 3400, arena: 'Phil Peak', label: 'Arena unlocked!', gold: 300 },
  { trophies: 3600, arena: 'Phil Peak', label: 'Rare Chest', chest: 'rare', gold: 140 },
  { trophies: 3800, arena: 'Phil Peak', label: 'Epic Chest', chest: 'epic', gold: 180 },
  { trophies: 4000, arena: 'Phil Peak', label: 'Gold pouch', gold: 200 },
  { trophies: 4200, arena: 'Phil Peak', label: 'Legendary Chest', chest: 'legendary', gold: 250 },
  { trophies: 4500, arena: 'Phil Peak', label: 'Epic Chest', chest: 'epic', gold: 220 },
  { trophies: 4800, arena: 'Phil Peak', label: 'Rare Chest', chest: 'rare', gold: 200 },
  { trophies: 5000, arena: 'Phil Peak', label: 'Champion Chest', chest: 'legendary', gold: 500, gems: 50 },
]

export const ARENA_COLORS: Record<string, { sky: string; ground: string; accent: string }> = {
  'Goblin Boot': { sky: '#3d7a3a', ground: '#2a5528', accent: '#7dff9a' },
  'Training Camp': { sky: '#2b8fd4', ground: '#1a5a8a', accent: '#8ec8ff' },
  'Sundae Strip': { sky: '#c45a8c', ground: '#8a3a62', accent: '#ffb0d0' },
  'Bone Bridge': { sky: '#6a6a78', ground: '#3a3a48', accent: '#d0d0e0' },
  'Royal Yard': { sky: '#5a3a9a', ground: '#3a2068', accent: '#c9a0ff' },
  'Phil Peak': { sky: '#c9a227', ground: '#6a4a10', accent: '#ffe08a' },
}

export const STARTER_UNLOCKS = [
  'finley',
  'shay',
  'beans',
  'lynne',
  'mike',
  'kathie',
  'todd',
  'dan',
  'pete',
  'dogHut',
  'iceCream',
  'scott',
  'footballHuck',
]

export function cardLevelMult(level: number): number {
  const lv = Math.max(1, Math.min(MAX_CARD_LEVEL, Math.floor(level)))
  return 1 + (lv - 1) * LEVEL_STAT_STEP
}

export function scaledStat(base: number, level: number): number {
  return Math.round(base * cardLevelMult(level))
}

export function arenaForTrophies(trophies: number): string {
  let arena = TROPHY_ROAD[0]!.arena
  for (const step of TROPHY_ROAD) {
    if (trophies >= step.trophies) arena = step.arena
  }
  return arena
}

export function nextRoadStep(trophies: number): TrophyRoadReward | null {
  for (const step of TROPHY_ROAD) {
    if (step.trophies > trophies) return step
  }
  return null
}

export function botLevelForTrophies(trophies: number): number {
  return Math.max(1, Math.min(MAX_CARD_LEVEL, 1 + Math.floor(trophies / 450)))
}

export function botNameForTrophies(trophies: number): string {
  const names = [
    'Bot Bray',
    'Training King',
    'Sundae Scout',
    'Bone Bandit',
    'Yard Guard',
    'Peak Phantom',
  ]
  const i = Math.min(names.length - 1, Math.floor(trophies / 800))
  return names[i]!
}

export type ShopOffer = {
  id: string
  kind: 'card' | 'chest'
  charId?: string
  chest?: ChestRarity
  copies?: number
  priceGold: number
}

export function dailyShopOffers(dayKey: string): ShopOffer[] {
  const seed = dayKey.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
  const shuffled = [...CHARACTERS].sort(
    (a, b) => ((a.id.charCodeAt(0) + seed) % 7) - ((b.id.charCodeAt(0) + seed) % 7),
  )
  const cards: ShopOffer[] = shuffled.slice(0, 3).map((c, i) => {
    const copies = c.rarity === 'legendary' ? 1 : c.rarity === 'epic' ? 2 : c.rarity === 'rare' ? 4 : 8
    const price =
      c.rarity === 'legendary' ? 1200 : c.rarity === 'epic' ? 500 : c.rarity === 'rare' ? 200 : 80
    return {
      id: `card-${dayKey}-${i}`,
      kind: 'card',
      charId: c.id,
      copies,
      priceGold: price + (seed % 40),
    }
  })
  const chests: ShopOffer[] = [
    { id: `chest-common-${dayKey}`, kind: 'chest', chest: 'common', priceGold: 100 },
    { id: `chest-rare-${dayKey}`, kind: 'chest', chest: 'rare', priceGold: 250 },
    { id: `chest-epic-${dayKey}`, kind: 'chest', chest: 'epic', priceGold: 600 },
    { id: `chest-legendary-${dayKey}`, kind: 'chest', chest: 'legendary', priceGold: 1400 },
  ]
  return [...cards, ...chests]
}

export function rollChestLoot(rarity: ChestRarity): {
  gold: number
  cards: { charId: string; copies: number }[]
} {
  const goldBase =
    rarity === 'legendary' ? 400 : rarity === 'epic' ? 220 : rarity === 'rare' ? 120 : 60
  const gold = goldBase + Math.floor(Math.random() * goldBase * 0.4)

  const pool = (r: Rarity) => CHARACTERS.filter((c) => c.rarity === r)
  const pick = (list: typeof CHARACTERS) =>
    list[Math.floor(Math.random() * list.length)] ?? CHARACTERS[0]!

  const cards: { charId: string; copies: number }[] = []
  if (rarity === 'common') {
    cards.push({ charId: pick(pool('common')).id, copies: 4 + Math.floor(Math.random() * 5) })
    cards.push({ charId: pick(pool('common')).id, copies: 2 + Math.floor(Math.random() * 3) })
    if (Math.random() < 0.35) {
      cards.push({ charId: pick(pool('rare')).id, copies: 1 })
    }
  } else if (rarity === 'rare') {
    cards.push({ charId: pick(pool('rare')).id, copies: 3 + Math.floor(Math.random() * 4) })
    cards.push({ charId: pick(pool('common')).id, copies: 6 + Math.floor(Math.random() * 6) })
    if (Math.random() < 0.4) {
      cards.push({ charId: pick(pool('epic')).id, copies: 1 })
    }
  } else if (rarity === 'epic') {
    cards.push({ charId: pick(pool('epic')).id, copies: 2 + Math.floor(Math.random() * 3) })
    cards.push({ charId: pick(pool('rare')).id, copies: 4 + Math.floor(Math.random() * 4) })
    cards.push({ charId: pick(pool('common')).id, copies: 8 })
  } else {
    cards.push({ charId: pick(pool('legendary')).id, copies: 1 })
    cards.push({ charId: pick(pool('epic')).id, copies: 2 + Math.floor(Math.random() * 2) })
    cards.push({ charId: pick(pool('rare')).id, copies: 5 })
  }
  return { gold, cards }
}
