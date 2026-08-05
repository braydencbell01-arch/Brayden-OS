/**
 * Shared helpers for professional Square / Jersey Deals listing titles & descriptions.
 */

const SIZE_TOKEN =
  /\b(XXL|XL|XS|S|M|L|YthXL|YthL|YthM|YthS|Youth\s*XL|Youth\s*L|Youth\s*M|Youth\s*S|\d+\s*[-–]\s*\d+\s*YRS?)\b/i

const BRANDS = /\b(Adidas|Nike|Puma|Under\s*Armour|Columbia|Pro\s*Edge)\b/i

// Keep in sync with jerseydeals/src/listings.ts CLUB_CATALOG (longer / more specific first).
const TEAMS = [
  [/manchester\s*city|\bman\s*city\b|\bmcfc\b/i, 'Manchester City'],
  [/manchester\s*united|\bman\s*utd\b|\bman\s*united\b|\bmufc\b/i, 'Manchester United'],
  [/paris\s*saint[-\s]?germain|\bpsg\b/i, 'Paris Saint-Germain'],
  [/inter\s*miami\b/i, 'Inter Miami'],
  [/inter\s*milan\b|internazionale|\bnerazzurri\b/i, 'Inter Milan'],
  [/\bac\s*milan\b/i, 'AC Milan'],
  [/borussia\s*dortmund|\bdortmund\b|\bbvb\b/i, 'Borussia Dortmund'],
  [/tottenham(?:\s*hotspur)?|\bspurs\b/i, 'Tottenham Hotspur'],
  [/liverpool(?:\s*fc)?|\blfc\b/i, 'Liverpool'],
  [/real\s*madrid|\brma\b/i, 'Real Madrid'],
  [/fc\s*barcelona|\bbarcelona\b|\bbarca\b|\bfcb\b/i, 'FC Barcelona'],
  [/chelsea(?:\s*fc)?|\bcfc\b/i, 'Chelsea'],
  [/ajax(?:\s*amsterdam)?/i, 'Ajax'],
  [/germany(?:\s*national(?:\s*team)?)?|\bdfb\b/i, 'Germany'],
  [/syracuse(?:\s*orange)?/i, 'Syracuse'],
  [/arsenal(?:\s*fc)?|\bgunners\b/i, 'Arsenal'],
  [/bayern(?:\s*munich)?|\bbayern\s*m[uü]nchen\b/i, 'Bayern Munich'],
  [/juventus|\bjuve\b/i, 'Juventus'],
  [/newcastle(?:\s*united)?|\bnufc\b/i, 'Newcastle United'],
  [/\bspain(?:\s*national)?\b|\bla\s*roja\b/i, 'Spain'],
  [/\bargentina\b|\balbiceleste\b/i, 'Argentina'],
  [/\bmexico\b|\bel\s*tri\b/i, 'Mexico'],
  [/\busa\b|united\s*states|\busmnt\b|\buswnt\b/i, 'USA'],
  [/west\s*ham/i, 'West Ham'],
  [/leicester(?:\s*city)?/i, 'Leicester City'],
  [/aston\s*villa/i, 'Aston Villa'],
  [/brighton/i, 'Brighton'],
  [/wolverhampton|\bwolves\b/i, 'Wolves'],
  [/everton/i, 'Everton'],
  [/napoli/i, 'Napoli'],
  [/\broma\b/i, 'Roma'],
  [/atletico(?:\s*madrid)?/i, 'Atletico Madrid'],
  [/portugal/i, 'Portugal'],
  [/france(?:\s*national)?/i, 'France'],
  [/england(?:\s*national)?/i, 'England'],
]

