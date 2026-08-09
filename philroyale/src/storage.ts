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
