import { createWorker, type Worker } from 'tesseract.js'
import { getJurisdiction, type Jurisdiction } from './jurisdictions'

export type PlateRead = {
  text: string
  confidence: number
  jurisdiction?: Jurisdiction
  guessedState?: string
  rawText: string
}

const PLATE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const STATE_HINT =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/

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

/** Boost contrast / crop toward plate-like mid band for OCR. */
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

function cleanPlateText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Prefer the densest alphanumeric token that looks like a plate serial. */
export function extractPlateSerial(cleaned: string): string {
  const tokens = cleaned.split(/[\s-]+/).filter(Boolean)
  const scored = tokens
    .map((t) => ({
      t,
      score: t.length * 2 + (/[A-Z]/.test(t) && /\d/.test(t) ? 8 : 0) + (t.length >= 5 && t.length <= 8 ? 6 : 0),
    }))
    .sort((a, b) => b.score - a.score)
  if (scored[0] && scored[0].score >= 8) return scored[0].t
  return cleaned.replace(/\s+/g, '') || cleaned
}

export async function readLicensePlate(
  source: HTMLCanvasElement | HTMLImageElement,
): Promise<PlateRead> {
  const prepared = await preprocessForOcr(source)
  const worker = await getWorker()
  const result = await worker.recognize(prepared)
  const rawText = result.data.text ?? ''
  const cleaned = cleanPlateText(rawText)
  const text = extractPlateSerial(cleaned)
  const stateMatch = cleaned.match(STATE_HINT) ?? rawText.toUpperCase().match(STATE_HINT)
  const guessedState = stateMatch?.[1]
  const jurisdiction = guessedState ? getJurisdiction(guessedState) : undefined

  return {
    text: text || '—',
    confidence: result.data.confidence ?? 0,
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
