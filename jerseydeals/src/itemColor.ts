import type { Listing } from './listings'

const COLOR_WORDS: { re: RegExp; name: string; hex: string }[] = [
  { re: /\b(navy|dark blue)\b/i, name: 'Navy', hex: '#0b223f' },
  { re: /\b(sky|light blue|baby blue)\b/i, name: 'Sky blue', hex: '#6CABDD' },
  { re: /\b(royal\s*blue)\b/i, name: 'Royal blue', hex: '#034694' },
  { re: /\b(maroon|burgundy|wine)\b/i, name: 'Maroon', hex: '#6B1D2A' },
  { re: /\b(crimson|scarlet|red)\b/i, name: 'Red', hex: '#C8102E' },
  { re: /\b(pink|rose)\b/i, name: 'Pink', hex: '#F7B5CD' },
  { re: /\b(black|noir)\b/i, name: 'Black', hex: '#111111' },
  { re: /\b(white|blanc|ivory)\b/i, name: 'White', hex: '#f5f5f5' },
  { re: /\b(yellow|gold)\b/i, name: 'Yellow', hex: '#FDE100' },
  { re: /\b(green|verde)\b/i, name: 'Green', hex: '#006847' },
  { re: /\b(orange)\b/i, name: 'Orange', hex: '#E85D04' },
  { re: /\b(purple|violet)\b/i, name: 'Purple', hex: '#4A148C' },
  { re: /\b(charcoal|heather|silver|grey|gray)\b/i, name: 'Grey', hex: '#8B9099' },
  { re: /\b(brown|tan|beige|khaki)\b/i, name: 'Brown', hex: '#8B5E3C' },
]

/** USA crest / pride blanks in this shop are typically heather grey. */
function isUsaCrestTee(blob: string) {
  return /\busa\b/i.test(blob) && /\b(crest|pride)\b/i.test(blob) && /\bt-?shirts?\b/i.test(blob)
}

function matchColor(text: string): { name: string; hex: string } | null {
  // Prefer a color word at the start of the title/slug ("Yellow Puma…", "grey-adidas-…").
  const start = text.trim()
  for (const row of COLOR_WORDS) {
    const anchored = new RegExp(`^[^a-z0-9]{0,6}${row.re.source}`, 'i')
    if (anchored.test(start)) return { name: row.name, hex: row.hex }
  }
  for (const row of COLOR_WORDS) {
    if (row.re.test(text)) return { name: row.name, hex: row.hex }
  }
  return null
}

/** Garment color for the item profile — never a club/country name. */
export function listingDisplayColor(item: Listing): { name: string; hex: string } {
  const title = item.title || ''
  const url = item.url || ''
  const desc = item.description || ''
  const tag = `${item.tag || ''} ${item.note || ''} ${item.category || ''}`
  const blob = `${title}\n${url}\n${desc}\n${tag}`

  const fromTitle = matchColor(title)
  if (fromTitle) return fromTitle

  const fromUrl = matchColor(url.replace(/[-_/]+/g, ' '))
  if (fromUrl) return fromUrl

  const fromRest = matchColor(`${desc} ${tag}`)
  if (fromRest) return fromRest

  if (isUsaCrestTee(blob)) return { name: 'Grey', hex: '#8B9099' }

  return { name: 'As pictured', hex: '#6B7280' }
}
