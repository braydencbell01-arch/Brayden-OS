import { CHARACTERS, type Rarity } from './characters'
import { cardCanEvolve } from './evolutions'
import {
  BANNER_CATALOG,
  FRAME_CATALOG,
  TITLE_CATALOG,
  TOWER_SKIN_CATALOG,
  frameRarity,
  type CosmeticDrop,
  type TitleRarity,
} from './cosmeticsCatalog'
import { EMOTE_CATALOG, emoteRarity } from './emoteCatalog'

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
  { trophies: 0, arena: 'Training Camp', label: 'Journey begins', gold: 50 },
  { trophies: 20, arena: 'Training Camp', label: 'x1 Dog Hut', unlockCard: 'dogHut', gold: 40 },
  { trophies: 40, arena: 'Training Camp', label: 'x1 Tristan', unlockCard: 'tristan', gold: 50 },
  { trophies: 60, arena: 'Training Camp', label: 'x1 Pete', unlockCard: 'dan', gold: 40 },
  { trophies: 80, arena: 'Training Camp', label: 'x1 Chuck', unlockCard: 'pete', gold: 70 },
  { trophies: 90, arena: 'Training Camp', label: "x1 George's Diner", unlockCard: 'georgesDiner', gold: 45 },
  // Sundae Strip 100–300
  { trophies: 100, arena: 'Sundae Strip', label: 'x1 D', unlockCard: 'dave', gold: 80 },
  { trophies: 120, arena: 'Sundae Strip', label: 'x1 Coach Graf', unlockCard: 'coachGraf', gold: 55 },
  { trophies: 160, arena: 'Sundae Strip', label: 'x1 Bocce Balls', unlockCard: 'bocceBalls', gold: 50 },
  { trophies: 180, arena: 'Sundae Strip', label: 'x1 Gretchin', unlockCard: 'gretchin', gold: 70 },
  { trophies: 220, arena: 'Sundae Strip', label: 'x8 Lynne', cardCopies: { charId: 'lynne', copies: 8 }, gold: 100 },
  { trophies: 260, arena: 'Sundae Strip', label: 'x1 Berry', unlockCard: 'berry', gold: 90 },
  { trophies: 280, arena: 'Sundae Strip', label: 'x1 Susan', unlockCard: 'susan', gold: 85 },
  // Beans' Battleground 300–500
  { trophies: 300, arena: "Beans' Battleground", label: 'x5 Beans', cardCopies: { charId: 'beans', copies: 5 }, gold: 50 },
  { trophies: 340, arena: "Beans' Battleground", label: 'x1 Phil Spirit', unlockCard: 'philSpirit', gold: 80 },
  { trophies: 380, arena: "Beans' Battleground", label: 'x1 Pete Spirit', unlockCard: 'peteSpirit', gold: 80 },
  { trophies: 420, arena: "Beans' Battleground", label: 'x4 Kathie', cardCopies: { charId: 'kathie', copies: 4 }, gold: 75, unlockEmote: 'heart' },
  { trophies: 460, arena: "Beans' Battleground", label: 'Rare Chest', chest: 'rare' },
  // Phil Pier 500–700
  { trophies: 500, arena: 'Phil Pier', label: 'Epic Chest', chest: 'epic', gold: 40 },
  { trophies: 540, arena: 'Phil Pier', label: 'x1 Baseball Huck', unlockCard: 'footballHuck', gold: 50 },
  { trophies: 580, arena: 'Phil Pier', label: 'x1 Hamburger Chicken', unlockCard: 'hamburgerChicken', gold: 80 },
  { trophies: 620, arena: 'Phil Pier', label: 'x1 Chicken Army', unlockCard: 'chickenArmy', gold: 70 },
  { trophies: 640, arena: 'Phil Pier', label: 'x1 Stalwart', unlockCard: 'stalwart', gold: 70 },
  { trophies: 660, arena: 'Phil Pier', label: 'x1 Chicken Barrel', unlockCard: 'chickenBarrel', gold: 80 },
  // Dave's Dungeon 700–1000
  { trophies: 700, arena: "Dave's Dungeon", label: 'x1 Scott', unlockCard: 'scott', gold: 60 },
  { trophies: 730, arena: "Dave's Dungeon", label: 'x1 Tentacool', unlockCard: 'tentacool', gold: 70 },
  { trophies: 760, arena: "Dave's Dungeon", label: 'x1 Big Mable', unlockCard: 'bigMable', gold: 80, unlockEmote: 'party' },
  { trophies: 820, arena: "Dave's Dungeon", label: "x1 Phil's Car", unlockCard: 'philsCar', gold: 90 },
  { trophies: 850, arena: "Dave's Dungeon", label: "x1 Phil's Rocket", unlockCard: 'philsRocket', gold: 70 },
  { trophies: 880, arena: "Dave's Dungeon", label: 'x1 Evil Phil', unlockCard: 'evilPhil', gold: 100 },
  { trophies: 940, arena: "Dave's Dungeon", label: 'x1 Phil', unlockCard: 'phil', gold: 110 },
  // Kathie's Kitchen 1000–1300
  { trophies: 980, arena: "Katherine's Kitchen", label: 'x1 Cool Whip', unlockCard: 'coolWhip', gold: 90 },
  { trophies: 1000, arena: "Katherine's Kitchen", label: 'Legendary Chest', chest: 'legendary', gold: 75, unlockEmote: 'cool' },
  { trophies: 1060, arena: "Katherine's Kitchen", label: 'x6 Jacobson', cardCopies: { charId: 'mike', copies: 6 }, gold: 150 },
  { trophies: 1080, arena: "Katherine's Kitchen", label: "x1 Ol' Reliable", unlockCard: 'olReliable', gold: 90 },
  { trophies: 1120, arena: "Katherine's Kitchen", label: 'Rare Chest', chest: 'rare', gold: 70 },
  { trophies: 1180, arena: "Katherine's Kitchen", label: 'x5 Baseball Huck', cardCopies: { charId: 'footballHuck', copies: 5 }, gold: 70 },
  { trophies: 1240, arena: "Katherine's Kitchen", label: "x4 Steve's Diner", cardCopies: { charId: 'stevesDiner', copies: 4 }, gold: 65 },
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
  { trophies: 1840, arena: "Gretchin's Grill", label: 'x12 Jacobson', cardCopies: { charId: 'mike', copies: 12 } },
  { trophies: 1920, arena: "Gretchin's Grill", label: 'Gold pouch', gold: 100 },
  // Ricky's Diner 2000–2400
  { trophies: 2000, arena: "Ricky's Diner", label: 'x4 Chuck', cardCopies: { charId: 'pete', copies: 4 }, gold: 125 },
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
  {
    trophies: 3200,
    arena: "Jeremy's Junkyard",
    label: 'x1 Jeremy Spirit',
    unlockCard: 'jeremySpirit',
    cardCopies: { charId: 'jeremySpirit', copies: 8 },
    gold: 150,
  },
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
  // Peter Palace 4300–4900
  { trophies: 4300, arena: 'Peter Palace', label: 'Legendary Chest', chest: 'legendary', gold: 250 },
  { trophies: 4450, arena: 'Peter Palace', label: 'Epic Chest', chest: 'epic', gold: 220 },
  { trophies: 4600, arena: 'Peter Palace', label: 'Rare Chest', chest: 'rare', gold: 200 },
  { trophies: 4750, arena: 'Peter Palace', label: 'x2 Pete', cardCopies: { charId: 'dan', copies: 2 }, gold: 200 },
  { trophies: 4880, arena: 'Peter Palace', label: 'x10 Todd', cardCopies: { charId: 'todd', copies: 10 } },
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
  "Katherine's Kitchen": { sky: '#f0c070', ground: '#5a2810', accent: '#ff8a4a' },
  'Jacobson Junction': { sky: '#7a8a9a', ground: '#2a3038', accent: '#f5d76e' },
  "Gretchin's Grill": { sky: '#c060c8', ground: '#3a1040', accent: '#e8a0ff' },
  "Ricky's Diner": { sky: '#e8a040', ground: '#3a2010', accent: '#ffd070' },
  'Scotts Mansion': { sky: '#c8d8e8', ground: '#2a3848', accent: '#f0e8c8' },
  "Jeremy's Junkyard": { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
  Clucktown: { sky: '#f0d060', ground: '#5a3010', accent: '#ff6060' },
  "Todd's Tavern": { sky: '#8a4a28', ground: '#201008', accent: '#e8b86a' },
  'Peter Palace': { sky: '#6a4a30', ground: '#140a08', accent: '#e8b86a' },
  'Phil Peak': { sky: '#6ec8ff', ground: '#5a3a10', accent: '#ffe08a' },
  // Legacy aliases (saved profiles / old road labels)
  "Kathie's Kitchen": { sky: '#f0c070', ground: '#5a2810', accent: '#ff8a4a' },
  'Pete Palace': { sky: '#6a4a30', ground: '#140a08', accent: '#e8b86a' },
  'Jeremy Land': { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
  'Phil Plaza': { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
  'Goblin Boot': { sky: '#4aad3a', ground: '#1a4a22', accent: '#8fd46a' },
  'Bone Bridge': { sky: '#6a4a30', ground: '#140a08', accent: '#e8b86a' },
  'Royal Yard': { sky: '#1a2838', ground: '#050810', accent: '#5a9ad0' },
}

/** Exactly 12 starter cards — rest unlock via trophy road / chests. */
export const STARTER_UNLOCKS = [
  'kathie',
  'todd',
  'mike',
  'lynne',
  'stevesDiner',
  'beans',
  'iceCream',
  'bobbySpecial',
  'jeremy',
  'shay',
  'finley',
  'chicken',
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
  // Card levels keep scaling with trophies so high-arena bots stay durable.
  return Math.max(1, Math.min(MAX_CARD_LEVEL, 1 + Math.floor(trophies / 400)))
}

/**
 * Decision-skill 0..1 — rises from 0→1000 trophies, then flat to 5000.
 * Floor is already strong (even Training Camp bots play well).
 */
export function botSkillForTrophies(trophies: number): number {
  const t = Math.max(0, Math.min(1000, trophies))
  return 0.62 + (t / 1000) * 0.38
}

/** AI cadence / elixir pressure — harder through 1000 trophies, then holds. */
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
  /** Decision quality 0..1 (placement / card choice) */
  skill: number
} {
  const raw = Math.max(0, trophies)
  // Cadence + elixir plateau at 1000; skill uses the same ramp.
  const t = Math.min(1000, raw)
  const level = botLevelForTrophies(raw)
  const skill = botSkillForTrophies(raw)
  // 0 trophies → ~1.55–2.45s (already brisk); 1000 → ~0.85–1.35s; flat after
  const deployMinMs = Math.max(850, Math.round(1550 - t * 0.7))
  const deployMaxMs = Math.max(deployMinMs + 350, Math.round(2450 - t * 1.1))
  // Mild elixir edge only (skill does the heavy lifting): 1.04 → 1.16 by 1000
  const elixirMult = 1.04 + (t / 1000) * 0.12
  const startElixir = t >= 700 ? 5 : 4
  return { level, deployMinMs, deployMaxMs, elixirMult, startElixir, skill }
}

export function arenaProgressInCurrent(trophies: number): number {
  const starts: { arena: string; start: number }[] = []
  for (const step of TROPHY_ROAD) {
    const last = starts[starts.length - 1]
    if (!last || last.arena !== step.arena) starts.push({ arena: step.arena, start: step.trophies })
  }
  let i = 0
  for (let k = 0; k < starts.length; k++) {
    if (trophies >= starts[k]!.start) i = k
  }
  const start = starts[i]!.start
  const end = starts[i + 1]?.start ?? start + 500
  if (end <= start) return 1
  return Math.max(0, Math.min(1, (trophies - start) / (end - start)))
}

export function botNameForTrophies(trophies: number): string {
  return randomBotName(trophies)
}

const BOT_NAMES = [
  'Sundae Scout',
  'Pancake Bandit',
  'Clucktown Kid',
  'Diner Ghost',
  'Pete Patrol',
  'Jeremy Agent',
  'Peak Phantom',
  'Gym Rat Bot',
  'Berry Bruiser',
  'Chuck Chuck',
  'Graf Grunt',
  'Lynne Lance',
  'Todd Tornado',
  'Beans Brigade',
  'Mable Drift',
  'Huck Hooligan',
  'Phil Fan 01',
  'Phil Fan 99',
  'Night Fryer',
  'River Rascal',
  'Bridge Brawler',
  'Arena Ant',
  'Trophy Trout',
  'King of Ketchup',
  'Mustard Mike',
  'Whippoorwill',
  'Sundae Slugger',
  'Ice Cream Imp',
  'Rocket Rookie',
  'Car Park Kid',
  'Hut Hunter',
  'Spirit Sprite',
  'Lane Lurker',
  'Crown Chaser',
  'Gold Goblin',
  'Elixir Elf',
  'Cycle Carl',
  'Beatdown Bea',
  'Control Cole',
  'Zap Zoe',
  'Hog Rider Hank',
  'Mirror Marv',
  'Log Larry',
  'Fireball Fran',
  'Ice Golem Ike',
  'Goblin Gail',
  'Miner Mo',
  'Princess Pip',
  'Wizard Wes',
  'Knight Nate',
  'Valkyrie Vi',
  'Giant Gus',
  'Sparky Sal',
  'Ram Rider Rio',
  'Fisherman Finn',
  'Mother Witch Mel',
  'Bowler Bo',
  'Executioner Ed',
  'Cannon Cart Cal',
  'Royal Ghost Rex',
  'Bandit Bea',
  'Magic Archer Max',
  'Night Witch Nyx',
  'Lava Hound Lou',
  'Balloon Bill',
  'Miner Mel',
  'Graveyard Gia',
  'Bait Betty',
]

export function randomBotName(seed = Date.now()): string {
  const i = Math.abs(Math.floor(seed * 17 + 31)) % BOT_NAMES.length
  return BOT_NAMES[i]!
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
  if (rarity === 'uncommon') return 6
  return 8
}

function goldPriceForRarity(rarity: Rarity, seed: number): number {
  const base =
    rarity === 'legendary'
      ? 1200
      : rarity === 'epic'
        ? 500
        : rarity === 'rare'
          ? 200
          : rarity === 'uncommon'
            ? 120
            : 80
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
      gemChar.rarity === 'legendary' ? 40 : gemChar.rarity === 'epic' ? 20 : gemChar.rarity === 'rare' ? 10 : gemChar.rarity === 'uncommon' ? 8 : 6,
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

export function rollChestLoot(rarity: ChestRarity): {
  gold: number
  gems: number
  cards: { charId: string; copies: number }[]
  evoShards: { charId: string; shards: number }[]
} {
  const pool = (r: Rarity) => CHARACTERS.filter((c) => c.rarity === r)
  const evoPool = CHARACTERS.filter((c) => cardCanEvolve(c.id))
  const pick = (list: typeof CHARACTERS) =>
    list[Math.floor(Math.random() * list.length)] ?? CHARACTERS[0]!
  const randInt = (lo: number, hi: number) =>
    lo + Math.floor(Math.random() * (hi - lo + 1))
  const chance = (p: number) => Math.random() < p

  if (rarity === 'common') {
    return {
      gold: chance(0.7) ? randInt(40, 100) : 0,
      gems: chance(0.6) ? randInt(4, 10) : 0,
      cards: [
        { charId: pick(pool('common')).id, copies: randInt(1, 3) },
        ...(chance(0.55)
          ? [{ charId: pick(pool('uncommon')).id, copies: randInt(1, 2) }]
          : []),
        ...(chance(0.45) ? [{ charId: pick(pool('rare')).id, copies: 1 }] : []),
      ],
      evoShards: [],
    }
  }

  if (rarity === 'rare') {
    return {
      gold: chance(0.8) ? randInt(80, 200) : 0,
      gems: chance(0.5) ? randInt(8, 20) : 0,
      cards: [
        ...(chance(0.85) ? [{ charId: pick(pool('common')).id, copies: randInt(1, 5) }] : []),
        { charId: pick(pool('rare')).id, copies: randInt(1, 3) },
        ...(chance(0.6) ? [{ charId: pick(pool('epic')).id, copies: 1 }] : []),
      ],
      evoShards: chance(0.25)
        ? [{ charId: pick(evoPool).id, shards: 1 }]
        : [],
    }
  }

  if (rarity === 'epic') {
    return {
      gold: chance(0.9) ? randInt(160, 400) : 0,
      gems: chance(0.75) ? randInt(16, 40) : 0,
      cards: [
        ...(chance(0.65) ? [{ charId: pick(pool('common')).id, copies: randInt(1, 8) }] : []),
        ...(chance(0.85) ? [{ charId: pick(pool('rare')).id, copies: randInt(1, 5) }] : []),
        { charId: pick(pool('epic')).id, copies: randInt(1, 3) },
        ...(chance(0.25) ? [{ charId: pick(pool('legendary')).id, copies: 1 }] : []),
      ],
      evoShards: chance(0.6)
        ? [{ charId: pick(evoPool).id, shards: randInt(1, 3) }]
        : [],
    }
  }

  // Legendary
  return {
    gold: randInt(320, 800),
    gems: randInt(32, 80),
    cards: [
      ...(chance(0.5) ? [{ charId: pick(pool('common')).id, copies: randInt(1, 15) }] : []),
      ...(chance(0.65) ? [{ charId: pick(pool('rare')).id, copies: randInt(1, 8) }] : []),
      ...(chance(0.85) ? [{ charId: pick(pool('epic')).id, copies: randInt(1, 5) }] : []),
      { charId: pick(pool('legendary')).id, copies: randInt(1, 3) },
    ],
    // Count not specified — scale above epic (1–3) as 1–5.
    evoShards: [{ charId: pick(evoPool).id, shards: randInt(1, 5) }],
  }
}

function pickRarityForChest(chest: ChestRarity): TitleRarity | null {
  const dropChance =
    chest === 'legendary' ? 0.4 : chest === 'epic' ? 0.28 : chest === 'rare' ? 0.18 : 0.12
  if (Math.random() > dropChance) return null
  const r = Math.random()
  if (chest === 'common') {
    if (r < 0.8) return 'common'
    if (r < 0.98) return 'rare'
    return 'epic'
  }
  if (chest === 'rare') {
    if (r < 0.45) return 'common'
    if (r < 0.85) return 'rare'
    if (r < 0.98) return 'epic'
    return 'legendary'
  }
  if (chest === 'epic') {
    if (r < 0.2) return 'common'
    if (r < 0.55) return 'rare'
    if (r < 0.9) return 'epic'
    return 'legendary'
  }
  if (r < 0.1) return 'rare'
  if (r < 0.45) return 'epic'
  return 'legendary'
}

export function rollChestCosmetic(
  chest: ChestRarity,
  owned: { titles: string[]; frames: string[]; emotes: string[]; skins: string[]; banners: string[] },
): CosmeticDrop | null {
  const rarity = pickRarityForChest(chest)
  if (!rarity) return null
  const pool: CosmeticDrop[] = []
  for (const t of TITLE_CATALOG) {
    if (t.priceGems <= 0 || t.rarity !== rarity || owned.titles.includes(t.id)) continue
    pool.push({ kind: 'title', id: t.id, label: t.label, rarity: t.rarity })
  }
  for (const f of FRAME_CATALOG) {
    if (f.priceGems <= 0 || frameRarity(f) !== rarity || owned.frames.includes(f.id)) continue
    pool.push({ kind: 'frame', id: f.id, label: f.label, rarity: frameRarity(f) })
  }
  for (const e of EMOTE_CATALOG) {
    if (e.priceGems <= 0 || emoteRarity(e) !== rarity || owned.emotes.includes(e.id)) continue
    pool.push({ kind: 'emote', id: e.id, label: e.label, rarity: emoteRarity(e) })
  }
  for (const s of TOWER_SKIN_CATALOG) {
    if (s.priceGems <= 0 || s.rarity !== rarity || owned.skins.includes(s.id)) continue
    pool.push({ kind: 'towerSkin', id: s.id, label: s.label, rarity: s.rarity })
  }
  for (const b of BANNER_CATALOG) {
    if (b.priceGems <= 0 || b.rarity !== rarity || owned.banners.includes(b.id)) continue
    pool.push({ kind: 'banner', id: b.id, label: b.label, rarity: b.rarity })
  }
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

/** Evolution shards needed to unlock a card's evolution. */
export const EVO_SHARDS_NEEDED = 5
/** Evolved form: +30% HP, damage, and move speed. */
export const EVO_STAT_MULT = 1.3

export function evoStatMult(evolved: boolean): number {
  return evolved ? EVO_STAT_MULT : 1
}
