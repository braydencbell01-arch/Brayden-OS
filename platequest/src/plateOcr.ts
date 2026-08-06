import { createWorker, type Worker } from 'tesseract.js'
import { getJurisdiction, JURISDICTIONS, type Jurisdiction } from './jurisdictions'

export type PlateRead = {
  text: string
  confidence: number
  jurisdiction?: Jurisdiction
  guessedState?: string
  rawText: string
}

const PLATE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Two-letter codes only — weak signal; OCR often invents these from graphics. */
const STATE_CODE_HINT =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/g

type NameHint = { code: string; needle: string; weight: number }

/** Distinctive plate graphic / slogan fragments OCR often half-reads. */
const DESIGN_CUES: NameHint[] = [
  { code: 'UT', needle: 'DELICATE', weight: 75 },
  { code: 'UT', needle: 'DELACT', weight: 70 },
  { code: 'UT', needle: 'ELEVATED', weight: 75 },
  { code: 'UT', needle: 'LIFEELEVATED', weight: 90 },
  { code: 'ID', needle: 'POTATO', weight: 70 },
  { code: 'ID', needle: 'POTATOES', weight: 80 },
  { code: 'NH', needle: 'LIVEFREE', weight: 80 },
  { code: 'NM', needle: 'ENCHANTMENT', weight: 75 },
  { code: 'NC', needle: 'FLIGHT', weight: 55 },
  { code: 'SD', needle: 'RUSHMORE', weight: 80 },
  { code: 'WY', needle: 'BUCKING', weight: 70 },
  { code: 'DC', needle: 'TAXATION', weight: 80 },
  { code: 'DC', needle: 'REPRESENTATION', weight: 80 },
]

const NAME_HINTS: NameHint[] = [
  ...JURISDICTIONS.flatMap((j) => {
    const hints: NameHint[] = []
    const name = j.name.toUpperCase().replace(/\./g, '')
    hints.push({ code: j.code, needle: name, weight: 100 })
    const compact = name.replace(/[^A-Z]/g, '')
    if (compact.length >= 4) hints.push({ code: j.code, needle: compact, weight: 95 })
    if (j.slogan) {
      const slogan = j.slogan
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (slogan.length >= 6) hints.push({ code: j.code, needle: slogan, weight: 85 })
      for (const part of slogan.split(' ').filter((w) => w.length >= 5)) {
        hints.push({ code: j.code, needle: part, weight: 55 })
      }
    }
    return hints
  }),
  ...DESIGN_CUES,
].sort((a, b) => b.needle.length - a.needle.length)

let workerPromise: Promise<Worker> | null = null

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        logger: () => {},
      })
      await worker.setParameters({
        tessedit_char_whitelist: PLATE_CHARS,
      })
      return worker
    })()
  }
  return workerPromise
}

