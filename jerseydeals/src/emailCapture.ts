import { CONTACT_EMAIL } from './config'
import { track } from './analytics'

const STORAGE_KEY = 'jd_email_signups_v1'

export type EmailSignup = {
  email: string
  source: string
  site: 'jerseydeals'
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

/** Optional override, e.g. Formspree URL. Default: FormSubmit → CONTACT_EMAIL. */
function formEndpoint() {
  const custom = (import.meta.env.VITE_EMAIL_FORM_ENDPOINT as string | undefined)?.trim()
  if (custom) return custom
  return `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`
}

/**
 * Collect + track an email: localStorage backup, analytics, and remote form POST.
 * Returns ok/error for UI messaging.
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
    at: new Date().toISOString(),
  }
  persistSignup(entry)
  track('email_captured', { source, site: 'jerseydeals' })

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
        site: 'Jersey Deals',
        _subject: `Jersey Deals signup · ${source}`,
        _template: 'table',
        _captcha: 'false',
      }),
    })
    if (!res.ok) {
      track('email_capture_remote_fail', { source, status: res.status })
      return {
        ok: true,
        message: 'Saved on this device. Confirm the first FormSubmit email to your inbox if asked.',
      }
    }
    track('email_capture_remote_ok', { source })
    return { ok: true, message: 'You’re on the list — we’ll email restocks and drops.' }
  } catch {
    track('email_capture_remote_fail', { source, status: 0 })
    return {
      ok: true,
      message: 'Saved on this device. Delivery to our inbox may need a one-time FormSubmit confirm.',
    }
  }
}
