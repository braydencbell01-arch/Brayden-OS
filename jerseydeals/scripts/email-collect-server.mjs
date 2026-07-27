#!/usr/bin/env node
/**
 * Local / tunnel email collector → Square Customers + notify shop inbox.
 * Same contract as email-api/worker.js
 *
 *   SQUARE_ACCESS_TOKEN=... node jerseydeals/scripts/email-collect-server.mjs
 *   Optional: PORT=8787 COLLECT_SECRET=... NOTIFY_EMAIL=shop@jerseydeals.online
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import {
  buildMemberNote,
  membershipFromSource,
  recordEmailCapture,
} from './lib/email-lists.mjs'

const PORT = Number(process.env.PORT || 8787)
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SECRET = process.env.COLLECT_SECRET || ''
const NOTIFY_EMAIL = (process.env.NOTIFY_EMAIL || 'shop@jerseydeals.online').trim()
const HOST = 'https://connect.squareup.com'
const VERSION = '2025-10-16'

if (!TOKEN) {
  console.error('Missing SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': VERSION,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.errors?.map((e) => e.detail || e.code).join('; ') || res.status
    throw new Error(String(msg))
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

function resolveMembership(payload, source) {
  const raw = String(payload.membership || '').trim().toLowerCase()
  if (raw === 'member' || raw === 'non_member') return raw
  return membershipFromSource(source)
}

function noteSaysMember(note) {
  return /\bjd_member:yes\b/i.test(String(note || '')) || /source:rewards_club\b/i.test(String(note || ''))
}

async function notifyOwner(fields) {
  if (!NOTIFY_EMAIL) return
  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(NOTIFY_EMAIL)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ...fields,
        _subject: `[${fields.site || 'Lead'}] ${fields.membership || 'lead'} · ${fields.source || 'unknown'}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: fields.email || NOTIFY_EMAIL,
      }),
    })
  } catch {
    // non-fatal
  }
}

async function upsertCustomer(email, source, membership, extras) {
  const search = await square('/v2/customers/search', {
    method: 'POST',
    body: { query: { filter: { email_address: { exact: email } } }, limit: 1 },
  })
  const existing = (search.customers || [])[0]
  const phone = extras.phone || extras.phone_number || ''
  const finalMembership =
    membership === 'member' || noteSaysMember(existing?.note) ? 'member' : 'non_member'
  const note = buildMemberNote({
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
    await square(`/v2/customers/${existing.id}`, {
      method: 'PUT',
      body: { customer: customerBody },
    })
    return { id: existing.id, created: false, membership: finalMembership }
  }
  const created = await square('/v2/customers', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      ...customerBody,
    },
  })
  return { id: created.customer?.id, created: true, membership: finalMembership }
}

function send(res, status, body, origin) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-JD-Collect-Secret',
  }
  res.writeHead(status, headers)
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '*'
  if (req.method === 'OPTIONS') {
    send(res, 204, {}, origin)
    return
  }
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'POST only' }, origin)
    return
  }
  if (SECRET && req.headers['x-jd-collect-secret'] !== SECRET) {
    send(res, 401, { ok: false, error: 'Unauthorized' }, origin)
    return
  }

  let raw = ''
  for await (const chunk of req) raw += chunk
  let payload = {}
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    send(res, 400, { ok: false, error: 'Invalid JSON' }, origin)
    return
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
    send(res, 400, { ok: false, error: 'Invalid email' }, origin)
    return
  }

  try {
    const result = await upsertCustomer(email, source, membership, extras)
    recordEmailCapture({
      email,
      source,
      membership: result.membership,
      phone: extras.phone || '',
    })
    console.log(
      `${result.created ? 'created' : 'updated'} ${email} (${source}, ${result.membership})`,
    )
    await notifyOwner({
      email,
      ...extras,
      source,
      membership: result.membership,
      product,
      site,
      list:
        result.membership === 'member' ? 'jerseydeals_rewards_members' : 'jerseydeals_non_members',
      collected_at: new Date().toISOString(),
      square_customer_id: result.id || '',
      square_created: String(!!result.created),
    })
    send(
      res,
      200,
      {
        ok: true,
        customerId: result.id,
        created: result.created,
        membership: result.membership,
      },
      origin,
    )
  } catch (err) {
    console.error(err)
    send(res, 502, { ok: false, error: String(err.message || err).slice(0, 240) }, origin)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Jersey Deals email collector listening on :${PORT} → notify ${NOTIFY_EMAIL}`)
})
