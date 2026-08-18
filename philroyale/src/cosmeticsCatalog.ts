/** Profile titles + frames — gem shop cosmetics. */

export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary'

export const TITLE_RARITY_COLOR: Record<TitleRarity, string> = {
  common: '#b8c0c8',
  rare: '#ff9a3c',
  epic: '#c060ff',
  legendary: '#ffe14a',
}

export const TITLE_RARITY_LABEL: Record<TitleRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

export type TitleDef = {
  id: string
  label: string
  /** Empty = no title shown. */
  text: string
  priceGems: number
  rarity: TitleRarity
  starter?: boolean
}

export type FrameShape =
  | 'square'
  | 'round'
  | 'hex'
  | 'diamond'
  | 'shield'
  | 'octagon'
  | 'star'
  | 'heart'
  | 'badge'

export type FrameDef = {
  id: string
  label: string
  priceGems: number
  shape: FrameShape
  /** Outer rim color for clip-path shapes. */
  edge: string
  /** CSS box-shadow ring around the avatar. */
  ring: string
  bg: string
  rarity?: TitleRarity
  starter?: boolean
}

export const DEFAULT_TITLE_ID = 'title-none'
export const DEFAULT_FRAME_ID = 'frame-wood'

export const TITLE_CATALOG: TitleDef[] = [
  { id: 'title-none', label: 'No title', text: '', priceGems: 0, rarity: 'common', starter: true },
  { id: 'title-rookie', label: 'Rookie', text: 'Rookie', priceGems: 40, rarity: 'common' },
  { id: 'title-diner', label: 'Diner Regular', text: 'Diner Regular', priceGems: 50, rarity: 'common' },
  { id: 'title-cheese', label: 'Philly Cheese Stake', text: 'Philly Cheese Stake', priceGems: 40, rarity: 'common' },
  { id: 'title-pancake', label: 'Pancake Ace', text: 'Pancake Ace', priceGems: 70, rarity: 'rare' },
  { id: 'title-sundae', label: 'Sundae Slayer', text: 'Sundae Slayer', priceGems: 80, rarity: 'rare' },
  { id: 'title-gym', label: 'Gym Rat', text: 'Gym Rat', priceGems: 80, rarity: 'rare' },
  { id: 'title-love-phil', label: 'I ❤️ Phil', text: 'I ❤️ Phil', priceGems: 80, rarity: 'rare' },
  { id: 'title-mighty-phil', label: 'The Mighty Phil', text: 'The Mighty Phil', priceGems: 80, rarity: 'rare' },
  { id: 'title-pete-sake', label: "For Pete's Sake", text: "For Pete's Sake", priceGems: 80, rarity: 'rare' },
  { id: 'title-hunter', label: 'Trophy Hunter', text: 'Trophy Hunter', priceGems: 110, rarity: 'epic' },
  { id: 'title-cluck', label: 'Clucktown Champ', text: 'Clucktown Champ', priceGems: 110, rarity: 'epic' },
  { id: 'title-evil', label: 'Evil Twin', text: 'Evil Twin', priceGems: 120, rarity: 'epic' },
  { id: 'title-last-phillip', label: 'The Last Phillip', text: 'The Last Phillip', priceGems: 130, rarity: 'epic' },
  { id: 'title-love-pete', label: 'For The Love Of Pete', text: 'For The Love Of Pete', priceGems: 130, rarity: 'epic' },
  { id: 'title-durling', label: 'Durling Legend', text: 'Durling Legend', priceGems: 200, rarity: 'legendary' },
  { id: 'title-king', label: 'King of the Arena', text: 'King of the Arena', priceGems: 200, rarity: 'legendary' },
  {
    id: 'title-grandson',
    label: "Phil's Favorite Grandson",
    text: "Phil's Favorite Grandson",
    priceGems: 220,
    rarity: 'legendary',
  },
  {
    id: 'title-all-for-phil',
    label: 'All For Phil Or Phil For None',
    text: 'All For Phil Or Phil For None',
    priceGems: 220,
    rarity: 'legendary',
  },
]

