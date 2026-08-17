/** Profile titles + frames — gem shop cosmetics. */

export type TitleDef = {
  id: string
  label: string
  /** Empty label = no title shown. */
  text: string
  priceGems: number
  color: string
  starter?: boolean
}

export type FrameDef = {
  id: string
  label: string
  priceGems: number
  /** CSS box-shadow ring around the avatar. */
  ring: string
  bg: string
  starter?: boolean
}

export const DEFAULT_TITLE_ID = 'title-none'
export const DEFAULT_FRAME_ID = 'frame-wood'

export const TITLE_CATALOG: TitleDef[] = [
  { id: 'title-none', label: 'No title', text: '', priceGems: 0, color: '#ffffff', starter: true },
  { id: 'title-rookie', label: 'Rookie', text: 'Rookie', priceGems: 40, color: '#c8d4e0' },
  { id: 'title-diner', label: 'Diner Regular', text: 'Diner Regular', priceGems: 60, color: '#ff8a7a' },
  { id: 'title-pancake', label: 'Pancake Ace', text: 'Pancake Ace', priceGems: 70, color: '#ffd27a' },
  { id: 'title-sundae', label: 'Sundae Slayer', text: 'Sundae Slayer', priceGems: 80, color: '#ff9ad8' },
  { id: 'title-gym', label: 'Gym Rat', text: 'Gym Rat', priceGems: 80, color: '#7ec8ff' },
  { id: 'title-hunter', label: 'Trophy Hunter', text: 'Trophy Hunter', priceGems: 90, color: '#f5d76e' },
  { id: 'title-cluck', label: 'Clucktown Champ', text: 'Clucktown Champ', priceGems: 100, color: '#7dff9a' },
  { id: 'title-durling', label: 'Durling Legend', text: 'Durling Legend', priceGems: 120, color: '#9b6bff' },
  { id: 'title-evil', label: 'Evil Twin', text: 'Evil Twin', priceGems: 120, color: '#c060ff' },
  { id: 'title-king', label: 'King of the Arena', text: 'King of the Arena', priceGems: 200, color: '#ffe08a' },
]

export const FRAME_CATALOG: FrameDef[] = [
  {
    id: 'frame-wood',
    label: 'Wood',
    priceGems: 0,
    ring: '0 0 0 2px #c9a227, 0 3px 0 #00000066',
    bg: 'linear-gradient(180deg,#3a2418,#1a100c)',
    starter: true,
  },
  {
    id: 'frame-gold',
    label: 'Gold Royale',
    priceGems: 80,
    ring: '0 0 0 3px #f5d76e, 0 0 10px #f5d76e88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#ffe08a,#c9a227)',
  },
  {
    id: 'frame-ice',
    label: 'Ice Blue',
    priceGems: 80,
    ring: '0 0 0 3px #7ec8ff, 0 0 10px #4a9eff88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#c8f0ff,#2f6fbf)',
  },
  {
    id: 'frame-ember',
    label: 'Ember',
    priceGems: 90,
    ring: '0 0 0 3px #ff7a4a, 0 0 10px #ff3b3b66, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#ffb47a,#c63c2e)',
  },
  {
    id: 'frame-forest',
    label: 'Forest',
    priceGems: 70,
    ring: '0 0 0 3px #7dff9a, 0 0 10px #3ecf6a66, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#b8ffc8,#1a7a3a)',
  },
  {
    id: 'frame-chrome',
    label: 'Diner Chrome',
    priceGems: 100,
    ring: '0 0 0 3px #e8eef6, 0 0 0 5px #ff4da8, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#f4f7fb,#8a9bb0)',
  },
  {
    id: 'frame-legend',
    label: 'Legendary',
    priceGems: 120,
    ring: '0 0 0 3px #d48af0, 0 0 12px #9b6bff99, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#e8c0ff,#5a2fbf)',
  },
  {
    id: 'frame-night',
    label: 'Night Sky',
    priceGems: 90,
    ring: '0 0 0 3px #4a9eff, 0 0 10px #1a2a40aa, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#2f4a80,#0a1020)',
  },
  {
    id: 'frame-crown',
    label: 'Crown',
    priceGems: 150,
    ring: '0 0 0 3px #ffe08a, 0 0 0 6px #9b6bff, 0 0 14px #f5d76e88, 0 3px 0 #00000066',
    bg: 'linear-gradient(160deg,#fff3a8,#c9a227 40%, #5a2fbf)',
  },
]

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
