/**
 * Permanently hide kits from the site catalog (still may exist on Square).
 * Prefer this over deleting listings.json rows that inventory sync can re-add.
 */
const HIDDEN_ITEM_IDS = new Set([
  'UQWJCMVXI44M4BYKG5ZXMUFO', // Ajax scarf (mislabeled "Ajax Kit — Standard")
  'OX7AAG6BBHIQYZ4OEW4GUWFM',
])

const HIDDEN_TITLE_RE = /\bajax\b.*\b(scarf|kit — standard|kit - standard)\b/i

export function isListingHidden(item: {
  id?: string
  itemId?: string
  title?: string
}): boolean {
  if (item.id && HIDDEN_ITEM_IDS.has(item.id)) return true
  if (item.itemId && HIDDEN_ITEM_IDS.has(item.itemId)) return true
  if (item.title && HIDDEN_TITLE_RE.test(item.title)) return true
  return false
}
