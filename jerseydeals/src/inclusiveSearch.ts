/**
 * Inclusive / fuzzy text matching for Jersey Deals listing search.
 * Handles team abbreviations, aliases, diacritics, prefixes, and close typos.
 */

/** Equivalent labels — any member matches any other in the same group. */
export const SEARCH_ALIAS_GROUPS: string[][] = [
  ['manchester united', 'man united', 'man utd', 'man u', 'mufc'],
  ['manchester city', 'man city', 'man c', 'mcfc'],
  ['paris saint germain', 'paris saint-germain', 'psg', 'paris sg', 'paris'],
  ['borussia dortmund', 'dortmund', 'bvb'],
  ['real madrid', 'madrid', 'rma', 'real'],
  ['barcelona', 'barca', 'barça', 'fcb', 'fc barcelona'],
  ['bayern munich', 'bayern', 'fc bayern', 'bayern munchen', 'bayern münchen'],
  ['tottenham', 'tottenham hotspur', 'spurs'],
  ['liverpool', 'liverpool fc', 'lfc'],
  ['chelsea', 'chelsea fc', 'cfc'],
  ['arsenal', 'arsenal fc', 'gunners'],
  ['juventus', 'juve'],
  ['inter milan', 'internazionale', 'inter'],
  ['ac milan', 'milan'],
  ['atletico madrid', 'atlético madrid', 'atletico', 'atleti'],
  ['newcastle', 'newcastle united', 'nufc'],
  ['ajax', 'ajax amsterdam'],
  ['inter miami', 'miami'],
  ['syracuse', 'syracuse orange', 'cuse'],
  ['germany', 'deutschland', 'dfb', 'german national', 'german'],
  ['spain', 'espana', 'españa', 'la roja', 'spanish'],
  ['argentina', 'albiceleste', 'argentine'],
  ['mexico', 'el tri', 'mexican'],
  ['usa', 'united states', 'usmnt', 'uswnt', 'america'],
  ['england', 'three lions', 'english'],
  ['france', 'les bleus', 'french'],
  ['brazil', 'brasil', 'selecao', 'seleção', 'brazilian'],
  ['portugal', 'portuguese'],
  ['italy', 'italia', 'azzurri', 'italian'],
  ['netherlands', 'holland', 'oranje', 'dutch'],
  // Kit / product language
  ['jersey', 'shirt', 'kit', 'top'],
  ['youth', 'kids', 'junior', 'boys', 'girls'],
  ['training', 'strike', 'pre match', 'prematch', 'warmup', 'warm up'],
  ['home', 'home kit', 'home jersey'],
  ['away', 'away kit', 'away jersey'],
  ['third', '3rd', 'third kit'],
]

const NOISE_TOKENS = new Set([
  'fc',
  'cf',
  'sc',
  'afc',
  'ac',
  'as',
  'the',
  'and',
  'a',
  'of',
])

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const cols = b.length + 1
  const prev = new Array<number>(cols)
  const curr = new Array<number>(cols)
  for (let j = 0; j < cols; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j < cols; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j]!
  }
  return prev[b.length]!
}

export function normalizeSearchText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/(\d{2})\s*\/\s*(\d{2})/g, '$1$2 $1 $2') // 22/23 → 2223 22 23
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeSearch(value: string): string[] {
  return normalizeSearchText(value)
    .split(' ')
    .filter(Boolean)
    .filter((token) => !NOISE_TOKENS.has(token))
}

function aliasIndex(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const group of SEARCH_ALIAS_GROUPS) {
    const norms = [...new Set(group.map(normalizeSearchText).filter(Boolean))]
    for (const key of norms) map.set(key, norms)
  }
  return map
}

const ALIAS_BY_KEY = aliasIndex()

export function aliasVariants(value: string): string[] {
  const n = normalizeSearchText(value)
  if (!n) return []
  const direct = ALIAS_BY_KEY.get(n)
  if (direct) return direct
  for (const [key, group] of ALIAS_BY_KEY) {
    if (key.length < 2) continue
    if (n === key || (n.length >= 3 && (key.startsWith(n) || n.startsWith(key)))) {
      return group
    }
  }
  return [n]
}

export function expandSearchBlob(...parts: Array<string | undefined | null>): string {
  const base = normalizeSearchText(parts.filter(Boolean).join(' '))
  if (!base) return ''
  const extras = new Set<string>()
  for (const [key, group] of ALIAS_BY_KEY) {
    if (key.length < 2) continue
    if (base.includes(key)) {
      for (const item of group) extras.add(item)
    }
  }
  const stripped = tokenizeSearch(base).join(' ')
  return [base, stripped, ...extras].filter(Boolean).join(' ')
}

function maxEditDistance(token: string): number {
  if (token.length >= 8) return 2
  if (token.length >= 4) return 1
  return 0
}

function acronymMatches(words: string[], token: string): boolean {
  if (token.length < 2 || token.length > 6) return false
  for (let i = 0; i < words.length; i++) {
    let initials = ''
    for (let j = i; j < words.length && initials.length < token.length; j++) {
      const w = words[j]
      if (!w) continue
      initials += w[0]
    }
    if (initials === token) return true
  }
  return false
}

function tokenMatchesBlob(blob: string, token: string): boolean {
  if (!token) return true
  if (blob.includes(token)) return true

  const words = blob.split(' ').filter(Boolean)
  if (token.length >= 2 && words.some((w) => w.startsWith(token))) return true
  if (acronymMatches(words, token)) return true

  const dist = maxEditDistance(token)
  if (dist > 0) {
    for (const word of words) {
      if (word.length < 3) continue
      if (Math.abs(word.length - token.length) > dist) continue
      if (levenshtein(word, token) <= dist) return true
    }
  }

  for (const variant of aliasVariants(token)) {
    if (variant !== token && blob.includes(variant)) return true
    const vWords = variant.split(' ').filter(Boolean)
    if (vWords.length > 1 && vWords.every((part) => blob.includes(part))) return true
  }

  return false
}

export function matchesInclusive(
  fields: Array<string | undefined | null> | string,
  query: string,
): boolean {
  const q = normalizeSearchText(query)
  if (!q) return true

  const fieldList = typeof fields === 'string' ? [fields] : fields
  const blob = expandSearchBlob(...fieldList)
  if (!blob) return false

  if (blob.includes(q)) return true

  for (const variant of aliasVariants(q)) {
    if (variant !== q && blob.includes(variant)) return true
    const parts = variant.split(' ').filter(Boolean)
    if (parts.length > 1 && parts.every((part) => blob.includes(part))) return true
  }

  for (const variant of aliasVariants(q)) {
    const group = ALIAS_BY_KEY.get(variant)
    if (!group) continue
    if (group.some((alias) => alias.length >= 2 && blob.includes(alias))) return true
  }

  const tokens = tokenizeSearch(q)
  if (tokens.length === 0) return true
  return tokens.every((token) => tokenMatchesBlob(blob, token))
}
