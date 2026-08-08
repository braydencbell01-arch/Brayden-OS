import { clubOutlineColor } from './clubColors'
import { inferClub, type Listing } from './listings'

const COLOR_WORDS: { re: RegExp; name: string; hex: string }[] = [
  { re: /\b(navy|dark blue)\b/i, name: 'Navy', hex: '#0b223f' },
  { re: /\b(sky|light blue|baby blue)\b/i, name: 'Sky blue', hex: '#6CABDD' },
  { re: /\b(royal|blue)\b/i, name: 'Blue', hex: '#034694' },
  { re: /\b(crimson|scarlet|red)\b/i, name: 'Red', hex: '#C8102E' },
  { re: /\b(pink|rose)\b/i, name: 'Pink', hex: '#F7B5CD' },
  { re: /\b(black|noir)\b/i, name: 'Black', hex: '#111111' },
  { re: /\b(white|blanc)\b/i, name: 'White', hex: '#f5f5f5' },
  { re: /\b(yellow|gold)\b/i, name: 'Yellow', hex: '#FDE100' },
  { re: /\b(green|verde)\b/i, name: 'Green', hex: '#006847' },
  { re: /\b(orange)\b/i, name: 'Orange', hex: '#E85D04' },
  { re: /\b(purple|violet)\b/i, name: 'Purple', hex: '#4A148C' },
  { re: /\b(grey|gray)\b/i, name: 'Grey', hex: '#6B7280' },
]

/** Single display color for a listing (GoalKick-style one swatch). */
export function listingDisplayColor(item: Listing): { name: string; hex: string } {
  const title = item.title || ''
  for (const row of COLOR_WORDS) {
    if (row.re.test(title)) return { name: row.name, hex: row.hex }
  }
  const club = inferClub(title)
  if (club) {
    return {
      name: club.name.split(' ').slice(-1)[0] || 'Club',
      hex: clubOutlineColor(club.id, '#0b223f'),
    }
  }
  return { name: 'As pictured', hex: '#0b223f' }
}
