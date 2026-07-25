/**
 * Jersey Deals–only email capture.
 * 1) Square Customers via collector API (preferred)
 * 2) FormSubmit inbox fallback
 * Never import BrayStats modules or BrayStats env vars.
 */
import { CONTACT_EMAIL } from './config'
import { track } from './analytics'

const STORAGE_KEY = 'jd_email_signups_v1'

export type EmailSignup = {
  email: string
  source: string
  site: 'jerseydeals'
  product: 'Jersey Deals'
  at: string
}

function canStore() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function readStoredSignups(): EmailSignup[] {
  if (!canStore()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EmailSignup[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSignup(entry: EmailSignup) {
  if (!canStore()) return
  const prev = readStoredSignups()
  if (prev.some((p) => p.email === entry.email && p.source === entry.source)) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...prev].slice(0, 200)))
}

/** Preferred: Cloudflare Worker / tunnel that upserts Square Customers. */
function squareCollectEndpoint() {
  return (import.meta.env.VITE_JERSEYDEALS_EMAIL_API_URL as string | undefined)?.trim() || ''
}

function collectSecret() {
  return (import.meta.env.VITE_JERSEYDEALS_EMAIL_API_SECRET as string | undefined)?.trim() || ''
}

/** Inbox fallback. Never share with BrayStats. */
function formEndpoint() {
  const custom = (
    import.meta.env.VITE_JERSEYDEALS_EMAIL_FORM_ENDPOINT as string | undefined
  )?.trim()
  if (custom) return custom
  return `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`
}

async function postSquareCollector(email: string, source: string) {
  const endpoint = squareCollectEndpoint()
  if (!endpoint) return { attempted: false, ok: false }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const secret = collectSecret()
  if (secret) headers['X-JD-Collect-Secret'] = secret
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      source,
      product: 'Jersey Deals',
      site: 'Jersey Deals',
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`collector ${res.status}: ${text.slice(0, 160)}`)
  }
  return { attempted: true, ok: true }
}

async function postFormSubmit(email: string, source: string) {
  const res = await fetch(formEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      source,
      product: 'Jersey Deals',
      site: 'Jersey Deals',
      list: 'jerseydeals_leads',
      _subject: `[Jersey Deals] signup · ${source}`,
      _template: 'table',
      _captcha: 'false',
    }),
  })
  return res.ok
}

/**
 * Collect + track a Jersey Deals email: localStorage, Square Customers API, FormSubmit.
 */
export async function captureEmail(
  rawEmail: string,
  source: string,
): Promise<{ ok: boolean; message: string }> {
  const email = rawEmail.trim().toLowerCase()
  if (!isValidEmail(email)) {
    return { ok: false, message: 'Enter a valid email address.' }
  }

  const entry: EmailSignup = {
    email,
    source,
    site: 'jerseydeals',
    product: 'Jersey Deals',
    at: new Date().toISOString(),
  }
  persistSignup(entry)
  track('email_captured', { source, site: 'jerseydeals', product: 'jersey_deals' })

  let squareOk = false
  try {
    const result = await postSquareCollector(email, source)
    squareOk = result.ok
    if (squareOk) track('email_capture_square_ok', { source, product: 'jersey_deals' })
  } catch {
    track('email_capture_square_fail', { source, product: 'jersey_deals' })
  }

  let formOk = false
  try {
    formOk = await postFormSubmit(email, source)
    if (formOk) track('email_capture_remote_ok', { source, product: 'jersey_deals' })
    else track('email_capture_remote_fail', { source, product: 'jersey_deals' })
  } catch {
    track('email_capture_remote_fail', { source, status: 0, product: 'jersey_deals' })
  }

  if (squareOk) {
    return { ok: true, message: 'Saved to our Jersey Deals list.' }
  }
  if (formOk) {
    return {
      ok: true,
      message: 'You’re on the list — confirm the first FormSubmit email in our inbox if asked.',
    }
  }
  return {
    ok: false,
    message: 'Couldn’t submit your email right now. Check your connection and try again.',
  }
}
