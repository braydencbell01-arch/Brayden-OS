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
  ['uefa nations league a', 'nations league a', 'unl a'],
  ['uefa nations league b', 'nations league b', 'unl b'],
  ['uefa nations league c', 'nations league c', 'unl c'],
  ['uefa nations league d', 'nations league d', 'unl d'],
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
  ['international', 'national team', 'country kit', 'country kits'],

  // Clubs / nations (common search shortcuts)
  ['manchester united', 'man united', 'man utd', 'man u', 'mufc', 'red devils'],
  ['manchester city', 'man city', 'mcfc', 'cityzens', 'citizens'],
  ['paris saint germain', 'paris saint-germain', 'psg', 'paris sg', 'paris'],
  ['borussia dortmund', 'dortmund', 'bvb'],
  ['real madrid', 'madrid', 'rma', 'los blancos'],
  ['barcelona', 'barca', 'barça', 'fcb', 'fc barcelona'],
  ['bayern munich', 'bayern', 'fc bayern', 'fcb munich'],
  ['tottenham', 'tottenham hotspur', 'spurs', 'lilywhites', 'thfc'],
  ['liverpool', 'liverpool fc', 'lfc', 'reds'],
  ['chelsea', 'chelsea fc', 'cfc', 'blues'],
  ['arsenal', 'arsenal fc', 'gunners', 'gooners'],
  ['juventus', 'juve', 'bianconeri'],
  ['inter milan', 'internazionale', 'fc internazionale', 'nerazzurri', 'inter naz'],
  ['ac milan', 'milan', 'rossoneri', 'acm'],
  ['atletico madrid', 'atlético madrid', 'atletico', 'atleti'],
  ['newcastle', 'newcastle united', 'nufc', 'toon', 'magpies'],
  ['west ham', 'west ham united', 'whu', 'hammers'],
  ['aston villa', 'villa', 'avfc'],
  ['nottingham forest', 'nottm forest', 'forest'],
  ['brighton', 'brighton hove albion', 'bhafc', 'seagulls'],
  ['wolves', 'wolverhampton', 'wolverhampton wanderers'],
  ['leicester', 'leicester city'],
  ['ajax', 'ajax amsterdam'],
  ['inter miami', 'miami', 'inter miami cf', 'miami cf'],
  ['syracuse', 'syracuse orange', 'cuse', 'ncaa'],
  ['germany', 'deutschland', 'dfb', 'german national', 'die mannschaft'],
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

/** Ambiguous short queries that should hit multiple club families. */
const AMBIGUOUS_QUERY_EXPANSIONS: Record<string, string[]> = {
  inter: ['inter miami', 'miami', 'inter milan', 'internazionale', 'nerazzurri'],
  inte: ['inter miami', 'miami', 'inter milan', 'internazionale', 'nerazzurri'],
  real: ['real madrid', 'madrid'],
  united: ['manchester united', 'man united', 'newcastle united'],
  city: ['manchester city', 'man city'],
  milan: ['ac milan', 'milan', 'inter milan', 'internazionale'],
}

/** Player → clubs (fantasy / team search). */
const PLAYER_CLUB_GROUPS: { players: string[]; clubs: string[] }[] = [
  { players: ['messi', 'lionel messi', 'leo messi'], clubs: ['inter miami', 'barcelona', 'paris saint germain', 'psg'] },
  { players: ['haaland', 'erling haaland'], clubs: ['manchester city', 'borussia dortmund'] },
  { players: ['salah', 'mohamed salah', 'mo salah'], clubs: ['liverpool'] },
  { players: ['mbappe', 'mbappé', 'kylian mbappe'], clubs: ['paris saint germain', 'psg', 'real madrid'] },
  { players: ['kane', 'harry kane'], clubs: ['tottenham', 'bayern munich'] },
  { players: ['saka', 'bukayo saka'], clubs: ['arsenal'] },
  { players: ['bellingham', 'jude bellingham'], clubs: ['real madrid', 'borussia dortmund'] },
  { players: ['vinicius', 'vini jr'], clubs: ['real madrid'] },
  { players: ['ronaldo', 'cristiano ronaldo', 'cr7'], clubs: ['manchester united', 'juventus', 'real madrid'] },
  { players: ['de bruyne', 'kevin de bruyne', 'kdb'], clubs: ['manchester city'] },
  { players: ['foden', 'phil foden'], clubs: ['manchester city'] },
  { players: ['son', 'son heung min', 'heung min son'], clubs: ['tottenham'] },
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
  'the',
  'and',
  'a',
  'of',
  'de',
  'la',
  'el',
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

function rawTokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean)
}

