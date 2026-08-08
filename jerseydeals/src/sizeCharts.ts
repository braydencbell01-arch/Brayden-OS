/** Brand size charts shown from “What’s my size?” on item profiles. */

export type SizeChartRow = {
  size: string
  chest: string
  length?: string
  note?: string
}

/** Selectable size chips on the item profile (available + greyed-out siblings). */
export const MEN_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'] as const
export const WOMEN_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export const YOUTH_SIZE_OPTIONS = ['Youth S', 'Youth M', 'Youth L', 'Youth XL'] as const

export function normalizeSizeLabel(raw: string): string {
  let s = (raw || '').trim()
  if (!s || /^other$/i.test(s) || /^one\s*size$/i.test(s)) return ''
  s = s
    .replace(/\byth\b/gi, 'Youth')
    .replace(/\byouth\b/gi, 'Youth')
    .replace(/\bxx-?large\b/gi, 'XXL')
    .replace(/\bx-?large\b/gi, 'XL')
    .replace(/\blarge\b/gi, 'L')
    .replace(/\bmedium\b/gi, 'M')
    .replace(/\bsmall\b/gi, 'S')
    .replace(/\bx-?small\b/gi, 'XS')
    .replace(/\s+/g, ' ')
    .trim()
  // Bare adult letter on a youth listing: "XL" → "Youth XL"
  return s
}

export function sizeKey(raw: string): string {
  return normalizeSizeLabel(raw).toLowerCase().replace(/\s+/g, ' ')
}

export function sizesForAudience(opts: {
  youth?: boolean
  women?: boolean
}): string[] {
  if (opts.youth) return [...YOUTH_SIZE_OPTIONS]
  if (opts.women) return [...WOMEN_SIZE_OPTIONS]
  return [...MEN_SIZE_OPTIONS]
}

/** Map listing size onto the audience grid label when possible. */
export function matchSizeOption(available: string, options: string[]): string | null {
  const key = sizeKey(available)
  if (!key) return null
  for (const opt of options) {
    if (sizeKey(opt) === key) return opt
  }
  // Youth listing stored as bare "XL"
  for (const opt of options) {
    const ok = sizeKey(opt)
    if (ok.endsWith(` ${key}`) || ok === `youth ${key}`) return opt
  }
  return null
}

export type SizeChart = {
  brand: string
  audience: 'Adult' | 'Youth'
  unit: string
  rows: SizeChartRow[]
  tip: string
}

const ADULT_ADIDAS: SizeChartRow[] = [
  { size: 'S', chest: '34–37"', length: '27.5"' },
  { size: 'M', chest: '37–40"', length: '28.5"' },
  { size: 'L', chest: '40–44"', length: '29.5"' },
  { size: 'XL', chest: '44–48"', length: '30.5"' },
  { size: 'XXL', chest: '48–52"', length: '31.5"' },
]

const ADULT_NIKE: SizeChartRow[] = [
  { size: 'S', chest: '35–37.5"', length: '27–28"' },
  { size: 'M', chest: '37.5–41"', length: '28–29"' },
  { size: 'L', chest: '41–44"', length: '29–30"' },
  { size: 'XL', chest: '44–48.5"', length: '30–31"' },
  { size: 'XXL', chest: '48.5–53.5"', length: '31–32"' },
]

const ADULT_PUMA: SizeChartRow[] = [
  { size: 'S', chest: '35–37"', length: '28"' },
  { size: 'M', chest: '38–40"', length: '29"' },
  { size: 'L', chest: '41–43"', length: '30"' },
  { size: 'XL', chest: '44–47"', length: '31"' },
  { size: 'XXL', chest: '48–51"', length: '32"' },
]

const ADULT_GENERIC: SizeChartRow[] = [
  { size: 'S', chest: '34–37"' },
  { size: 'M', chest: '37–40"' },
  { size: 'L', chest: '40–44"' },
  { size: 'XL', chest: '44–48"' },
  { size: 'XXL', chest: '48–52"' },
]

const YOUTH_GENERIC: SizeChartRow[] = [
  { size: 'Youth S', chest: '26–28"', note: '~6–8 yrs' },
  { size: 'Youth M', chest: '28–30"', note: '~8–10 yrs' },
  { size: 'Youth L', chest: '30–32"', note: '~10–12 yrs' },
  { size: 'Youth XL', chest: '32–35"', note: '~12–14 yrs' },
  { size: '9-12 YRS', chest: '30–34"', note: 'Age label on garment' },
]

function normalizeBrand(brand: string | undefined) {
  return (brand || '').trim().toLowerCase()
}

export function resolveSizeChart(opts: {
  brand?: string
  youth?: boolean
}): SizeChart {
  const brand = normalizeBrand(opts.brand)
  const youth = Boolean(opts.youth)

  if (youth) {
    return {
      brand: opts.brand?.trim() || 'Youth',
      audience: 'Youth',
      unit: 'Inches',
      rows: YOUTH_GENERIC,
      tip: 'Youth kits vary by brand — use the size printed on the listing and garment label.',
    }
  }

  if (brand.includes('adidas')) {
    return {
      brand: 'Adidas',
      audience: 'Adult',
      unit: 'Inches',
      rows: ADULT_ADIDAS,
      tip: 'Adidas replica kits usually run true to size. Size up for a looser training fit.',
    }
  }
  if (brand.includes('nike')) {
    return {
      brand: 'Nike',
      audience: 'Adult',
      unit: 'Inches',
      rows: ADULT_NIKE,
      tip: 'Nike Dri-FIT replicas are often a modern athletic fit — size up if you prefer room.',
    }
  }
  if (brand.includes('puma')) {
    return {
      brand: 'Puma',
      audience: 'Adult',
      unit: 'Inches',
      rows: ADULT_PUMA,
      tip: 'Puma kits tend to run true to size. Pre-match tops can feel slightly slim.',
    }
  }

  return {
    brand: opts.brand?.trim() || 'Standard',
    audience: 'Adult',
    unit: 'Inches',
    rows: ADULT_GENERIC,
    tip: 'When between sizes, size up — especially for training and pre-match tops.',
  }
}
