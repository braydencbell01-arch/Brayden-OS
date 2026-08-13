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
  /** Grant extra copies of an already-known card (also unlocks if needed). */
  cardCopies?: { charId: string; copies: number }
  gems?: number
  /** Unlock an emote id (character / photo). */
  unlockEmote?: string
}

/** Map trophy count → 0–1 progress along evenly-spaced road steps (bottom = low). */
export function trophyRoadProgress(trophies: number): number {
  const n = TROPHY_ROAD.length
  if (n <= 1) return trophies > 0 ? 1 : 0
  const last = n - 1
  if (trophies >= TROPHY_ROAD[last]!.trophies) return 1
  if (trophies <= TROPHY_ROAD[0]!.trophies) return 0
  for (let i = 0; i < last; i++) {
    const lo = TROPHY_ROAD[i]!.trophies
    const hi = TROPHY_ROAD[i + 1]!.trophies
    if (trophies >= lo && trophies < hi) {
      const t = hi > lo ? (trophies - lo) / (hi - lo) : 0
      return (i + t) / last
    }
  }
  return 1
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

/** Stable claim id — trophies + primary reward (survives copy-count edits). */
export function roadStepKey(step: TrophyRoadReward): string {
  const id =
    step.unlockCard ||
    step.cardCopies?.charId ||
    step.chest ||
    (step.unlockEmote ? `e:${step.unlockEmote}` : '') ||
    'x'
  return `${step.trophies}:${id}`
}

/** Clash-style trophy road — denser milestones like CR. */
export const TROPHY_ROAD: TrophyRoadReward[] = [
  { trophies: 0, arena: 'Training Camp', label: 'Journey begins', gold: 50, unlockCard: 'finley' },
  { trophies: 25, arena: 'Training Camp', label: 'Gold pouch', gold: 30 },
  { trophies: 50, arena: 'Training Camp', label: 'x1 Shay', unlockCard: 'shay', gold: 40 },
  { trophies: 75, arena: 'Training Camp', label: 'Common Chest', chest: 'common', gold: 25 },
  { trophies: 80, arena: 'Training Camp', label: 'x1 Dan', unlockCard: 'dan', gold: 40 },
  { trophies: 100, arena: 'Training Camp', label: 'x5 Beans', cardCopies: { charId: 'beans', copies: 5 }, gold: 50 },
  { trophies: 125, arena: 'Training Camp', label: 'Common Chest', chest: 'common' },
  { trophies: 150, arena: 'Training Camp', label: 'Rare Chest', chest: 'rare', gold: 35, unlockEmote: 'wave' },
  { trophies: 175, arena: 'Training Camp', label: 'Gold pouch', gold: 50 },
  { trophies: 200, arena: 'Training Camp', label: 'x8 Lynne', cardCopies: { charId: 'lynne', copies: 8 }, gold: 100 },
  { trophies: 225, arena: 'Training Camp', label: 'x4 Kathie', cardCopies: { charId: 'kathie', copies: 4 } },
  { trophies: 250, arena: 'Training Camp', label: 'Common Chest', chest: 'common', gold: 40 },
  { trophies: 300, arena: 'Training Camp', label: 'Gold pouch', gold: 60 },
  { trophies: 325, arena: 'Training Camp', label: 'x1 Pete', unlockCard: 'pete', gold: 70 },
  { trophies: 350, arena: 'Training Camp', label: 'Rare Chest', chest: 'rare' },
  { trophies: 375, arena: 'Training Camp', label: 'x1 Dave', unlockCard: 'dave', gold: 80 },
  { trophies: 400, arena: 'Training Camp', label: 'x2 Kathie', cardCopies: { charId: 'kathie', copies: 2 }, gold: 75, unlockEmote: 'heart' },
  { trophies: 425, arena: 'Training Camp', label: 'x1 Gretchin', unlockCard: 'gretchin', gold: 70 },
  { trophies: 450, arena: 'Training Camp', label: 'Common Chest', chest: 'common', gold: 50 },
  { trophies: 475, arena: 'Training Camp', label: 'x1 Phil Spirit', unlockCard: 'philSpirit', gold: 80 },
  { trophies: 500, arena: 'Training Camp', label: 'Epic Chest', chest: 'epic', gold: 40 },
  { trophies: 525, arena: 'Training Camp', label: 'x1 Pete Spirit', unlockCard: 'peteSpirit', gold: 80 },
  { trophies: 550, arena: 'Training Camp', label: 'Gold pouch', gold: 70 },
  { trophies: 575, arena: 'Training Camp', label: 'x1 Hamburger Chicken', unlockCard: 'hamburgerChicken', gold: 80 },
  { trophies: 600, arena: 'Sundae Strip', label: 'x6 Michael', cardCopies: { charId: 'mike', copies: 6 }, gold: 150 },
  { trophies: 625, arena: 'Sundae Strip', label: 'x1 Scott', unlockCard: 'scott', gold: 60 },
  { trophies: 650, arena: 'Sundae Strip', label: 'x5 Baseball Huck', cardCopies: { charId: 'footballHuck', copies: 5 }, gold: 70 },
  { trophies: 675, arena: 'Sundae Strip', label: "x4 Steve's Diner", cardCopies: { charId: 'stevesDiner', copies: 4 }, gold: 65 },
  { trophies: 700, arena: 'Sundae Strip', label: 'x1 Big Mable', unlockCard: 'bigMable', gold: 80, unlockEmote: 'party' },
  { trophies: 700, arena: 'Sundae Strip', label: 'Rare Chest', chest: 'rare', gold: 50 },
  { trophies: 725, arena: 'Sundae Strip', label: 'x8 Bobby Special', cardCopies: { charId: 'bobbySpecial', copies: 8 }, gold: 90 },
  { trophies: 750, arena: 'Sundae Strip', label: 'Common Chest', chest: 'common', gold: 60 },
  { trophies: 775, arena: 'Sundae Strip', label: 'x10 Todd', cardCopies: { charId: 'todd', copies: 10 } },
  { trophies: 825, arena: 'Sundae Strip', label: 'Gold pouch', gold: 80 },
  { trophies: 850, arena: 'Sundae Strip', label: "x1 Phil's Car", unlockCard: 'philsCar', gold: 90 },
  { trophies: 875, arena: 'Sundae Strip', label: 'x1 Evil Phil', unlockCard: 'evilPhil', gold: 100 },
  { trophies: 900, arena: 'Sundae Strip', label: 'x2 Todd', cardCopies: { charId: 'todd', copies: 2 }, gold: 100 },
  { trophies: 925, arena: 'Sundae Strip', label: 'x1 Phil', unlockCard: 'phil', gold: 110 },
  { trophies: 950, arena: 'Sundae Strip', label: 'Epic Chest', chest: 'epic' },
  { trophies: 1000, arena: 'Sundae Strip', label: 'Legendary Chest', chest: 'legendary', gold: 75, unlockEmote: 'cool' },
  { trophies: 1050, arena: 'Sundae Strip', label: 'x5 Gretchin', cardCopies: { charId: 'gretchin', copies: 5 }, gold: 90 },
  { trophies: 1100, arena: 'Sundae Strip', label: 'Rare Chest', chest: 'rare', gold: 70 },
  { trophies: 1150, arena: 'Sundae Strip', label: 'x12 Mike', cardCopies: { charId: 'mike', copies: 12 } },
  { trophies: 1200, arena: "Pete's Pit", label: 'x2 Dan', cardCopies: { charId: 'dan', copies: 2 }, gold: 200 },
  { trophies: 1250, arena: "Pete's Pit", label: 'x8 Beans', cardCopies: { charId: 'beans', copies: 8 } },
  { trophies: 1300, arena: "Pete's Pit", label: 'Common Chest', chest: 'common', gold: 80 },
  { trophies: 1350, arena: "Pete's Pit", label: 'x5 Hamburger Chicken', cardCopies: { charId: 'hamburgerChicken', copies: 5 } },
  { trophies: 1400, arena: "Pete's Pit", label: 'Epic Chest', chest: 'epic', gold: 80, unlockEmote: 'skull' },
  { trophies: 1500, arena: "Pete's Pit", label: 'Gold pouch', gold: 100 },
  { trophies: 1600, arena: "Pete's Pit", label: 'x4 Pete', cardCopies: { charId: 'pete', copies: 4 }, gold: 125 },
  { trophies: 1650, arena: "Pete's Pit", label: 'x5 Lynne', cardCopies: { charId: 'lynne', copies: 5 } },
  { trophies: 1700, arena: "Pete's Pit", label: 'Rare Chest', chest: 'rare', gold: 90 },
  { trophies: 1800, arena: "Pete's Pit", label: 'Epic Chest', chest: 'epic', gold: 100, unlockEmote: 'emote-pete' },
  { trophies: 1900, arena: "Pete's Pit", label: 'Gold pouch', gold: 110 },
  { trophies: 2000, arena: 'Jeremy Land', label: 'x2 Jeremy', cardCopies: { charId: 'jeremy', copies: 2 }, gold: 250 },
  { trophies: 2050, arena: 'Jeremy Land', label: 'x4 Jeremy', cardCopies: { charId: 'jeremy', copies: 4 } },
  { trophies: 2150, arena: 'Jeremy Land', label: 'Rare Chest', chest: 'rare', gold: 100 },
  { trophies: 2200, arena: 'Jeremy Land', label: 'Emote: Jeremy', unlockEmote: 'emote-jeremy', gold: 60 },
  { trophies: 2300, arena: 'Jeremy Land', label: 'Epic Chest', chest: 'epic', gold: 120 },
  { trophies: 2450, arena: 'Jeremy Land', label: 'Common Chest', chest: 'common', gold: 90 },
  { trophies: 2600, arena: 'Jeremy Land', label: 'x2 Phil', cardCopies: { charId: 'phil', copies: 2 }, gold: 200 },
  { trophies: 2650, arena: 'Jeremy Land', label: 'x2 Phil Spirit', cardCopies: { charId: 'philSpirit', copies: 2 }, gold: 150 },
  { trophies: 2675, arena: 'Jeremy Land', label: 'x2 Pete Spirit', cardCopies: { charId: 'peteSpirit', copies: 2 }, gold: 150 },
  { trophies: 2688, arena: 'Jeremy Land', label: 'x8 Jeremy Spirit', cardCopies: { charId: 'jeremySpirit', copies: 8 }, gold: 150 },
  { trophies: 2700, arena: 'Jeremy Land', label: "x2 Phil's Car", cardCopies: { charId: 'philsCar', copies: 2 }, gold: 180 },
  { trophies: 2750, arena: 'Jeremy Land', label: 'x2 Evil Phil', cardCopies: { charId: 'evilPhil', copies: 2 }, gold: 220 },
  { trophies: 2800, arena: 'Jeremy Land', label: 'Legendary Chest', chest: 'legendary', gold: 120 },
  { trophies: 2850, arena: 'Jeremy Land', label: 'x6 Kathie', cardCopies: { charId: 'kathie', copies: 6 } },
  { trophies: 2900, arena: 'Jeremy Land', label: 'Emote: Coach', unlockEmote: 'coach', gold: 80 },
  { trophies: 3000, arena: 'Jeremy Land', label: 'Epic Chest', chest: 'epic', gold: 150 },
  { trophies: 3200, arena: 'Jeremy Land', label: 'Gold pouch', gold: 160 },
  { trophies: 3400, arena: 'Phil Peak', label: 'Arena unlocked!', gold: 300 },
  { trophies: 3500, arena: 'Phil Peak', label: 'x8 Jeremy', cardCopies: { charId: 'jeremy', copies: 8 } },
  { trophies: 3550, arena: 'Phil Peak', label: 'Emote: Evil Phil', unlockEmote: 'emote-evilPhil', gold: 100 },
  { trophies: 3600, arena: 'Phil Peak', label: 'Rare Chest', chest: 'rare', gold: 140 },
  { trophies: 3800, arena: 'Phil Peak', label: 'Epic Chest', chest: 'epic', gold: 180 },
  { trophies: 4000, arena: 'Phil Peak', label: 'Gold pouch', gold: 200 },
  { trophies: 4200, arena: 'Phil Peak', label: 'Legendary Chest', chest: 'legendary', gold: 250 },
  { trophies: 4500, arena: 'Phil Peak', label: 'Epic Chest', chest: 'epic', gold: 220 },
  { trophies: 4800, arena: 'Phil Peak', label: 'Rare Chest', chest: 'rare', gold: 200 },
  { trophies: 5000, arena: 'Phil Peak', label: 'Champion Chest', chest: 'legendary', gold: 500, gems: 50 },
]

export const ARENA_COLORS: Record<string, { sky: string; ground: string; accent: string }> = {
  'Training Camp': { sky: '#4aad3a', ground: '#1a4a22', accent: '#8fd46a' },
  'Sundae Strip': { sky: '#ff9ec8', ground: '#8a3060', accent: '#ffb0d0' },
  "Pete's Pit": { sky: '#6a4a30', ground: '#140a08', accent: '#e8b86a' },
  'Jeremy Land': { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
  'Phil Peak': { sky: '#6ec8ff', ground: '#5a3a10', accent: '#ffe08a' },
  // Legacy aliases (saved profiles / old road labels)
  'Phil Plaza': { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
  'Goblin Boot': { sky: '#4aad3a', ground: '#1a4a22', accent: '#8fd46a' },
  'Bone Bridge': { sky: '#6a4a30', ground: '#140a08', accent: '#e8b86a' },
  'Royal Yard': { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
}

/** Exactly 12 starter cards — rest unlock via trophy road / chests. */
export const STARTER_UNLOCKS = [
  'beans',
  'iceCream',
  'lynne',
  'jeremy',
  'todd',
  'kathie',
  'footballHuck',
  'stevesDiner',
  'mike',
  'bobbySpecial',
  'jeremySpirit',
  'dogHut',
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
  // Scales across the trophy road (~0 → Phil Peak 4000+).
  return Math.max(1, Math.min(MAX_CARD_LEVEL, 1 + Math.floor(trophies / 400)))
}

/** AI cadence / elixir pressure — harder the further you are on trophy road. */
export function botAiProfile(trophies: number): {
  level: number
  /** Min ms between deploy attempts */
  deployMinMs: number
  /** Max ms between deploy attempts */
  deployMaxMs: number
  /** Enemy elixir regen multiplier vs the player */
  elixirMult: number
  /** Starting enemy elixir */
  startElixir: number
} {
  const t = Math.max(0, trophies)
  const level = botLevelForTrophies(t)
  // 0 trophies → ~2.4–3.8s; 4000+ → ~0.7–1.3s
  const deployMinMs = Math.max(700, Math.round(2400 - t * 0.42))
  const deployMaxMs = Math.max(deployMinMs + 400, Math.round(3800 - t * 0.6))
  // Mild elixir edge at high trophies (1.0 → ~1.35)
  const elixirMult = Math.min(1.35, 1 + t / 12000)
  const startElixir = Math.min(7, 4 + Math.floor(t / 1200))
  return { level, deployMinMs, deployMaxMs, elixirMult, startElixir }
}

export function botNameForTrophies(trophies: number): string {
  const names = [
    'Bot Bray',
    'Training King',
    'Sundae Scout',
    'Pete Bandit',
    'Jeremy Agent',
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
  /** Free daily deal — no gold or gems. */
  free?: boolean
  priceGold?: number
  priceGems?: number
}

function cardCopiesForRarity(rarity: Rarity): number {
  if (rarity === 'legendary') return 1
  if (rarity === 'epic') return 2
  if (rarity === 'rare') return 4
  return 8
}

function goldPriceForRarity(rarity: Rarity, seed: number): number {
  const base =
    rarity === 'legendary' ? 1200 : rarity === 'epic' ? 500 : rarity === 'rare' ? 200 : 80
  return base + (seed % 40)
}

/** Six daily card deals — one free, one gems, four gold (CR 3×2 grid). */
export function dailyShopOffers(dayKey: string): ShopOffer[] {
  const seed = dayKey.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
  const shuffled = [...CHARACTERS].sort(
    (a, b) => ((a.id.charCodeAt(0) + seed) % 7) - ((b.id.charCodeAt(0) + seed) % 7),
  )
  const cards: ShopOffer[] = []

  const freeChar = shuffled[0]!
  cards.push({
    id: `card-free-${dayKey}`,
    kind: 'card',
    charId: freeChar.id,
    copies: Math.max(2, Math.floor(cardCopiesForRarity(freeChar.rarity) / 2)),
    free: true,
  })

  const gemChar =
    shuffled.find((c) => c.rarity === 'epic' || c.rarity === 'rare') ?? shuffled[1]!
  cards.push({
    id: `card-gem-${dayKey}`,
    kind: 'card',
    charId: gemChar.id,
    copies: cardCopiesForRarity(gemChar.rarity),
    priceGems:
      gemChar.rarity === 'legendary' ? 40 : gemChar.rarity === 'epic' ? 20 : gemChar.rarity === 'rare' ? 10 : 6,
  })

  for (let i = 0; i < 4; i++) {
    const c = shuffled[(i + 2) % shuffled.length]!
    cards.push({
      id: `card-${dayKey}-${i + 2}`,
      kind: 'card',
      charId: c.id,
      copies: cardCopiesForRarity(c.rarity),
      priceGold: goldPriceForRarity(c.rarity, seed + i * 11),
    })
  }

  return cards
}

export function chestShopOffers(dayKey: string): ShopOffer[] {
  return [
    { id: `chest-common-${dayKey}`, kind: 'chest', chest: 'common', priceGold: 100 },
    { id: `chest-rare-${dayKey}`, kind: 'chest', chest: 'rare', priceGold: 250 },
    { id: `chest-epic-${dayKey}`, kind: 'chest', chest: 'epic', priceGold: 600 },
    { id: `chest-legendary-${dayKey}`, kind: 'chest', chest: 'legendary', priceGold: 1400 },
  ]
}

export function allShopOffers(dayKey: string): ShopOffer[] {
  return [...dailyShopOffers(dayKey), ...chestShopOffers(dayKey)]
}

/** Character / photo emotes that can drop from chests (not free emoji). */
export const CHEST_EMOTE_POOL = [
  'coach',
  'hood',
  'buzz',
  'emote-phil',
  'emote-jeremy',
  'emote-kathie',
  'emote-todd',
  'emote-mike',
  'emote-beans',
  'emote-lynne',
  'emote-evilPhil',
  'emote-pete',
  'emote-dan',
]

export function rollChestLoot(rarity: ChestRarity): {
  gold: number
  cards: { charId: string; copies: number }[]
  emoteId?: string
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

  const emoteChance =
    rarity === 'legendary' ? 0.55 : rarity === 'epic' ? 0.35 : rarity === 'rare' ? 0.18 : 0.08
  let emoteId: string | undefined
  if (Math.random() < emoteChance) {
    emoteId = CHEST_EMOTE_POOL[Math.floor(Math.random() * CHEST_EMOTE_POOL.length)]
  }
  return { gold, cards, emoteId }
}
