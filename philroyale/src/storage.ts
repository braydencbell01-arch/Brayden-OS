import { CHARACTERS, DEFAULT_DECK, DECK_SIZE } from './characters'
import {
  CLUB_CHEST_GOAL,
  CLUB_MAX_MEMBERS,
  DONATE_LIMIT_DAY,
  SEASON_FREE_TRACK,
  clubChestTier,
  currentSeasonId,
  generateClubMembers,
  kingLevelFromXp,
  randomDonateCharId,
  seedClubChat,
  weekKey,
  type ClubChatMsg,
  type ClubDonateRequest,
  type RichClub,
} from './clubMeta'
import {
  CHEST_META,
  MAX_CARD_LEVEL,
  STARTER_UNLOCKS,
  TROPHY_ROAD,
  arenaForTrophies,
  dailyShopOffers,
  rollChestLoot,
  type ChestRarity,
  type ShopOffer,
} from './progression'

const DECK_KEY = 'philroyale.deck.v2'
const FRIENDS_KEY = 'philroyale.friends'
const MY_CLUB_KEY = 'philroyale.myClub'
const MY_CLUB_META_KEY = 'philroyale.myClubMeta'
const PLAYER_NAME_KEY = 'philroyale.playerName'
const BATTLE_CHALLENGE_KEY = 'philroyale.battleChallenge'
const BATTLE_INCOMING_KEY = 'philroyale.battleIncoming'
const BATTLE_ACCEPTED_KEY = 'philroyale.battleAccepted'

export const BATTLE_CHANNEL_NAME = 'philroyale-battle'

export type BattleChallenge = {
  challengeId: string
  fromName: string
  toName: string
  createdAt: string
}

export type BattleAccepted = {
  challengeId: string
  acceptedBy: string
  acceptedAt: string
}

export type BattleChannelMessage =
  | { type: 'challenge'; challenge: BattleChallenge }
  | { type: 'accept'; challengeId: string; acceptedBy: string }
  | { type: 'decline'; challengeId: string }

export type Friend = {
  id: string
  name: string
  /** When they joined via your invite link */
  addedAt: string
}

/** Legacy shape — prefer RichClub via loadRichClub(). */
export type Club = {
  id: string
  name: string
  tag: string
  description: string
  /** Invite code shared over text */
  code: string
}

export type { RichClub, ClubChatMsg, ClubDonateRequest }

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadDeck(): string[] {
  const ids = readJson<string[]>(DECK_KEY, DEFAULT_DECK)
  const unlocked = new Set(loadCardProgress().unlocked)
  const valid = ids.filter(
    (id) => CHARACTERS.some((c) => c.id === id) && unlocked.has(id),
  )
  if (valid.length === DECK_SIZE) return valid
  const fallback = DEFAULT_DECK.filter((id) => unlocked.has(id))
  while (fallback.length < DECK_SIZE && STARTER_UNLOCKS.length) {
    fallback.push(STARTER_UNLOCKS[fallback.length % STARTER_UNLOCKS.length]!)
  }
  return fallback.slice(0, DECK_SIZE)
}

export function saveDeck(ids: string[]): void {
  localStorage.setItem(DECK_KEY, JSON.stringify(ids.slice(0, DECK_SIZE)))
}

export function loadFriends(): Friend[] {
  return readJson(FRIENDS_KEY, [])
}

export function saveFriends(friends: Friend[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
}

export function loadMyClub(): Club | null {
  return readJson<Club | null>(MY_CLUB_META_KEY, null)
}

export function saveMyClub(club: Club | null): void {
  if (!club) {
    localStorage.removeItem(MY_CLUB_META_KEY)
    localStorage.removeItem(MY_CLUB_KEY)
    return
  }
  localStorage.setItem(MY_CLUB_META_KEY, JSON.stringify(club))
  localStorage.setItem(MY_CLUB_KEY, club.code)
}

export function loadPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) || ''
}

export function savePlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name.trim())
}

export function siteOrigin(): string {
  if (typeof window === 'undefined') return 'https://braydencbell01-arch.github.io/Brayden-OS/philroyale/'
  const { origin, pathname } = window.location
  // Ensure we share the philroyale base, not a nested path
  const base = pathname.includes('/philroyale')
    ? `${origin}${pathname.split('/philroyale')[0]}/philroyale/`
    : `${origin}${pathname.endsWith('/') ? pathname : `${pathname}/`}`
  return base
}

export function clubInviteUrl(code: string): string {
  const u = new URL(siteOrigin())
  u.searchParams.set('club', code)
  return u.toString()
}

export function friendInviteUrl(fromName: string): string {
  const u = new URL(siteOrigin())
  u.searchParams.set('friend', fromName || 'PhilRoyale')
  return u.toString()
}

export function generateChallengeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function battleInviteUrl(
  fromName: string,
  toName: string,
  challengeId: string,
): string {
  const u = new URL(siteOrigin())
  u.searchParams.set('battleFrom', fromName || 'Player')
  u.searchParams.set('battleTo', toName || 'Friend')
  u.searchParams.set('challenge', challengeId)
  return u.toString()
}

export function parseBattleChallengeFromUrl(
  search = typeof window !== 'undefined' ? window.location.search : '',
): BattleChallenge | null {
  const params = new URLSearchParams(search)
  const fromName = params.get('battleFrom')?.trim()
  const toName = params.get('battleTo')?.trim()
  const challengeId = params.get('challenge')?.trim()
  if (!fromName || !toName || !challengeId) return null
  return {
    challengeId,
    fromName,
    toName,
    createdAt: new Date().toISOString(),
  }
}

export function loadOutgoingChallenge(): BattleChallenge | null {
  return readJson<BattleChallenge | null>(BATTLE_CHALLENGE_KEY, null)
}