function cleanSpaces(s) {
  return String(s || '')
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractSeason(title) {
  const m = cleanSpaces(title).match(/\b(\d{2}\/\d{2})\b/)
  return m ? m[1] : ''
}

export function extractBrand(title, fallback = '') {
  const m = cleanSpaces(title).match(BRANDS)
  if (m) return m[1].replace(/\s+/g, ' ')
  const fb = cleanSpaces(fallback).match(BRANDS)
  return fb ? fb[1].replace(/\s+/g, ' ') : ''
}

export function extractTeam(title) {
  const text = cleanSpaces(title)
  for (const [re, name] of TEAMS) {
    if (re.test(text)) return name
  }
  return ''
}

export function extractSize(title, fallback = '') {
  if (fallback) {
    return cleanSpaces(fallback)
      .replace(/^Size\s+/i, '')
      .replace(/^Youth\s+/i, (m) => m)
  }
  const text = cleanSpaces(title)
  // Prefer trailing size tokens like "XL Extra Large" → XL
  const trailing = text.match(
    /\b(XXL|XL|XS|[SML])(?:\s+(?:Extra\s+)?(?:Large|Medium|Small))?(?:\s*[—–-]\s*Size\s+\1)?\s*$/i,
  )
  if (trailing) return trailing[1].toUpperCase()
  const youth = text.match(/\b(Yth(?:XL|L|M|S)|Youth\s*(?:Extra\s*)?(?:Large|Medium|Small|XL|L|M|S))\b/i)
  if (youth) {
    const raw = youth[1].replace(/Youth\s*/i, 'Youth ').replace(/Yth/i, 'Youth ')
    return raw
      .replace(/Extra\s*Large/i, 'XL')
      .replace(/\bLarge\b/i, 'L')
      .replace(/\bMedium\b/i, 'M')
      .replace(/\bSmall\b/i, 'S')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const yrs = text.match(/\b(\d+\s*[-–]\s*\d+\s*YRS?)\b/i)
  if (yrs) return yrs[1].replace(/\s+/g, ' ').toUpperCase()
  const m = text.match(SIZE_TOKEN)
  return m ? m[1] : ''
}

export function extractPlayer(title) {
  const text = cleanSpaces(title)
  if (/towel|t-?shirt|pack|inches?|\din\b/i.test(text)) return null
  // Strip season tokens so "Inter Miami 22/23" does not become Miami #22
  const noSeason = text.replace(/\b\d{2}\/\d{2}\b/g, ' ')
  const block =
    /Adidas|Nike|Puma|Under|Columbia|Pro|Edge|Men|Youth|Boys|Towel|Pack|Rally|Crest|Shirt|Jersey|Home|Away|Third|Miami|City|United|Madrid|Chelsea|Liverpool|Barcelona|Dortmund|Tottenham|Paris|Saint|Germain|Orange|Germany|Syracuse|Milan|Manchester|Inter|Real|Borussia|Hotspur|Newcastle|Arsenal|Bayern|Juventus|Ajax|Napoli|Roma|Everton|Brighton|Wolves|Villa|Leicester|Portugal|France|England|Spain|Argentina|Mexico/i

  // "Messi 10" or "Messi #10" / "Torres #9"
  const named = noSeason.match(/\b([A-Z][a-z]{2,})\s+#?\s*(\d{1,2})\b/)
  if (named && !block.test(named[1])) {
    return { name: named[1], number: named[2] }
  }
  const hash = noSeason.match(/#\s*(\d{1,2})\b/)
  if (hash) return { name: '', number: hash[1] }
  return null
}

export function extractKitLabel(title, tag = '') {
  const text = cleanSpaces(title)
  if (/pre-?match/i.test(text)) return 'Pre-Match Jersey'
  if (/strike\s*top/i.test(text)) return 'Strike Top'
  if (/\btraining\b/i.test(text)) return 'Training Jersey'
  if (/\bhome\b/i.test(text)) return 'Home Jersey'
  if (/\baway\b/i.test(text)) return 'Away Jersey'
  if (/\bthird\b/i.test(text)) return 'Third Jersey'
  if (/crest\s*t-?shirt|t-?shirt/i.test(text)) return 'Crest T-Shirt'
  if (/rally\s*towel|towel/i.test(text)) return 'Rally Towel'
  if (/jersey/i.test(text)) return 'Jersey'
  if (tag === 'Youth') return 'Youth Jersey'
  if (tag === 'Training') return 'Training Jersey'
  if (tag === 'Jerseys') return 'Jersey'
  if (tag === 'Apparel') return 'Apparel'
  return 'Kit'
}

/**
 * Build a cleaner storefront title.
 * e.g. "Inter Miami 22/23 Home Jersey — Messi #10 · XL"
 */
export function polishTitle(rawTitle, meta = {}) {
  const title = cleanSpaces(rawTitle).replace(/\s*[—–-]\s*Size\s+\S+.*$/i, '')
  const season = extractSeason(title)
  const brand = extractBrand(title, meta.brand || '')
  const team = extractTeam(title)
  const size = extractSize(title, meta.size || meta.note || '')
  const kit = extractKitLabel(title, meta.tag || '')
  const player = extractPlayer(title)

  // Special / non-soccer leftovers
  if (/syracuse.*towel|two\s*pack/i.test(title)) {
    return 'Syracuse Soccer Rally Towels (2-Pack)'
  }
  if (/syracuse.*jersey|#12/i.test(title) && /syracuse/i.test(title)) {
    return size
      ? `Syracuse Orange Football Jersey #12 · ${size}`
      : 'Syracuse Orange Football Jersey #12'
  }
  if (/barcelona.*t-?shirt|crest\s*t-?shirt/i.test(title)) {
    const bits = ['FC Barcelona Crest T-Shirt']
    if (/navy/i.test(title)) bits[0] += ' — Navy'
    if (size) bits.push(size)
    return bits.length > 1 ? `${bits[0]} · ${bits[1]}` : bits[0]
  }

  // Unknown club: keep the seller title. Using only "brand + kit" drops names
  // like "Newcastle United" / "Inter Milan" and ships incomplete storefront cards.
  if (!team) {
    let fallback = title
      .replace(/\bMen'?s\b/gi, '')
      .replace(/\bWomen'?s\b/gi, '')
      .replace(/\b(?:Boys|Girls)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (size) {
      const sizeRe = new RegExp(
        `\\b${size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`,
        'i',
      )
      if (!sizeRe.test(fallback)) {
        fallback = fallback
          .replace(
            /\b(?:Yth(?:XXL|XL|XS|[SML])|Youth\s*(?:Extra\s*)?(?:Large|Medium|Small|XXL|XL|XS|[SML])|XXL|XL|XS|[SML])(?:\s+(?:Extra\s+)?(?:Large|Medium|Small))?\s*$/i,
            '',
          )
          .trim()
        fallback = `${fallback} · ${size}`
      }
    }
    return cleanSpaces(fallback)
  }

  const headParts = []
  headParts.push(team)
  if (season) headParts.push(season)
  headParts.push(kit)

  let head = headParts.join(' ')
  if (player?.name && player?.number) {
    head += ` — ${player.name} #${player.number}`
  } else if (player?.number) {
    head += ` — #${player.number}`
  }

  if (brand) {
    // Keep brand subtle at end for searchability without cluttering the card
    head += ` (${brand})`
  }

  if (size) head += ` · ${size}`

  return cleanSpaces(head)
}

/** Canonical buyer-contact sentence on listing descriptions. */
export const CONTACT_LINE = 'Please message us if you have any questions.'

/**
 * Rewrite near-matches of "message me/us if you have questions" to CONTACT_LINE.
 * Leaves other description text alone.
 */
export function normalizeContactLine(text) {
  if (text == null || text === '') return text
  return String(text).replace(
    /\b(?:please\s+)?message\s+(?:me|us|up)\s+if\s+you\s+have\s+(?:any\s+)?questions\.?/gi,
    CONTACT_LINE,
  )
}

/**
 * Professional multi-line description for Square Online PDPs.
 */
export function polishDescription(rawTitle, meta = {}) {
  const title = cleanSpaces(rawTitle)
  const season = extractSeason(title)
  const brand = extractBrand(title, meta.brand || '')
  const team = extractTeam(title)
  const size = extractSize(title, meta.size || meta.note || '')
  const kit = extractKitLabel(title, meta.tag || '')
  const player = extractPlayer(title)
  const tag = meta.tag || ''
  const isYouth = /youth|yth|yrs/i.test(`${title} ${tag} ${size}`)

  const lines = []

  if (team && kit && !/towel|t-?shirt/i.test(kit)) {
    let lead = `Authentic ${brand ? brand + ' ' : ''}${team} ${kit.toLowerCase()}`
    if (season) lead += ` from the ${season} season`
    if (player?.name && player?.number) lead += `, featuring ${player.name} #${player.number}`
    else if (player?.number) lead += `, #${player.number}`
    lines.push(`${lead}.`)
  } else if (/towel/i.test(title)) {
    lines.push('Official-style Syracuse soccer rally towels — two-pack for match day or the dorm.')
  } else if (/t-?shirt|crest/i.test(title)) {
    lines.push(
      `Authentic ${team || 'club'} crest apparel${brand ? ` by ${brand}` : ''} from Jersey Deals.`.replace(
        / {2,}/g,
        ' ',
      ),
    )
  } else {
    lines.push('Authentic branded football kit from Jersey Deals US inventory.')
  }

  const facts = []
  if (brand) facts.push(`Brand: ${brand}`)
  if (season) facts.push(`Season: ${season}`)
  if (size) facts.push(`Size: ${size}${isYouth ? ' (Youth)' : ' (Adult)'}`)
  else if (isYouth) facts.push('Sizing: Youth')
  if (tag && !/jersey|training|youth|apparel/i.test(kit)) facts.push(`Category: ${tag}`)
  if (facts.length) lines.push(facts.join(' · '))

  lines.push('Ships from our US inventory. Real product photos. Secure Square checkout.')
  lines.push(CONTACT_LINE)

  return lines.join('\n\n')
}

export function polishDescriptionHtml(rawTitle, meta = {}) {
  const plain = polishDescription(rawTitle, meta)
  return plain
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('')
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Category bucket for Square Catalog categories. */
export function categoryForListing(title, meta = {}) {
  const text = `${title} ${meta.tag || ''} ${meta.note || ''}`
  if (/towel|t-?shirt|crest|apparel/i.test(text) && !/jersey/i.test(text)) return 'Apparel'
  if (/youth|yth|\d+\s*[-–]\s*\d+\s*yrs/i.test(text) || meta.tag === 'Youth') return 'Youth'
  if (/pre-?match|training|strike/i.test(text) || meta.tag === 'Training') return 'Training'
  return 'Match Jerseys'
}