function hasContiguousWords(text: string, key: string): boolean {
  const words = rawTokens(text)
  const parts = rawTokens(key)
  if (!parts.length || parts.length > words.length) return false
  if (parts.length === 1) return words.includes(parts[0]!)
  outer: for (let i = 0; i <= words.length - parts.length; i++) {
    for (let j = 0; j < parts.length; j++) {
      if (words[i + j] !== parts[j]) continue outer
    }
    return true
  }
  return false
}

/** Block "inter" from unlocking the international / country-kit group. */
function aliasKeyMatchesQuery(key: string, query: string): boolean {
  if (query === key) return true
  if (query.length >= 3 && key.startsWith(query)) {
    if (key === 'international' || key.startsWith('international ')) return false
    if (query.length <= 2) return false
    return true
  }
  if (key.length >= 3 && query.length > key.length && query.startsWith(key)) return true
  return false
}

function playerMatchesQuery(player: string, query: string): boolean {
  const p = normalizeSearchText(player)
  if (!p || !query) return false
  if (query === p) return true
  if (query.length >= 3 && p.startsWith(query)) return true
  if (p.length >= 3 && query.startsWith(p)) return true
  return p.split(' ').some((part) => part.length >= 3 && (part === query || part.startsWith(query)))
}

/** All alias variants for a phrase (union of every related group). */
export function aliasVariants(value: string): string[] {
  const n = normalizeSearchText(value)
  if (!n) return []
  const out = new Set<string>([n])
  const ambiguous = AMBIGUOUS_QUERY_EXPANSIONS[n]
  if (ambiguous) for (const item of ambiguous) out.add(normalizeSearchText(item))

  for (const [key, group] of ALIAS_BY_KEY) {
    if (key.length < 2) continue
    if (!aliasKeyMatchesQuery(key, n)) continue
    for (const item of group) out.add(item)
  }

  for (const row of PLAYER_CLUB_GROUPS) {
    for (const player of row.players) {
      if (!playerMatchesQuery(player, n)) continue
      out.add(normalizeSearchText(player))
      for (const club of row.clubs) out.add(normalizeSearchText(club))
    }
  }

  return [...out]
}

/** Expand text with alias group members (contiguous whole-word keys only). */
export function expandSearchBlob(...parts: Array<string | undefined | null>): string {
  const base = normalizeSearchText(parts.filter(Boolean).join(' '))
  if (!base) return ''
  const extras = new Set<string>()
  const words = tokenizeSearch(base)
  const keys = [...ALIAS_BY_KEY.keys()].sort((a, b) => b.length - a.length)
  const claimed = new Set<number>()

  for (const key of keys) {
    const partsKey = tokenizeSearch(key)
    if (!partsKey.length) continue
    for (let i = 0; i <= words.length - partsKey.length; i++) {
      let ok = true
      for (let j = 0; j < partsKey.length; j++) {
        if (claimed.has(i + j) || words[i + j] !== partsKey[j]) {
          ok = false
          break
        }
      }
      if (!ok) continue
      for (let j = 0; j < partsKey.length; j++) claimed.add(i + j)
      for (const item of ALIAS_BY_KEY.get(key) || []) extras.add(item)
    }
  }

  const stripped = words.filter((t) => !CLUB_SUFFIXES.has(t)).join(' ')
  return [base, stripped, ...extras].filter(Boolean).join(' ')
}