export function saveOutgoingChallenge(challenge: BattleChallenge): void {
  localStorage.setItem(BATTLE_CHALLENGE_KEY, JSON.stringify(challenge))
}

export function clearOutgoingChallenge(): void {
  localStorage.removeItem(BATTLE_CHALLENGE_KEY)
}

export function loadIncomingChallenge(): BattleChallenge | null {
  return readJson<BattleChallenge | null>(BATTLE_INCOMING_KEY, null)
}

export function saveIncomingChallenge(challenge: BattleChallenge): void {
  localStorage.setItem(BATTLE_INCOMING_KEY, JSON.stringify(challenge))
}

export function clearIncomingChallenge(): void {
  localStorage.removeItem(BATTLE_INCOMING_KEY)
}

export function loadBattleAccepted(): BattleAccepted | null {
  return readJson<BattleAccepted | null>(BATTLE_ACCEPTED_KEY, null)
}

export function saveBattleAccepted(accepted: BattleAccepted): void {
  localStorage.setItem(BATTLE_ACCEPTED_KEY, JSON.stringify(accepted))
}

export function clearBattleAccepted(): void {
  localStorage.removeItem(BATTLE_ACCEPTED_KEY)
}

export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function isChallengeForMe(challenge: BattleChallenge): boolean {
  const me = loadPlayerName().trim()
  if (!me) return false
  return namesMatch(challenge.toName, me) && !namesMatch(challenge.fromName, me)
}

export function createBattleChallenge(toName: string): BattleChallenge {
  const challenge: BattleChallenge = {
    challengeId: generateChallengeId(),
    fromName: loadPlayerName().trim() || 'Player',
    toName: toName.trim(),
    createdAt: new Date().toISOString(),
  }
  saveOutgoingChallenge(challenge)
  return challenge
}

export function postBattleMessage(message: BattleChannelMessage): void {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const channel = new BroadcastChannel(BATTLE_CHANNEL_NAME)
    channel.postMessage(message)
    channel.close()
  } catch {
    /* ignore */
  }
}

export async function shareText(title: string, text: string, url?: string): Promise<void> {
  const body = url ? `${text}\n${url}` : text
  try {
    if (navigator.share) {
      await navigator.share({ title, text: body, url })
      return
    }
  } catch {
    /* user cancelled or share failed — fall through */
  }
  const sms = `sms:?&body=${encodeURIComponent(body)}`
  window.location.href = sms
}

/* ——— Home / progression (local) ——— */

const PROFILE_KEY = 'philroyale.profile.v2'
const CARD_PROGRESS_KEY = 'philroyale.cardProgress.v2'
const DAILY_KEY = 'philroyale.daily.v1'
const FRIEND_META_KEY = 'philroyale.friendMeta.v1'
const CHESTS_KEY = 'philroyale.chests.v1'
const ROAD_KEY = 'philroyale.trophyRoad.v1'
const SHOP_BOUGHT_KEY = 'philroyale.shopBought.v1'

export type PlayerProfile = {
  trophies: number
  gold: number
  gems: number
  wins: number
  losses: number
  draws: number
  winStreak: number
  bestWinStreak: number
  battlesPlayed: number
  /** Crown chest progress 0–10 */
  crownChest: number
  /** King tower XP */
  xp: number
  /** Daily donation remaining */
  donateLeft: number
  donateDay: string
}

export type CardProgress = {
  /** charId → level (1–10) */
  levels: Record<string, number>
  /** charId → owned copies */
  copies: Record<string, number>
  favorites: string[]
  unlocked: string[]
}

export type OwnedChest = {
  id: string
  rarity: ChestRarity
  /** When unlock started; null = waiting in slot */
  unlockingStartedAt: number | null
  /** Ready timestamp when unlocking */
  readyAt: number | null
}

export type TrophyRoadState = {
  claimed: number[]
}

export type DailyState = {
  /** YYYY-MM-DD local */
  day: string
  chestClaimed: boolean
  questId: 'win1' | 'play3' | 'deploy8'
  questProgress: number
  questTarget: number
  questClaimed: boolean
}

export type FriendMeta = {
  /** friend id → pinned */
  pinned: Record<string, boolean>
  /** friend id → last battle ISO */
  lastBattled: Record<string, string>
  /** friend id → note */
  notes: Record<string, string>
}

const DEFAULT_PROFILE: PlayerProfile = {
  trophies: 0,
  gold: 500,
  gems: 20,
  wins: 0,
  losses: 0,
  draws: 0,
  winStreak: 0,
  bestWinStreak: 0,
  battlesPlayed: 0,
  crownChest: 0,
  xp: 0,
  donateLeft: DONATE_LIMIT_DAY,
  donateDay: '',
}

const RICH_CLUB_KEY = 'philroyale.richClub.v1'
const SEASON_KEY = 'philroyale.season.v1'
const EVENTS_KEY = 'philroyale.events.v1'

export type SeasonState = {
  seasonId: string
  points: number
  claimed: number[]
}

