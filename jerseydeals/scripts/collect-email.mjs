#!/usr/bin/env node
/**
 * One-shot: upsert Square Customer + append permanent email lists.
 *
 *   EMAIL=a@b.com SOURCE=rewards_club node jerseydeals/scripts/collect-email.mjs
 *   EMAIL=a@b.com SOURCE=first_buyer_offer MEMBERSHIP=non_member node ...
 */

import { randomUUID } from 'node:crypto'
import {
  buildMemberNote,
  membershipFromSource,
  normalizeEmail,
  isValidEmail,
  recordEmailCapture,
} from './lib/email-lists.mjs'

const TOKEN = process.env.SQUARE_ACCESS_TOKEN || ''
const HOST =
  (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com'
const VERSION = '2025-10-16'

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
    throw new Error(`Square ${method} ${path}: ${msg}`)
  }
  return data
}

function noteSaysMember(note) {
  return /\bjd_member:yes\b/i.test(String(note || '')) || /source:rewards_club\b/i.test(String(note || ''))
}

async function main() {
  const email = normalizeEmail(process.env.EMAIL || '')
  const source = String(process.env.SOURCE || 'manual').trim().slice(0, 80) || 'manual'
  const membershipRaw = String(process.env.MEMBERSHIP || '').trim().toLowerCase()
  const membership =
    membershipRaw === 'member' || membershipRaw === 'non_member'
      ? membershipRaw
      : membershipFromSource(source)
  const phone = String(process.env.PHONE || '').trim()

  if (!isValidEmail(email)) {
    console.error('Invalid or missing EMAIL')
    process.exit(1)
  }
  if (!TOKEN) {
    console.error('Missing SQUARE_ACCESS_TOKEN')
    process.exit(1)
  }

  const search = await square('/v2/customers/search', {
    method: 'POST',
    body: { query: { filter: { email_address: { exact: email } } }, limit: 1 },
  })
  const existing = (search.customers || [])[0]
  const finalMembership =
    membership === 'member' || noteSaysMember(existing?.note) ? 'member' : 'non_member'
  const note = buildMemberNote({
    source,
    membership: finalMembership,
    phone,
    previousNote: existing?.note || '',
  })
  const customerBody = {
    email_address: email,
    note,
    reference_id: existing?.reference_id || 'jerseydeals',
    ...(phone ? { phone_number: phone } : {}),
  }

  if (existing?.id) {
    await square(`/v2/customers/${existing.id}`, {
      method: 'PUT',
      body: { customer: customerBody },
    })
    console.log('updated', existing.id, email, finalMembership)
  } else {
    const created = await square('/v2/customers', {
      method: 'POST',
      body: { idempotency_key: randomUUID(), ...customerBody },
    })
    console.log('created', created.customer?.id, email, finalMembership)
  }

  const lists = recordEmailCapture({
    email,
    source,
    membership: finalMembership,
    phone,
  })
  console.log(
    `lists → members=${lists.members?.count} non-members=${lists.nonMembers?.count} (${lists.membership})`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
