import { CHARACTERS } from './characters'

export type ClubRole = 'leader' | 'coLeader' | 'elder' | 'member'
export type ClubAccess = 'open' | 'invite'

export type ClubMember = {
  id: string
  name: string
  role: ClubRole
  trophies: number
  donations: number
  online: boolean
  isYou?: boolean
  /** Live account code — used for friend invite / profile. */
  playerId?: string
}

export type ClubChatMsg = {
  id: string
  from: string
  text: string
  at: string
  kind: 'chat' | 'donate' | 'join' | 'system' | 'war'
}

export type ClubDonateRequest = {
  id: string
  from: string
  charId: string
  need: number
  have: number
  createdAt: string
}

export type RichClub = {
  id: string
  name: string
  tag: string
  description: string
  code: string
  badge: number
  access: ClubAccess
  minTrophies: number
  /** Aggregate club trophies */
  trophies: number
  weeklyDonations: number
  /** 0–100 club chest crowns */
  chestCrowns: number
  chestClaimed: boolean
  members: ClubMember[]
  chat: ClubChatMsg[]
  donateRequests: ClubDonateRequest[]
  /** Club war stars this week */
  warStars: number
  warDay: number
  createdAt: string
}

export const CLUB_BADGES = [
  { id: 0, label: 'Shield', color: '#4a9eff' },
  { id: 1, label: 'Crown', color: '#f5d76e' },
  { id: 2, label: 'Skull', color: '#c0c0c8' },
  { id: 3, label: 'Flame', color: '#ff6a3a' },
  { id: 4, label: 'Leaf', color: '#7dff9a' },
  { id: 5, label: 'Moon', color: '#b14fd6' },
  { id: 6, label: 'Star', color: '#ffe08a' },
  { id: 7, label: 'Sword', color: '#e8a0a0' },
  { id: 8, label: 'Bolt', color: '#8ec8ff' },
  { id: 9, label: 'Heart', color: '#ff8ab8' },
  { id: 10, label: 'Tower', color: '#c9a227' },
  { id: 11, label: 'Phil', color: '#5ad0ff' },
] as const

export const CLUB_MAX_MEMBERS = 50
export const CLUB_CHEST_GOAL = 100
export const DONATE_LIMIT_DAY = 40

const BOT_NAMES = [
  'RiverRaid',
  'SundaeSam',
  'BoneBaron',
  'YardYeti',
  'PeakPete',
  'WhipWizard',
  'FinleyFan',
  'BeansBoss',
  'ToddTornado',
  'MikeMax',
  'LynneLightning',
  'DanDome',
  'KathieKing',
  'JeremyJet',
  'RoyalRook',
  'ArenaAce',
  'CrownCrusher',
  'ElixirElf',
  'BridgeBandit',
  'TrophyTiger',
]

export function roleRank(role: ClubRole): number {
  if (role === 'leader') return 4
  if (role === 'coLeader') return 3
  if (role === 'elder') return 2
  return 1
}

export function roleLabel(role: ClubRole): string {
  if (role === 'coLeader') return 'Co-leader'
  if (role === 'leader') return 'Leader'
  if (role === 'elder') return 'Elder'
  return 'Member'
}

export function weekKey(d = new Date()): string {
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

export function generateClubMembers(
  leaderName: string,
  seed: string,
  yourTrophies: number,
): ClubMember[] {
  const n = 8 + (seed.charCodeAt(0) % 10)
  const members: ClubMember[] = [
    {
      id: 'you',
      name: leaderName || 'You',
      role: 'leader',
      trophies: yourTrophies,
      donations: 0,
      online: true,
      isYou: true,
    },
  ]
  for (let i = 0; i < n; i++) {
    const name = BOT_NAMES[(seed.charCodeAt(i % seed.length) + i * 3) % BOT_NAMES.length]!
    const role: ClubRole = i === 0 ? 'coLeader' : i < 3 ? 'elder' : 'member'
    members.push({
      id: `m-${seed}-${i}`,
      name: `${name}${i + 1}`,
      role,
      trophies: Math.max(0, yourTrophies + ((i * 137 + seed.length * 11) % 900) - 300),
      donations: (i * 17 + seed.charCodeAt(0)) % 120,
      online: (i + seed.charCodeAt(0)) % 3 !== 0,
    })
  }
  return members.sort((a, b) => b.trophies - a.trophies)
}

export function seedClubChat(clubName: string): ClubChatMsg[] {
  const now = Date.now()
  return [
    {
      id: 'c0',
      from: 'System',
      text: `Welcome to ${clubName}! Donate cards, fill the club chest, and win wars.`,
      at: new Date(now - 3600000).toISOString(),
      kind: 'system',
    },
    {
      id: 'c1',
      from: 'RiverRaid1',
      text: 'Anyone free for a friendly?',
      at: new Date(now - 1800000).toISOString(),
      kind: 'chat',
    },
    {
      id: 'c2',
      from: 'SundaeSam2',
      text: 'Donating Finleys — request if you need!',
      at: new Date(now - 900000).toISOString(),
      kind: 'chat',
    },
  ]
}

export function randomDonateCharId(): string {
  const pool = CHARACTERS.filter((c) => c.rarity === 'common' || c.rarity === 'rare')
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? 'finley'
}

export function clubChestTier(crowns: number): {
  label: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
} {
  if (crowns >= 100) return { label: 'Legendary Club Chest', rarity: 'legendary' }
  if (crowns >= 70) return { label: 'Epic Club Chest', rarity: 'epic' }
  if (crowns >= 40) return { label: 'Rare Club Chest', rarity: 'rare' }
  return { label: 'Common Club Chest', rarity: 'common' }
}

/** Season pass free track — CR-like rewards. */
export type SeasonReward = {
  points: number
  gold?: number
  gems?: number
  chest?: 'common' | 'rare' | 'epic'
  copies?: { rarity: 'common' | 'rare' | 'epic'; amount: number }
}

export const SEASON_FREE_TRACK: SeasonReward[] = [
  { points: 0, gold: 50 },
  { points: 20, chest: 'common' },
  { points: 40, gold: 100 },
  { points: 60, copies: { rarity: 'common', amount: 5 } },
  { points: 80, gems: 5 },
  { points: 100, chest: 'rare' },
  { points: 130, gold: 200 },
  { points: 160, copies: { rarity: 'rare', amount: 3 } },
  { points: 200, chest: 'epic' },
  { points: 250, gold: 400, gems: 10 },
  { points: 300, copies: { rarity: 'epic', amount: 2 } },
  { points: 400, chest: 'epic', gold: 500 },
]

export function currentSeasonId(): string {
  const d = new Date()
  return `${d.getFullYear()}-S${d.getMonth() + 1}`
}

export function kingLevelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1
  let remain = Math.max(0, xp)
  let need = 100
  while (remain >= need && level < 50) {
    remain -= need
    level += 1
    need = 80 + level * 40
  }
  return { level, into: remain, need }
}
