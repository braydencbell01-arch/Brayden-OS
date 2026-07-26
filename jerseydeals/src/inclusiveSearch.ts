/**
 * Inclusive / fuzzy text matching for Jersey Deals listing search.
 * Prefixes, leagues, player→club, abbreviations, nicknames, close typos.
 */

/** Equivalent labels — any member matches any other in the same group. */
export const SEARCH_ALIAS_GROUPS: string[][] = [
  // Leagues
  ['premier league', 'epl', 'pl', 'prem', 'english premier league', 'barclays'],
  ['la liga', 'laliga', 'spanish league', 'primera'],
  ['serie a', 'seria a', 'italian league'],
  ['bundesliga', 'bundes'],
  ['ligue 1', 'ligue1', 'french league'],
  ['mls', 'major league soccer', 'american soccer'],
  ['eredivisie', 'dutch league'],
  ['ncaa', 'college', 'college soccer', 'college football'],
  // Keep "international" out of short "inter*" prefix expansion (see aliasKeyMatchesQuery).
  ['international', 'national team', 'country kit', 'country kits', 'nt'],

  // Clubs / nations
  ['manchester united', 'man united', 'man utd', 'man u', 'mufc', 'red devils'],
  ['manchester city', 'man city', 'mcfc', 'cityzens', 'citizens'],
  ['paris saint germain', 'paris saint-germain', 'psg', 'paris sg', 'paris'],
  ['borussia dortmund', 'dortmund', 'bvb', 'die schwarzgelben'],
  ['real madrid', 'madrid', 'rma', 'los blancos'],
  ['barcelona', 'barca', 'barça', 'fcb', 'fc barcelona', 'blaugarana'],
  ['bayern munich', 'bayern', 'fc bayern', 'bayern munchen', 'bayern münchen', 'fcb munich'],
  ['tottenham', 'tottenham hotspur', 'spurs', 'lilywhites', 'thfc'],
  ['liverpool', 'liverpool fc', 'lfc', 'reds', 'the reds'],
  ['chelsea', 'chelsea fc', 'cfc', 'blues', 'the blues'],
  ['arsenal', 'arsenal fc', 'gunners', 'afs', 'gooners'],
  ['juventus', 'juve', 'bianconeri', 'old lady'],
  // Keep Inter Milan / Inter Miami distinct — bare "inter" handled specially below.
  ['inter milan', 'internazionale', 'fc internazionale', 'nerazzurri', 'inter naz'],
  ['ac milan', 'milan', 'rossoneri', 'acm'],
  ['atletico madrid', 'atlético madrid', 'atletico', 'atleti'],
  ['newcastle', 'newcastle united', 'nufc', 'toon', 'magpies'],
  ['west ham', 'west ham united', 'whu', 'hammers', 'irons'],
  ['aston villa', 'villa', 'avfc'],
  ['brighton', 'brighton hove albion', 'bhafc', 'seagulls'],
  ['wolves', 'wolverhampton', 'wolverhampton wanderers', 'wwfc'],
  ['ajax', 'ajax amsterdam'],
  ['inter miami', 'miami', 'club internacional de futbol miami', 'inter miami cf', 'miami cf'],
  ['syracuse', 'syracuse orange', 'cuse', 'orange'],
  ['germany', 'deutschland', 'dfb', 'german national', 'die mannschaft'],
  ['spain', 'espana', 'españa', 'la roja', 'spanish national'],
  ['argentina', 'albiceleste', 'argentine'],
  ['mexico', 'el tri', 'mexican national'],
  ['usa', 'united states', 'usmnt', 'uswnt'],
  ['england', 'three lions', 'english national'],
  ['france', 'les bleus', 'french national'],
  ['brazil', 'brasil', 'selecao', 'seleção', 'brazilian national'],
  ['portugal', 'portuguese national'],
  ['italy', 'italia', 'azzurri', 'italian national'],
  ['netherlands', 'holland', 'oranje', 'dutch national'],

  // Kit / product language
  ['jersey', 'shirt', 'kit', 'top', 'maillot', 'camiseta'],
  ['youth', 'kids', 'junior', 'boys', 'girls', 'yth'],
  ['training', 'strike', 'pre match', 'prematch', 'warmup', 'warm up', 'drill'],
  ['home', 'home kit', 'home jersey'],
  ['away', 'away kit', 'away jersey'],
  ['third', '3rd', 'third kit', 'fourth', '4th'],
  ['pre match', 'prematch', 'warm up', 'warmup'],
]

/**
 * Player search → clubs whose kits should surface.
 * Typing a player shows every jersey we have for that player’s club(s).
 */
