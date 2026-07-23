/** Consistent placeholders when BrayStats has no value for a field. */

export const MISSING_SHORT = '?'
export const MISSING_LONG = 'No information'

const SENTINELS = new Set([
  '—',
  '–',
  '-',
  '--',
  'N/A',
  'n/a',
  'NA',
  'TBD',
  'tbd',
  'Unknown',
  'unknown',
  'Not available',
  'not available',
  'Not listed',
  'not listed',
])

export function isMissing(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'number') return !Number.isFinite(value)
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return !trimmed || SENTINELS.has(trimmed)
}

/** Short / metric / tabular cells. */
export function missingShort(value: unknown): string {
  if (isMissing(value)) return MISSING_SHORT
  return String(value).trim()
}

/** Longer prose / status / label lines. */
export function missingLong(value: unknown): string {
  if (isMissing(value)) return MISSING_LONG
  return String(value).trim()
}