/** Boost contrast for OCR. */
export async function preprocessForOcr(source: HTMLCanvasElement | HTMLImageElement): Promise<HTMLCanvasElement> {
  const w = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width
  const h = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height
  const canvas = document.createElement('canvas')
  const targetW = Math.min(900, Math.max(480, w))
  const scale = targetW / w
  canvas.width = targetW
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const boosted = g < 128 ? g * 0.65 : Math.min(255, g * 1.25 + 20)
    d[i] = d[i + 1] = d[i + 2] = boosted
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Top band where the state name usually sits (supplement to full-frame OCR). */
function cropTopBand(source: HTMLCanvasElement): HTMLCanvasElement {
  const band = document.createElement('canvas')
  const h = Math.max(40, Math.round(source.height * 0.32))
  band.width = source.width
  band.height = h
  const ctx = band.getContext('2d')!
  ctx.drawImage(source, 0, 0, source.width, h, 0, 0, source.width, h)
  return band
}

/**
 * Optional center region matching the on-screen aim tip (~72% × 28%).
 * Used only as an extra OCR pass — never the sole source.
 */
function cropAimSuggestion(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas')
  const w = Math.max(80, Math.round(source.width * 0.72))
  const h = Math.max(40, Math.round(source.height * 0.28))
  const sx = Math.round((source.width - w) / 2)
  const sy = Math.round((source.height - h) / 2)
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!
  ctx.drawImage(source, sx, sy, w, h, 0, 0, w, h)
  return out
}

function cleanPlateText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeForNameMatch(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Guess jurisdiction from OCR text.
 * Prefer full state names / slogans / design cues over two-letter codes.
 */
export function guessJurisdictionCode(cleaned: string, rawText: string): string | undefined {
  const hay = normalizeForNameMatch(`${cleaned} ${rawText}`)
  const hayCompact = hay.replace(/\s+/g, '')
  const scores = new Map<string, number>()

  function bump(code: string, points: number) {
    scores.set(code, (scores.get(code) ?? 0) + points)
  }

  for (const hint of NAME_HINTS) {
    const needleCompact = hint.needle.replace(/\s+/g, '')
    if (hint.needle.includes(' ')) {
      if (hay.includes(hint.needle)) bump(hint.code, hint.weight)
    } else if (hayCompact.includes(needleCompact)) {
      bump(hint.code, hint.weight)
    }
  }

  const codeHay = cleanPlateText(`${cleaned} ${rawText}`)
  for (const match of codeHay.matchAll(STATE_CODE_HINT)) {
    bump(match[1], 12)
  }

  let best: string | undefined
  let bestScore = 0
  for (const [code, score] of scores) {
    if (score > bestScore) {
      best = code
      bestScore = score
    }
  }

  // Lone two-letter hits (e.g. "DE" from "DE LACT") are not trustworthy.
  if (!best || bestScore < 40) return undefined
  return best
}

/** Prefer mixed letter+digit tokens of plate-like length over long OCR junk. */
export function extractPlateSerial(cleaned: string): string {
  const tokens = cleaned.split(/[\s-]+/).filter(Boolean)
  const scored = tokens
    .map((t) => {
      const hasLetter = /[A-Z]/.test(t)
      const hasDigit = /\d/.test(t)
      const mixed = hasLetter && hasDigit
      let score = 0
      if (mixed) score += 20
      if (t.length >= 5 && t.length <= 8) score += 12
      else if (t.length >= 4 && t.length <= 9) score += 6
      if (!hasDigit && t.length > 8) score -= 20
      if (t.length > 10) score -= (t.length - 10) * 3
      score += Math.min(t.length, 8)
      return { t, score }
    })
    .sort((a, b) => b.score - a.score)
  if (scored[0] && scored[0].score >= 12) return scored[0].t
  const mixed = tokens.filter((t) => /[A-Z]/.test(t) && /\d/.test(t) && t.length >= 3)
  if (mixed.length) return mixed.sort((a, b) => b.length - a.length)[0]
  return cleaned.replace(/\s+/g, '') || cleaned
}

export async function readLicensePlate(
  source: HTMLCanvasElement | HTMLImageElement,
): Promise<PlateRead> {
  // Always OCR the whole picture first; aim-tip / top-band crops are extras only.
  const prepared = await preprocessForOcr(source)
  const worker = await getWorker()
  const [full, top, aim] = await Promise.all([
    worker.recognize(prepared),
    worker.recognize(cropTopBand(prepared)),
    worker.recognize(cropAimSuggestion(prepared)),
  ])
  const rawText = [full.data.text ?? '', top.data.text ?? '', aim.data.text ?? '']
    .filter(Boolean)
    .join(' ')
  const cleaned = cleanPlateText(rawText)
  const text = extractPlateSerial(cleaned)
  const guessedState = guessJurisdictionCode(cleaned, rawText)
  const jurisdiction = guessedState ? getJurisdiction(guessedState) : undefined
  const confidence = Math.max(
    full.data.confidence ?? 0,
    top.data.confidence ?? 0,
    aim.data.confidence ?? 0,
  )

  return {
    text: text || '—',
    confidence,
    jurisdiction,
    guessedState,
    rawText: cleaned || rawText.trim(),
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return
  const w = await workerPromise
  workerPromise = null
  await w.terminate()
}
