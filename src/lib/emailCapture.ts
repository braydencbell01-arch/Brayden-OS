const STORAGE_KEY = 'braystats_email_signups_v1'
const CONTACT_EMAIL = 'braydencbell01@gmail.com'

export type EmailSignup = {
  email: string
  source: string
  site: 'braystats'
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

function formEndpoint() {
  const custom = (import.meta.env.VITE_EMAIL_FORM_ENDPOINT as string | undefined)?.trim()
  if (custom) return custom
  return `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`
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
        site: 'BrayStats',
        _subject: `BrayStats signup · ${source}`,
        _template: 'table',
        _captcha: 'false',
      }),
    })
    if (!res.ok) {
      return {
        ok: true,
        message: 'Saved. Confirm FormSubmit’s first email to your inbox if prompted.',
      }
    }
    return { ok: true, message: 'You’re on the list for BrayStats updates.' }
  } catch {
    return {
      ok: true,
      message: 'Saved on this device. Inbox delivery may need a one-time FormSubmit confirm.',
    }
  }
}