export type EventsState = {
  day: string
  classicWins: number
  classicClaimed: boolean
  suddenWins: number
  suddenClaimed: boolean
  friendlyWins: number
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function arenaTitle(trophies: number): string {
  return arenaForTrophies(trophies)
}

export function loadProfile(): PlayerProfile {
  const legacy = readJson<Partial<PlayerProfile>>('philroyale.profile.v1', {})
  const cur = readJson<Partial<PlayerProfile>>(PROFILE_KEY, {})
  const p = { ...DEFAULT_PROFILE, ...legacy, ...cur }
  const day = todayKey()
  if (p.donateDay !== day) {
    p.donateDay = day
    p.donateLeft = DONATE_LIMIT_DAY
    saveProfile(p)
  }
  return p
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function recordMatchResult(
  result: 'victory' | 'defeat' | 'draw',
  opts?: { crowns?: number },
): PlayerProfile {
  const p = loadProfile()
  p.battlesPlayed += 1
  const crowns = Math.max(0, Math.min(3, opts?.crowns ?? (result === 'victory' ? 3 : result === 'draw' ? 1 : 0)))
  p.crownChest = Math.min(10, p.crownChest + crowns)
  if (result === 'victory') {
    p.wins += 1
    p.winStreak += 1
    p.bestWinStreak = Math.max(p.bestWinStreak, p.winStreak)
    p.trophies += 30
    p.gold += 50
    p.xp += 40
  } else if (result === 'defeat') {
    p.losses += 1
    p.winStreak = 0
    p.trophies = Math.max(0, p.trophies - 20)
    p.gold += 15
    p.xp += 15
  } else {
    p.draws += 1
    p.winStreak = 0
    p.trophies += 5
    p.gold += 25
    p.xp += 25
  }
  saveProfile(p)
  addSeasonPoints(result === 'victory' ? 25 : result === 'draw' ? 10 : 5)
  addClubCrowns(result === 'victory' ? 3 : result === 'draw' ? 1 : 0)
  if (result === 'victory') noteEventWin('ladder')

  const daily = loadDaily()
  if (!daily.questClaimed) {
    if (daily.questId === 'win1' && result === 'victory') {
      daily.questProgress = Math.min(daily.questTarget, daily.questProgress + 1)
    } else if (daily.questId === 'play3') {
      daily.questProgress = Math.min(daily.questTarget, daily.questProgress + 1)
    }
    saveDaily(daily)
  }

  // Auto-claim trophy road steps the player has reached
  claimAvailableRoadRewards()
  return loadProfile()
}

export function loadCardProgress(): CardProgress {
  const legacy = readJson<Partial<CardProgress>>('philroyale.cardProgress.v1', {})
  const raw = { ...legacy, ...readJson<Partial<CardProgress>>(CARD_PROGRESS_KEY, {}) }
  const levels: Record<string, number> = {}
  const copies: Record<string, number> = {}
  const unlockedSet = new Set([
    ...STARTER_UNLOCKS,
    ...(raw.unlocked ?? []),
    ...DEFAULT_DECK,
  ])
  // Apply any already-claimed road unlocks
  const road = loadTrophyRoad()
  for (const idx of road.claimed) {
    const step = TROPHY_ROAD[idx]
    if (step?.unlockCard) unlockedSet.add(step.unlockCard)
  }
  for (const c of CHARACTERS) {
    const level = Math.max(1, Math.min(MAX_CARD_LEVEL, raw.levels?.[c.id] ?? 1))
    levels[c.id] = level
    const savedCopies = raw.copies?.[c.id]
    const ownedFromSaves = savedCopies != null && savedCopies > 0
    if (ownedFromSaves) unlockedSet.add(c.id)
    const unlocked = unlockedSet.has(c.id)
    let count = savedCopies ?? (unlocked ? startingCopiesFor(c.rarity) : 0)
    // Unstuck: unlocked Lv1 cards always have enough copies for the first upgrade.
    if (unlocked && level === 1) {
      count = Math.max(count, startingCopiesFor(c.rarity))
    }
    copies[c.id] = Math.max(0, count)
  }
  return {
    levels,
    copies,
    favorites: (raw.favorites ?? []).filter((id) => CHARACTERS.some((c) => c.id === id)),
    unlocked: [...unlockedSet],
  }
}

export function saveCardProgress(progress: CardProgress): void {
  localStorage.setItem(CARD_PROGRESS_KEY, JSON.stringify(progress))
}

export function isCardUnlocked(charId: string): boolean {
  return loadCardProgress().unlocked.includes(charId)
}

export function copiesToUpgrade(level: number, rarity: string): number {
  // Playable CR-style curve — first upgrade is reachable with starter copies.
  const base = rarity === 'legendary' ? 1 : rarity === 'epic' ? 2 : rarity === 'rare' ? 2 : 2
  const step = rarity === 'legendary' || rarity === 'epic' ? 1 : 2
  return base + (level - 1) * step
}

export function goldToUpgrade(level: number): number {
  return 40 + (level - 1) * 30
}

export function startingCopiesFor(rarity: string): number {
  if (rarity === 'legendary') return 2
  if (rarity === 'epic') return 3
  if (rarity === 'rare') return 4
  return 5
}

export function tryUpgradeCard(charId: string): { ok: boolean; message: string; progress: CardProgress } {
  const char = CHARACTERS.find((c) => c.id === charId)
  const progress = loadCardProgress()
  if (!char) return { ok: false, message: 'Unknown card', progress }
  const have = progress.copies[charId] ?? 0
  // Owning copies counts as unlocked for upgrades (chests/shop may have granted them).
  if (!progress.unlocked.includes(charId)) {
    if (have <= 0) {
      return { ok: false, message: 'Card locked — unlock on Trophy Road', progress }
    }
    progress.unlocked.push(charId)
  }
  const level = progress.levels[charId] ?? 1
  if (level >= MAX_CARD_LEVEL) return { ok: false, message: 'Max level 10', progress }
  const need = copiesToUpgrade(level, char.rarity)
  const cost = goldToUpgrade(level)
  const profile = loadProfile()
  if (have < need) {
    return {
      ok: false,
      message: `Need ${need} copies (have ${have}) — buy more in Shop or open chests`,
      progress,
    }
  }
  if (profile.gold < cost) {
    return { ok: false, message: `Need ${cost} gold (have ${profile.gold})`, progress }
  }
  progress.copies[charId] = have - need
  progress.levels[charId] = level + 1
  profile.gold -= cost
  saveCardProgress(progress)
  saveProfile(profile)
  return {
    ok: true,
    message: `${char.name} → Lv ${level + 1} (+5% HP & dmg)`,
    progress: loadCardProgress(),
  }
}

function pickQuest(day: string): DailyState['questId'] {
  const n = day.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
  return (['win1', 'play3', 'deploy8'] as const)[n % 3]!
}

export function loadDaily(): DailyState {
  const day = todayKey()
  const raw = readJson<Partial<DailyState> | null>(DAILY_KEY, null)
  if (!raw || raw.day !== day) {
    const questId = pickQuest(day)
    const fresh: DailyState = {
      day,
      chestClaimed: false,
      questId,
      questProgress: 0,
      questTarget: questId === 'play3' ? 3 : questId === 'deploy8' ? 8 : 1,
      questClaimed: false,
    }
    saveDaily(fresh)
    return fresh
  }
  return {
    day,
    chestClaimed: !!raw.chestClaimed,
    questId: raw.questId ?? 'win1',
    questProgress: raw.questProgress ?? 0,
    questTarget: raw.questTarget ?? 1,
    questClaimed: !!raw.questClaimed,
  }
}

export function saveDaily(daily: DailyState): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify(daily))
}

