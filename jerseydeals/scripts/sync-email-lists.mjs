#!/usr/bin/env node
/**
 * Landing-page email lists only (Jersey Deals site — not Square Online, not BrayStats).
 *
 * - Optional one-shot capture: EMAIL + SOURCE (+ MEMBERSHIP) appends/moves between lists
 * - Optional Square import: ONLY customers tagged with the current list_gen (new landing captures)
 * - Members and non-members are mutually exclusive (join Rewards moves non-member → member)
 *
 *   node jerseydeals/scripts/sync-email-lists.mjs
 *   EMAIL=a@b.com SOURCE=rewards_club node jerseydeals/scripts/sync-email-lists.mjs
 *   RESET_LISTS=1 node jerseydeals/scripts/sync-email-lists.mjs
 */

import {
  LIST_GENERATION,
  MEMBERS_PATH,
  NON_MEMBERS_PATH,
  emptyList,
  membershipFromSource,
  normalizeEmail,
  isValidEmail,
  parseCustomerNote,
  readList,
  recordEmailCapture,
  writeList,
} from './lib/email-lists.mjs'
import { writeFileSync } from 'node:fs'

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
  if (process.env.RESET_LISTS === '1') {
    writeFileSync(MEMBERS_PATH, `${JSON.stringify(emptyList('rewards_members'), null, 2)}\n`)
    writeFileSync(NON_MEMBERS_PATH, `${JSON.stringify(emptyList('non_members'), null, 2)}\n`)
    console.log(`Reset landing email lists (generation ${LIST_GENERATION})`)
  }

  const captureEmail = normalizeEmail(process.env.EMAIL || '')
  if (captureEmail) {
    if (!isValidEmail(captureEmail)) {
      console.error('Invalid EMAIL')
      process.exit(1)
    }
    const source = String(process.env.SOURCE || 'landing').trim() || 'landing'
    const membershipRaw = String(process.env.MEMBERSHIP || '').trim().toLowerCase()
    const membership =
      membershipRaw === 'member' || membershipRaw === 'non_member'
        ? membershipRaw
        : membershipFromSource(source)
    const result = recordEmailCapture({
      email: captureEmail,
      source,
      membership,
      phone: process.env.PHONE || '',
    })
    console.log(
      `Landing capture ${captureEmail} → ${result.membership} (source:${source}) · members=${result.members?.count} non-members=${result.nonMembers?.count}`,
    )
  }

  const members = readList(MEMBERS_PATH, 'rewards_members')
  const nonMembers = readList(NON_MEMBERS_PATH, 'non_members')
  const memberMap = new Map(members.entries.map((e) => [e.email, { ...e, sources: [...e.sources] }]))
  const nonMemberMap = new Map(
    nonMembers.entries.map((e) => [e.email, { ...e, sources: [...e.sources] }]),
  )

  // Only import Square customers tagged for THIS landing list generation.
  // Pre-reset leads (no matching list_gen) are ignored so wiped lists stay clean.
  let fromSquare = 0
  if (TOKEN && process.env.IMPORT_SQUARE_LANDING === '1') {
    const customers = await listSquareCustomers()
    for (const c of customers) {
      const note = String(c.note || '')
      if (!note.includes(`list_gen:${LIST_GENERATION}`)) continue
      const email = normalizeEmail(c.email_address)
      if (!isValidEmail(email)) continue
      const parsed = parseCustomerNote(note)
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
    }
    writeList(MEMBERS_PATH, 'rewards_members', memberMap)
    writeList(NON_MEMBERS_PATH, 'non_members', nonMemberMap)
  }

  const membersOut = readList(MEMBERS_PATH, 'rewards_members')
  const nonMembersOut = readList(NON_MEMBERS_PATH, 'non_members')
  console.log(
    `Landing email lists · members=${membersOut.count} non-members=${nonMembersOut.count} (square landing-tagged import=${fromSquare})`,
  )
  console.log(`→ ${MEMBERS_PATH}`)
  console.log(`→ ${NON_MEMBERS_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
