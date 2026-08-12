/** Shared emote catalog — shop + battle picker. */
export type EmoteAnim = 'bounce' | 'wiggle' | 'bob'

export type EmoteDef = {
  id: string
  label: string
  kind: 'phil' | 'photo' | 'character' | 'emoji'
  src?: string
  charId?: string
  emoji?: string
  priceGems: number
  anim: EmoteAnim
}

const BASE = `${import.meta.env.BASE_URL}characters/`

export const PHIL_EMOTE_SRC = `${BASE}phil.png`
export const EMOTE_COACH = `${BASE}emote-coach.png`
export const EMOTE_HOOD = `${BASE}emote-hood.png`
export const EMOTE_BUZZ = `${BASE}emote-buzz.png`

export const EMOTE_CATALOG: EmoteDef[] = [
  { id: 'phil', label: 'Phil wave', kind: 'phil', priceGems: 0, anim: 'bounce' },
  { id: 'coach', label: 'Coach smile', kind: 'photo', src: EMOTE_COACH, priceGems: 50, anim: 'wiggle' },
  { id: 'hood', label: 'Hood stare', kind: 'photo', src: EMOTE_HOOD, priceGems: 50, anim: 'bob' },
  { id: 'buzz', label: 'Buzz cut', kind: 'photo', src: EMOTE_BUZZ, priceGems: 50, anim: 'bounce' },
  { id: 'emote-phil', label: 'Phil portrait', kind: 'character', charId: 'phil', priceGems: 80, anim: 'bob' },
  { id: 'emote-jeremy', label: 'Jeremy', kind: 'character', charId: 'jeremy', priceGems: 80, anim: 'wiggle' },
  { id: 'emote-kathie', label: 'Kathie', kind: 'character', charId: 'kathie', priceGems: 80, anim: 'bounce' },
  { id: 'emote-todd', label: 'Todd', kind: 'character', charId: 'todd', priceGems: 60, anim: 'bob' },
  { id: 'emote-mike', label: 'Mike', kind: 'character', charId: 'mike', priceGems: 60, anim: 'wiggle' },
  { id: 'emote-beans', label: 'Beans', kind: 'character', charId: 'beans', priceGems: 60, anim: 'bounce' },
  { id: 'emote-lynne', label: 'Lynne', kind: 'character', charId: 'lynne', priceGems: 70, anim: 'bob' },
  { id: 'emote-evilPhil', label: 'Evil Phil', kind: 'character', charId: 'evilPhil', priceGems: 120, anim: 'wiggle' },
  { id: 'emote-pete', label: 'Pete', kind: 'character', charId: 'pete', priceGems: 90, anim: 'bounce' },
  { id: 'emote-dan', label: 'Dan', kind: 'character', charId: 'dan', priceGems: 90, anim: 'bob' },
  { id: 'thumbs', label: 'Thumbs up', kind: 'emoji', emoji: '👍', priceGems: 30, anim: 'bounce' },
  { id: 'laugh', label: 'Laugh', kind: 'emoji', emoji: '😂', priceGems: 30, anim: 'wiggle' },
  { id: 'fire', label: 'Fire', kind: 'emoji', emoji: '🔥', priceGems: 40, anim: 'bob' },
]

export function getEmoteById(id: string): EmoteDef | undefined {
  return EMOTE_CATALOG.find((e) => e.id === id)
}
