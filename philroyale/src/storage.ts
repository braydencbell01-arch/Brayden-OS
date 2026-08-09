import { CHARACTERS, DEFAULT_DECK, DECK_SIZE } from './characters'
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

export type Club = {
  id: string
  name: string
  tag: string
  description: string
  /** Invite code shared over text */
  code: string
}

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
  return { ...DEFAULT_PROFILE, ...legacy, ...cur }
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
  } else if (result === 'defeat') {
    p.losses += 1
    p.winStreak = 0
    p.trophies = Math.max(0, p.trophies - 20)
    p.gold += 15
  } else {
    p.draws += 1
    p.winStreak = 0
    p.trophies += 5
    p.gold += 25
  }
  saveProfile(p)

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
    levels[c.id] = Math.max(1, Math.min(MAX_CARD_LEVEL, raw.levels?.[c.id] ?? 1))
    copies[c.id] = Math.max(0, raw.copies?.[c.id] ?? (c.rarity === 'common' ? 4 : 1))
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
  const base = rarity === 'legendary' ? 2 : rarity === 'epic' ? 4 : rarity === 'rare' ? 6 : 8
  return base + (level - 1) * 2
}

export function goldToUpgrade(level: number): number {
  return 50 + (level - 1) * 40
}

export function tryUpgradeCard(charId: string): { ok: boolean; message: string; progress: CardProgress } {
  const char = CHARACTERS.find((c) => c.id === charId)
  const progress = loadCardProgress()
  if (!char) return { ok: false, message: 'Unknown card', progress }
  if (!progress.unlocked.includes(charId)) {
    return { ok: false, message: 'Card locked — unlock on Trophy Road', progress }
  }
  const level = progress.levels[charId] ?? 1
  if (level >= MAX_CARD_LEVEL) return { ok: false, message: 'Max level 10', progress }
  const need = copiesToUpgrade(level, char.rarity)
  const have = progress.copies[charId] ?? 0
  const cost = goldToUpgrade(level)
  const profile = loadProfile()
  if (have < need) return { ok: false, message: `Need ${need} copies`, progress }
  if (profile.gold < cost) return { ok: false, message: `Need ${cost} gold`, progress }
  progress.copies[charId] = have - need
  progress.levels[charId] = level + 1
  profile.gold -= cost
  saveCardProgress(progress)
  saveProfile(profile)
  return {
    ok: true,
    message: `${char.name} → Lv ${level + 1} (+5% HP & dmg)`,
    progress,
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
  const gold = 80 + Math.floor(Math.random() * 41)
  const profile = loadProfile()
  profile.gold += gold
  // Small chance of a random card copy
  const progress = loadCardProgress()
  const pick = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]!
  progress.copies[pick.id] = (progress.copies[pick.id] ?? 0) + 1
  saveCardProgress(progress)
  saveProfile(profile)
  daily.chestClaimed = true
  saveDaily(daily)
  return { ok: true, gold, message: `+${gold} gold · +1 ${pick.name}` }
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
    const name = CHARACTERS.find((c) => c.id === step.unlockCard)?.name ?? step.unlockCard
    messages.push(`Unlocked ${name}`)
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
