/** Shared emote catalog — shop + battle picker + profile. */
export type EmoteAnim = 'bounce' | 'wiggle' | 'bob'

export type EmoteDef = {
  id: string
  label: string
  kind: 'phil' | 'photo' | 'character' | 'emoji'
  src?: string
  charId?: string
  emoji?: string
  /** Gem price in Emote Market. 0 = free / not sold (emoji starter unlocks). */
  priceGems: number
  anim: EmoteAnim
  /** If true, starts owned for every player. */
  starter?: boolean
}

const BASE = `${import.meta.env.BASE_URL}characters/`

export const PHIL_EMOTE_SRC = `${BASE}phil.png`
export const EMOTE_COACH = `${BASE}emote-coach.png`
export const EMOTE_HOOD = `${BASE}emote-hood.png`
export const EMOTE_BUZZ = `${BASE}emote-buzz.png`
export const EMOTE_PHOTO_01 = `${BASE}emote-photo-01.png`
export const EMOTE_PHOTO_02 = `${BASE}emote-photo-02.png`
export const EMOTE_PHOTO_03 = `${BASE}emote-photo-03.png`
export const EMOTE_PHOTO_04 = `${BASE}emote-photo-04.png`
export const EMOTE_PHOTO_05 = `${BASE}emote-photo-05.png`
export const EMOTE_PHOTO_06 = `${BASE}emote-photo-06.png`
export const EMOTE_PHOTO_07 = `${BASE}emote-photo-07.png`
export const EMOTE_PHOTO_08 = `${BASE}emote-photo-08.png`
export const EMOTE_PHOTO_09 = `${BASE}emote-photo-09.png`
export const EMOTE_PHOTO_10 = `${BASE}emote-photo-10.png`

export const MAX_ACTIVE_EMOTES = 12

