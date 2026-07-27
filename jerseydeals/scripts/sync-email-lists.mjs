#!/usr/bin/env node
/**
 * Rebuild permanent Rewards member / non-member email lists.
 *
 * Merges:
 *  1) Existing public JSON lists (never drop known emails)
 *  2) Square Customers notes (jd_member + source:*)
 *  3) Optional one-shot capture via env EMAIL + SOURCE (+ MEMBERSHIP)
 *
 *   node jerseydeals/scripts/sync-email-lists.mjs
 *   EMAIL=a@b.com SOURCE=rewards_club node jerseydeals/scripts/sync-email-lists.mjs
 */

import {
  MEMBERS_PATH,
  NON_MEMBERS_PATH,
  buildMemberNote,
  membershipFromSource,
  normalizeEmail,
  isValidEmail,
  parseCustomerNote,
  readList,
  recordEmailCapture,
  writeList,
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

async function listSquareCustomers() {
  if (!TOKEN) return []
  const out = []
  let cursor = ''
  do {
    const qs = new URLSearchParams({ limit: '100' })
    if (cursor) qs.set('cursor', cursor)
    const data = await square(`/v2/customers?${qs}`)
    for (const c of data.customers || []) out.push(c)
    cursor = data.cursor || ''
  } while (cursor)
  return out
}

function mergeInto(map, entry) {
  const key = normalizeEmail(entry.email)
  if (!isValidEmail(key)) return
  const prev = map.get(key)
  if (!prev) {
    map.set(key, {
      email: key,
      sources: [...(entry.sources || [])],
      firstSeen: entry.firstSeen || entry.at || new Date().toISOString(),
      lastSeen: entry.lastSeen || entry.at || new Date().toISOString(),
      ...(entry.phone ? { phone: entry.phone } : {}),
    })
    return
  }
  for (const s of entry.sources || []) {
    if (s && !prev.sources.includes(s)) prev.sources.push(s)
  }
  if (entry.lastSeen && entry.lastSeen > prev.lastSeen) prev.lastSeen = entry.lastSeen
  if (entry.firstSeen && entry.firstSeen < prev.firstSeen) prev.firstSeen = entry.firstSeen
  if (entry.phone) prev.phone = entry.phone
}

async function main() {
  // Optional single capture (used by collect workflow).
  const captureEmail = normalizeEmail(process.env.EMAIL || '')
  if (captureEmail) {
    const source = String(process.env.SOURCE || 'manual').trim() || 'manual'
    const membership =
      process.env.MEMBERSHIP === 'member' || process.env.MEMBERSHIP === 'non_member'
        ? process.env.MEMBERSHIP
        : membershipFromSource(source)
    const result = recordEmailCapture({
      email: captureEmail,
      source,
      membership,
      phone: process.env.PHONE || '',
    })
    console.log(
      `Recorded ${captureEmail} as ${result.membership} (source:${source}) → members=${result.members?.count} non-members=${result.nonMembers?.count}`,
    )
  }

  const members = readList(MEMBERS_PATH, 'rewards_members')
  const nonMembers = readList(NON_MEMBERS_PATH, 'non_members')
  const memberMap = new Map(members.entries.map((e) => [e.email, { ...e, sources: [...e.sources] }]))
  const nonMemberMap = new Map(
    nonMembers.entries.map((e) => [e.email, { ...e, sources: [...e.sources] }]),
  )

  const customers = await listSquareCustomers()
  let fromSquare = 0
  for (const c of customers) {
    const email = normalizeEmail(c.email_address)
    if (!isValidEmail(email)) continue
    const parsed = parseCustomerNote(c.note)
    // Buyers with empty notes are not automatically leads — only tagged captures.
    if (!parsed.membership && parsed.sources.length === 0) continue
    const membership =
      parsed.membership ||
      (parsed.sources.some((s) => membershipFromSource(s) === 'member') ? 'member' : 'non_member')
    const entry = {
      email,
      sources: parsed.sources,
      firstSeen: c.created_at || new Date().toISOString(),
      lastSeen: c.updated_at || c.created_at || new Date().toISOString(),
      ...(c.phone_number ? { phone: c.phone_number } : {}),
    }
    fromSquare += 1
    if (membership === 'member') {
      mergeInto(memberMap, entry)
      nonMemberMap.delete(email)
    } else if (!memberMap.has(email)) {
      mergeInto(nonMemberMap, entry)
    } else {
      mergeInto(memberMap, entry)
    }

    // Keep Square note membership flag current when we have a token.
    if (TOKEN) {
      const nextNote = buildMemberNote({
        source: parsed.sources[0] || 'square_sync',
        membership,
        phone: c.phone_number || '',
        previousNote: String(c.note || ''),
      })
      if (nextNote !== String(c.note || '').trim()) {
        try {
          await square(`/v2/customers/${c.id}`, {
            method: 'PUT',
            body: {
              customer: {
                email_address: email,
                note: nextNote,
                reference_id: c.reference_id || 'jerseydeals',
                ...(c.phone_number ? { phone_number: c.phone_number } : {}),
              },
            },
          })
        } catch (err) {
          console.warn(`Could not retag ${email}:`, err.message || err)
        }
      }
    }
  }

  const membersOut = writeList(MEMBERS_PATH, 'rewards_members', memberMap)
  const nonMembersOut = writeList(NON_MEMBERS_PATH, 'non_members', nonMemberMap)
  console.log(
    `Email lists synced · members=${membersOut.count} non-members=${nonMembersOut.count} (square tagged=${fromSquare})`,
  )
  console.log(`→ ${MEMBERS_PATH}`)
  console.log(`→ ${NON_MEMBERS_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