export const FRAME_CATALOG: FrameDef[] = [
  {
    id: 'frame-wood',
    label: 'Wood',
    priceGems: 0,
    shape: 'square',
    edge: '#c9a227',
    ring: '0 0 0 2px #c9a227, 0 3px 0 #00000066',
    bg: 'linear-gradient(180deg,#3a2418,#1a100c)',
    starter: true,
  },
  {
    id: 'frame-gold',
    label: 'Gold Royale',
    priceGems: 80,
    shape: 'square',
    edge: '#f5d76e',
    ring: '0 0 0 3px #f5d76e, 0 0 10px #f5d76e88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#ffe08a,#c9a227)',
  },
  {
    id: 'frame-round',
    label: 'Medal',
    priceGems: 80,
    shape: 'round',
    edge: '#f5d76e',
    ring: '0 0 0 3px #f5d76e, 0 0 12px #f5d76e99, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#ffe08a,#c9a227)',
  },
  {
    id: 'frame-ice',
    label: 'Ice Blue',
    priceGems: 80,
    shape: 'round',
    edge: '#7ec8ff',
    ring: '0 0 0 3px #7ec8ff, 0 0 10px #4a9eff88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#c8f0ff,#2f6fbf)',
  },
  {
    id: 'frame-hex',
    label: 'Hex',
    priceGems: 100,
    shape: 'hex',
    edge: '#7dff9a',
    ring: '0 0 0 3px #7dff9a, 0 0 12px #3ecf6a77, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#b8ffc8,#1a7a3a)',
  },
  {
    id: 'frame-ember',
    label: 'Ember',
    priceGems: 90,
    shape: 'octagon',
    edge: '#ff7a4a',
    ring: '0 0 0 3px #ff7a4a, 0 0 10px #ff3b3b66, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#ffb47a,#c63c2e)',
  },
  {
    id: 'frame-diamond',
    label: 'Diamond',
    priceGems: 110,
    shape: 'diamond',
    edge: '#9b6bff',
    ring: '0 0 0 3px #7ec8ff, 0 0 14px #9b6bff88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#e8f4ff,#4a9eff)',
  },
  {
    id: 'frame-shield',
    label: 'Shield',
    priceGems: 120,
    shape: 'shield',
    edge: '#c9a227',
    ring: '0 0 0 3px #c9a227, 0 0 12px #f5d76e77, 0 3px 0 #00000066',
    bg: 'linear-gradient(180deg,#ffe08a,#8a5a10)',
  },
  {
    id: 'frame-forest',
    label: 'Forest',
    priceGems: 70,
    shape: 'square',
    edge: '#7dff9a',
    ring: '0 0 0 3px #7dff9a, 0 0 10px #3ecf6a66, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#b8ffc8,#1a7a3a)',
  },
  {
    id: 'frame-chrome',
    label: 'Diner Chrome',
    priceGems: 100,
    shape: 'badge',
    edge: '#ff4da8',
    ring: '0 0 0 3px #e8eef6, 0 0 0 5px #ff4da8, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#f4f7fb,#8a9bb0)',
  },
  {
    id: 'frame-legend',
    label: 'Legendary',
    priceGems: 120,
    shape: 'hex',
    edge: '#d48af0',
    ring: '0 0 0 3px #d48af0, 0 0 12px #9b6bff99, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#e8c0ff,#5a2fbf)',
  },
  {
    id: 'frame-night',
    label: 'Night Sky',
    priceGems: 90,
    shape: 'octagon',
    edge: '#4a9eff',
    ring: '0 0 0 3px #4a9eff, 0 0 10px #1a2a40aa, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#2f4a80,#0a1020)',
  },
  {
    id: 'frame-star',
    label: 'Star',
    priceGems: 150,
    shape: 'star',
    edge: '#ffe08a',
    ring: '0 0 0 3px #ffe08a, 0 0 14px #f5d76e88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#fff3a8,#c9a227)',
  },
  {
    id: 'frame-heart',
    label: 'Heart',
    priceGems: 110,
    shape: 'heart',
    edge: '#ff6ad8',
    ring: '0 0 0 3px #ff6ad8, 0 0 12px #ff4da888, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#ffb4e8,#c63c6e)',
  },
  {
    id: 'frame-crown',
    label: 'Crown',
    priceGems: 150,
    shape: 'shield',
    edge: '#ffe08a',
    ring: '0 0 0 3px #ffe08a, 0 0 0 6px #9b6bff, 0 0 14px #f5d76e88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#fff3a8,#c9a227 40%, #5a2fbf)',
  },
]

