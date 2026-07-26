/**
 * BrayStats-only email capture storage.
 * Notifications go to the official shop inbox so every site lead is emailed there.
 */

const STORAGE_KEY = 'braystats_email_signups_v1'
/** Official business inbox — receives every BrayStats lead notification. */
const NOTIFY_EMAIL = 'shop@jerseydeals.online'

export type LeadExtras = {
  phone?: string
  name?: string
  message?: string
  [key: string]: string | undefined
}

export type EmailSignup = {
  email: string
  source: string
  site: 'braystats'
  product: 'BrayStats'
  at: string
  phone?: string
  name?: string
  message?: string
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

/** BrayStats-only form endpoint override. Default notifies shop@jerseydeals.online. */
function formEndpoint() {
  const custom = (import.meta.env.VITE_BRAYSTATS_EMAIL_FORM_ENDPOINT as string | undefined)?.trim()
  if (custom) return custom
  return `https://formsubmit.co/ajax/${encodeURIComponent(NOTIFY_EMAIL)}`
}

function cleanExtras(extras?: LeadExtras) {
  const out: Record<string, string> = {}
  if (!extras) return out
  for (const [k, v] of Object.entries(extras)) {
    const val = String(v || '').trim()
    if (val) out[k] = val.slice(0, 500)
  }
  return out
}

export async function captureEmail(
  rawEmail: string,
  source: string,
  extras?: LeadExtras,
): Promise<{ ok: boolean; message: string }> {
  const email = rawEmail.trim().toLowerCase()
  if (!isValidEmail(email)) {
    return { ok: false, message: 'Enter a valid email address.' }
  }

  const extra = cleanExtras(extras)
  const entry: EmailSignup = {
    email,
    source,
    site: 'braystats',
    product: 'BrayStats',
    at: new Date().toISOString(),
    ...(extra.phone ? { phone: extra.phone } : {}),
    ...(extra.name ? { name: extra.name } : {}),
    ...(extra.message ? { message: extra.message } : {}),
  }
  persistSignup(entry)

  try {
    const res = await fetch(formEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        ...extra,
        source,
        product: 'BrayStats',
        site: 'BrayStats',
        list: 'braystats_updates',
        collected_at: entry.at,
        _subject: `[BrayStats] new info · ${source}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: email,
      }),
    })
    if (!res.ok) {
      return {
        ok: false,
        message: 'Couldn’t reach the signup service. Try again in a moment.',
      }
    }
    return { ok: true, message: 'You’re on the BrayStats list.' }
  } catch {
    return {
      ok: false,
      message: 'Network error — your email wasn’t submitted. Check connection and try again.',
    }
  }
}