export const EMOTE_CATALOG: EmoteDef[] = [
  { id: 'phil', label: 'Phil wave', kind: 'phil', priceGems: 0, anim: 'bounce', starter: true },
  { id: 'coach', label: 'Coach smile', kind: 'photo', src: EMOTE_COACH, priceGems: 50, anim: 'wiggle' },
  { id: 'hood', label: 'Hood stare', kind: 'photo', src: EMOTE_HOOD, priceGems: 50, anim: 'bob' },
  { id: 'buzz', label: 'Buzz cut', kind: 'photo', src: EMOTE_BUZZ, priceGems: 50, anim: 'bounce' },
  // New photo pack — full-frame circles, unlocked for everyone
  { id: 'photo-01', label: 'Event polo', kind: 'photo', src: EMOTE_PHOTO_01, priceGems: 0, anim: 'bob', starter: true },
  { id: 'photo-02', label: 'Arms crossed', kind: 'photo', src: EMOTE_PHOTO_02, priceGems: 0, anim: 'wiggle', starter: true },
  { id: 'photo-03', label: 'Blue jacket', kind: 'photo', src: EMOTE_PHOTO_03, priceGems: 0, anim: 'bounce', starter: true },
  { id: 'photo-04', label: 'Group smile', kind: 'photo', src: EMOTE_PHOTO_04, priceGems: 0, anim: 'bob', starter: true },
  { id: 'photo-05', label: 'Says what', kind: 'photo', src: EMOTE_PHOTO_05, priceGems: 0, anim: 'wiggle', starter: true },
  { id: 'photo-06', label: 'Big grin', kind: 'photo', src: EMOTE_PHOTO_06, priceGems: 0, anim: 'bounce', starter: true },
  { id: 'photo-07', label: 'Hands out', kind: 'photo', src: EMOTE_PHOTO_07, priceGems: 0, anim: 'bob', starter: true },
  { id: 'photo-08', label: 'Side glance', kind: 'photo', src: EMOTE_PHOTO_08, priceGems: 0, anim: 'wiggle', starter: true },
  { id: 'photo-09', label: 'Hairnet', kind: 'photo', src: EMOTE_PHOTO_09, priceGems: 0, anim: 'bounce', starter: true },
  { id: 'photo-10', label: 'Close-up', kind: 'photo', src: EMOTE_PHOTO_10, priceGems: 0, anim: 'bob', starter: true },
  { id: 'emote-phil', label: 'Phil portrait', kind: 'character', charId: 'phil', priceGems: 80, anim: 'bob' },
  { id: 'emote-jeremy', label: 'Jeremy', kind: 'character', charId: 'jeremy', priceGems: 80, anim: 'wiggle' },
  { id: 'emote-kathie', label: 'Kathie', kind: 'character', charId: 'kathie', priceGems: 80, anim: 'bounce' },
  { id: 'emote-todd', label: 'Todd', kind: 'character', charId: 'todd', priceGems: 60, anim: 'bob' },
  { id: 'emote-mike', label: 'Jacobson', kind: 'character', charId: 'mike', priceGems: 60, anim: 'wiggle' },
  { id: 'emote-beans', label: 'Beans', kind: 'character', charId: 'beans', priceGems: 60, anim: 'bounce' },
  { id: 'emote-lynne', label: 'Lynne', kind: 'character', charId: 'lynne', priceGems: 70, anim: 'bob' },
  { id: 'emote-evilPhil', label: 'Evil Phil', kind: 'character', charId: 'evilPhil', priceGems: 120, anim: 'wiggle' },
  { id: 'emote-pete', label: 'Pete', kind: 'character', charId: 'pete', priceGems: 90, anim: 'bounce' },
  { id: 'emote-dan', label: 'Dan', kind: 'character', charId: 'dan', priceGems: 90, anim: 'bob' },
  // Free emoji pack — auto-unlocked, not sold in Emote Market
  { id: 'thumbs', label: 'Thumbs up', kind: 'emoji', emoji: '👍', priceGems: 0, anim: 'bounce', starter: true },
  { id: 'laugh', label: 'Laugh', kind: 'emoji', emoji: '😂', priceGems: 0, anim: 'wiggle', starter: true },
  { id: 'fire', label: 'Fire', kind: 'emoji', emoji: '🔥', priceGems: 0, anim: 'bob', starter: true },
  { id: 'mad', label: 'Mad', kind: 'emoji', emoji: '😤', priceGems: 0, anim: 'wiggle', starter: true },
  { id: 'wow', label: 'Wow', kind: 'emoji', emoji: '😱', priceGems: 0, anim: 'bounce', starter: true },
  { id: 'party', label: 'Party', kind: 'emoji', emoji: '🎉', priceGems: 0, anim: 'bob', starter: true },
  { id: 'wave', label: 'Wave', kind: 'emoji', emoji: '👋', priceGems: 0, anim: 'bounce', starter: true },
  { id: 'cry', label: 'Cry', kind: 'emoji', emoji: '😢', priceGems: 0, anim: 'bob', starter: true },
  { id: 'heart', label: 'Heart', kind: 'emoji', emoji: '❤️', priceGems: 0, anim: 'bounce', starter: true },
  { id: 'cool', label: 'Cool', kind: 'emoji', emoji: '😎', priceGems: 0, anim: 'wiggle', starter: true },
  { id: 'skull', label: 'Skull', kind: 'emoji', emoji: '💀', priceGems: 0, anim: 'bob', starter: true },
  { id: 'clap', label: 'Clap', kind: 'emoji', emoji: '👏', priceGems: 0, anim: 'bounce', starter: true },
  { id: 'think', label: 'Think', kind: 'emoji', emoji: '🤔', priceGems: 0, anim: 'wiggle', starter: true },
  { id: 'kiss', label: 'Kiss', kind: 'emoji', emoji: '😘', priceGems: 0, anim: 'bob', starter: true },
  { id: 'sleep', label: 'Sleep', kind: 'emoji', emoji: '😴', priceGems: 0, anim: 'bounce', starter: true },
  { id: 'muscle', label: 'Muscle', kind: 'emoji', emoji: '💪', priceGems: 0, anim: 'wiggle', starter: true },
  { id: '100', label: '100', kind: 'emoji', emoji: '💯', priceGems: 0, anim: 'bob', starter: true },
  { id: 'eyes', label: 'Eyes', kind: 'emoji', emoji: '👀', priceGems: 0, anim: 'bounce', starter: true },
]

/** Emotes sold in Emote Market (paid photos + characters only). */
export function shopEmotes(): EmoteDef[] {
  return EMOTE_CATALOG.filter(
    (e) => (e.kind === 'photo' || e.kind === 'character') && e.priceGems > 0,
  )
}

export function starterEmoteIds(): string[] {
  return EMOTE_CATALOG.filter((e) => e.starter).map((e) => e.id)
}

export function getEmoteById(id: string): EmoteDef | undefined {
  return EMOTE_CATALOG.find((e) => e.id === id)
}

export function isPurchasableEmote(emote: EmoteDef): boolean {
  return emote.kind === 'photo' || emote.kind === 'character'
}