export const FRAME_CLIP: Record<FrameShape, string> = {
  square: 'inset(0 round 0.55rem)',
  round: 'circle(50% at 50% 50%)',
  hex: 'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)',
  diamond: 'polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)',
  shield: 'polygon(12% 8%, 88% 8%, 96% 28%, 96% 58%, 50% 100%, 4% 58%, 4% 28%)',
  octagon: 'polygon(30% 4%, 70% 4%, 96% 30%, 96% 70%, 70% 96%, 30% 96%, 4% 70%, 4% 30%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  heart:
    'polygon(50% 92%, 8% 54%, 2% 32%, 12% 10%, 32% 4%, 50% 18%, 68% 4%, 88% 10%, 98% 32%, 92% 54%)',
  badge: 'circle(50% at 50% 50%)',
}

export function titleColor(title: Pick<TitleDef, 'rarity'>): string {
  return TITLE_RARITY_COLOR[title.rarity]
}

export function getTitle(id: string | undefined | null): TitleDef {
  return TITLE_CATALOG.find((t) => t.id === id) ?? TITLE_CATALOG[0]!
}

export function getFrame(id: string | undefined | null): FrameDef {
  return FRAME_CATALOG.find((f) => f.id === id) ?? FRAME_CATALOG[0]!
}

export function shopTitles(): TitleDef[] {
  return TITLE_CATALOG.filter((t) => t.priceGems > 0)
}

export function shopFrames(): FrameDef[] {
  return FRAME_CATALOG.filter((f) => f.priceGems > 0)
}

export function rarityFromGems(gems: number): TitleRarity {
  if (gems >= 180) return 'legendary'
  if (gems >= 110) return 'epic'
  if (gems >= 70) return 'rare'
  return 'common'
}

export function frameRarity(f: FrameDef): TitleRarity {
  return f.rarity ?? rarityFromGems(f.priceGems)
}

export type TowerSkinDef = {
  id: string
  label: string
  priceGems: number
  rarity: TitleRarity
  face: string
  merlon: string
  accent: string
  starter?: boolean
}

export const DEFAULT_TOWER_SKIN_ID = 'tower-stone'

export const TOWER_SKIN_CATALOG: TowerSkinDef[] = [
  {
    id: 'tower-stone',
    label: 'Stone Keep',
    priceGems: 0,
    rarity: 'common',
    face: '#cfc6b6',
    merlon: '#d8d2c4',
    accent: '#f0d060',
    starter: true,
  },
  {
    id: 'tower-timber',
    label: 'Timber Keep',
    priceGems: 50,
    rarity: 'common',
    face: '#c48a3a',
    merlon: '#e0b878',
    accent: '#f5d76e',
  },
  {
    id: 'tower-ice',
    label: 'Ice Keep',
    priceGems: 90,
    rarity: 'rare',
    face: '#c8e8ff',
    merlon: '#e8f6ff',
    accent: '#7ec8ff',
  },
  {
    id: 'tower-gold',
    label: 'Gold Keep',
    priceGems: 100,
    rarity: 'rare',
    face: '#ffe08a',
    merlon: '#fff3a8',
    accent: '#c9a227',
  },
  {
    id: 'tower-ember',
    label: 'Ember Keep',
    priceGems: 140,
    rarity: 'epic',
    face: '#ff9a4a',
    merlon: '#ffc078',
    accent: '#ff3b3b',
  },
  {
    id: 'tower-neon',
    label: 'Neon Keep',
    priceGems: 150,
    rarity: 'epic',
    face: '#c080ff',
    merlon: '#e8c0ff',
    accent: '#7dff9a',
  },
  {
    id: 'tower-royal',
    label: 'Royal Keep',
    priceGems: 220,
    rarity: 'legendary',
    face: '#fff3a8',
    merlon: '#ffe08a',
    accent: '#9b6bff',
  },
  {
    id: 'tower-void',
    label: 'Night Keep',
    priceGems: 240,
    rarity: 'legendary',
    face: '#2a3048',
    merlon: '#4a5580',
    accent: '#4a9eff',
  },
]