export function claimDailyChest(): { ok: boolean; gold: number; message: string } {
  const daily = loadDaily()
  if (daily.chestClaimed) return { ok: false, gold: 0, message: 'Already claimed today' }
  const added = addChest('common')
  if (!added.ok) return { ok: false, gold: 0, message: added.message }
  daily.chestClaimed = true
  saveDaily(daily)
  return { ok: true, gold: 0, message: 'Free Common Chest added — tap a slot to unlock' }
}

export function questLabel(id: DailyState['questId']): string {
  if (id === 'win1') return 'Win 1 battle'
  if (id === 'play3') return 'Play 3 battles'
  return 'Deploy 8 cards in battle'
}

export function claimDailyQuest(): { ok: boolean; gold: number; message: string } {
  const daily = loadDaily()
  if (daily.questClaimed) return { ok: false, gold: 0, message: 'Quest already claimed' }
  if (daily.questProgress < daily.questTarget) {
    return { ok: false, gold: 0, message: 'Quest not finished' }
  }
  const gold = 120
  const profile = loadProfile()
  profile.gold += gold
  saveProfile(profile)
  daily.questClaimed = true
  saveDaily(daily)
  return { ok: true, gold, message: `Quest complete · +${gold} gold` }
}

export function noteCardDeployed(count = 1): void {
  const daily = loadDaily()
  if (daily.questClaimed || daily.questId !== 'deploy8') return
  daily.questProgress = Math.min(daily.questTarget, daily.questProgress + count)
  saveDaily(daily)
}

export function loadFriendMeta(): FriendMeta {
  const raw = readJson<Partial<FriendMeta>>(FRIEND_META_KEY, {})
  return {
    pinned: raw.pinned ?? {},
    lastBattled: raw.lastBattled ?? {},
    notes: raw.notes ?? {},
  }
}

export function saveFriendMeta(meta: FriendMeta): void {
  localStorage.setItem(FRIEND_META_KEY, JSON.stringify(meta))
}

export function markFriendBattled(friendId: string): void {
  const meta = loadFriendMeta()
  meta.lastBattled[friendId] = new Date().toISOString()
  saveFriendMeta(meta)
}

/* ——— Chests ——— */

const MAX_CHEST_SLOTS = 4

export function loadChests(): OwnedChest[] {
  return readJson<OwnedChest[]>(CHESTS_KEY, [])
}

export function saveChests(chests: OwnedChest[]): void {
  localStorage.setItem(CHESTS_KEY, JSON.stringify(chests.slice(0, MAX_CHEST_SLOTS)))
}

