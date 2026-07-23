/**
 * Infer a short Square POS abbreviation (max 5 chars shown) from a listing title.
 * Example: "… Manchester City Pre-Match …" → "MC"
 */

/** Longer / more specific names first. */
const CLUB_ABBREVS = [
  [/manchester\s*city|\bman\s*city\b|\bmcfc\b/i, 'MC'],
  [/manchester\s*united|\bman\s*utd\b|\bman\s*united\b|\bmufc\b/i, 'MU'],
  [/paris\s*saint[-\s]?germain|\bpsg\b/i, 'PSG'],
  [/inter\s*miami\b/i, 'IM'],
  [/\bac\s*milan\b/i, 'ACM'],
  [/borussia\s*dortmund|\bdortmund\b|\bbvb\b/i, 'BVB'],
  [/tottenham(?:\s*hotspur)?|\bspurs\b/i, 'TOT'],
  [/liverpool(?:\s*fc)?|\blfc\b/i, 'LIV'],
  [/real\s*madrid|\brma\b/i, 'RMA'],
  [/fc\s*barcelona|\bbarcelona\b|\bbarca\b|\bfcb\b/i, 'BAR'],
  [/chelsea(?:\s*fc)?|\bcfc\b/i, 'CHE'],
  [/ajax(?:\s*amsterdam)?/i, 'AJX'],
  [/germany(?:\s*national)?|\bdfb\b/i, 'GER'],
  [/syracuse(?:\s*orange)?/i, 'SYR'],
  [/arsenal(?:\s*fc)?/i, 'ARS'],
  [/bayern(?:\s*munich)?/i, 'BAY'],
  [/juventus|\bjuve\b/i, 'JUV'],
  [/newcastle(?:\s*united)?/i, 'NEW'],
  [/west\s*ham/i, 'WHU'],
  [/leicester(?:\s*city)?/i, 'LEI'],
  [/aston\s*villa/i, 'AVL'],
  [/brighton/i, 'BHA'],
  [/wolverhampton|\bwolves\b/i, 'WOL'],
  [/everton/i, 'EVE'],
  [/napoli/i, 'NAP'],
  [/roma\b/i, 'ROM'],
  [/inter(?:nazionale)?(?!\s*miami)/i, 'INT'],
  [/atletico(?:\s*madrid)?/i, 'ATM'],
  [/portugal/i, 'POR'],
  [/france(?:\s*national)?/i, 'FRA'],
  [/spain(?:\s*national)?/i, 'ESP'],
  [/england(?:\s*national)?/i, 'ENG'],
  [/usa\b|united\s*states/i, 'USA'],
]

export function inferClubAbbrev(title) {
  const text = String(title || '')
  for (const [re, code] of CLUB_ABBREVS) {
    if (re.test(text)) return code.slice(0, 5)
  }

  // Fallback: first letters of capitalized club-like words after brand
  const cleaned = text
    .replace(/^\d{2}\/\d{2}\s*/i, '')
    .replace(/\b(men'?s|women'?s|youth|boys|girls)\b/gi, ' ')
    .replace(/\b(adidas|nike|puma|under\s*armour)\b/gi, ' ')
    .replace(/\b(home|away|third|pre-?match|training|jersey|kit|top|strike|authentic|scarf|towel|crest|t-?shirt|football|soccer|rally|pack|two)\b/gi, ' ')
    .replace(/\b(extra\s+large|large|medium|small|xxl|xl|xs|[sml]|yth\w*|\d+[-–]\d+\s*yrs?)\b/gi, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = cleaned.split(' ').filter((w) => w.length > 1)
  if (words.length === 0) return 'JD'
  if (words.length === 1) return words[0].slice(0, 5).toUpperCase()
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 5)
}