export type BannerDef = {
  id: string
  label: string
  priceGems: number
  rarity: TitleRarity
  theme: 'gold' | 'blue' | 'diner' | 'sundae' | 'fire' | 'pixel' | 'royal' | 'phil'
  starter?: boolean
}

export const DEFAULT_BANNER_ID = 'banner-gold'

export const BANNER_CATALOG: BannerDef[] = [
  { id: 'banner-gold', label: 'Gold Ribbon', priceGems: 0, rarity: 'common', theme: 'gold', starter: true },
  { id: 'banner-blue', label: 'Blue Check', priceGems: 50, rarity: 'common', theme: 'blue' },
  { id: 'banner-diner', label: 'Diner Stripe', priceGems: 80, rarity: 'rare', theme: 'diner' },
  { id: 'banner-sundae', label: 'Sundae Scene', priceGems: 90, rarity: 'rare', theme: 'sundae' },
  { id: 'banner-fire', label: 'Fire Pit', priceGems: 130, rarity: 'epic', theme: 'fire' },
  { id: 'banner-pixel', label: 'Pixel Skull', priceGems: 140, rarity: 'epic', theme: 'pixel' },
  { id: 'banner-royal', label: 'King Banner', priceGems: 200, rarity: 'legendary', theme: 'royal' },
  { id: 'banner-phil', label: 'Phil Forever', priceGems: 220, rarity: 'legendary', theme: 'phil' },
]

export function getTowerSkin(id: string | undefined | null): TowerSkinDef {
  return TOWER_SKIN_CATALOG.find((t) => t.id === id) ?? TOWER_SKIN_CATALOG[0]!
}

export function getBanner(id: string | undefined | null): BannerDef {
  return BANNER_CATALOG.find((b) => b.id === id) ?? BANNER_CATALOG[0]!
}

export function shopTowerSkins(): TowerSkinDef[] {
  return TOWER_SKIN_CATALOG.filter((t) => t.priceGems > 0)
}

export function shopBanners(): BannerDef[] {
  return BANNER_CATALOG.filter((b) => b.priceGems > 0)
}

export function sanitizeTowerSkinId(id: string | undefined | null): string {
  return TOWER_SKIN_CATALOG.some((t) => t.id === id) ? id! : DEFAULT_TOWER_SKIN_ID
}

export function sanitizeBannerId(id: string | undefined | null): string {
  return BANNER_CATALOG.some((b) => b.id === id) ? id! : DEFAULT_BANNER_ID
}

export type CosmeticDropKind = 'title' | 'frame' | 'emote' | 'towerSkin' | 'banner'

export type CosmeticDrop = {
  kind: CosmeticDropKind
  id: string
  label: string
  rarity: TitleRarity
}

export type CosmeticIds = {
  titleId: string
  frameId: string
  avatarId?: string
}

export function sanitizeTitleId(id: string | undefined | null): string {
  return TITLE_CATALOG.some((t) => t.id === id) ? id! : DEFAULT_TITLE_ID
}

export function sanitizeFrameId(id: string | undefined | null): string {
  return FRAME_CATALOG.some((f) => f.id === id) ? id! : DEFAULT_FRAME_ID
}
