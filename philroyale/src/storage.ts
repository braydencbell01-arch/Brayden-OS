import { CHARACTERS, DEFAULT_DECK, DECK_SIZE } from './characters'

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
  const valid = ids.filter((id) => CHARACTERS.some((c) => c.id === id))
  if (valid.length === DECK_SIZE) return valid
  return DEFAULT_DECK
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

const PROFILE_KEY = 'philroyale.profile.v1'
const CARD_PROGRESS_KEY = 'philroyale.cardProgress.v1'
const DAILY_KEY = 'philroyale.daily.v1'
const FRIEND_META_KEY = 'philroyale.friendMeta.v1'

export type PlayerProfile = {
  trophies: number
  gold: number
  wins: number
  losses: number
  draws: number
  winStreak: number
  bestWinStreak: number
  battlesPlayed: number
}

export type CardProgress = {
  /** charId → level (1–11) */
  levels: Record<string, number>
  /** charId → owned copies */
  copies: Record<string, number>
  favorites: string[]
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
  wins: 0,
  losses: 0,
  draws: 0,
  winStreak: 0,
  bestWinStreak: 0,
  battlesPlayed: 0,
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function arenaTitle(trophies: number): string {
  if (trophies >= 4000) return 'Phil Peak'
  if (trophies >= 3000) return 'Royal Yard'
  if (trophies >= 2000) return 'Bone Bridge'
  if (trophies >= 1000) return 'Sundae Strip'
  if (trophies >= 400) return 'Training Camp'
  return 'Goblin Boot'
}

export function loadProfile(): PlayerProfile {
  return { ...DEFAULT_PROFILE, ...readJson<Partial<PlayerProfile>>(PROFILE_KEY, {}) }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function recordMatchResult(result: 'victory' | 'defeat' | 'draw'): PlayerProfile {
  const p = loadProfile()
  p.battlesPlayed += 1
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
  return p
}

export function loadCardProgress(): CardProgress {
  const raw = readJson<Partial<CardProgress>>(CARD_PROGRESS_KEY, {})
  const levels: Record<string, number> = {}
  const copies: Record<string, number> = {}
  for (const c of CHARACTERS) {
    levels[c.id] = Math.max(1, Math.min(11, raw.levels?.[c.id] ?? 1))
    copies[c.id] = Math.max(0, raw.copies?.[c.id] ?? (c.rarity === 'common' ? 4 : 1))
  }
  return {
    levels,
    copies,
    favorites: (raw.favorites ?? []).filter((id) => CHARACTERS.some((c) => c.id === id)),
  }
}

export function saveCardProgress(progress: CardProgress): void {
  localStorage.setItem(CARD_PROGRESS_KEY, JSON.stringify(progress))
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
  const level = progress.levels[charId] ?? 1
  if (level >= 11) return { ok: false, message: 'Max level', progress }
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
  return { ok: true, message: `${char.name} → Lv ${level + 1}`, progress }
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
