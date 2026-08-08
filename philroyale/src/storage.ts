import { CHARACTERS, DEFAULT_DECK, DECK_SIZE } from './characters'

const DECK_KEY = 'philroyale.deck'
const FRIENDS_KEY = 'philroyale.friends'
const CLUBS_KEY = 'philroyale.clubs'
const MY_CLUB_KEY = 'philroyale.myClub'

export type Friend = {
  id: string
  name: string
  online: boolean
}

export type Club = {
  id: string
  name: string
  tag: string
  members: number
  description: string
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

const SEED_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Alex', online: true },
  { id: 'f2', name: 'Sam', online: false },
  { id: 'f3', name: 'Jordan', online: true },
]

export function loadFriends(): Friend[] {
  return readJson(FRIENDS_KEY, SEED_FRIENDS)
}

export function saveFriends(friends: Friend[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
}

const SEED_CLUBS: Club[] = [
  {
    id: 'c1',
    name: 'Crown Crushers',
    tag: '#CCRUSH',
    members: 42,
    description: 'Friendly wars, active chat.',
  },
  {
    id: 'c2',
    name: 'Bridge Bandits',
    tag: '#BRIDGB',
    members: 28,
    description: 'Push both lanes. No mercy.',
  },
  {
    id: 'c3',
    name: 'Elixir Elite',
    tag: '#ELIXIR',
    members: 51,
    description: 'Cycle decks welcome.',
  },
]

export function loadClubs(): Club[] {
  return readJson(CLUBS_KEY, SEED_CLUBS)
}

export function saveClubs(clubs: Club[]): void {
  localStorage.setItem(CLUBS_KEY, JSON.stringify(clubs))
}

export function loadMyClubId(): string | null {
  return localStorage.getItem(MY_CLUB_KEY)
}

export function saveMyClubId(id: string | null): void {
  if (id == null) localStorage.removeItem(MY_CLUB_KEY)
  else localStorage.setItem(MY_CLUB_KEY, id)
}