export const PLAYER_CLUB_GROUPS: { players: string[]; clubs: string[] }[] = [
  { players: ['messi', 'lionel messi', 'leo messi'], clubs: ['inter miami', 'barcelona', 'paris saint germain', 'psg'] },
  { players: ['ronaldo', 'cristiano ronaldo', 'cr7'], clubs: ['manchester united', 'juventus', 'real madrid', 'al nassr'] },
  { players: ['haaland', 'erling haaland', 'erling'], clubs: ['manchester city', 'borussia dortmund'] },
  { players: ['salah', 'mohamed salah', 'mo salah'], clubs: ['liverpool'] },
  { players: ['mbappe', 'mbappé', 'kylian mbappe', 'kylian'], clubs: ['paris saint germain', 'psg', 'real madrid'] },
  { players: ['kane', 'harry kane'], clubs: ['tottenham', 'bayern munich'] },
  { players: ['son', 'son heung min', 'heung min son'], clubs: ['tottenham'] },
  { players: ['de bruyne', 'kevin de bruyne', 'kdb'], clubs: ['manchester city'] },
  { players: ['foden', 'phil foden'], clubs: ['manchester city'] },
  { players: ['saka', 'bukayo saka'], clubs: ['arsenal'] },
  { players: ['rice', 'declan rice'], clubs: ['arsenal', 'west ham'] },
  { players: ['palmer', 'cole palmer'], clubs: ['chelsea', 'manchester city'] },
  { players: ['sterling', 'raheem sterling'], clubs: ['chelsea', 'manchester city', 'arsenal'] },
  { players: ['rashford', 'marcus rashford'], clubs: ['manchester united'] },
  { players: ['bruno', 'bruno fernandes'], clubs: ['manchester united'] },
  { players: ['virgil', 'van dijk', 'virgil van dijk'], clubs: ['liverpool'] },
  { players: ['nunez', 'núñez', 'darwin nunez'], clubs: ['liverpool'] },
  { players: ['diaz', 'luis diaz'], clubs: ['liverpool'] },
  { players: ['grealish', 'jack grealish'], clubs: ['manchester city', 'aston villa'] },
  { players: ['rodri', 'rodrigo'], clubs: ['manchester city'] },
  { players: ['bellingham', 'jude bellingham'], clubs: ['real madrid', 'borussia dortmund'] },
  { players: ['vinicius', 'vini jr', 'vinicius junior'], clubs: ['real madrid'] },
  { players: ['rodrygo'], clubs: ['real madrid'] },
  { players: ['lewandowski', 'lewy'], clubs: ['barcelona', 'bayern munich'] },
  { players: ['pedri', 'gavi', 'yamal', 'lamine yamal'], clubs: ['barcelona'] },
  { players: ['neymar'], clubs: ['paris saint germain', 'psg', 'santos', 'al hilal'] },
  { players: ['hakimi'], clubs: ['paris saint germain', 'psg', 'inter milan', 'borussia dortmund'] },
  { players: ['dembele', 'dembelee', 'ousmane dembele'], clubs: ['paris saint germain', 'psg', 'barcelona'] },
  { players: ['wirtz', 'florian wirtz'], clubs: ['bayer leverkusen', 'liverpool'] },
  { players: ['musiala', 'jamal musiala'], clubs: ['bayern munich'] },
  { players: ['sancho', 'jadon sancho'], clubs: ['manchester united', 'borussia dortmund', 'chelsea'] },
  { players: ['reus', 'marco reus'], clubs: ['borussia dortmund'] },
  { players: ['halle', 'erling haaland'], clubs: ['manchester city'] },
  { players: ['pogba', 'paul pogba'], clubs: ['manchester united'] },
  // Named / primary clubs — avoid dumping every career stop into shop search.
  { players: ['torres', 'fernando torres'], clubs: ['chelsea'] },
  { players: ['suarez', 'luis suarez'], clubs: ['inter miami', 'barcelona', 'liverpool'] },
  { players: ['busquets', 'sergio busquets'], clubs: ['inter miami', 'barcelona'] },
  { players: ['alba', 'jordi alba'], clubs: ['inter miami', 'barcelona'] },
  { players: ['hernandez', 'theo'], clubs: ['ac milan'] },
  { players: ['leao', 'rafael leao'], clubs: ['ac milan'] },
  { players: ['giroud', 'olivier giroud'], clubs: ['ac milan'] },
  { players: ['modric', 'luka modric'], clubs: ['real madrid'] },
  { players: ['kroos', 'toni kroos'], clubs: ['real madrid'] },
  { players: ['muller', 'müller', 'thomas muller'], clubs: ['bayern munich'] },
  { players: ['kimmich'], clubs: ['bayern munich'] },
  { players: ['marez', 'riyad mahrez', 'mahrez'], clubs: ['manchester city'] },
  { players: ['lautaro', 'lautaro martinez'], clubs: ['inter milan'] },
  { players: ['barella', 'nicolo barella'], clubs: ['inter milan'] },
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


const NOISE_TOKENS = new Set([
  'fc',
  'cf',
  'sc',
  'afc',
  // keep "ac" — needed for AC Milan searches
  'as',
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
    .replace(/(\d{2})\s*\/\s*(\d{2})/g, '$1$2 $1 $2')
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

/** Raw tokens (keeps fc/the/etc so "fc inter" does not collapse to "inter"). */
function rawTokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean)
}

/** True if `key` appears as contiguous whole words in `text`. */
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

function aliasIndex(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const group of SEARCH_ALIAS_GROUPS) {
    const norms = [...new Set(group.map(normalizeSearchText).filter(Boolean))]
    for (const key of norms) map.set(key, norms)
  }
  return map
}

