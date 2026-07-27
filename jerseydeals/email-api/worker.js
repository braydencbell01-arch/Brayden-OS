/**
 * Cloudflare Worker: collect Jersey Deals leads into Square Customers,
 * tag Rewards members vs non-members, and email shop@jerseydeals.online.
 *
 * Secrets:
 *   SQUARE_ACCESS_TOKEN
 *   (optional) COLLECT_SECRET — if set, require header X-JD-Collect-Secret
 *   (optional) NOTIFY_EMAIL — defaults to shop@jerseydeals.online
 *
 * POST JSON: { email, phone?, name?, message?, source?, membership?, product?, site?, ... }
 * OPTIONS for CORS
 */

const SQUARE_HOST = 'https://connect.squareup.com'
const SQUARE_VERSION = '2025-10-16'
const DEFAULT_NOTIFY = 'shop@jerseydeals.online'
const MEMBER_SOURCES = new Set(['rewards_club'])

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-JD-Collect-Secret',
    'Access-Control-Max-Age': '86400',
  }
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function membershipFromSource(source) {
  return MEMBER_SOURCES.has(String(source || '').trim()) ? 'member' : 'non_member'
}

function resolveMembership(payload, source) {
  const raw = String(payload.membership || '').trim().toLowerCase()
  if (raw === 'member' || raw === 'non_member') return raw
  return membershipFromSource(source)
}

async function square(env, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${SQUARE_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Square non-JSON ${res.status}: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    const msg =
      data?.errors?.map((e) => e.detail || e.code).join('; ') || text.slice(0, 200)
    throw new Error(`Square ${method} ${path}: ${msg}`)
  }
  return data
}

function pickExtras(payload) {
  const skip = new Set([
    'email',
    'source',
    'product',
    'site',
    'list',
    'membership',
    '_subject',
    '_template',
    '_captcha',
    '_replyto',
  ])
  const out = {}
  for (const [k, v] of Object.entries(payload || {})) {
    if (skip.has(k)) continue
    const val = String(v ?? '').trim()
    if (val) out[k] = val.slice(0, 500)
  }
  return out
}

function buildNote({ source, membership, phone, name, previousNote = '' }) {
  const line = [
    'Jersey Deals lead',
    `jd_member:${membership === 'member' ? 'yes' : 'no'}`,
    source ? `source:${source}` : null,
    phone ? `phone:${phone}` : null,
    name ? `name:${name}` : null,
    `at:${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const prev = String(previousNote || '').trim()
  if (!prev) return line
  let nextPrev = prev
  if (membership === 'member') {
    nextPrev = nextPrev.replace(/\bjd_member:no\b/gi, 'jd_member:yes')
    if (!/\bjd_member:yes\b/i.test(nextPrev)) nextPrev = `${nextPrev}\njd_member:yes`
  }
  if (source && nextPrev.includes(`source:${source}`)) return nextPrev.slice(0, 2000)
  return [nextPrev, line].filter(Boolean).join('\n').slice(0, 2000)
}

function noteSaysMember(note) {
  return /\bjd_member:yes\b/i.test(String(note || '')) || /source:rewards_club\b/i.test(String(note || ''))
}

async function notifyOwner(env, fields) {
  const to = String(env.NOTIFY_EMAIL || DEFAULT_NOTIFY).trim() || DEFAULT_NOTIFY
  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ...fields,
        _subject: `[${fields.site || 'Lead'}] ${fields.membership || 'lead'} · ${fields.source || 'unknown'}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: fields.email || to,
      }),
    })
  } catch {
    // non-fatal — Square upsert still succeeded
  }
}

async function upsertCustomer(env, email, source, membership, extras) {
  const search = await square(env, '/v2/customers/search', {
    method: 'POST',
    body: {
      query: {
        filter: {
          email_address: { exact: email },
        },
      },
      limit: 1,
    },
  })
  const existing = (search.customers || [])[0]
  const phone = extras.phone || extras.phone_number || ''
  // Never demote an existing Rewards member.
  const finalMembership =
    membership === 'member' || noteSaysMember(existing?.note) ? 'member' : 'non_member'
  const note = buildNote({
    source,
    membership: finalMembership,
    phone,
    name: extras.name,
    previousNote: existing?.note || '',
  })

  const customerBody = {
    email_address: email,
    note,
    reference_id: existing?.reference_id || 'jerseydeals',
  }
  if (phone) customerBody.phone_number = phone
  if (extras.name) {
    const parts = extras.name.split(/\s+/)
    customerBody.given_name = parts[0]
    if (parts.length > 1) customerBody.family_name = parts.slice(1).join(' ')
  }

  if (existing?.id) {
    await square(env, `/v2/customers/${existing.id}`, {
      method: 'PUT',
      body: { customer: customerBody },
    })
    return { id: existing.id, created: false, membership: finalMembership }
  }

  const created = await square(env, '/v2/customers', {
    method: 'POST',
    body: {
      idempotency_key: crypto.randomUUID(),
      ...customerBody,
    },
  })
  return { id: created.customer?.id, created: true, membership: finalMembership }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*'

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'POST only' }, 405, origin)
    }

    if (!env.SQUARE_ACCESS_TOKEN) {
      return json({ ok: false, error: 'Server misconfigured' }, 500, origin)
    }

    if (env.COLLECT_SECRET) {
      const got = request.headers.get('X-JD-Collect-Secret') || ''
      if (got !== env.COLLECT_SECRET) {
        return json({ ok: false, error: 'Unauthorized' }, 401, origin)
      }
    }

    let payload = {}
    try {
      payload = await request.json()
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400, origin)
    }

    const email = String(payload.email || '')
      .trim()
      .toLowerCase()
    const source = String(payload.source || 'unknown')
      .trim()
      .slice(0, 80)
    const product = String(payload.product || 'Jersey Deals').trim().slice(0, 80)
    const site = String(payload.site || 'Jersey Deals').trim().slice(0, 80)
    const extras = pickExtras(payload)
    const membership = resolveMembership(payload, source)

    if (!isValidEmail(email)) {
      return json({ ok: false, error: 'Invalid email' }, 400, origin)
    }

    try {
      const result = await upsertCustomer(env, email, source, membership, extras)
      await notifyOwner(env, {
        email,
        ...extras,
        source,
        membership: result.membership,
        product,
        site,
        list: result.membership === 'member' ? 'jerseydeals_rewards_members' : 'jerseydeals_non_members',
        collected_at: new Date().toISOString(),
        square_customer_id: result.id || '',
        square_created: String(!!result.created),
      })
      return json(
        {
          ok: true,
          customerId: result.id,
          created: result.created,
          membership: result.membership,
        },
        200,
        origin,
      )
    } catch (err) {
      return json({ ok: false, error: String(err.message || err).slice(0, 240) }, 502, origin)
    }
  },
}
