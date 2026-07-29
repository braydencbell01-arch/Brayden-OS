#!/usr/bin/env node
/**
 * Email buyers a short thank-you after each completed Square order.
 *
 * - Searches COMPLETED Square orders (lookback THANKS_LOOKBACK_DAYS, default 30)
 * - Diffs order ids vs public/order-thanks-state.json
 * - First run bootstraps known order ids WITHOUT emailing
 * - New orders with a buyer email get a plain-text thank-you (inbox-friendly)
 *
 * Env:
 *   SQUARE_ACCESS_TOKEN (required)
 *   SQUARE_ENVIRONMENT / SQUARE_LOCATION_ID
 *   SMTP_* — same secrets as send-smtp-email.mjs
 *   DRY_RUN=1 / SKIP_SEND=1
 *   FORCE_RESEND_TODAY=1 — re-queue recent unsent window (see THANKS_EMAIL_RECENT_DAYS)
 *   THANKS_EMAIL_RECENT_DAYS (default 1 = today ET) — bootstrap still emails this window
 *   THANKS_LOOKBACK_DAYS (default 30)
 *   DELIVERY_DAYS (default "3–7") — “delivered in X days” copy
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '../public')
const STATE_PATH = join(PUBLIC, 'order-thanks-state.json')
const SITE = 'https://jerseydeals.online/'
const SHOP = 'shop@jerseydeals.online'

const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const API_VERSION = '2025-10-16'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const LOOKBACK_DAYS = Number.parseInt(process.env.THANKS_LOOKBACK_DAYS || '30', 10)
const DELIVERY_DAYS = (process.env.DELIVERY_DAYS || '3–7').trim() || '3–7'

const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const SKIP_SEND = process.env.SKIP_SEND === '1' || process.env.SKIP_SEND === 'true'

if (!TOKEN) {
  console.error('Missing required secret: SQUARE_ACCESS_TOKEN')
  process.exit(1)
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function emptyState() {
  return {
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    bootstrappedAt: null,
    emailedOrderIds: [],
    lastEmailedAt: null,
    lastEmailedOrderIds: [],
  }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': API_VERSION,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Square ${method} ${path} non-JSON (${res.status}): ${text.slice(0, 400)}`)
  }
  if (!res.ok) {
    const msg =
      json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') ||
      text.slice(0, 400)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
}

async function primaryLocationId() {
  if (process.env.SQUARE_LOCATION_ID) return process.env.SQUARE_LOCATION_ID
  const data = await square('/v2/locations')
  const active = (data.locations || []).filter((l) => l.status === 'ACTIVE')
  const loc = active[0] || (data.locations || [])[0]
  if (!loc?.id) throw new Error('No Square location found')
  return loc.id
}

function emailsFromOrder(order) {
  const found = []
  for (const f of order.fulfillments || []) {
    for (const e of [
      f.shipment_details?.recipient?.email_address,
      f.pickup_details?.recipient?.email_address,
      f.delivery_details?.recipient?.email_address,
    ]) {
      if (isEmail(e)) found.push(String(e).trim().toLowerCase())
    }
  }
  return [...new Set(found)]
}

function itemTitles(order) {
  const titles = []
  for (const line of order.line_items || []) {
    const name = String(line.name || '').trim()
    if (name) titles.push(name)
  }
  return titles
}

async function paymentInfoByOrderId() {
  /** @type {Map<string, { email: string, paidAt: string | null }>} */
  const map = new Map()
  const begin = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  let cursor = ''
  do {
    const qs = new URLSearchParams({ limit: '100', begin_time: begin })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/payments?${qs}`)
    for (const payment of data.payments || []) {
      const status = String(payment.status || '').toUpperCase()
      if (status !== 'COMPLETED' && status !== 'APPROVED') continue
      const orderId = String(payment.order_id || '').trim()
      if (!orderId) continue
      const email = String(payment.buyer_email_address || '')
        .trim()
        .toLowerCase()
      const paidAt = payment.updated_at || payment.created_at || null
      const prev = map.get(orderId)
      if (!prev) {
        map.set(orderId, { email: isEmail(email) ? email : '', paidAt })
        continue
      }
      if (!prev.email && isEmail(email)) prev.email = email
      if (paidAt && (!prev.paidAt || paidAt > prev.paidAt)) prev.paidAt = paidAt
    }
    cursor = data.cursor || ''
  } while (cursor)
  return map
}

async function completedOrders(locationId) {
  const start = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const orders = []
  let cursor = ''
  do {
    const body = {
      location_ids: [locationId],
      query: {
        filter: {
          state_filter: { states: ['COMPLETED'] },
          date_time_filter: {
            updated_at: { start_at: start },
          },
        },
        sort: { sort_field: 'UPDATED_AT', sort_order: 'DESC' },
      },
      limit: 100,
    }
    if (cursor) body.cursor = cursor
    const data = await square('/v2/orders/search', { method: 'POST', body })
    for (const order of data.orders || []) {
      if (order?.id) orders.push(order)
    }
    cursor = data.cursor || ''
  } while (cursor)
  return orders
}

function buildThanksEmail({ titles }) {
  const subject = 'Thanks for your order — Jersey Deals'
  const itemLines =
    titles.length > 0
      ? ['You’re getting:', ...titles.slice(0, 8).map((t) => `• ${t}`), '']
      : []
  if (titles.length > 8) itemLines.splice(itemLines.length - 1, 0, `• +${titles.length - 8} more`)

  const body = [
    'Hey —',
    '',
    'Thanks for your order at Jersey Deals — we appreciate you.',
    '',
    ...itemLines,
    `Your order will be delivered in ${DELIVERY_DAYS} days.`,
    '',
    'We ship from US inventory. If you need anything, just reply to this email.',
    '',
    'Brayden',
    'Jersey Deals',
    SHOP,
    SITE,
  ].join('\n')

  return { subject, body }
}

function sendThanksEmail({ to, subject, body }) {
  const env = {
    ...process.env,
    TO: to,
    SUBJECT: subject,
    BODY: body,
    PLAIN_TEXT_ONLY: '1',
    TRANSACTIONAL: '1',
    AUDIENCE: 'order',
    LINK: SITE,
    REPLY_TO: SHOP,
  }
  delete env.ITEM_NAME
  const result = spawnSync(process.execPath, [join(__dirname, 'send-smtp-email.mjs')], {
    env,
    encoding: 'utf8',
    cwd: join(__dirname, '..'),
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    throw new Error(`SMTP send failed with exit ${result.status}`)
  }
}

function dayKeyEt(iso = new Date().toISOString()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** True when any order/payment timestamp falls on today's ET calendar date. */
function isOrderFromToday(order, today = dayKeyEt()) {
  return [order.createdAt, order.updatedAt, order.paidAt].some(
    (stamp) => stamp && dayKeyEt(stamp) === today,
  )
}

/** True when any timestamp is within the last N ET calendar days (including today). */
function isOrderWithinRecentDays(order, recentDays, today = dayKeyEt()) {
  if (!Number.isFinite(recentDays) || recentDays <= 0) return isOrderFromToday(order, today)
  const stamps = [order.createdAt, order.updatedAt, order.paidAt].filter(Boolean)
  if (!stamps.length) return false
  for (const stamp of stamps) {
    const day = dayKeyEt(stamp)
    // Compare YYYY-MM-DD lexicographically after computing the oldest allowed day.
    const oldest = new Date(`${today}T12:00:00-04:00`)
    oldest.setDate(oldest.getDate() - (recentDays - 1))
    const oldestKey = dayKeyEt(oldest.toISOString())
    if (day >= oldestKey && day <= today) return true
  }
  return false
}

async function main() {
  const locationId = await primaryLocationId()
  const [orders, paymentInfo] = await Promise.all([
    completedOrders(locationId),
    paymentInfoByOrderId(),
  ])

  const live = []
  for (const order of orders) {
    const id = String(order.id)
    const fromOrder = emailsFromOrder(order)
    const pay = paymentInfo.get(id)
    const email = fromOrder[0] || pay?.email || ''
    live.push({
      id,
      email,
      titles: itemTitles(order),
      createdAt: order.created_at || null,
      updatedAt: order.updated_at || null,
      paidAt: pay?.paidAt || null,
    })
  }

  console.log(
    JSON.stringify(
      {
        scannedOrders: live.length,
        orders: live.map((o) => ({
          id: o.id,
          email: o.email || null,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          paidAt: o.paidAt,
          createdEt: o.createdAt ? dayKeyEt(o.createdAt) : null,
          updatedEt: o.updatedAt ? dayKeyEt(o.updatedAt) : null,
          paidEt: o.paidAt ? dayKeyEt(o.paidAt) : null,
        })),
      },
      null,
      2,
    ),
  )

  let state = readJson(STATE_PATH, null) || emptyState()
  if (!Array.isArray(state.emailedOrderIds)) state.emailedOrderIds = []

  const today = dayKeyEt()
  const recentDays = Number.parseInt(process.env.THANKS_EMAIL_RECENT_DAYS || '1', 10)
  const forceResendToday =
    process.env.FORCE_RESEND_TODAY === '1' || process.env.FORCE_RESEND_TODAY === 'true'

  // Bootstrap: remember older completed orders without emailing.
  // Recent orders (default: today ET) stay pending so buyers still get a thank-you.
  if (!state.bootstrappedAt) {
    const olderIds = live
      .filter((o) => !isOrderWithinRecentDays(o, recentDays, today))
      .map((o) => o.id)
    state = {
      ...emptyState(),
      bootstrappedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      emailedOrderIds: [...olderIds].sort(),
    }
    if (!DRY) writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)
    console.log(
      JSON.stringify(
        {
          bootstrapped: true,
          knownOlderOrders: olderIds.length,
          pendingRecent: live.filter((o) => isOrderWithinRecentDays(o, recentDays, today)).length,
          recentDays,
          today,
          dryRun: DRY,
        },
        null,
        2,
      ),
    )
    // Fall through to send recent pending orders.
  }

  const already = new Set(state.emailedOrderIds.map((id) => String(id)))
  if (forceResendToday) {
    for (const o of live) {
      if (isOrderWithinRecentDays(o, recentDays, today)) already.delete(o.id)
    }
  }
  const pending = live.filter((o) => !already.has(o.id))

  if (!pending.length) {
    state.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    if (!DRY) writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)
    console.log(JSON.stringify({ pending: 0, emailed: 0, dryRun: DRY, today, recentDays }, null, 2))
    return
  }

  const sent = []
  const skipped = []
  for (const order of pending) {
    if (!order.email) {
      skipped.push({ id: order.id, reason: 'no-email' })
      // Still mark known so we don't retry forever without an address.
      already.add(order.id)
      continue
    }
    const { subject, body } = buildThanksEmail({ titles: order.titles })
    console.log(
      JSON.stringify(
        {
          willSend: !SKIP_SEND && !DRY,
          orderId: order.id,
          to: order.email,
          subject,
          dryRun: DRY,
          skipSend: SKIP_SEND,
        },
        null,
        2,
      ),
    )
    if (!DRY && !SKIP_SEND) {
      sendThanksEmail({ to: order.email, subject, body })
      sent.push(order.id)
    }
    already.add(order.id)
  }

  state = {
    ...state,
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    emailedOrderIds: [...already].sort(),
    lastEmailedAt: sent.length
      ? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      : state.lastEmailedAt || null,
    lastEmailedOrderIds: sent.length ? sent : state.lastEmailedOrderIds || [],
  }
  if (!DRY) writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)

  console.log(
    JSON.stringify(
      {
        pending: pending.length,
        emailed: sent.length,
        skipped,
        dryRun: DRY,
        skipSend: SKIP_SEND,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