function maxEditDistance(token: string): number {
  // No fuzzy on short codes — mufc≈mcfc≈cfc is worse than typos help.
  if (token.length >= 8) return 2
  if (token.length >= 5) return 1
  return 0
}

function acronymMatches(words: string[], token: string): boolean {
  if (token.length < 2 || token.length > 6) return false
  if (!/^[a-z0-9]+$/.test(token)) return false
  const significant = words.filter((w) => w.length >= 3)
  for (let i = 0; i < significant.length; i++) {
    let initials = ''
    for (let j = i; j < significant.length && initials.length < token.length; j++) {
      const w = significant[j]
      if (!w) continue
      initials += w[0]
    }
    if (initials === token) return true
  }
  return false
}

const PREFIX_BLOCKED_WORDS = new Set([
  'international',
  'internacional',
  'authentic',
  'please',
  'questions',
  'training',
  'premiere',
  'premium',
  'prematch',
  'complete',
  'completed',
  'camiseta',
  'maillot',
  'mannschaft',
])

function wordMatchesToken(word: string, token: string): boolean {
  if (!word || !token) return false
  if (word === token) return true
  if (token.length <= 2) return false
  if (!word.startsWith(token)) return false
  if (PREFIX_BLOCKED_WORDS.has(word)) return false
  return true
}

function blobHasPhrase(blob: string, phrase: string): boolean {
  const p = normalizeSearchText(phrase)
  if (!p) return false
  const words = tokenizeSearch(blob)
  const parts = tokenizeSearch(p)
  if (!parts.length) return false
  if (parts.length === 1) {
    const t = parts[0]!
    return words.some((w) => wordMatchesToken(w, t))
  }
  return hasContiguousWords(blob, p)
}

function multiWordVariantMatches(words: string[], variant: string): boolean {
  const vWords = tokenizeSearch(variant)
  if (vWords.length < 2) return false
  return vWords.every((part) => {
    if (part.length <= 2) return words.includes(part)
    return words.some((w) => wordMatchesToken(w, part))
  })
}

function tokenMatchesBlob(blob: string, token: string): boolean {
  if (!token) return true
  if (blobHasPhrase(blob, token)) return true

  const words = tokenizeSearch(blob)
  if (acronymMatches(words, token)) return true

  const dist = maxEditDistance(token)
  if (dist > 0) {
    for (const word of words) {
      if (word.length < 3) continue
      if (PREFIX_BLOCKED_WORDS.has(word)) continue
      if (Math.abs(word.length - token.length) > dist) continue
      if (levenshtein(word, token) <= dist) return true
    }
  }

  for (const variant of aliasVariants(token)) {
    if (variant !== token && blobHasPhrase(blob, variant)) return true
    if (multiWordVariantMatches(words, variant)) return true
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

  if (blobHasPhrase(blob, q)) return true

  for (const variant of aliasVariants(q)) {
    if (variant.length >= 2 && blobHasPhrase(blob, variant)) return true
  }

  const tokens = tokenizeSearch(q)
  if (tokens.length === 0) {
    const raw = normalizeSearchText(q).split(' ').filter(Boolean)
    if (!raw.length) return true
    return raw.every((part) => blobHasPhrase(blob, part))
  }
  if (tokens.every((token) => tokenMatchesBlob(blob, token))) return true

  if (tokens.length >= 2 && !ALIAS_BY_KEY.has(q) && !AMBIGUOUS_QUERY_EXPANSIONS[q]) {
    const hits = tokens.filter((token) => tokenMatchesBlob(blob, token)).length
    if (
      hits >= Math.ceil(tokens.length * 0.6) &&
      tokens.some((t) => t.length >= 4 && tokenMatchesBlob(blob, t))
    ) {
      return true
    }
  }
  return false
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
