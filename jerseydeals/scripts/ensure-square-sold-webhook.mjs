#!/usr/bin/env node
/**
 * Ensure a Square webhook subscription fires on payment capture so sold
 * reconcile can run immediately (via Cloudflare Worker → repository_dispatch).
 *
 * Requires:
 *   SQUARE_ACCESS_TOKEN
 *   SQUARE_WEBHOOK_NOTIFICATION_URL  (e.g. https://….workers.dev/square-webhook)
 *
 * Optional:
 *   SQUARE_ENVIRONMENT=production|sandbox
 *   SQUARE_WEBHOOK_NAME=Jersey Deals sold reconcile
 *
 * Prints the subscription signature key on create/update so it can be stored
 * as Cloudflare secret SQUARE_WEBHOOK_SIGNATURE_KEY.
 *
 *   node jerseydeals/scripts/ensure-square-sold-webhook.mjs
 */

const ENV = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase()
const HOST =
  ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com'
const TOKEN = process.env.SQUARE_ACCESS_TOKEN
const NOTIFICATION_URL = (process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || '').trim()
const NAME = process.env.SQUARE_WEBHOOK_NAME || 'Jersey Deals sold reconcile'
const EVENT_TYPES = ['payment.created', 'payment.updated']

if (!TOKEN) {
  console.error('Missing SQUARE_ACCESS_TOKEN')
  process.exit(1)
}
if (!NOTIFICATION_URL || !/^https:\/\//i.test(NOTIFICATION_URL)) {
  console.error('Missing SQUARE_WEBHOOK_NOTIFICATION_URL (https URL ending in /square-webhook)')
  process.exit(1)
}

async function square(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Square-Version': '2025-10-16',
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
    throw new Error(`Square ${method} ${path} non-JSON (${res.status}): ${text.slice(0, 300)}`)
  }
  if (!res.ok) {
    const msg =
      json?.errors?.map((e) => `${e.code}: ${e.detail || e.category}`).join('; ') ||
      text.slice(0, 300)
    throw new Error(`Square ${method} ${path} HTTP ${res.status}: ${msg}`)
  }
  return json
}

function sameEvents(a = [], b = []) {
  const left = [...a].map(String).sort().join('|')
  const right = [...b].map(String).sort().join('|')
  return left === right
}

async function main() {
  const listed = await square('/v2/webhooks/subscriptions')
  const existing = (listed.subscriptions || []).find(
    (s) =>
      String(s.notification_url || '') === NOTIFICATION_URL ||
      String(s.name || '') === NAME,
  )

  if (existing?.id) {
    const needsUpdate =
      String(existing.notification_url || '') !== NOTIFICATION_URL ||
      !sameEvents(existing.event_types || [], EVENT_TYPES) ||
      existing.enabled === false
    if (!needsUpdate) {
      console.log(`Webhook already configured: ${existing.id} → ${NOTIFICATION_URL}`)
      return
    }
    const updated = await square(`/v2/webhooks/subscriptions/${existing.id}`, {
      method: 'PUT',
      body: {
        subscription: {
          name: NAME,
          enabled: true,
          event_types: EVENT_TYPES,
          notification_url: NOTIFICATION_URL,
          api_version: '2025-10-16',
        },
      },
    })
    const sub = updated.subscription || existing
    console.log(`Updated webhook ${sub.id} → ${NOTIFICATION_URL}`)
    if (updated.subscription?.signature_key) {
      console.log(`SQUARE_WEBHOOK_SIGNATURE_KEY=${updated.subscription.signature_key}`)
    }
    return
  }

  const created = await square('/v2/webhooks/subscriptions', {
    method: 'POST',
    body: {
      idempotency_key: `jd-sold-webhook-${Date.now()}`,
      subscription: {
        name: NAME,
        enabled: true,
        event_types: EVENT_TYPES,
        notification_url: NOTIFICATION_URL,
        api_version: '2025-10-16',
      },
    },
  })
  const sub = created.subscription
  if (!sub?.id) throw new Error('No subscription returned')
  console.log(`Created webhook ${sub.id} → ${NOTIFICATION_URL}`)
  if (sub.signature_key) {
    console.log(`SQUARE_WEBHOOK_SIGNATURE_KEY=${sub.signature_key}`)
    console.log('Store that value as a Cloudflare Worker secret.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
