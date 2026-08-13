import { CHARACTERS, type Rarity } from './characters'

export const MAX_CARD_LEVEL = 15
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

/** Clash-style trophy road — 15 arenas, 5 rewards each. */
export const TROPHY_ROAD: TrophyRoadReward[] = [
  // Training Camp 0–100
  { trophies: 0, arena: 'Training Camp', label: 'Journey begins', gold: 50, unlockCard: 'finley' },
  { trophies: 20, arena: 'Training Camp', label: 'x1 Shay', unlockCard: 'shay', gold: 40 },
  { trophies: 40, arena: 'Training Camp', label: 'x1 Tristan', unlockCard: 'tristan', gold: 50 },
  { trophies: 60, arena: 'Training Camp', label: 'x1 Dan', unlockCard: 'dan', gold: 40 },
  { trophies: 80, arena: 'Training Camp', label: 'x1 Pete', unlockCard: 'pete', gold: 70 },
  // Sundae Strip 100–300
  { trophies: 100, arena: 'Sundae Strip', label: 'x1 Dave', unlockCard: 'dave', gold: 80 },
  { trophies: 140, arena: 'Sundae Strip', label: 'Rare Chest', chest: 'rare', gold: 35, unlockEmote: 'wave' },
  { trophies: 180, arena: 'Sundae Strip', label: 'x1 Gretchin', unlockCard: 'gretchin', gold: 70 },
  { trophies: 220, arena: 'Sundae Strip', label: 'x8 Lynne', cardCopies: { charId: 'lynne', copies: 8 }, gold: 100 },
  { trophies: 260, arena: 'Sundae Strip', label: 'Common Chest', chest: 'common', gold: 40 },
  // Beans' Battleground 300–500
  { trophies: 300, arena: "Beans' Battleground", label: 'x5 Beans', cardCopies: { charId: 'beans', copies: 5 }, gold: 50 },
  { trophies: 340, arena: "Beans' Battleground", label: 'x1 Phil Spirit', unlockCard: 'philSpirit', gold: 80 },
  { trophies: 380, arena: "Beans' Battleground", label: 'x1 Pete Spirit', unlockCard: 'peteSpirit', gold: 80 },
  { trophies: 420, arena: "Beans' Battleground", label: 'x4 Kathie', cardCopies: { charId: 'kathie', copies: 4 }, gold: 75, unlockEmote: 'heart' },
  { trophies: 460, arena: "Beans' Battleground", label: 'Rare Chest', chest: 'rare' },
  // Phil Pier 500–700
  { trophies: 500, arena: 'Phil Pier', label: 'Epic Chest', chest: 'epic', gold: 40 },
  { trophies: 540, arena: 'Phil Pier', label: 'x1 Chicken', unlockCard: 'chicken', gold: 50 },
  { trophies: 580, arena: 'Phil Pier', label: 'x1 Hamburger Chicken', unlockCard: 'hamburgerChicken', gold: 80 },
  { trophies: 620, arena: 'Phil Pier', label: 'x1 Chicken Army', unlockCard: 'chickenArmy', gold: 70 },
  { trophies: 660, arena: 'Phil Pier', label: 'x1 Chicken Barrel', unlockCard: 'chickenBarrel', gold: 80 },
  // Dave's Dungeon 700–1000
  { trophies: 700, arena: "Dave's Dungeon", label: 'x1 Scott', unlockCard: 'scott', gold: 60 },
  { trophies: 760, arena: "Dave's Dungeon", label: 'x1 Big Mable', unlockCard: 'bigMable', gold: 80, unlockEmote: 'party' },
  { trophies: 820, arena: "Dave's Dungeon", label: "x1 Phil's Car", unlockCard: 'philsCar', gold: 90 },
  { trophies: 880, arena: "Dave's Dungeon", label: 'x1 Evil Phil', unlockCard: 'evilPhil', gold: 100 },
  { trophies: 940, arena: "Dave's Dungeon", label: 'x1 Phil', unlockCard: 'phil', gold: 110 },
  // Kathie's Kitchen 1000–1300
  { trophies: 1000, arena: "Kathie's Kitchen", label: 'Legendary Chest', chest: 'legendary', gold: 75, unlockEmote: 'cool' },
  { trophies: 1060, arena: "Kathie's Kitchen", label: 'x6 Michael', cardCopies: { charId: 'mike', copies: 6 }, gold: 150 },
  { trophies: 1120, arena: "Kathie's Kitchen", label: 'Rare Chest', chest: 'rare', gold: 70 },
  { trophies: 1180, arena: "Kathie's Kitchen", label: 'x5 Baseball Huck', cardCopies: { charId: 'footballHuck', copies: 5 }, gold: 70 },
  { trophies: 1240, arena: "Kathie's Kitchen", label: "x4 Steve's Diner", cardCopies: { charId: 'stevesDiner', copies: 4 }, gold: 65 },
  // Jacobson Junction 1300–1600
  { trophies: 1300, arena: 'Jacobson Junction', label: 'x8 Bobby Special', cardCopies: { charId: 'bobbySpecial', copies: 8 }, gold: 90 },
  { trophies: 1360, arena: 'Jacobson Junction', label: 'x8 Chicken', cardCopies: { charId: 'chicken', copies: 8 } },
  { trophies: 1420, arena: 'Jacobson Junction', label: 'x5 Hamburger Chicken', cardCopies: { charId: 'hamburgerChicken', copies: 5 } },
  { trophies: 1480, arena: 'Jacobson Junction', label: 'x4 Chicken Army', cardCopies: { charId: 'chickenArmy', copies: 4 } },
  { trophies: 1540, arena: 'Jacobson Junction', label: 'x4 Chicken Barrel', cardCopies: { charId: 'chickenBarrel', copies: 4 } },
  // Gretchin's Grill 1600–2000
  { trophies: 1600, arena: "Gretchin's Grill", label: 'x5 Gretchin', cardCopies: { charId: 'gretchin', copies: 5 }, gold: 90 },
  { trophies: 1680, arena: "Gretchin's Grill", label: 'Common Chest', chest: 'common', gold: 80 },
  { trophies: 1760, arena: "Gretchin's Grill", label: 'Epic Chest', chest: 'epic', gold: 80, unlockEmote: 'skull' },
  { trophies: 1840, arena: "Gretchin's Grill", label: 'x12 Mike', cardCopies: { charId: 'mike', copies: 12 } },
  { trophies: 1920, arena: "Gretchin's Grill", label: 'Gold pouch', gold: 100 },
  // Ricky's Diner 2000–2400
  { trophies: 2000, arena: "Ricky's Diner", label: 'x4 Pete', cardCopies: { charId: 'pete', copies: 4 }, gold: 125 },
  { trophies: 2080, arena: "Ricky's Diner", label: 'x5 Lynne', cardCopies: { charId: 'lynne', copies: 5 } },
  { trophies: 2160, arena: "Ricky's Diner", label: 'Rare Chest', chest: 'rare', gold: 90 },
  { trophies: 2240, arena: "Ricky's Diner", label: 'Epic Chest', chest: 'epic', gold: 100, unlockEmote: 'emote-pete' },
  { trophies: 2320, arena: "Ricky's Diner", label: 'Gold pouch', gold: 110 },
  // Scotts Mansion 2400–2800
  { trophies: 2400, arena: 'Scotts Mansion', label: 'x2 Jeremy', cardCopies: { charId: 'jeremy', copies: 2 }, gold: 250 },
  { trophies: 2480, arena: 'Scotts Mansion', label: 'x4 Jeremy', cardCopies: { charId: 'jeremy', copies: 4 } },
  { trophies: 2560, arena: 'Scotts Mansion', label: 'Rare Chest', chest: 'rare', gold: 100 },
  { trophies: 2640, arena: 'Scotts Mansion', label: 'Emote: Jeremy', unlockEmote: 'emote-jeremy', gold: 60 },
  { trophies: 2720, arena: 'Scotts Mansion', label: 'Epic Chest', chest: 'epic', gold: 120 },
  // Jeremy's Junkyard 2800–3300
  { trophies: 2800, arena: "Jeremy's Junkyard", label: 'Legendary Chest', chest: 'legendary', gold: 120 },
  { trophies: 2900, arena: "Jeremy's Junkyard", label: 'x2 Phil', cardCopies: { charId: 'phil', copies: 2 }, gold: 200 },
  { trophies: 3000, arena: "Jeremy's Junkyard", label: 'x2 Phil Spirit', cardCopies: { charId: 'philSpirit', copies: 2 }, gold: 150 },
  { trophies: 3100, arena: "Jeremy's Junkyard", label: 'x2 Pete Spirit', cardCopies: { charId: 'peteSpirit', copies: 2 }, gold: 150 },
  { trophies: 3200, arena: "Jeremy's Junkyard", label: 'x8 Jeremy Spirit', cardCopies: { charId: 'jeremySpirit', copies: 8 }, gold: 150 },
  // Clucktown 3300–3800
  { trophies: 3300, arena: 'Clucktown', label: "x2 Phil's Car", cardCopies: { charId: 'philsCar', copies: 2 }, gold: 180 },
  { trophies: 3400, arena: 'Clucktown', label: 'x2 Evil Phil', cardCopies: { charId: 'evilPhil', copies: 2 }, gold: 220 },
  { trophies: 3500, arena: 'Clucktown', label: 'x6 Kathie', cardCopies: { charId: 'kathie', copies: 6 } },
  { trophies: 3600, arena: 'Clucktown', label: 'Emote: Coach', unlockEmote: 'coach', gold: 80 },
  { trophies: 3700, arena: 'Clucktown', label: 'Epic Chest', chest: 'epic', gold: 150 },
  // Todd's Tavern 3800–4300
  { trophies: 3800, arena: "Todd's Tavern", label: 'x8 Jeremy', cardCopies: { charId: 'jeremy', copies: 8 } },
  { trophies: 3900, arena: "Todd's Tavern", label: 'Emote: Evil Phil', unlockEmote: 'emote-evilPhil', gold: 100 },
  { trophies: 4000, arena: "Todd's Tavern", label: 'Rare Chest', chest: 'rare', gold: 140 },
  { trophies: 4100, arena: "Todd's Tavern", label: 'Epic Chest', chest: 'epic', gold: 180 },
  { trophies: 4200, arena: "Todd's Tavern", label: 'Gold pouch', gold: 200 },
  // Pete Palace 4300–4900
  { trophies: 4300, arena: 'Pete Palace', label: 'Legendary Chest', chest: 'legendary', gold: 250 },
  { trophies: 4450, arena: 'Pete Palace', label: 'Epic Chest', chest: 'epic', gold: 220 },
  { trophies: 4600, arena: 'Pete Palace', label: 'Rare Chest', chest: 'rare', gold: 200 },
  { trophies: 4750, arena: 'Pete Palace', label: 'x2 Dan', cardCopies: { charId: 'dan', copies: 2 }, gold: 200 },
  { trophies: 4880, arena: 'Pete Palace', label: 'x10 Todd', cardCopies: { charId: 'todd', copies: 10 } },
  // Phil Peak 4900–5000
  { trophies: 4900, arena: 'Phil Peak', label: 'Arena unlocked!', gold: 300 },
  { trophies: 4925, arena: 'Phil Peak', label: 'Common Chest', chest: 'common', gold: 90 },
  { trophies: 4950, arena: 'Phil Peak', label: 'Epic Chest', chest: 'epic', gold: 180 },
  { trophies: 4975, arena: 'Phil Peak', label: 'Gold pouch', gold: 200 },
  { trophies: 5000, arena: 'Phil Peak', label: 'Champion Chest', chest: 'legendary', gold: 500, gems: 50 },
]

