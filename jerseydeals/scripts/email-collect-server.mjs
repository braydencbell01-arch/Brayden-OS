#!/usr/bin/env node
/**
 * Local / tunnel email collector → Square Customers.
 * Same contract as email-api/worker.js
 *
 *   SQUARE_ACCESS_TOKEN=... node jerseydeals/scripts/email-collect-server.mjs
 *   Optional: PORT=8787 COLLECT_SECRET=...
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.env.PORT || 8787)
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SECRET = process.env.COLLECT_SECRET || ''
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

async function upsertCustomer(email, source) {
  const search = await square('/v2/customers/search', {
    method: 'POST',
    body: { query: { filter: { email_address: { exact: email } } }, limit: 1 },
  })
  const existing = (search.customers || [])[0]
  const note = `Jersey Deals lead · source:${source || 'unknown'} · at:${new Date().toISOString()}`
  if (existing?.id) {
    const prev = existing.note || ''
    const nextNote = prev.includes(source || '') ? prev : [prev, note].filter(Boolean).join('\n').slice(0, 2000)
    await square(`/v2/customers/${existing.id}`, {
      method: 'PUT',
      body: {
        customer: {
          email_address: email,
          note: nextNote,
          reference_id: existing.reference_id || 'jerseydeals',
        },
      },
    })
    return { id: existing.id, created: false }
  }
  const created = await square('/v2/customers', {
    method: 'POST',
    body: {
      idempotency_key: randomUUID(),
      email_address: email,
      note,
      reference_id: 'jerseydeals',
    },
  })
  return { id: created.customer?.id, created: true }
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
  if (!isValidEmail(email)) {
    send(res, 400, { ok: false, error: 'Invalid email' }, origin)
    return
  }

  try {
    const result = await upsertCustomer(email, source)
    console.log(`${result.created ? 'created' : 'updated'} ${email} (${source})`)
    send(res, 200, { ok: true, customerId: result.id, created: result.created }, origin)
  } catch (err) {
    console.error(err)
    send(res, 502, { ok: false, error: String(err.message || err).slice(0, 240) }, origin)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Jersey Deals email collector listening on :${PORT}`)
})
