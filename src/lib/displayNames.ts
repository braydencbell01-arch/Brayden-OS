/** Particles kept with the following surname token (van den Berg, de Jong, …). */
const SURNAME_PARTICLES = new Set([
  'van',
  'von',
  'de',
  'da',
  'di',
  'del',
  'della',
  'der',
  'den',
  'la',
  'le',
  'el',
  'al',
  'af',
  'av',
  'bin',
  'ibn',
  'dos',
  'das',
  'do',
  'st',
  'ste',
])

/**
 * Compact surname for pitch / tight UI chips.
 * Keeps multi-word surnames (e.g. "van den Berg") instead of only "Berg".
 */
export function pitchSurname(name: string, shortName?: string): string {
  const short = (shortName || '').trim()
  const afterInitial = short.replace(/^[A-Za-z]\.\s*/u, '').trim()
  if (afterInitial.includes(' ')) return afterInitial

  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return afterInitial || short || name
  if (parts.length === 1) return parts[0]!

  let start = parts.length - 1
  while (start > 1 && SURNAME_PARTICLES.has(parts[start - 1]!.toLowerCase())) {
    start -= 1
  }
  // Include a single particle immediately before the last token ("de Jong").
  if (start === parts.length - 1 && start > 0 && SURNAME_PARTICLES.has(parts[start - 1]!.toLowerCase())) {
    start -= 1
  }
  return parts.slice(start).join(' ')
}
