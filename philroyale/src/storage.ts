import { CHARACTERS, DEFAULT_DECK, DECK_SIZE } from './characters'
import {
  CLUB_CHEST_GOAL,
  CLUB_MAX_MEMBERS,
  DONATE_LIMIT_DAY,
  SEASON_FREE_TRACK,
  clubChestTier,
  currentSeasonId,
  kingLevelFromXp,
  randomDonateCharId,
  seedClubChat,
  weekKey,
  type ClubChatMsg,
  type ClubDonateRequest,
  type ClubMember,
  type ClubRole,
  type RichClub,
} from './clubMeta'
import {
  WAR_ATTACKS_PER_DAY,
  WAR_BATTLE_MS,
  WAR_BOAT_COUNT,
  WAR_COLLECTION_MS,
  crownsToWarStars,
  emptyWar,
  makeEnemyBoats,
  pickEnemyClub,
  warRewardForResult,
  type ClubWarState,
} from './clubWar'
import {
  CHEST_META,
  MAX_CARD_LEVEL,
  STARTER_UNLOCKS,
  TROPHY_ROAD,
  arenaForTrophies,
  allShopOffers,
  rollChestLoot,
  type ChestRarity,
  type ShopOffer,
} from './progression'
import type { GameMode } from './gameModes'
import { parseGameMode } from './gameModes'
import { getEmoteById } from './emoteCatalog'
import {
  getGemPack,
  getGoldWithGemsPack,
  getRealMoneyOffer,
} from './shopCatalog'

export type { GameMode } from './gameModes'
export { parseGameMode, earnsTrophies, isPartyMode, modeLabel } from './gameModes'

const DECK_KEY = 'philroyale.deck.v2'
const DECKS_KEY = 'philroyale.decks.v1'
const ACTIVE_DECK_KEY = 'philroyale.activeDeck.v1'
const DECK_SLOT_COUNT = 5
const FRIENDS_KEY = 'philroyale.friends'
const MY_CLUB_KEY = 'philroyale.myClub'
const MY_CLUB_META_KEY = 'philroyale.myClubMeta'
const PLAYER_NAME_KEY = 'philroyale.playerName'
const PLAYER_ID_KEY = 'philroyale.playerId.v1'
const ACCOUNT_CODE_KEY = 'philroyale.accountCode.v1'
const LEGACY_PLAYER_ID_KEY = 'philroyale.legacyPlayerId.v1'
const BATTLE_CHALLENGE_KEY = 'philroyale.battleChallenge'
const BATTLE_INCOMING_KEY = 'philroyale.battleIncoming'
const BATTLE_ACCEPTED_KEY = 'philroyale.battleAccepted'
const PENDING_FRIEND_KEY = 'philroyale.pendingFriendLink'
const INCOMING_CLUB_INVITE_KEY = 'philroyale.incomingClubInvite'

export const BATTLE_CHANNEL_NAME = 'philroyale-battle'

export type BattleChallenge = {
  challengeId: string
  fromName: string
  toName: string
  fromPlayerId?: string
  toPlayerId?: string
  mode: GameMode
  createdAt: string
}

export type PendingFriendLink = {
  playerId: string
  name: string
}

export type ClubInviteIncoming = {
  fromPlayerId: string
  fromName: string
  clubCode: string
  clubName: string
  at: string
}

export type BattleAccepted = {
  challengeId: string
  acceptedBy: string
  acceptedAt: string
}

export type BattleChannelMessage =
  | { type: 'challenge'; challenge: BattleChallenge }
  | { type: 'accept'; challengeId: string; acceptedBy: string; mode?: GameMode }
  | { type: 'decline'; challengeId: string }

export type Friend = {
  id: string
  name: string
  /** Remote player id for cross-device invites (ntfy topic). */
  playerId?: string
  /** Last known trophies (from presence) — used on Trophy Road. */
  trophies?: number
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

export function normalizeDeck(ids: string[], opts?: { fill?: boolean }): string[] {
  const unlocked = new Set(loadCardProgress().unlocked)
  const valid = ids.filter(
    (id) => id && CHARACTERS.some((c) => c.id === id) && unlocked.has(id),
  )
  // Dedupe while preserving order
  const unique: string[] = []
  for (const id of valid) {
    if (!unique.includes(id)) unique.push(id)
  }
  const sliced = unique.slice(0, DECK_SIZE)
  if (!opts?.fill && sliced.length > 0) return sliced
  if (sliced.length === DECK_SIZE) return sliced
  const fallback = [...sliced]
  const pool = [
    ...DEFAULT_DECK.filter((id) => unlocked.has(id)),
    ...STARTER_UNLOCKS.filter((id) => unlocked.has(id)),
  ]
  for (const id of pool) {
    if (fallback.length >= DECK_SIZE) break
    if (!fallback.includes(id)) fallback.push(id)
  }
  while (fallback.length < DECK_SIZE && STARTER_UNLOCKS.length) {
    fallback.push(STARTER_UNLOCKS[fallback.length % STARTER_UNLOCKS.length]!)
  }
  return fallback.slice(0, DECK_SIZE)
}

export function loadActiveDeckIndex(): number {
  const raw = Number(localStorage.getItem(ACTIVE_DECK_KEY) ?? '0')
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(DECK_SLOT_COUNT - 1, Math.floor(raw)))
}

export function setActiveDeckIndex(index: number): void {
  const i = Math.max(0, Math.min(DECK_SLOT_COUNT - 1, Math.floor(index)))
  localStorage.setItem(ACTIVE_DECK_KEY, String(i))
}

export function loadDecks(): string[][] {
  const raw = readJson<string[][] | null>(DECKS_KEY, null)
  const legacy = readJson<string[]>(DECK_KEY, DEFAULT_DECK)
  const decks: string[][] = []
  for (let i = 0; i < DECK_SLOT_COUNT; i++) {
    const slot = Array.isArray(raw?.[i]) ? raw![i]! : i === 0 ? legacy : DEFAULT_DECK
    decks.push(normalizeDeck(slot, { fill: true }))
  }
  return decks
}