export function addChest(rarity: ChestRarity): { ok: boolean; message: string } {
  const chests = loadChests()
  if (chests.length >= MAX_CHEST_SLOTS) {
    return { ok: false, message: 'Chest slots full (4). Open one first.' }
  }
  chests.push({
    id: `chest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rarity,
    unlockingStartedAt: null,
    readyAt: null,
  })
  saveChests(chests)
  return { ok: true, message: `${CHEST_META[rarity].label} added` }
}

export function startChestUnlock(chestId: string): { ok: boolean; message: string } {
  const chests = loadChests()
  if (chests.some((c) => c.unlockingStartedAt != null && (c.readyAt ?? 0) > Date.now())) {
    return { ok: false, message: 'Already unlocking a chest' }
  }
  const chest = chests.find((c) => c.id === chestId)
  if (!chest) return { ok: false, message: 'Chest not found' }
  if (chest.readyAt != null && chest.readyAt <= Date.now()) {
    return { ok: false, message: 'Chest ready to open' }
  }
  const now = Date.now()
  chest.unlockingStartedAt = now
  chest.readyAt = now + CHEST_META[chest.rarity].unlockSec * 1000
  saveChests(chests)
  return { ok: true, message: `Unlocking ${CHEST_META[chest.rarity].label}` }
}

export function openChestNow(
  chestId: string,
  payGold: boolean,
): {
  ok: boolean
  message: string
  rarity?: ChestRarity
  gold?: number
  cards?: { charId: string; copies: number }[]
} {
  const chests = loadChests()
  const idx = chests.findIndex((c) => c.id === chestId)
  if (idx < 0) return { ok: false, message: 'Chest not found' }
  const chest = chests[idx]!
  const ready = chest.readyAt != null && chest.readyAt <= Date.now()
  const profile = loadProfile()
  if (!ready) {
    if (!payGold) return { ok: false, message: 'Still unlocking' }
    const cost = CHEST_META[chest.rarity].openNowGold
    if (profile.gold < cost) return { ok: false, message: `Need ${cost} gold` }
    profile.gold -= cost
  }
  const loot = rollChestLoot(chest.rarity)
  profile.gold += loot.gold
  const progress = loadCardProgress()
  for (const drop of loot.cards) {
    progress.copies[drop.charId] = (progress.copies[drop.charId] ?? 0) + drop.copies
    if (!progress.unlocked.includes(drop.charId)) {
      progress.unlocked.push(drop.charId)
    }
  }
  saveCardProgress(progress)
  saveProfile(profile)
  const rarity = chest.rarity
  chests.splice(idx, 1)
  saveChests(chests)
  const names = loot.cards
    .map((d) => {
      const c = CHARACTERS.find((x) => x.id === d.charId)
      return `${d.copies}× ${c?.name ?? d.charId}`
    })
    .join(', ')
  return {
    ok: true,
    message: `+${loot.gold} gold · ${names}`,
    rarity,
    gold: loot.gold,
    cards: loot.cards,
  }
}

export function claimCrownChest(): { ok: boolean; message: string } {
  const p = loadProfile()
  if (p.crownChest < 10) return { ok: false, message: `Need 10 crowns (${p.crownChest}/10)` }
  const added = addChest('rare')
  if (!added.ok) return added
  p.crownChest = 0
  saveProfile(p)
  return { ok: true, message: 'Crown Chest claimed — Rare Chest added!' }
}

/* ——— Trophy road ——— */

export function loadTrophyRoad(): TrophyRoadState {
  return readJson<TrophyRoadState>(ROAD_KEY, { claimed: [] })
}

export function saveTrophyRoad(state: TrophyRoadState): void {
  localStorage.setItem(ROAD_KEY, JSON.stringify(state))
}

function grantRoadStep(
  step: (typeof TROPHY_ROAD)[number],
  profile: PlayerProfile,
  progress: CardProgress,
): string[] {
  const messages: string[] = []
  if (step.gold) {
    profile.gold += step.gold
    messages.push(`+${step.gold} gold`)
  }
  if (step.gems) {
    profile.gems += step.gems
    messages.push(`+${step.gems} gems`)
  }
  if (step.chest) {
    const r = addChest(step.chest)
    if (r.ok) messages.push(CHEST_META[step.chest].label)
    else messages.push(`${CHEST_META[step.chest].label} (slots full)`)
  }
  if (step.unlockCard && !progress.unlocked.includes(step.unlockCard)) {
    progress.unlocked.push(step.unlockCard)
    const char = CHARACTERS.find((c) => c.id === step.unlockCard)
    if (char && (progress.copies[step.unlockCard] ?? 0) <= 0) {
      progress.copies[step.unlockCard] = startingCopiesFor(char.rarity)
    }
    messages.push(`Unlocked ${char?.name ?? step.unlockCard}`)
  }
  return messages
}

/** Claim one trophy-road node (must be reached and unclaimed). */
export function claimRoadStep(idx: number): { ok: boolean; message: string } {
  const step = TROPHY_ROAD[idx]
  if (!step) return { ok: false, message: 'Invalid reward' }
  const profile = loadProfile()
  const state = loadTrophyRoad()
  if (profile.trophies < step.trophies) return { ok: false, message: 'Not enough trophies' }
  if (state.claimed.includes(idx)) return { ok: false, message: 'Already claimed' }
  const progress = loadCardProgress()
  state.claimed.push(idx)
  const messages = grantRoadStep(step, profile, progress)
  saveTrophyRoad(state)
  saveProfile(profile)
  saveCardProgress(progress)
  return { ok: true, message: messages.join(' · ') || 'Claimed!' }
}

export function claimAvailableRoadRewards(): string[] {
  const profile = loadProfile()
  const state = loadTrophyRoad()
  const progress = loadCardProgress()
  const messages: string[] = []
  TROPHY_ROAD.forEach((step, idx) => {
    if (state.claimed.includes(idx)) return
    if (profile.trophies < step.trophies) return
    state.claimed.push(idx)
    messages.push(...grantRoadStep(step, profile, progress))
  })
  saveTrophyRoad(state)
  saveProfile(profile)
  saveCardProgress(progress)
  return messages
}

export function countUnclaimedRoadRewards(): number {
  const trophies = loadProfile().trophies
  const claimed = new Set(loadTrophyRoad().claimed)
  return TROPHY_ROAD.reduce(
    (n, step, idx) => (trophies >= step.trophies && !claimed.has(idx) ? n + 1 : n),
    0,
  )
}

/* ——— Shop ——— */

export function loadShopBoughtToday(): string[] {
  const day = todayKey()
  const raw = readJson<{ day: string; ids: string[] } | null>(SHOP_BOUGHT_KEY, null)
  if (!raw || raw.day !== day) return []
  return raw.ids
}

function saveShopBought(ids: string[]): void {
  localStorage.setItem(SHOP_BOUGHT_KEY, JSON.stringify({ day: todayKey(), ids }))
}

export function getShopOffers(): ShopOffer[] {
  return dailyShopOffers(todayKey())
}

export function buyShopOffer(offerId: string): { ok: boolean; message: string } {
  const offer = getShopOffers().find((o) => o.id === offerId)
  if (!offer) return { ok: false, message: 'Offer not found' }
  const bought = loadShopBoughtToday()
  if (bought.includes(offerId)) return { ok: false, message: 'Already bought today' }
  const profile = loadProfile()
  if (profile.gold < offer.priceGold) return { ok: false, message: `Need ${offer.priceGold} gold` }
  if (offer.kind === 'chest' && offer.chest) {
    const added = addChest(offer.chest)
    if (!added.ok) return added
  } else if (offer.kind === 'card' && offer.charId) {
    const progress = loadCardProgress()
    progress.copies[offer.charId] =
      (progress.copies[offer.charId] ?? 0) + (offer.copies ?? 1)
    if (!progress.unlocked.includes(offer.charId)) {
      progress.unlocked.push(offer.charId)
    }
    saveCardProgress(progress)
  }
  profile.gold -= offer.priceGold
  saveProfile(profile)
  bought.push(offerId)
  saveShopBought(bought)
  return { ok: true, message: 'Purchased!' }
}

export function grantBattleChest(result: 'victory' | 'defeat' | 'draw'): void {
  if (result !== 'victory') return
  const roll = Math.random()
  const rarity: ChestRarity =
    roll < 0.05 ? 'legendary' : roll < 0.2 ? 'epic' : roll < 0.55 ? 'rare' : 'common'
  addChest(rarity)
}

/* ——— Rich clubs ——— */

function emptyRichFromLegacy(club: Club): RichClub {
  const you = loadPlayerName().trim() || 'You'
  const trophies = loadProfile().trophies
  return {
    id: club.id,
    name: club.name,
    tag: club.tag,
    description: club.description,
    code: club.code,
    badge: club.code.charCodeAt(0) % 12,
    access: 'invite',
    minTrophies: 0,
    trophies: trophies + 1200,
    weeklyDonations: 0,
    chestCrowns: 0,
    chestClaimed: false,
    members: generateClubMembers(you, club.code, trophies),
    chat: seedClubChat(club.name),
    donateRequests: [],
    warStars: 0,
    warDay: 1,
    createdAt: new Date().toISOString(),
  }
}

export function loadRichClub(): RichClub | null {
  const rich = readJson<RichClub | null>(RICH_CLUB_KEY, null)
  if (rich) {
    // Refresh your trophy line
    const you = rich.members.find((m) => m.isYou)
    if (you) {
      you.name = loadPlayerName().trim() || you.name
      you.trophies = loadProfile().trophies
    }
    return rich
  }
  const legacy = loadMyClub()
  if (!legacy) return null
  const migrated = emptyRichFromLegacy(legacy)
  saveRichClub(migrated)
  return migrated
}

export function saveRichClub(club: RichClub | null): void {
  if (!club) {
    localStorage.removeItem(RICH_CLUB_KEY)
    saveMyClub(null)
    return
  }
  localStorage.setItem(RICH_CLUB_KEY, JSON.stringify(club))
  saveMyClub({
    id: club.id,
    name: club.name,
    tag: club.tag,
    description: club.description,
    code: club.code,
  })
}

export function createRichClub(name: string, description: string, badge: number): RichClub {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const you = loadPlayerName().trim() || 'You'
  const trophies = loadProfile().trophies
  const club: RichClub = {
    id: `c-${Date.now()}`,
    name: name.trim(),
    tag: `#${code}`,
    description: description.trim() || 'A Phil Royale club. Donate, chat, war.',
    code,
    badge: Math.max(0, Math.min(11, badge)),
    access: 'invite',
    minTrophies: 0,
    trophies: trophies + 800,
    weeklyDonations: 0,
    chestCrowns: 0,
    chestClaimed: false,
    members: generateClubMembers(you, code, trophies),
    chat: seedClubChat(name.trim()),
    donateRequests: [],
    warStars: 0,
    warDay: 1,
    createdAt: new Date().toISOString(),
  }
  club.chat.push({
    id: `join-${Date.now()}`,
    from: 'System',
    text: `${you} founded the club as Leader.`,
    at: new Date().toISOString(),
    kind: 'join',
  })
  saveRichClub(club)
  return club
}

export function joinRichClubByCode(code: string): RichClub {
  const c = code.trim().toUpperCase()
  const you = loadPlayerName().trim() || 'You'
  const trophies = loadProfile().trophies
  const club: RichClub = {
    id: `joined-${c}`,
    name: `Club ${c}`,
    tag: `#${c}`,
    description: 'Joined with an invite code.',
    code: c,
    badge: c.charCodeAt(0) % 12,
    access: 'invite',
    minTrophies: 0,
    trophies: trophies + 1500,
    weeklyDonations: 40,
    chestCrowns: 12,
    chestClaimed: false,
    members: generateClubMembers(you, c, trophies).map((m) =>
      m.isYou ? { ...m, role: 'member' as const } : m,
    ),
    chat: seedClubChat(`Club ${c}`),
    donateRequests: [
      {
        id: 'dr0',
        from: 'BeansBoss3',
        charId: 'finley',
        need: 4,
        have: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    warStars: 4,
    warDay: 2,
    createdAt: new Date().toISOString(),
  }
  // Ensure you aren't leader when joining
  const leader = club.members.find((m) => !m.isYou)
  if (leader) leader.role = 'leader'
  club.chat.push({
    id: `join-${Date.now()}`,
    from: 'System',
    text: `${you} joined the club.`,
    at: new Date().toISOString(),
    kind: 'join',
  })
  saveRichClub(club)
  return club
}

export function postClubChat(text: string): RichClub | null {
  const club = loadRichClub()
  if (!club) return null
  const msg: ClubChatMsg = {
    id: `chat-${Date.now()}`,
    from: loadPlayerName().trim() || 'You',
    text: text.trim().slice(0, 140),
    at: new Date().toISOString(),
    kind: 'chat',
  }
  if (!msg.text) return club
  club.chat = [...club.chat.slice(-40), msg]
  saveRichClub(club)
  return club
}

export function requestClubDonation(charId: string): { ok: boolean; message: string; club: RichClub | null } {
  const club = loadRichClub()
  if (!club) return { ok: false, message: 'Join a club first', club: null }
  if (club.donateRequests.length >= 8) {
    return { ok: false, message: 'Too many open requests', club }
  }
  const char = CHARACTERS.find((c) => c.id === charId)
  if (!char) return { ok: false, message: 'Unknown card', club }
  const req: ClubDonateRequest = {
    id: `dr-${Date.now()}`,
    from: loadPlayerName().trim() || 'You',
    charId,
    need: char.rarity === 'common' ? 6 : 4,
    have: 0,
    createdAt: new Date().toISOString(),
  }
  club.donateRequests = [req, ...club.donateRequests].slice(0, 8)
  club.chat.push({
    id: `donreq-${Date.now()}`,
    from: req.from,
    text: `Requests ${req.need}× ${char.name}`,
    at: new Date().toISOString(),
    kind: 'donate',
  })
  saveRichClub(club)
  return { ok: true, message: 'Donation request posted', club }
}

export function fulfillDonation(requestId: string): { ok: boolean; message: string; club: RichClub | null } {
  const club = loadRichClub()
  if (!club) return { ok: false, message: 'No club', club: null }
  const profile = loadProfile()
  if (profile.donateLeft <= 0) {
    return { ok: false, message: 'Daily donation limit reached', club }
  }
  const req = club.donateRequests.find((r) => r.id === requestId)
  if (!req) return { ok: false, message: 'Request gone', club }
  if (req.have >= req.need) return { ok: false, message: 'Already filled', club }
  const progress = loadCardProgress()
  const have = progress.copies[req.charId] ?? 0
  if (have < 1) return { ok: false, message: 'No copies to donate', club }
  progress.copies[req.charId] = have - 1
  req.have += 1
  profile.donateLeft -= 1
  club.weeklyDonations += 1
  const you = club.members.find((m) => m.isYou)
  if (you) you.donations += 1
  const char = CHARACTERS.find((c) => c.id === req.charId)
  club.chat.push({
    id: `don-${Date.now()}`,
    from: loadPlayerName().trim() || 'You',
    text: `Donated 1× ${char?.name ?? req.charId} to ${req.from}`,
    at: new Date().toISOString(),
    kind: 'donate',
  })
  if (req.have >= req.need) {
    club.donateRequests = club.donateRequests.filter((r) => r.id !== requestId)
  }
  // Simulate a bot request occasionally
  if (Math.random() < 0.35 && club.donateRequests.length < 5) {
    club.donateRequests.push({
      id: `dr-bot-${Date.now()}`,
      from: club.members.find((m) => !m.isYou)?.name ?? 'Clubmate',
      charId: randomDonateCharId(),
      need: 4,
      have: 0,
      createdAt: new Date().toISOString(),
    })
  }
  saveCardProgress(progress)
  saveProfile(profile)
  saveRichClub(club)
  return { ok: true, message: 'Donated!', club }
}

export function addClubCrowns(n: number): void {
  if (n <= 0) return
  const club = loadRichClub()
  if (!club || club.chestClaimed) return
  club.chestCrowns = Math.min(CLUB_CHEST_GOAL, club.chestCrowns + n)
  club.warStars += n > 2 ? 1 : 0
  saveRichClub(club)
}

export function claimClubChest(): { ok: boolean; message: string } {
  const club = loadRichClub()
  if (!club) return { ok: false, message: 'Join a club first' }
  if (club.chestClaimed) return { ok: false, message: 'Already claimed this week' }
  if (club.chestCrowns < 20) return { ok: false, message: 'Need 20+ club crowns' }
  const tier = clubChestTier(club.chestCrowns)
  const added = addChest(tier.rarity)
  if (!added.ok) return added
  club.chestClaimed = true
  saveRichClub(club)
  return { ok: true, message: `${tier.label} added to your slots!` }
}

export function playClubWarBattle(): { ok: boolean; message: string; club: RichClub | null } {
  const club = loadRichClub()
  if (!club) return { ok: false, message: 'Join a club first', club: null }
  const win = Math.random() < 0.55
  const stars = win ? 1 + Math.floor(Math.random() * 3) : 0
  club.warStars += stars
  club.warDay = Math.min(7, club.warDay)
  club.chat.push({
    id: `war-${Date.now()}`,
    from: 'War',
    text: win
      ? `${loadPlayerName().trim() || 'You'} scored ${stars} war star${stars === 1 ? '' : 's'}!`
      : `${loadPlayerName().trim() || 'You'} fought bravely (0 stars).`,
    at: new Date().toISOString(),
    kind: 'war',
  })
  if (win) {
    const p = loadProfile()
    p.gold += 20
    p.xp += 20
    saveProfile(p)
    addClubCrowns(2)
  }
  saveRichClub(club)
  return {
    ok: true,
    message: win ? `War win · +${stars} stars` : 'War battle lost — try again',
    club,
  }
}

export function clubMemberCount(club: RichClub): string {
  return `${club.members.length}/${CLUB_MAX_MEMBERS}`
}

export type ClubShopOffer = {
  id: string
  label: string
  costGold: number
  gold?: number
  gems?: number
  copies?: number
  xp?: number
}

export const CLUB_SHOP_OFFERS: ClubShopOffer[] = [
  { id: 'boost', label: 'War Boost (+2 war stars)', costGold: 150, xp: 10 },
  { id: 'pack', label: 'Donation Pack (5 random copies)', costGold: 200, copies: 5 },
  { id: 'gemlet', label: 'Club Gemlet', costGold: 400, gems: 3 },
  { id: 'chestgold', label: 'Treasury Tip', costGold: 100, gold: 80, xp: 25 },
]

export function buyClubShopOffer(
  offerId: string,
): { ok: boolean; message: string; club: RichClub | null } {
  const club = loadRichClub()
  if (!club) return { ok: false, message: 'Join a club first', club: null }
  const offer = CLUB_SHOP_OFFERS.find((o) => o.id === offerId)
  if (!offer) return { ok: false, message: 'Unknown offer', club: null }
  const profile = loadProfile()
  if (profile.gold < offer.costGold) {
    return { ok: false, message: `Need ${offer.costGold} gold`, club: null }
  }
  profile.gold -= offer.costGold
  if (offer.gold) profile.gold += offer.gold
  if (offer.gems) profile.gems += offer.gems
  if (offer.xp) profile.xp += offer.xp
  if (offer.id === 'boost') {
    club.warStars += 2
    club.chat.push({
      id: `shop-${Date.now()}`,
      from: 'Club Shop',
      text: `${loadPlayerName().trim() || 'You'} bought a War Boost (+2 stars).`,
      at: new Date().toISOString(),
      kind: 'system',
    })
  }
  if (offer.copies) {
    const progress = loadCardProgress()
    for (let i = 0; i < offer.copies; i++) {
      const pool = progress.unlocked.length ? progress.unlocked : ['finley']
      const id = pool[Math.floor(Math.random() * pool.length)]!
      progress.copies[id] = (progress.copies[id] ?? 0) + 1
    }
    saveCardProgress(progress)
  }
  saveProfile(profile)
  saveRichClub(club)
  return { ok: true, message: `Bought ${offer.label}`, club }
}

export function advanceRiverRace(): { ok: boolean; message: string; club: RichClub | null } {
  const club = loadRichClub()
  if (!club) return { ok: false, message: 'Join a club first', club: null }
  const gain = 3 + Math.floor(Math.random() * 5)
  club.chestCrowns = Math.min(CLUB_CHEST_GOAL, club.chestCrowns + gain)
  club.weeklyDonations += gain
  club.chat.push({
    id: `river-${Date.now()}`,
    from: 'River Race',
    text: `${loadPlayerName().trim() || 'You'} paddled +${gain} race points for the club.`,
    at: new Date().toISOString(),
    kind: 'system',
  })
  const p = loadProfile()
  p.gold += 15
  p.xp += 15
  saveProfile(p)
  saveRichClub(club)
  return { ok: true, message: `River race +${gain} · club at ${club.chestCrowns}`, club }
}

/* ——— Season pass ——— */

export function loadSeason(): SeasonState {
  const id = currentSeasonId()
  const raw = readJson<SeasonState | null>(SEASON_KEY, null)
  if (!raw || raw.seasonId !== id) {
    const fresh: SeasonState = { seasonId: id, points: 0, claimed: [] }
    saveSeason(fresh)
    return fresh
  }
  return raw
}

export function saveSeason(s: SeasonState): void {
  localStorage.setItem(SEASON_KEY, JSON.stringify(s))
}

export function addSeasonPoints(n: number): void {
  const s = loadSeason()
  s.points += n
  saveSeason(s)
}

export function claimSeasonReward(index: number): { ok: boolean; message: string } {
  const s = loadSeason()
  const reward = SEASON_FREE_TRACK[index]
  if (!reward) return { ok: false, message: 'Invalid tier' }
  if (s.claimed.includes(index)) return { ok: false, message: 'Already claimed' }
  if (s.points < reward.points) return { ok: false, message: `Need ${reward.points} season points` }
  const profile = loadProfile()
  const progress = loadCardProgress()
  const bits: string[] = []
  if (reward.gold) {
    profile.gold += reward.gold
    bits.push(`+${reward.gold}g`)
  }
  if (reward.gems) {
    profile.gems += reward.gems
    bits.push(`+${reward.gems} gems`)
  }
  if (reward.chest) {
    const r = addChest(reward.chest)
    bits.push(r.ok ? CHEST_META[reward.chest].label : 'chest slots full')
  }
  if (reward.copies) {
    const pool = CHARACTERS.filter((c) => c.rarity === reward.copies!.rarity)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (pick) {
      progress.copies[pick.id] = (progress.copies[pick.id] ?? 0) + reward.copies.amount
      if (!progress.unlocked.includes(pick.id)) progress.unlocked.push(pick.id)
      bits.push(`${reward.copies.amount}× ${pick.name}`)
    }
  }
  s.claimed.push(index)
  saveSeason(s)
  saveProfile(profile)
  saveCardProgress(progress)
  return { ok: true, message: bits.join(' · ') || 'Claimed' }
}

export function kingInfo() {
  return kingLevelFromXp(loadProfile().xp)
}

/* ——— Events ——— */

export function loadEvents(): EventsState {
  const day = todayKey()
  const raw = readJson<EventsState | null>(EVENTS_KEY, null)
  if (!raw || raw.day !== day) {
    const fresh: EventsState = {
      day,
      classicWins: 0,
      classicClaimed: false,
      suddenWins: 0,
      suddenClaimed: false,
      friendlyWins: 0,
    }
    saveEvents(fresh)
    return fresh
  }
  return raw
}

export function saveEvents(e: EventsState): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(e))
}

export function noteEventWin(kind: 'ladder' | 'classic' | 'sudden' | 'friendly'): void {
  const e = loadEvents()
  if (kind === 'classic') e.classicWins += 1
  else if (kind === 'sudden') e.suddenWins += 1
  else if (kind === 'friendly') e.friendlyWins += 1
  saveEvents(e)
}

export function claimEventReward(
  kind: 'classic' | 'sudden',
): { ok: boolean; message: string } {
  const e = loadEvents()
  const profile = loadProfile()
  if (kind === 'classic') {
    if (e.classicClaimed) return { ok: false, message: 'Already claimed' }
    if (e.classicWins < 3) return { ok: false, message: 'Win 3 classic battles' }
    profile.gold += 200
    profile.gems += 5
    e.classicClaimed = true
    saveEvents(e)
    saveProfile(profile)
    addChest('rare')
    return { ok: true, message: '+200g · +5 gems · Rare Chest' }
  }
  if (e.suddenClaimed) return { ok: false, message: 'Already claimed' }
  if (e.suddenWins < 2) return { ok: false, message: 'Win 2 sudden-death battles' }
  profile.gold += 150
  e.suddenClaimed = true
  saveEvents(e)
  saveProfile(profile)
  addChest('common')
  return { ok: true, message: '+150g · Common Chest' }
}

export function weekLabel(): string {
  return weekKey()
}
