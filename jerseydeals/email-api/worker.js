/**
 * Cloudflare Worker: collect Jersey Deals leads into Square Customers,
 * tag Rewards members vs non-members, email shop@jerseydeals.online,
 * create multi-item Square Payment Links for cart "Checkout all",
 * and receive Square payment webhooks to kick sold reconcile on GitHub.
 *
 * Secrets:
 *   SQUARE_ACCESS_TOKEN
 *   (optional) COLLECT_SECRET — if set, require header X-JD-Collect-Secret (lead/cart only)
 *   (optional) NOTIFY_EMAIL — defaults to shop@jerseydeals.online
 *   (optional) GITHUB_LISTS_TOKEN — PAT for repository_dispatch (sold reconcile)
 *   (optional) SQUARE_WEBHOOK_SIGNATURE_KEY — verify Square-Signature on /square-webhook
 *
 * POST /  → { email, phone?, name?, message?, source?, membership?, product?, site?, ... }
 * POST /cart-checkout → { variationIds: string[], first10?, freeShipping? }
 * POST /square-webhook → Square payment.created / payment.updated
 * OPTIONS for CORS
 */

const SQUARE_HOST = 'https://connect.squareup.com'
const SQUARE_VERSION = '2025-10-16'
const DEFAULT_NOTIFY = 'shop@jerseydeals.online'
const MEMBER_SOURCES = new Set(['rewards_club'])
const LIST_GENERATION = '2026-07-27-email-reset'
/** First-time buyer 10% catalog discount (see checkout-links.json). */
const DEFAULT_FIRST10_DISCOUNT_ID = 'OLPMVGCGLRBDCULSOPQOY2FI'
const DEFAULT_REDIRECT = 'https://jerseydeals.online/?purchase=1'
const SHIPPING_PERCENT = '10'
const MAX_CART_LINES = 20

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
    'Jersey Deals landing lead',
    `list_gen:${LIST_GENERATION}`,
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
  if (!nextPrev.includes(`list_gen:${LIST_GENERATION}`)) {
    nextPrev = `${nextPrev}\nlist_gen:${LIST_GENERATION}`
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

/**
 * Append/move the email on the landing-page member / non-member JSON lists
 * via GitHub Actions (repository_dispatch → collect-jerseydeals-email).
 */
async function dispatchLandingEmailList(env, { email, source, membership, phone }) {
  const token = String(env.GITHUB_LISTS_TOKEN || '').trim()
  const repo = String(env.GITHUB_REPO || 'braydencbell01-arch/Brayden-OS').trim()
  if (!token) return { attempted: false, ok: false }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'jerseydeals-email',
        client_payload: {
          email,
          source,
          membership,
          phone: phone || '',
          secret: env.COLLECT_SECRET || '',
          scope: 'jerseydeals-landing',
        },
      }),
    })
    return { attempted: true, ok: res.ok || res.status === 204 }
  } catch {
    return { attempted: true, ok: false }
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

function normalizeVariationIds(raw) {
  const list = Array.isArray(raw) ? raw : []
  const out = []
  const seen = new Set()
  for (const value of list) {
    const id = String(value || '')
      .trim()
      .toUpperCase()
    if (!id || seen.has(id)) continue
    // Square catalog IDs are alphanumeric.
    if (!/^[A-Z0-9]+$/.test(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= MAX_CART_LINES) break
  }
  return out
}

async function resolveLocationId(env) {
  if (env.SQUARE_LOCATION_ID) return String(env.SQUARE_LOCATION_ID).trim()
  const data = await square(env, '/v2/locations')
  const active = (data.locations || []).filter((l) => l.status === 'ACTIVE')
  const loc = active[0] || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location found')
  return loc.id
}

function redirectForCart(variationIds) {
  const base = (DEFAULT_REDIRECT.includes('?') ? DEFAULT_REDIRECT : `${DEFAULT_REDIRECT}?purchase=1`)
  const url = new URL(base)
  url.searchParams.set('purchase', '1')
  url.searchParams.set('sold', variationIds.join(','))
  return url.toString()
}

async function createCartPaymentLink(env, payload) {
  const variationIds = normalizeVariationIds(payload.variationIds || payload.ids || [])
  if (variationIds.length === 0) {
    return { status: 400, body: { ok: false, error: 'variationIds required' } }
  }

  const first10 = Boolean(payload.first10 || payload.discounted || payload.offer === 'first10')
  const freeShipping = Boolean(payload.freeShipping || payload.freeShip)
  const discountId = String(payload.discountId || env.FIRST10_DISCOUNT_ID || DEFAULT_FIRST10_DISCOUNT_ID).trim()
  const locationId = await resolveLocationId(env)

  const order = {
    location_id: locationId,
    line_items: variationIds.map((id) => ({
      catalog_object_id: id,
      quantity: '1',
    })),
  }

  if (first10 && discountId) {
    order.discounts = [{ catalog_object_id: discountId, scope: 'ORDER' }]
  }

  if (!freeShipping) {
    order.service_charges = [
      {
        name: 'Shipping',
        percentage: SHIPPING_PERCENT,
        calculation_phase: 'SUBTOTAL_PHASE',
      },
    ]
  }

  const data = await square(env, '/v2/online-checkout/payment-links', {
    method: 'POST',
    body: {
      idempotency_key: crypto.randomUUID(),
      description: `Jersey Deals cart · ${variationIds.length} item${variationIds.length === 1 ? '' : 's'}`.slice(
        0,
        100,
      ),
      checkout_options: {
        ask_for_shipping_address: true,
        allow_tipping: false,
        redirect_url: redirectForCart(variationIds),
      },
      order,
    },
  })

  const link = data.payment_link
  if (!link?.url) {
    return { status: 502, body: { ok: false, error: 'Square did not return a checkout URL' } }
  }

  return {
    status: 200,
    body: {
      ok: true,
      url: link.url,
      longUrl: link.long_url || '',
      paymentLinkId: link.id || '',
      orderId: link.order_id || '',
      items: variationIds.length,
      first10,
      freeShipping,
    },
  }
}

async function handleLeadCollect(env, payload, origin) {
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

  // Landing-page collection only — ignore BrayStats / other sites.
  const siteLower = site.toLowerCase()
  if (siteLower.includes('braystats') || siteLower.includes('brayden-os stats')) {
    return json({ ok: false, error: 'Landing-page collection only' }, 400, origin)
  }

  try {
    const result = await upsertCustomer(env, email, source, membership, extras)
    // Landing-page lists are updated via GitHub Actions (not Square Customer import).
    await dispatchLandingEmailList(env, {
      email,
      source,
      membership: result.membership,
      phone: extras.phone || '',
    })
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
}

async function hmacSha256Base64(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  const bytes = new Uint8Array(sig)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** Square sends Square-Signature = base64(HMAC_SHA256(signature_key, notification_url + body)). */
async function verifySquareWebhookSignature(request, rawBody, env, notificationUrl) {
  const key = String(env.SQUARE_WEBHOOK_SIGNATURE_KEY || '').trim()
  if (!key) return true // allow until secret is configured; still gated by URL obscurity + GitHub token
  const header = request.headers.get('x-square-hmacsha256-signature') || request.headers.get('Square-Signature') || ''
  if (!header) return false
  const expected = await hmacSha256Base64(key, `${notificationUrl}${rawBody}`)
  return header === expected
}

async function dispatchSoldReconcile(env, reason) {
  const token = String(env.GITHUB_LISTS_TOKEN || '').trim()
  const repo = String(env.GITHUB_REPO || 'braydencbell01-arch/Brayden-OS').trim()
  if (!token) {
    return { ok: false, skipped: true, error: 'GITHUB_LISTS_TOKEN not set' }
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'jerseydeals-email-api',
    },
    body: JSON.stringify({
      event_type: 'jerseydeals-sold-reconcile',
      client_payload: {
        reason: String(reason || 'square-payment').slice(0, 120),
        at: new Date().toISOString(),
      },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `GitHub dispatch ${res.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true }
}

function paymentEventIsCaptured(payload) {
  const type = String(payload?.type || '')
  if (type !== 'payment.created' && type !== 'payment.updated') return false
  const status = String(payload?.data?.object?.payment?.status || '').toUpperCase()
  return status === 'COMPLETED' || status === 'APPROVED'
}

async function handleSquareWebhook(request, env, origin) {
  const rawBody = await request.text()
  const notificationUrl = new URL(request.url).origin + '/square-webhook'
  const valid = await verifySquareWebhookSignature(request, rawBody, env, notificationUrl)
  if (!valid) {
    return json({ ok: false, error: 'Invalid signature' }, 401, origin)
  }
  let payload = {}
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400, origin)
  }
  if (!paymentEventIsCaptured(payload)) {
    return json({ ok: true, ignored: true, type: payload?.type || null }, 200, origin)
  }
  const payment = payload?.data?.object?.payment || {}
  const dispatched = await dispatchSoldReconcile(
    env,
    `payment:${payment.id || ''}:${payment.status || ''}`,
  )
  if (!dispatched.ok && !dispatched.skipped) {
    return json({ ok: false, error: dispatched.error }, 502, origin)
  }
  return json(
    {
      ok: true,
      dispatched: Boolean(dispatched.ok),
      skipped: Boolean(dispatched.skipped),
      paymentId: payment.id || null,
      status: payment.status || null,
    },
    200,
    origin,
  )
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*'
    const url = new URL(request.url)
    const path = (url.pathname || '/').replace(/\/+$/, '') || '/'

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'POST only' }, 405, origin)
    }

    // Square webhooks must not require the lead-collect secret header.
    if (path.endsWith('/square-webhook')) {
      return handleSquareWebhook(request, env, origin)
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

    const isCartCheckout =
      path.endsWith('/cart-checkout') ||
      String(payload.action || '').trim() === 'cart_checkout'

    if (isCartCheckout) {
      try {
        const result = await createCartPaymentLink(env, payload)
        return json(result.body, result.status, origin)
      } catch (err) {
        return json({ ok: false, error: String(err.message || err).slice(0, 240) }, 502, origin)
      }
    }

    return handleLeadCollect(env, payload, origin)
  },
}