export function saveDecks(decks: string[][]): void {
  const next = Array.from({ length: DECK_SLOT_COUNT }, (_, i) =>
    normalizeDeck(decks[i] ?? DEFAULT_DECK, { fill: false }),
  )
  // Ensure each slot has a battle-ready fallback when empty
  const stored = next.map((d) => (d.length === 0 ? normalizeDeck(DEFAULT_DECK, { fill: true }) : d))
  localStorage.setItem(DECKS_KEY, JSON.stringify(stored))
  localStorage.setItem(
    DECK_KEY,
    JSON.stringify(normalizeDeck(stored[loadActiveDeckIndex()]!, { fill: true })),
  )
}

export function loadDeck(): string[] {
  const decks = loadDecks()
  return normalizeDeck(decks[loadActiveDeckIndex()] ?? DEFAULT_DECK, { fill: true })
}

export function saveDeck(ids: string[]): void {
  const decks = loadDecks()
  const i = loadActiveDeckIndex()
  decks[i] = normalizeDeck(ids, { fill: false })
  saveDecks(decks)
}

export function loadFriends(): Friend[] {
  const friends = readJson<Friend[]>(FRIENDS_KEY, [])
  // Drop short digit codes from the old 3-digit era — they collide and break online/PvP.
  const cleaned = friends.filter((f) => {
    const id = (f.playerId || '').trim()
    if (!id) return true
    if (/^\d{1,5}$/.test(id)) return false
    return true
  })
  if (cleaned.length !== friends.length) {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(cleaned))
  }
  return cleaned
}

export function saveFriends(friends: Friend[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
}

/** Persist a friend's last-known trophies for Trophy Road markers. */
export function saveFriendTrophies(playerId: string, trophies: number): void {
  const id = playerId.trim()
  if (!id || !Number.isFinite(trophies)) return
  const friends = loadFriends()
  let changed = false
  for (const f of friends) {
    if (f.playerId === id || f.id === id) {
      const next = Math.max(0, Math.floor(trophies))
      if (f.trophies !== next) {
        f.trophies = next
        changed = true
      }
    }
  }
  if (changed) saveFriends(friends)
}

export function removeFriendByPlayerId(playerId: string): void {
  const id = playerId.trim()
  if (!id) return
  saveFriends(loadFriends().filter((f) => f.playerId !== id && f.id !== id))
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

/** Friend codes are 6 digits — unique enough that two players rarely share a topic. */
export const FRIEND_CODE_LEN = 6

/** Short shareable friend code (also the live social player id). */
export function generateAccountCode(): string {
  const n =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? 100_000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 900_000)
      : 100_000 + Math.floor(Math.random() * 900_000)
  return String(n)
}

/** Digits only, max 6 — for friend codes. */
export function normalizeFriendCode(raw: string): string {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, FRIEND_CODE_LEN)
}

export function isFriendCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/** @deprecated use normalizeFriendCode — kept for call sites that also strip club junk */
export function normalizeAccountCode(raw: string): string {
  // Prefer digits-only friend codes; fall back to alnum for rare legacy reads.
  const digits = normalizeFriendCode(raw)
  if (digits.length === FRIEND_CODE_LEN) return digits
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

export function formatAccountCode(code: string): string {
  const c = normalizeFriendCode(code) || normalizeAccountCode(code)
  return c
}

/**
 * Canonical online id = 6-digit friend code.
 * Migrates older 3-digit / 8-char / UUID ids to a new code while keeping legacy inboxes.
 */
export function loadPlayerId(): string {
  const existing = localStorage.getItem(PLAYER_ID_KEY) || ''
  let code = localStorage.getItem(ACCOUNT_CODE_KEY) || ''

  // Force cutover to 6-digit codes (3-digit codes collided and broke friending / PvP).
  if (!isFriendCode(code)) {
    const old = code || existing
    if (old && !isFriendCode(old)) {
      const prevLegacy = localStorage.getItem(LEGACY_PLAYER_ID_KEY)?.trim()
      if (!prevLegacy) localStorage.setItem(LEGACY_PLAYER_ID_KEY, old)
      else if (prevLegacy !== old) {
        const parts = new Set(prevLegacy.split(',').map((s) => s.trim()).filter(Boolean))
        parts.add(old)
        localStorage.setItem(LEGACY_PLAYER_ID_KEY, [...parts].join(','))
      }
    }
    code = generateAccountCode()
    localStorage.setItem(ACCOUNT_CODE_KEY, code)
  }

  if (existing && existing !== code && !isFriendCode(existing)) {
    const prevLegacy = localStorage.getItem(LEGACY_PLAYER_ID_KEY)?.trim()
    if (!prevLegacy) localStorage.setItem(LEGACY_PLAYER_ID_KEY, existing)
    else if (!prevLegacy.split(',').includes(existing)) {
      localStorage.setItem(LEGACY_PLAYER_ID_KEY, `${prevLegacy},${existing}`)
    }
  }

  localStorage.setItem(PLAYER_ID_KEY, code)
  return code
}

/** Display / copy form of the player's account code. */
export function loadAccountCode(): string {
  return loadPlayerId()
}

/** Older inbox ids still subscribed so pre-migration friends can reach you. */
export function loadLegacyPlayerIds(): string[] {
  const legacy = localStorage.getItem(LEGACY_PLAYER_ID_KEY)?.trim()
  const current = localStorage.getItem(ACCOUNT_CODE_KEY) || localStorage.getItem(PLAYER_ID_KEY) || ''
  if (!legacy) return []
  return legacy
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== current)
}

function isPlaceholderFriendName(name: string): boolean {
  const n = name.trim()
  if (!n) return true
  if (/^player(\s|-)/i.test(n)) return true
  if (n === 'Friend' || n === 'New friend' || n === 'Adding…') return true
  return false
}

export function upsertFriend(friend: {
  name: string
  playerId?: string
}): Friend {
  const friends = loadFriends()
  const name = friend.name.trim()
  const playerId = friend.playerId?.trim() || undefined
  if (!name && !playerId) {
    throw new Error('Friend needs a name or id')
  }
  const existingIdx = friends.findIndex((f) => {
    if (playerId && f.playerId && f.playerId === playerId) return true
    if (
      name &&
      !isPlaceholderFriendName(name) &&
      f.name.toLowerCase() === name.toLowerCase()
    ) {
      return true
    }
    return false
  })
  if (existingIdx >= 0) {
    const prev = friends[existingIdx]!
    // Never let a placeholder wipe a real display name.
    const nextName =
      name && !(isPlaceholderFriendName(name) && !isPlaceholderFriendName(prev.name))
        ? name
        : prev.name
    const next: Friend = {
      ...prev,
      name: nextName,
      playerId: playerId || prev.playerId,
    }
    friends[existingIdx] = next
    saveFriends(friends)
    return next
  }
  const created: Friend = {
    id: playerId || `f-${Date.now()}`,
    name: name || 'New friend',
    playerId,
    addedAt: new Date().toISOString(),
  }
  friends.push(created)
  saveFriends(friends)
  return created
}

