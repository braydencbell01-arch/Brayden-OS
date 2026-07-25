/**
 * Inclusive / fuzzy text matching for BrayStats search boxes.
 * Handles abbreviations, aliases, diacritics, prefixes, and close typos.
 */

/** Equivalent labels — any member matches any other in the same group. */
export const SEARCH_ALIAS_GROUPS: string[][] = [
  // Leagues / comps
  ['premier league', 'epl', 'pl', 'prem', 'english premier league'],
  ['championship', 'efl championship', 'eng championship', 'english championship'],
  ['la liga', 'laliga', 'spanish league', 'primera'],
  ['serie a', 'seria a'],
  ['bundesliga', 'bundes'],
  ['ligue 1', 'ligue1', 'french league'],
  ['mls', 'major league soccer'],
  ['uefa champions league', 'champions league', 'ucl', 'champions'],
  ['uefa europa league', 'europa league', 'uel', 'europa'],
  ['uefa conference league', 'conference league', 'uecl'],
  ['fifa world cup', 'world cup', 'wc'],
  ['uefa european championship', 'euros', 'euro', 'european championship'],
  ['uefa nations league', 'nations league', 'unl'],
  ['copa america', 'copa américa'],
  ['africa cup of nations', 'afcon'],
  ['copa libertadores', 'libertadores'],
  ['copa sudamericana', 'sudamericana'],
  ['fa cup', 'facup'],
  ['carabao cup', 'efl cup', 'league cup'],
  ['copa del rey', 'cdr'],
  ['dfb pokal', 'dfb-pokal', 'german cup'],
  ['brasileirao', 'brasileirão', 'brazil serie a'],
  ['liga mx', 'mexican league'],
  ['eredivisie', 'dutch league'],
  ['primeira liga', 'liga portugal', 'portuguese league'],

  // Clubs / nations (common search shortcuts)
  ['manchester united', 'man united', 'man utd', 'man u', 'mufc'],
  ['manchester city', 'man city', 'man c', 'mcfc'],
  ['paris saint germain', 'paris saint-germain', 'psg', 'paris sg'],
  ['borussia dortmund', 'dortmund', 'bvb'],
  ['real madrid', 'madrid', 'rma', 'real'],
  ['barcelona', 'barca', 'barça', 'fcb', 'fc barcelona'],
  ['bayern munich', 'bayern', 'fc bayern', 'fcb munich'],
  ['tottenham', 'tottenham hotspur', 'spurs'],
  ['liverpool', 'liverpool fc', 'lfc'],
  ['chelsea', 'chelsea fc', 'cfc'],
  ['arsenal', 'arsenal fc', 'afc', 'gunners'],
  ['juventus', 'juve'],
  ['inter milan', 'internazionale', 'inter'],
  ['ac milan', 'milan'],
  ['atletico madrid', 'atlético madrid', 'atletico', 'atleti'],
  ['newcastle', 'newcastle united', 'nufc', 'toon'],
  ['west ham', 'west ham united', 'whu'],
  ['aston villa', 'villa'],
  ['nottingham forest', 'nottm forest', 'forest'],
  ['brighton', 'brighton hove albion', 'bhafc'],
  ['wolves', 'wolverhampton', 'wolverhampton wanderers'],
  ['leicester', 'leicester city'],
  ['ajax', 'ajax amsterdam'],
  ['inter miami', 'miami'],
  ['germany', 'deutschland', 'dfb', 'german national'],
  ['spain', 'espana', 'españa', 'la roja'],
  ['argentina', 'albiceleste'],
  ['mexico', 'el tri'],
  ['usa', 'united states', 'usmnt', 'uswnt'],
  ['england', 'three lions'],
  ['france', 'les bleus'],
  ['brazil', 'brasil', 'selecao', 'seleção'],
  ['portugal', 'selecao portugal'],
  ['italy', 'italia', 'azzurri'],
  ['netherlands', 'holland', 'oranje'],
]