const ALIAS_BY_KEY = aliasIndex()

/** Block "inter" from unlocking the international / country-kit league group. */
function aliasKeyMatchesQuery(key: string, query: string): boolean {
  if (query === key) return true
  if (query.length >= 3 && key.startsWith(query)) {
    if (key === 'international' || key.startsWith('international ')) return false
    // "nt" / short noise should not unlock huge groups via prefix.
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
  // "leo messi" when typing "messi"
  return p.split(' ').some((part) => part.length >= 3 && (part === query || part.startsWith(query)))
}

/** Every alias group that relates to this query (prefix / exact / contained). */
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

/**
 * Enrich listing text with nicknames / league / related aliases.
 * Uses contiguous whole-word matches so "inter miami" does not inherit "milan".
 */
export function expandSearchBlob(...parts: Array<string | undefined | null>): string {
  const base = normalizeSearchText(parts.filter(Boolean).join(' '))
  if (!base) return ''
  const extras = new Set<string>()
  const words = tokenizeSearch(base)

  // Longest alias keys first so "inter miami" wins over shorter collisions.
  const keys = [...ALIAS_BY_KEY.keys()].sort((a, b) => b.length - a.length)
  const claimed = new Set<number>() // word indexes already claimed by a longer key

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

  // Do not expand jersey player names into career clubs here — that makes a
  // Messi Miami kit match "psg". Player→club runs on the query via aliasVariants.

  const stripped = words.join(' ')
  return [base, stripped, ...extras].filter(Boolean).join(' ')
}

function maxEditDistance(token: string): number {
  // No fuzzy on short codes — mufc≈mcfc≈cfc and reds≈red are worse than typos help.
  if (token.length >= 8) return 2
  if (token.length >= 5) return 1
  return 0
}

function acronymMatches(words: string[], token: string): boolean {
  if (token.length < 2 || token.length > 6) return false
  // Ignore size letters / tiny tokens so "puma" + "l" never becomes "pl".
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

/** Words that must not match via short prefixes (inter≠international, prem≠prematch). */
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
  // Ultra-short tokens: exact only (pl, ac, nt) — still allow "man"→manchester.
  if (token.length <= 2) return false
  if (!word.startsWith(token)) return false
  if (PREFIX_BLOCKED_WORDS.has(word)) return false
  return true
}

/** Whole-word / prefix match — never substring inside unrelated words (please≠pl). */
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
  // Every part must appear as a whole word (or solid prefix for longer parts).
  // Prevents "man c" → manchester + camiseta.
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

function queryMatchesBlob(blob: string, query: string): boolean {
  const q = normalizeSearchText(query)
  if (!q) return true
  if (!blob) return false

  if (blobHasPhrase(blob, q)) return true

  // Any expanded phrase for the full query
  for (const variant of aliasVariants(q)) {
    if (variant.length >= 2 && blobHasPhrase(blob, variant)) return true
  }

  const tokens = tokenizeSearch(q)
  // Only-noise queries (e.g. lone "the") should not match everything.
  if (tokens.length === 0) {
    const raw = normalizeSearchText(q).split(' ').filter(Boolean)
    if (!raw.length) return true
    return raw.every((part) => blobHasPhrase(blob, part))
  }

  if (tokens.every((token) => tokenMatchesBlob(blob, token))) return true

  // Soft: multi-word query — majority of tokens, with at least one strong hit.
  // Skip when the full query is already a known alias (e.g. "inter milan") so
  // we don't partially match a different club ("inter" → Miami).
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

export function matchesInclusive(
  fields: Array<string | undefined | null> | string,
  query: string,
): boolean {
  const q = normalizeSearchText(query)
  if (!q) return true

  const fieldList = typeof fields === 'string' ? [fields] : fields
  const blob = expandSearchBlob(...fieldList)
  if (!blob) return false

  return queryMatchesBlob(blob, q)
}