export function savePendingFriendLink(link: PendingFriendLink | null): void {
  if (!link) {
    localStorage.removeItem(PENDING_FRIEND_KEY)
    return
  }
  localStorage.setItem(PENDING_FRIEND_KEY, JSON.stringify(link))
}

export function loadPendingFriendLink(): PendingFriendLink | null {
  return readJson<PendingFriendLink | null>(PENDING_FRIEND_KEY, null)
}

export function saveIncomingClubInvite(invite: ClubInviteIncoming | null): void {
  if (!invite) {
    localStorage.removeItem(INCOMING_CLUB_INVITE_KEY)
    return
  }
  localStorage.setItem(INCOMING_CLUB_INVITE_KEY, JSON.stringify(invite))
}

export function loadIncomingClubInvite(): ClubInviteIncoming | null {
  return readJson<ClubInviteIncoming | null>(INCOMING_CLUB_INVITE_KEY, null)
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

export function friendInviteUrl(fromName: string, fromPlayerId?: string): string {
  const u = new URL(siteOrigin())
  const name = fromName || 'PhilRoyale'
  const id = fromPlayerId || loadPlayerId()
  u.searchParams.set('addFriend', id)
  u.searchParams.set('friendName', name)
  // Legacy param still accepted
  u.searchParams.set('friend', name)
  return u.toString()
}

export function parseFriendInviteFromUrl(
  search = typeof window !== 'undefined' ? window.location.search : '',
): PendingFriendLink | null {
  const params = new URLSearchParams(search)
  const playerId = (params.get('addFriend') || '').trim()
  const name = (params.get('friendName') || params.get('friend') || '').trim()
  if (!playerId && !name) return null
  if (playerId && playerId === loadPlayerId()) return null
  return { playerId: playerId || `name:${name.toLowerCase()}`, name: name || 'Friend' }
}

export function generateChallengeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function battleInviteUrl(
  fromName: string,
  toName: string,
  challengeId: string,
  mode: GameMode = 'classic',
  fromPlayerId?: string,
  toPlayerId?: string,
): string {
  const u = new URL(siteOrigin())
  u.searchParams.set('battleFrom', fromName || 'Player')
  u.searchParams.set('battleTo', toName || 'Friend')
  u.searchParams.set('challenge', challengeId)
  u.searchParams.set('mode', mode)
  if (fromPlayerId) u.searchParams.set('fromId', fromPlayerId)
  if (toPlayerId) u.searchParams.set('toId', toPlayerId)
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
  const mode = parseGameMode(params.get('mode')?.trim())
  return {
    challengeId,
    fromName,
    toName,
    fromPlayerId: params.get('fromId')?.trim() || undefined,
    toPlayerId: params.get('toId')?.trim() || undefined,
    mode,
    createdAt: new Date().toISOString(),
  }
}

function normalizeChallenge(raw: BattleChallenge | null): BattleChallenge | null {
  if (!raw) return null
  return {
    ...raw,
    mode: parseGameMode(raw.mode),
  }
}

export function loadOutgoingChallenge(): BattleChallenge | null {
  return normalizeChallenge(readJson<BattleChallenge | null>(BATTLE_CHALLENGE_KEY, null))
}

export function saveOutgoingChallenge(challenge: BattleChallenge): void {
  localStorage.setItem(BATTLE_CHALLENGE_KEY, JSON.stringify(challenge))
}

export function clearOutgoingChallenge(): void {
  localStorage.removeItem(BATTLE_CHALLENGE_KEY)
}

export function loadIncomingChallenge(): BattleChallenge | null {
  return normalizeChallenge(readJson<BattleChallenge | null>(BATTLE_INCOMING_KEY, null))
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

export function createBattleChallenge(
  toName: string,
  opts?: { mode?: GameMode; toPlayerId?: string },
): BattleChallenge {
  const challenge: BattleChallenge = {
    challengeId: generateChallengeId(),
    fromName: loadPlayerName().trim() || 'Player',
    toName: toName.trim(),
    fromPlayerId: loadPlayerId(),
    toPlayerId: opts?.toPlayerId,
    mode: opts?.mode ?? 'classic',
    createdAt: new Date().toISOString(),
  }
  saveOutgoingChallenge(challenge)
  return challenge
}

export function isChallengeForMe(challenge: BattleChallenge): boolean {
  const me = loadPlayerName().trim()
  const myId = loadPlayerId()
  if (challenge.fromPlayerId && challenge.fromPlayerId === myId) return false
  if (challenge.toPlayerId && challenge.toPlayerId === myId) return true
  if (!me) return false
  return namesMatch(challenge.toName, me) && !namesMatch(challenge.fromName, me)
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
const EMOTES_KEY = 'philroyale.emotes.v1'

export type PlayerProfile = {
  trophies: number
  /** Highest trophies ever reached (cosmetic peak for trophy road). */
  peakTrophies: number
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
  /** Portrait character id for profile / road markers */
  avatarId: string
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
  peakTrophies: 0,
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
  avatarId: 'phil',
  donateLeft: DONATE_LIMIT_DAY,
  donateDay: '',
}

const RICH_CLUB_KEY = 'philroyale.richClub.v1'
const SEASON_KEY = 'philroyale.season.v1'
const EVENTS_KEY = 'philroyale.events.v1'
const CLUB_WAR_KEY = 'philroyale.clubWar.v1'
const PENDING_WAR_KEY = 'philroyale.pendingWarAttack.v1'

export type { ClubWarState }
export type PendingWarAttack = { boatId: string; startedAt: number }

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
  if (p.peakTrophies < p.trophies) p.peakTrophies = p.trophies
  if (!p.avatarId || typeof p.avatarId !== 'string') p.avatarId = 'phil'
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
  opts?: {
    crowns?: number
    pvp?: boolean
    opponentTrophies?: number
    /** Party modes: play still counts, but no trophy ladder moves. */
    awardsTrophies?: boolean
  },
): PlayerProfile {
  const p = loadProfile()
  p.battlesPlayed += 1
  const crowns = Math.max(0, Math.min(3, opts?.crowns ?? (result === 'victory' ? 3 : result === 'draw' ? 1 : 0)))
  p.crownChest = Math.min(10, p.crownChest + crowns)
  const awardsTrophies = opts?.awardsTrophies !== false
  if (opts?.pvp) {
    const myTrophies = p.trophies
    const oppTrophies = Math.max(0, opts.opponentTrophies ?? myTrophies)
    const diff = oppTrophies - myTrophies
    if (result === 'victory') {
      p.wins += 1
      p.winStreak += 1
      p.bestWinStreak = Math.max(p.bestWinStreak, p.winStreak)
      if (awardsTrophies) {
        const gain = Math.max(15, Math.min(32, 28 + Math.round(diff * 0.04)))
        p.trophies += gain
      }
      p.gold += awardsTrophies ? 50 : 25
      p.xp += awardsTrophies ? 40 : 20
    } else if (result === 'defeat') {
      p.losses += 1
      p.winStreak = 0
      if (awardsTrophies) {
        const loss = Math.max(10, Math.min(28, 22 - Math.round(diff * 0.04)))
        p.trophies = Math.max(0, p.trophies - loss)
      }
      p.gold += awardsTrophies ? 15 : 10
      p.xp += awardsTrophies ? 15 : 10
    } else {
      p.draws += 1
      p.winStreak = 0
      if (awardsTrophies) p.trophies += 5
      p.gold += awardsTrophies ? 25 : 15
      p.xp += awardsTrophies ? 25 : 15
    }
  } else if (result === 'victory') {
    p.wins += 1
    p.winStreak += 1
    p.bestWinStreak = Math.max(p.bestWinStreak, p.winStreak)
    if (awardsTrophies) p.trophies += 30
    p.gold += awardsTrophies ? 50 : 25
    p.xp += awardsTrophies ? 40 : 20
  } else if (result === 'defeat') {
    p.losses += 1
    p.winStreak = 0
    if (awardsTrophies) p.trophies = Math.max(0, p.trophies - 20)
    p.gold += awardsTrophies ? 15 : 10
    p.xp += awardsTrophies ? 15 : 10
  } else {
    p.draws += 1
    p.winStreak = 0
    if (awardsTrophies) p.trophies += 5
    p.gold += awardsTrophies ? 25 : 15
    p.xp += awardsTrophies ? 25 : 15
  }
  p.peakTrophies = Math.max(p.peakTrophies ?? 0, p.trophies)
  saveProfile(p)
  addSeasonPoints(result === 'victory' ? 25 : result === 'draw' ? 10 : 5)
  addClubCrowns(result === 'victory' ? 3 : result === 'draw' ? 1 : 0)
  if (result === 'victory') noteEventWin('ladder')

  const pendingWar = loadPendingWarAttack()
  if (pendingWar) {
    resolveWarAttack(pendingWar.boatId, crowns, result === 'victory')
    clearPendingWarAttack()
  }

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
    message: `${char.name} → Lv ${level + 1} (+5% HP & DM)`,
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
  if (step.cardCopies) {
    const { charId, copies } = step.cardCopies
    if (!progress.unlocked.includes(charId)) {
      progress.unlocked.push(charId)
    }
    progress.copies[charId] = (progress.copies[charId] ?? 0) + copies
    const char = CHARACTERS.find((c) => c.id === charId)
    messages.push(`+${copies} ${char?.name ?? charId}`)
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
  return allShopOffers(todayKey())
}

export function loadOwnedEmotes(): string[] {
  const owned = readJson<string[]>(EMOTES_KEY, [])
  if (!owned.includes('phil')) return ['phil', ...owned.filter((id) => id !== 'phil')]
  return owned
}

function saveOwnedEmotes(ids: string[]): void {
  localStorage.setItem(EMOTES_KEY, JSON.stringify(ids))
}

export function buyEmote(id: string): { ok: boolean; message: string } {
  const emote = getEmoteById(id)
  if (!emote) return { ok: false, message: 'Emote not found' }
  const owned = loadOwnedEmotes()
  if (owned.includes(id)) return { ok: false, message: 'Already owned' }
  if (emote.priceGems <= 0) {
    if (!owned.includes(id)) {
      owned.push(id)
      saveOwnedEmotes(owned)
    }
    return { ok: true, message: `${emote.label} unlocked!` }
  }
  const profile = loadProfile()
  if (profile.gems < emote.priceGems) {
    return { ok: false, message: `Need ${emote.priceGems} gems` }
  }
  profile.gems -= emote.priceGems
  owned.push(id)
  saveProfile(profile)
  saveOwnedEmotes(owned)
  return { ok: true, message: `${emote.label} unlocked!` }
}

export function buyGemPack(_id: string): { ok: boolean; message: string } {
  return {
    ok: false,
    message: 'Gem packs require real-money checkout — tap the price to pay with Square.',
  }
}

/** Fulfill a gem pack after Square redirects back (real payment completed). */
export function fulfillGemPackPurchase(id: string): { ok: boolean; message: string } {
  const pack = getGemPack(id)
  if (!pack) return { ok: false, message: 'Pack not found' }
  if (!consumePendingUsdCheckout(id)) {
    return { ok: false, message: 'Start checkout from the shop before claiming.' }
  }
  const profile = loadProfile()
  profile.gems += pack.gems
  saveProfile(profile)
  return { ok: true, message: `+${pack.gems} gems` }
}

export function buyGoldWithGems(id: string): { ok: boolean; message: string } {
  const pack = getGoldWithGemsPack(id)
  if (!pack) return { ok: false, message: 'Pack not found' }
  const profile = loadProfile()
  if (profile.gems < pack.gems) return { ok: false, message: `Need ${pack.gems} gems` }
  profile.gems -= pack.gems
  profile.gold += pack.gold
  saveProfile(profile)
  return { ok: true, message: `+${pack.gold.toLocaleString()} gold` }
}

export function buyRealMoneyOffer(_id: string): { ok: boolean; message: string } {
  return {
    ok: false,
    message: 'Offers require real-money checkout — tap the price to pay with Square.',
  }
}

/** Fulfill a Royale offer after Square redirects back (real payment completed). */
export function fulfillRealMoneyOffer(id: string): { ok: boolean; message: string } {
  const offer = getRealMoneyOffer(id)
  if (!offer) return { ok: false, message: 'Offer not found' }
  if (!consumePendingUsdCheckout(id)) {
    return { ok: false, message: 'Start checkout from the shop before claiming.' }
  }
  const profile = loadProfile()
  profile.gold += offer.gold
  profile.gems += offer.gems
  if (offer.chest) {
    const added = addChest(offer.chest)
    if (!added.ok) return added
  }
  if (offer.charId && offer.copies) {
    const progress = loadCardProgress()
    progress.copies[offer.charId] =
      (progress.copies[offer.charId] ?? 0) + offer.copies
    if (!progress.unlocked.includes(offer.charId)) {
      progress.unlocked.push(offer.charId)
    }
    saveCardProgress(progress)
  }
  saveProfile(profile)
  const bits = [`+${offer.gold}g`, `+${offer.gems} gems`]
  if (offer.chest) bits.push(CHEST_META[offer.chest].label)
  if (offer.charId && offer.copies) {
    const char = CHARACTERS.find((c) => c.id === offer.charId)
    bits.push(`${offer.copies}× ${char?.name ?? offer.charId}`)
  }
  return {
    ok: true,
    message: `${offer.title} — ${bits.join(' · ')}`,
  }
}

const USD_PENDING_KEY = 'philroyale.shop.usdPending.v1'

type PendingUsd = { skuId: string; at: number }

export function beginUsdCheckout(skuId: string): void {
  const pending: PendingUsd = { skuId, at: Date.now() }
  localStorage.setItem(USD_PENDING_KEY, JSON.stringify(pending))
}

function consumePendingUsdCheckout(skuId: string): boolean {
  const raw = readJson<PendingUsd | null>(USD_PENDING_KEY, null)
  localStorage.removeItem(USD_PENDING_KEY)
  if (!raw || raw.skuId !== skuId) return false
  // Checkout sessions expire after 2 hours.
  if (Date.now() - raw.at > 2 * 3600 * 1000) return false
  return true
}

/** Claim a paid shop SKU after Square redirects back with ?philShopPaid=. */
export function claimPaidShopSku(skuId: string): { ok: boolean; message: string } {
  if (getGemPack(skuId)) return fulfillGemPackPurchase(skuId)
  if (getRealMoneyOffer(skuId)) return fulfillRealMoneyOffer(skuId)
  return { ok: false, message: 'Unknown shop purchase' }
}

export function buyShopOffer(offerId: string): { ok: boolean; message: string } {
  const offer = getShopOffers().find((o) => o.id === offerId)
  if (!offer) return { ok: false, message: 'Offer not found' }
  const bought = loadShopBoughtToday()
  if (bought.includes(offerId)) return { ok: false, message: 'Already bought today' }
  const profile = loadProfile()
  if (offer.free) {
    /* no cost */
  } else if (offer.priceGems != null && offer.priceGems > 0) {
    if (profile.gems < offer.priceGems) {
      return { ok: false, message: `Need ${offer.priceGems} gems` }
    }
    profile.gems -= offer.priceGems
  } else {
    const cost = offer.priceGold ?? 0
    if (profile.gold < cost) return { ok: false, message: `Need ${cost} gold` }
    profile.gold -= cost
  }
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
  saveProfile(profile)
  bought.push(offerId)
  saveShopBought(bought)
  return { ok: true, message: offer.free ? 'Free deal claimed!' : 'Purchased!' }
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
  const trophies = loadProfile().trophies
  const fakeName = /^Club [A-Z0-9]{4,8}$/i.test(club.name)
  return {
    id: club.id,
    name: fakeName ? 'Joining…' : club.name,
    tag: club.tag,
    description: fakeName
      ? 'Connecting to club… keep Phil Royale open.'
      : club.description,
    code: club.code,
    badge: club.code.charCodeAt(0) % 12,
    access: 'invite',
    minTrophies: 0,
    trophies,
    weeklyDonations: 0,
    chestCrowns: 0,
    chestClaimed: false,
    // Never seed bot members — real roster syncs over the club channel.
    members: [makeYouMember('leader')],
    chat: seedClubChat(fakeName ? 'Club' : club.name),
    donateRequests: [],
    warStars: 0,
    warDay: 1,
    createdAt: new Date().toISOString(),
  }
}

/** Wipe leftover “Club XXXXXX” / empty joins that never synced to a real club. */
export function repairBrokenLocalClub(): RichClub | null {
  const club = readJson<RichClub | null>(RICH_CLUB_KEY, null)
  if (!club) return null
  const placeholder =
    club.name.startsWith('Joining') || /^Club [A-Z0-9]{4,8}$/i.test(club.name.trim())
  const realOthers = club.members.filter(
    (m) => !m.isYou && m.playerId && m.playerId.length >= 6,
  )
  if (placeholder && realOthers.length === 0) {
    localStorage.removeItem(RICH_CLUB_KEY)
    saveMyClub(null)
    return null
  }
  if (placeholder && realOthers.length > 0) {
    // Have peers but never got the real name — keep waiting via sync.
    club.name = 'Joining…'
    club.description = 'Syncing club name… keep Phil Royale open.'
    saveRichClub(club)
  }
  return pruneFakeClubMembers()
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

function makeYouMember(role: ClubRole): ClubMember {
  const you = loadPlayerName().trim() || 'You'
  const trophies = loadProfile().trophies
  const playerId = loadPlayerId()
  return {
    id: playerId,
    name: you,
    role,
    trophies,
    donations: 0,
    online: true,
    isYou: true,
    playerId,
  }
}

export function createRichClub(name: string, description: string, badge: number): RichClub {
  // 6-char club codes (distinct from 8-char account codes).
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(6))
      : null
  for (let i = 0; i < 6; i++) {
    const n = bytes ? bytes[i]! : Math.floor(Math.random() * alphabet.length)
    code += alphabet[n % alphabet.length]!
  }
  const you = loadPlayerName().trim() || 'You'
  const trophies = loadProfile().trophies
  const club: RichClub = {
    id: `c-${code}`,
    name: name.trim(),
    tag: `#${code}`,
    description: description.trim() || 'A Phil Royale club. Donate, chat, war.',
    code,
    badge: Math.max(0, Math.min(11, badge)),
    access: 'invite',
    minTrophies: 0,
    trophies,
    weeklyDonations: 0,
    chestCrowns: 0,
    chestClaimed: false,
    members: [makeYouMember('leader')],
    chat: [
      {
        id: `sys-${Date.now()}`,
        from: 'System',
        text: `Welcome to ${name.trim()}! Share code ${code} so friends can join.`,
        at: new Date().toISOString(),
        kind: 'system',
      },
    ],
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

/** Join a live club by invite code — real members sync over the club channel (no bots). */
export function joinRichClubByCode(code: string): RichClub {
  const c = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  const you = loadPlayerName().trim() || 'You'
  const trophies = loadProfile().trophies
  const existing = loadRichClub()
  // Re-joining the same code keeps your roster; refresh "you".
  if (existing && existing.code === c) {
    const others = existing.members.filter((m) => !m.isYou && m.playerId !== loadPlayerId())
    existing.members = [makeYouMember('member'), ...others]
    saveRichClub(existing)
    return existing
  }
  const club: RichClub = {
    id: `joined-${c}`,
    name: 'Joining…',
    tag: `#${c}`,
    description: 'Connecting to club… keep Phil Royale open.',
    code: c,
    badge: c.charCodeAt(0) % 12,
    access: 'invite',
    minTrophies: 0,
    trophies,
    weeklyDonations: 0,
    chestCrowns: 0,
    chestClaimed: false,
    members: [makeYouMember('member')],
    chat: [
      {
        id: `sys-${Date.now()}`,
        from: 'System',
        text: `Joining club ${c}… the leader must have Phil Royale open.`,
        at: new Date().toISOString(),
        kind: 'system',
      },
    ],
    donateRequests: [],
    warStars: 0,
    warDay: 1,
    createdAt: new Date().toISOString(),
  }
  club.chat.push({
    id: `join-${Date.now()}`,
    from: 'System',
    text: `${you} joined.`,
    at: new Date().toISOString(),
    kind: 'join',
  })
  saveRichClub(club)
  return club
}

/** Merge a remote club member into the local roster (by account code). */
export function upsertClubMember(member: {
  playerId: string
  name: string
  role?: ClubRole
  trophies?: number
  online?: boolean
}): RichClub | null {
  const club = loadRichClub()
  if (!club) return null
  const myId = loadPlayerId()
  const playerId = member.playerId.trim()
  if (!playerId) return club
  const isYou = playerId === myId
  const idx = club.members.findIndex(
    (m) => m.playerId === playerId || (isYou && m.isYou) || m.id === playerId,
  )
  if (idx >= 0) {
    const prev = club.members[idx]!
    club.members[idx] = {
      ...prev,
      id: playerId,
      playerId,
      name: member.name.trim() || prev.name,
      role: member.role ?? prev.role,
      trophies: member.trophies ?? prev.trophies,
      online: member.online ?? prev.online,
      isYou: isYou || prev.isYou,
    }
  } else {
    club.members.push({
      id: playerId,
      playerId,
      name: member.name.trim() || 'Member',
      role: member.role ?? 'member',
      trophies: member.trophies ?? 0,
      donations: 0,
      online: member.online ?? true,
      isYou,
    })
  }
  // One "you" row only.
  if (isYou) {
    club.members = club.members.filter((m) => m.playerId === myId || !m.isYou)
  }
  club.trophies = club.members.reduce((s, m) => s + m.trophies, 0)
  saveRichClub(club)
  return club
}

export function applyRemoteClubState(state: {
  code: string
  name: string
  description: string
  badge: number
  members: { playerId: string; name: string; role: ClubRole; trophies: number }[]
}): RichClub | null {
  const club = loadRichClub()
  if (!club || club.code !== state.code) return null
  const myId = loadPlayerId()
  const you = makeYouMember(
    club.members.find((m) => m.isYou || m.playerId === myId)?.role ?? 'member',
  )
  const remote = state.members
    .filter((m) => m.playerId && m.playerId !== myId)
    .map((m) => ({
      id: m.playerId,
      playerId: m.playerId,
      name: m.name,
      role: m.role,
      trophies: m.trophies,
      donations: 0,
      online: true,
    }))
  // Preserve leader role from remote if they claim it.
  const hasLeader = remote.some((m) => m.role === 'leader') || you.role === 'leader'
  if (!hasLeader && remote[0]) remote[0]!.role = 'leader'
  club.name = state.name || club.name
  club.description = state.description || club.description
  club.badge = state.badge
  club.tag = `#${state.code}`
  club.members = [you, ...remote]
  club.trophies = club.members.reduce((s, m) => s + m.trophies, 0)
  saveRichClub(club)
  return club
}

export function removeClubMember(playerId: string): RichClub | null {
  const club = loadRichClub()
  if (!club) return null
  club.members = club.members.filter((m) => m.playerId !== playerId && m.id !== playerId)
  club.trophies = club.members.reduce((s, m) => s + m.trophies, 0)
  saveRichClub(club)
  return club
}

export function clubMembersForSync(): {
  playerId: string
  name: string
  role: ClubRole
  trophies: number
}[] {
  const club = loadRichClub()
  if (!club) return []
  return club.members
    .filter((m) => m.playerId || m.isYou)
    .map((m) => ({
      playerId: m.playerId || (m.isYou ? loadPlayerId() : m.id),
      name: m.name,
      role: m.role,
      trophies: m.trophies,
    }))
}

/** Drop seeded bot members (no account code) so only real players remain. */
export function pruneFakeClubMembers(): RichClub | null {
  const club = loadRichClub()
  if (!club) return null
  const myId = loadPlayerId()
  const real = club.members.filter((m) => m.isYou || (m.playerId && m.playerId.length >= 6))
  const hasYou = real.some((m) => m.isYou || m.playerId === myId)
  if (!hasYou) real.unshift(makeYouMember(real.some((m) => m.role === 'leader') ? 'member' : 'leader'))
  // Ensure you have playerId.
  for (const m of real) {
    if (m.isYou) {
      m.playerId = myId
      m.id = myId
      m.name = loadPlayerName().trim() || m.name
    }
  }
  if (real.length === club.members.length && real.every((m, i) => m.id === club.members[i]?.id)) {
    return club
  }
  club.members = real
  club.trophies = club.members.reduce((s, m) => s + m.trophies, 0)
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

function syncClubWarStars(war: ClubWarState): void {
  const club = loadRichClub()
  if (!club) return
  club.warStars = war.ourStars
  club.warDay = war.phase === 'battle' ? 4 : war.phase === 'collection' ? 2 : war.phase === 'ended' ? 7 : 1
  saveRichClub(club)
}

export function loadClubWar(): ClubWarState {
  const id = weekKey()
  const raw = readJson<ClubWarState | null>(CLUB_WAR_KEY, null)
  if (!raw || raw.weekId !== id) {
    const fresh = emptyWar(id)
    saveClubWar(fresh)
    return fresh
  }
  return advanceClubWar(raw)
}

export function saveClubWar(war: ClubWarState): void {
  localStorage.setItem(CLUB_WAR_KEY, JSON.stringify(war))
}

/** Advance phases by timer + enemy AI ticks. */
export function advanceClubWar(war: ClubWarState = loadClubWar()): ClubWarState {
  const now = Date.now()
  let next = { ...war, boats: war.boats.map((b) => ({ ...b })) }

  if (next.phase === 'collection' && next.phaseEndsAt > 0 && now >= next.phaseEndsAt) {
    next.phase = 'battle'
    next.phaseEndsAt = now + WAR_BATTLE_MS
    next.attacksLeft = WAR_ATTACKS_PER_DAY
    next.lastEnemyTick = now
    const club = loadRichClub()
    if (club) {
      club.chat.push({
        id: `war-day-${now}`,
        from: 'War',
        text: `War Day vs ${next.enemyName}! Attack enemy boats for stars.`,
        at: new Date().toISOString(),
        kind: 'war',
      })
      saveRichClub(club)
    }
  }

  if (next.phase === 'battle' && next.phaseEndsAt > 0 && now >= next.phaseEndsAt) {
    next.phase = 'ended'
    next.phaseEndsAt = 0
    const club = loadRichClub()
    if (club) {
      const outcome =
        next.ourStars > next.theirStars
          ? 'won'
          : next.ourStars === next.theirStars
            ? 'drew'
            : 'lost'
      club.chat.push({
        id: `war-end-${now}`,
        from: 'War',
        text: `War ${outcome} vs ${next.enemyName}: ${next.ourStars}–${next.theirStars}. Claim rewards!`,
        at: new Date().toISOString(),
        kind: 'war',
      })
      saveRichClub(club)
    }
  }

  // Enemy club slowly scores during battle day
  if (next.phase === 'battle' && next.lastEnemyTick > 0) {
    const elapsed = now - next.lastEnemyTick
    const ticks = Math.floor(elapsed / (45 * 60 * 1000)) // every 45 min
    if (ticks > 0) {
      next.theirStars = Math.min(WAR_BOAT_COUNT * 3, next.theirStars + ticks)
      next.lastEnemyTick += ticks * 45 * 60 * 1000
    }
  }

  saveClubWar(next)
  syncClubWarStars(next)
  return next
}

export function startClubWar(): { ok: boolean; message: string; war: ClubWarState } {
  const club = loadRichClub()
  if (!club) return { ok: false, message: 'Join a club first', war: loadClubWar() }
  let war = loadClubWar()
  if (war.phase !== 'idle' && war.phase !== 'ended') {
    return { ok: false, message: 'War already in progress', war }
  }
  const enemy = pickEnemyClub(`${club.code}-${war.weekId}`)
  const now = Date.now()
  war = {
    ...emptyWar(war.weekId),
    phase: 'collection',
    phaseEndsAt: now + WAR_COLLECTION_MS,
    enemyName: enemy.name,
    enemyTag: enemy.tag,
    enemyBadge: enemy.badge,
    boats: makeEnemyBoats(`${club.code}-${enemy.tag}`, loadProfile().trophies),
    lastEnemyTick: now,
  }
  // Fast-track: if collection already full from prior, still start collection
  saveClubWar(war)
  syncClubWarStars(war)
  club.chat.push({
    id: `war-start-${now}`,
    from: 'War',
    text: `Matched vs ${enemy.name} (${enemy.tag})! Collection Day — train for medals.`,
    at: new Date().toISOString(),
    kind: 'war',
  })
  saveRichClub(club)
  return { ok: true, message: `War vs ${enemy.name} — Collection Day!`, war }
}

export function contributeWarCollection(): { ok: boolean; message: string; war: ClubWarState } {
  const war = advanceClubWar()
  if (war.phase !== 'collection') {
    return { ok: false, message: 'Not collection day', war }
  }
  if (war.collection >= war.collectionGoal) {
    return { ok: false, message: 'Collection full — wait for War Day', war }
  }
  war.collection += 1
  const p = loadProfile()
  p.gold += 10
  p.xp += 15
  saveProfile(p)
  if (war.collection >= war.collectionGoal) {
    // Kick into battle early when club finishes collection
    war.phase = 'battle'
    war.phaseEndsAt = Date.now() + WAR_BATTLE_MS
    war.attacksLeft = WAR_ATTACKS_PER_DAY
    war.lastEnemyTick = Date.now()
    const club = loadRichClub()
    if (club) {
      club.chat.push({
        id: `war-ready-${Date.now()}`,
        from: 'War',
        text: 'Collection complete! War Day is live — attack now.',
        at: new Date().toISOString(),
        kind: 'war',
      })
      saveRichClub(club)
    }
    saveClubWar(war)
    syncClubWarStars(war)
    return { ok: true, message: 'Collection done — War Day started!', war }
  }
  saveClubWar(war)
  return { ok: true, message: `Trained ${war.collection}/${war.collectionGoal}`, war }
}

export function loadPendingWarAttack(): PendingWarAttack | null {
  return readJson<PendingWarAttack | null>(PENDING_WAR_KEY, null)
}

export function clearPendingWarAttack(): void {
  localStorage.removeItem(PENDING_WAR_KEY)
}

export function beginWarAttack(
  boatId: string,
): { ok: boolean; message: string; opponent?: string; war: ClubWarState } {
  const war = advanceClubWar()
  if (war.phase !== 'battle') {
    return { ok: false, message: 'War Day is not active', war }
  }
  if (war.attacksLeft <= 0) {
    return { ok: false, message: 'No attacks left', war }
  }
  const boat = war.boats.find((b) => b.id === boatId)
  if (!boat) return { ok: false, message: 'Boat not found', war }
  if (boat.stars >= 3) return { ok: false, message: 'Boat already 3-starred', war }
  localStorage.setItem(
    PENDING_WAR_KEY,
    JSON.stringify({ boatId, startedAt: Date.now() } satisfies PendingWarAttack),
  )
  return {
    ok: true,
    message: `Attacking ${boat.defenderName}…`,
    opponent: boat.defenderName,
    war,
  }
}

export function resolveWarAttack(
  boatId: string,
  crowns: number,
  won: boolean,
): { ok: boolean; message: string; war: ClubWarState } {
  const war = advanceClubWar()
  if (war.phase !== 'battle') {
    return { ok: false, message: 'War not in battle phase', war }
  }
  const boat = war.boats.find((b) => b.id === boatId)
  if (!boat) return { ok: false, message: 'Boat missing', war }

  war.attacksLeft = Math.max(0, war.attacksLeft - 1)
  war.battlesFought += 1
  const stars = won ? Math.max(1, crownsToWarStars(crowns)) : crownsToWarStars(crowns)
  const gained = Math.max(0, stars - boat.stars)
  if (stars > boat.stars) boat.stars = stars
  boat.attacks += 1
  war.ourStars += gained

  // Enemy counters a bit
  if (Math.random() < 0.55) {
    war.theirStars = Math.min(WAR_BOAT_COUNT * 3, war.theirStars + (won ? 1 : 2))
  }

  const you = loadPlayerName().trim() || 'You'
  const club = loadRichClub()
  if (club) {
    club.chat.push({
      id: `war-atk-${Date.now()}`,
      from: 'War',
      text:
        gained > 0
          ? `${you} hit ${boat.defenderName} for ${stars}★ (+${gained} club)`
          : `${you} attacked ${boat.defenderName} — ${stars}★ (no new stars)`,
      at: new Date().toISOString(),
      kind: 'war',
    })
    saveRichClub(club)
  }

  if (won) {
    const p = loadProfile()
    p.gold += 25 + gained * 15
    p.xp += 25
    saveProfile(p)
    addClubCrowns(2)
  }

  saveClubWar(war)
  syncClubWarStars(war)
  return {
    ok: true,
    message:
      gained > 0 ? `+${gained} war star${gained === 1 ? '' : 's'}!` : won ? 'Win — no new stars' : 'Attack failed',
    war,
  }
}

/** Instant sim attack (no real battle) — uses crowns roll. */
export function simWarAttack(
  boatId: string,
): { ok: boolean; message: string; war: ClubWarState } {
  const start = beginWarAttack(boatId)
  if (!start.ok) return { ok: false, message: start.message, war: start.war }
  const crowns = Math.random() < 0.35 ? 0 : 1 + Math.floor(Math.random() * 3)
  const won = crowns > 0
  clearPendingWarAttack()
  return resolveWarAttack(boatId, crowns, won)
}

export function claimWarRewards(): { ok: boolean; message: string; war: ClubWarState } {
  const war = advanceClubWar()
  if (war.phase !== 'ended') {
    return { ok: false, message: 'War is not over yet', war }
  }
  if (war.claimed) return { ok: false, message: 'Already claimed', war }
  if (war.battlesFought <= 0) {
    return { ok: false, message: 'Fight at least one war battle before claiming.', war }
  }
  const reward = warRewardForResult(war.ourStars, war.theirStars)
  const p = loadProfile()
  p.gold += reward.gold
  p.gems += reward.gems
  p.xp += reward.xp
  saveProfile(p)
  war.claimed = true
  war.phase = 'idle'
  saveClubWar(war)
  syncClubWarStars(war)
  addChest(war.ourStars > war.theirStars ? 'epic' : war.ourStars === war.theirStars ? 'rare' : 'common')
  return {
    ok: true,
    message: `${reward.label} +${reward.gold}g · +${reward.gems} gems`,
    war,
  }
}

/** Legacy quick fight — starts/continues war then sims one attack. */
export function playClubWarBattle(): { ok: boolean; message: string; club: RichClub | null } {
  let war = loadClubWar()
  if (war.phase === 'idle' || (war.phase === 'ended' && war.claimed)) {
    const started = startClubWar()
    if (!started.ok) return { ok: false, message: started.message, club: loadRichClub() }
    war = started.war
  }
  if (war.phase === 'collection') {
    const c = contributeWarCollection()
    return { ok: c.ok, message: c.message, club: loadRichClub() }
  }
  if (war.phase === 'ended') {
    const r = claimWarRewards()
    return { ok: r.ok, message: r.message, club: loadRichClub() }
  }
  const target = war.boats.find((b) => b.stars < 3) ?? war.boats[0]
  if (!target) return { ok: false, message: 'No boats', club: loadRichClub() }
  const r = simWarAttack(target.id)
  return { ok: r.ok, message: r.message, club: loadRichClub() }
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
    const war = loadClubWar()
    if (war.phase === 'battle' || war.phase === 'collection') {
      war.ourStars += 2
      saveClubWar(war)
    }
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

/** Cosmetic player level from XP (alias of king level curve). */
export function playerLevelInfo() {
  return kingLevelFromXp(loadProfile().xp)
}

export function loadPeakTrophies(): number {
  const p = loadProfile()
  return Math.max(p.peakTrophies ?? 0, p.trophies)
}

export function loadAvatarId(): string {
  const id = loadProfile().avatarId || 'phil'
  return CHARACTERS.some((c) => c.id === id) ? id : 'phil'
}

export function saveAvatarId(avatarId: string): void {
  const p = loadProfile()
  p.avatarId = CHARACTERS.some((c) => c.id === avatarId) ? avatarId : 'phil'
  saveProfile(p)
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