const CLUB_SUFFIXES = new Set([
  'fc',
  'cf',
  'sc',
  'afc',
  'cfc',
  'ac',
  'as',
  'ss',
  'sd',
  'cd',
  'ud',
  'rcd',
  'sv',
  'bk',
  'if',
  'fk',
  'sk',
])

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const prev = new Array<number>(cols)
  const curr = new Array<number>(cols)
  for (let j = 0; j < cols; j++) prev[j] = j
  for (let i = 1; i < rows; i++) {
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

/** Normalize for matching: lowercase, strip diacritics/punct, collapse space. */
export function normalizeSearchText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeSearch(value: string): string[] {
  return normalizeSearchText(value)
    .split(' ')
    .filter(Boolean)
    .filter((token) => !CLUB_SUFFIXES.has(token) || token.length > 3)
}

function aliasIndex(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const group of SEARCH_ALIAS_GROUPS) {
    const norms = [...new Set(group.map(normalizeSearchText).filter(Boolean))]
    for (const key of norms) {
      map.set(key, norms)
    }
  }
  return map
}

const ALIAS_BY_KEY = aliasIndex()

/** All alias variants for a phrase (including itself). */
export function aliasVariants(value: string): string[] {
  const n = normalizeSearchText(value)
  if (!n) return []
  const direct = ALIAS_BY_KEY.get(n)
  if (direct) return direct
  // Prefix/contains against short aliases (e.g. query "barca" vs group member)
  for (const [key, group] of ALIAS_BY_KEY) {
    if (key.length < 2) continue
    if (n === key || (n.length >= 3 && (key.startsWith(n) || n.startsWith(key)))) {
      return group
    }
  }
  return [n]
}

/** Expand text with alias group members that touch any phrase in the text. */
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
  // Also drop club suffixes from words for softer matching.
  const stripped = tokenizeSearch(base)
    .filter((t) => !CLUB_SUFFIXES.has(t))
    .join(' ')
  return [base, stripped, ...extras].filter(Boolean).join(' ')
}

function maxEditDistance(token: string): number {
  if (token.length >= 8) return 2
  if (token.length >= 4) return 1
  return 0
}

function acronymMatches(words: string[], token: string): boolean {
  if (token.length < 2 || token.length > 6) return false
  if (!/^[a-z0-9]+$/.test(token)) return false
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

  // Alias-expanded forms of this token
  for (const variant of aliasVariants(token)) {
    if (variant !== token && blob.includes(variant)) return true
    const vWords = variant.split(' ').filter(Boolean)
    if (vWords.length > 1 && vWords.every((part) => blob.includes(part))) return true
  }

  return false
}

/**
 * True when query is inclusively found in any of the provided fields.
 * Multi-word queries use AND across tokens (order-independent).
 */
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

  // Whole-query alias: "man u" ↔ manchester united
  for (const variant of aliasVariants(q)) {
    if (variant !== q && blob.includes(variant)) return true
    const parts = variant.split(' ').filter(Boolean)
    if (parts.length > 1 && parts.every((part) => blob.includes(part))) return true
  }

  // If any alias group member equals/contains the query, accept hay with any member.
  for (const variant of aliasVariants(q)) {
    const group = ALIAS_BY_KEY.get(variant)
    if (!group) continue
    if (group.some((alias) => alias.length >= 2 && blob.includes(alias))) return true
  }

  const tokens = tokenizeSearch(q)
  if (tokens.length === 0) return true
  return tokens.every((token) => tokenMatchesBlob(blob, token))
}

/** Prefer a longer canonical label when query is a known abbreviation (for ESPN). */
export function canonicalSearchQuery(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return trimmed
  const n = normalizeSearchText(trimmed)
  const group = ALIAS_BY_KEY.get(n) || aliasVariants(n)
  if (!group.length) return trimmed
  const best = group.reduce((a, b) => (a.length >= b.length ? a : b))
  // Only rewrite when the query looks like a short alias.
  if (n.length <= 6 || group.some((g) => g === n && g.length <= 6)) {
    return best
  }
  return trimmed
}
