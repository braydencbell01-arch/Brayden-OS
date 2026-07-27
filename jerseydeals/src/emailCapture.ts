/**
 * Jersey Deals–only email capture.
 * 1) Square Customers via collector API (preferred) — tagged member vs non-member
 * 2) FormSubmit → shop@jerseydeals.online (always notify owner)
 * Permanent lists live in public/rewards-members.json + public/non-member-emails.json
 * (kept current by the collect/sync pipelines).
 * Never import BrayStats modules or BrayStats env vars.
 */
import { CONTACT_EMAIL } from './config'
import { track } from './analytics'

const STORAGE_KEY = 'jd_email_signups_v1'
const MEMBER_SOURCES = new Set(['rewards_club'])

export type LeadExtras = {
  phone?: string
  name?: string
  message?: string
  membership?: 'member' | 'non_member'
  [key: string]: string | undefined
}

export type EmailSignup = {
  email: string
  source: string
  site: 'jerseydeals'
  product: 'Jersey Deals'
  at: string
  membership: 'member' | 'non_member'
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

export function membershipFromSource(source: string): 'member' | 'non_member' {
  return MEMBER_SOURCES.has(String(source || '').trim()) ? 'member' : 'non_member'
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

/** Inbox notify. Defaults to CONTACT_EMAIL (shop@jerseydeals.online). */
function formEndpoint() {
  const custom = (
    import.meta.env.VITE_JERSEYDEALS_EMAIL_FORM_ENDPOINT as string | undefined
  )?.trim()
  if (custom) return custom
  return `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`
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

async function postSquareCollector(
  email: string,
  source: string,
  membership: 'member' | 'non_member',
  extra: Record<string, string>,
) {
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
      membership,
      product: 'Jersey Deals',
      site: 'Jersey Deals',
      ...extra,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`collector ${res.status}: ${text.slice(0, 160)}`)
  }
  return { attempted: true, ok: true }
}

async function postFormSubmit(
  email: string,
  source: string,
  membership: 'member' | 'non_member',
  extra: Record<string, string>,
  at: string,
) {
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
      membership,
      product: 'Jersey Deals',
      site: 'Jersey Deals',
      list: membership === 'member' ? 'jerseydeals_rewards_members' : 'jerseydeals_non_members',
      collected_at: at,
      _subject: `[Jersey Deals] ${membership} · ${source}`,
      _template: 'table',
      _captcha: 'false',
      _replyto: email,
    }),
  })
  return res.ok
}

/**
 * Collect + track a Jersey Deals lead: localStorage, Square Customers API, FormSubmit notify.
 * Rewards Club (`rewards_club`) → members list; all other sources → non-members list.
 */
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
  const membership =
    extras?.membership === 'member' || extras?.membership === 'non_member'
      ? extras.membership
      : membershipFromSource(source)
  // Don't send membership twice in extras spread to collector.
  delete extra.membership

  const entry: EmailSignup = {
    email,
    source,
    site: 'jerseydeals',
    product: 'Jersey Deals',
    at: new Date().toISOString(),
    membership,
    ...(extra.phone ? { phone: extra.phone } : {}),
    ...(extra.name ? { name: extra.name } : {}),
    ...(extra.message ? { message: extra.message } : {}),
  }
  persistSignup(entry)
  track('email_captured', {
    source,
    site: 'jerseydeals',
    product: 'jersey_deals',
    membership,
  })

  let squareOk = false
  try {
    const result = await postSquareCollector(email, source, membership, extra)
    squareOk = result.ok
    if (squareOk) track('email_capture_square_ok', { source, product: 'jersey_deals', membership })
  } catch {
    track('email_capture_square_fail', { source, product: 'jersey_deals', membership })
  }

  let formOk = false
  try {
    formOk = await postFormSubmit(email, source, membership, extra, entry.at)
    if (formOk) track('email_capture_remote_ok', { source, product: 'jersey_deals', membership })
    else track('email_capture_remote_fail', { source, product: 'jersey_deals', membership })
  } catch {
    track('email_capture_remote_fail', { source, status: 0, product: 'jersey_deals', membership })
  }

  if (squareOk) {
    return {
      ok: true,
      message:
        membership === 'member'
          ? 'Saved to Jersey Deals Rewards members.'
          : 'Saved to our Jersey Deals list.',
    }
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
