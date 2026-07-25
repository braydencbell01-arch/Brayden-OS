/**
 * BrayStats-only email capture. Never import jerseydeals modules or JD env vars.
 */

const STORAGE_KEY = 'braystats_email_signups_v1'
/** Product inbox for BrayStats updates (keep separate from Jersey Deals business). */
const BRAYSTATS_CONTACT_EMAIL = 'braydencbell01@gmail.com'

export type EmailSignup = {
  email: string
  source: string
  site: 'braystats'
  product: 'BrayStats'
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

/** BrayStats-only form endpoint. Never reads Jersey Deals env vars. */
function formEndpoint() {
  const custom = (import.meta.env.VITE_BRAYSTATS_EMAIL_FORM_ENDPOINT as string | undefined)?.trim()
  if (custom) return custom
  return `https://formsubmit.co/ajax/${encodeURIComponent(BRAYSTATS_CONTACT_EMAIL)}`
}

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
    site: 'braystats',
    product: 'BrayStats',
    at: new Date().toISOString(),
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
        source,
        product: 'BrayStats',
        site: 'BrayStats',
        list: 'braystats_updates',
        _subject: `[BrayStats] signup · ${source}`,
        _template: 'table',
        _captcha: 'false',
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
