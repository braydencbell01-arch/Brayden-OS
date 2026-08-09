/** Clash-style Club War helpers (phases, boats, stars). */

export type WarPhase = 'idle' | 'collection' | 'battle' | 'ended'

export type WarBoat = {
  id: string
  defenderName: string
  defenderTrophies: number
  /** Best stars scored on this boat (0–3) */
  stars: number
  attacks: number
}

export type ClubWarState = {
  weekId: string
  phase: WarPhase
  /** Phase end timestamp (ms) */
  phaseEndsAt: number
  ourStars: number
  theirStars: number
  enemyName: string
  enemyTag: string
  enemyBadge: number
  /** Enemy boats you can attack */
  boats: WarBoat[]
  attacksLeft: number
  collection: number
  collectionGoal: number
  claimed: boolean
  /** Last time enemy AI scored */
  lastEnemyTick: number
  battlesFought: number
}

export const WAR_ATTACKS_PER_DAY = 2
export const WAR_COLLECTION_MS = 8 * 60 * 60 * 1000 // 8h local sim
export const WAR_BATTLE_MS = 16 * 60 * 60 * 1000 // 16h
export const WAR_BOAT_COUNT = 8

const ENEMY_CLUBS = [
  { name: 'Bone Brigade', tag: '#B0NE', badge: 2 },
  { name: 'Elixir Empire', tag: '#ELIX', badge: 3 },
  { name: 'Bridge Bandits', tag: '#BRDG', badge: 7 },
  { name: 'Crown Crushers', tag: '#CRWN', badge: 1 },
  { name: 'River Raiders', tag: '#RIVR', badge: 4 },
  { name: 'Arena Assassins', tag: '#ARNA', badge: 8 },
  { name: 'Phil Phalanx', tag: '#PHIL', badge: 11 },
  { name: 'Trophy Titans', tag: '#TRPH', badge: 6 },
] as const

const DEFENDER_NAMES = [
  'Spike',
  'Nova',
  'Brick',
  'Luna',
  'Rex',
  'Ivy',
  'Knox',
  'Jade',
  'Blitz',
  'Ash',
  'Vex',
  'Coral',
  'Drake',
  'Quinn',
  'Bolt',
  'Sage',
]

export function emptyWar(weekId: string): ClubWarState {
  return {
    weekId,
    phase: 'idle',
    phaseEndsAt: 0,
    ourStars: 0,
    theirStars: 0,
    enemyName: '',
    enemyTag: '',
    enemyBadge: 0,
    boats: [],
    attacksLeft: WAR_ATTACKS_PER_DAY,
    collection: 0,
    collectionGoal: 4,
    claimed: false,
    lastEnemyTick: 0,
    battlesFought: 0,
  }
}

export function pickEnemyClub(seed: string): (typeof ENEMY_CLUBS)[number] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return ENEMY_CLUBS[h % ENEMY_CLUBS.length]!
}

export function makeEnemyBoats(seed: string, baseTrophies: number): WarBoat[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0
  const boats: WarBoat[] = []
  for (let i = 0; i < WAR_BOAT_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    const name = DEFENDER_NAMES[h % DEFENDER_NAMES.length]!
    boats.push({
      id: `boat-${i}`,
      defenderName: `${name}${h % 90}`,
      defenderTrophies: Math.max(0, baseTrophies + ((h % 400) - 150)),
      stars: 0,
      attacks: 0,
    })
  }
  return boats.sort((a, b) => b.defenderTrophies - a.defenderTrophies)
}

/** Crowns from a battle → war stars (Clash-like). */
export function crownsToWarStars(crowns: number): number {
  if (crowns >= 3) return 3
  if (crowns >= 2) return 2
  if (crowns >= 1) return 1
  return 0
}

export function warRewardForResult(
  our: number,
  their: number,
): { gold: number; gems: number; xp: number; label: string } {
  if (our > their) return { gold: 400, gems: 10, xp: 120, label: 'War Victory!' }
  if (our === their) return { gold: 200, gems: 4, xp: 60, label: 'War Draw' }
  return { gold: 100, gems: 2, xp: 30, label: 'War Defeat' }
}

export function phaseLabel(phase: WarPhase): string {
  if (phase === 'collection') return 'Collection Day'
  if (phase === 'battle') return 'War Day'
  if (phase === 'ended') return 'War Over'
  return 'No Active War'
}

export function formatWarRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