export const ARENA_COLORS: Record<string, { sky: string; ground: string; accent: string }> = {
  'Training Camp': { sky: '#4aad3a', ground: '#1a4a22', accent: '#8fd46a' },
  'Sundae Strip': { sky: '#ff9ec8', ground: '#8a3060', accent: '#ffb0d0' },
  "Beans' Battleground": { sky: '#6aad3a', ground: '#1a3a10', accent: '#c8e060' },
  'Phil Pier': { sky: '#5ab0d8', ground: '#1a3a58', accent: '#ffe08a' },
  "Dave's Dungeon": { sky: '#5a3a28', ground: '#120808', accent: '#e07040' },
  "Kathie's Kitchen": { sky: '#f0c070', ground: '#5a2810', accent: '#ff8a4a' },
  'Jacobson Junction': { sky: '#7a8a9a', ground: '#2a3038', accent: '#f5d76e' },
  "Gretchin's Grill": { sky: '#c060c8', ground: '#3a1040', accent: '#e8a0ff' },
  "Ricky's Diner": { sky: '#e8a040', ground: '#3a2010', accent: '#ffd070' },
  'Scotts Mansion': { sky: '#c8d8e8', ground: '#2a3848', accent: '#f0e8c8' },
  "Jeremy's Junkyard": { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
  Clucktown: { sky: '#f0d060', ground: '#5a3010', accent: '#ff6060' },
  "Todd's Tavern": { sky: '#8a4a28', ground: '#201008', accent: '#e8b86a' },
  'Pete Palace': { sky: '#6a4a30', ground: '#140a08', accent: '#e8b86a' },
  'Phil Peak': { sky: '#6ec8ff', ground: '#5a3a10', accent: '#ffe08a' },
  // Legacy aliases (saved profiles / old road labels)
  "Pete's Pit": { sky: '#6a4a30', ground: '#140a08', accent: '#e8b86a' },
  'Jeremy Land': { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
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
  // Scales across the trophy road (~0 → Phil Peak 5000).
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
