/**
 * Permanent Jersey Deals email lists:
 *  - rewards-members.json  → Rewards Club members
 *  - non-member-emails.json → collected emails that are not members
 *
 * Shared helpers for sync scripts + collectors.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PUBLIC_DIR = join(__dirname, '../../public')
export const MEMBERS_PATH = join(PUBLIC_DIR, 'rewards-members.json')
export const NON_MEMBERS_PATH = join(PUBLIC_DIR, 'non-member-emails.json')

/** Sources that mean Rewards Club membership. */
export const MEMBER_SOURCES = new Set(['rewards_club'])

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

export function membershipFromSource(source) {
  return MEMBER_SOURCES.has(String(source || '').trim()) ? 'member' : 'non_member'
}

export function emptyList(kind) {
  return {
    syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    kind,
    count: 0,
    emails: [],
    entries: [],
  }
}

export function readList(path, kind) {
  if (!existsSync(path)) return emptyList(kind)
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    const entries = Array.isArray(raw.entries)
      ? raw.entries
          .map((e) => ({
            email: normalizeEmail(e.email),
            sources: Array.isArray(e.sources)
              ? [...new Set(e.sources.map(String))]
              : e.source
                ? [String(e.source)]
                : [],
            firstSeen: e.firstSeen || e.at || raw.syncedAt || new Date().toISOString(),
            lastSeen: e.lastSeen || e.at || raw.syncedAt || new Date().toISOString(),
            ...(e.phone ? { phone: String(e.phone) } : {}),
          }))
          .filter((e) => isValidEmail(e.email))
      : (raw.emails || [])
          .map((email) => ({
            email: normalizeEmail(email),
            sources: [],
            firstSeen: raw.syncedAt || new Date().toISOString(),
            lastSeen: raw.syncedAt || new Date().toISOString(),
          }))
          .filter((e) => isValidEmail(e.email))
    return {
      syncedAt: raw.syncedAt || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      kind,
      count: entries.length,
      emails: entries.map((e) => e.email).sort(),
      entries: entries.sort((a, b) => a.email.localeCompare(b.email)),
    }
  } catch {
    return emptyList(kind)
  }
}

function upsertEntry(map, { email, source, at, phone }) {
  const key = normalizeEmail(email)
  if (!isValidEmail(key)) return
  const when = at || new Date().toISOString()
  const prev = map.get(key)
  if (!prev) {
    map.set(key, {
      email: key,
      sources: source ? [String(source)] : [],
      firstSeen: when,
      lastSeen: when,
      ...(phone ? { phone: String(phone) } : {}),
    })
    return
  }
  if (source && !prev.sources.includes(String(source))) prev.sources.push(String(source))
  prev.lastSeen = when
  if (phone) prev.phone = String(phone)
}

export function writeList(path, kind, entryMap) {
  const entries = [...entryMap.values()].sort((a, b) => a.email.localeCompare(b.email))
  const payload = {
    syncedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    kind,
    count: entries.length,
    emails: entries.map((e) => e.email),
    entries,
  }
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`)
  return payload
}

/**
 * Record one capture into the permanent lists.
 * Members always win: joining Rewards moves the email out of non-members.
 */
export function recordEmailCapture({
  email,
  source,
  membership,
  phone,
  at,
  membersPath = MEMBERS_PATH,
  nonMembersPath = NON_MEMBERS_PATH,
}) {
  const cleaned = normalizeEmail(email)
  if (!isValidEmail(cleaned)) {
    return { ok: false, message: 'Invalid email' }
  }
  const status = membership || membershipFromSource(source)
  const when = at || new Date().toISOString()

  const members = readList(membersPath, 'rewards_members')
  const nonMembers = readList(nonMembersPath, 'non_members')
  const memberMap = new Map(members.entries.map((e) => [e.email, { ...e, sources: [...e.sources] }]))
  const nonMemberMap = new Map(
    nonMembers.entries.map((e) => [e.email, { ...e, sources: [...e.sources] }]),
  )

  if (status === 'member') {
    upsertEntry(memberMap, { email: cleaned, source, at: when, phone })
    nonMemberMap.delete(cleaned)
  } else if (memberMap.has(cleaned)) {
    // Already a Rewards member — keep on members list, attach source history.
    upsertEntry(memberMap, { email: cleaned, source, at: when, phone })
  } else {
    upsertEntry(nonMemberMap, { email: cleaned, source, at: when, phone })
  }

  const membersOut = writeList(membersPath, 'rewards_members', memberMap)
  const nonMembersOut = writeList(nonMembersPath, 'non_members', nonMemberMap)
  return {
    ok: true,
    membership: memberMap.has(cleaned) ? 'member' : 'non_member',
    members: membersOut,
    nonMembers: nonMembersOut,
  }
}

/** Parse Square customer note for membership + sources. */
export function parseCustomerNote(note) {
  const text = String(note || '')
  const sources = []
  for (const match of text.matchAll(/source:([^\s·\n]+)/g)) {
    sources.push(match[1])
  }
  let membership = null
  if (/\bjd_member:yes\b/i.test(text) || sources.some((s) => MEMBER_SOURCES.has(s))) {
    membership = 'member'
  } else if (/\bjd_member:no\b/i.test(text) || /Jersey Deals lead/i.test(text)) {
    membership = 'non_member'
  }
  return { membership, sources: [...new Set(sources)] }
}

export function buildMemberNote({ source, membership, phone, name, previousNote = '' }) {
  const status = membership || membershipFromSource(source)
  const line = [
    'Jersey Deals lead',
    `jd_member:${status === 'member' ? 'yes' : 'no'}`,
    source ? `source:${source}` : null,
    phone ? `phone:${phone}` : null,
    name ? `name:${name}` : null,
    `at:${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const prev = String(previousNote || '').trim()
  if (!prev) return line
  // Upgrade membership flag in prior text when joining Rewards.
  let nextPrev = prev
  if (status === 'member') {
    nextPrev = nextPrev.replace(/\bjd_member:no\b/gi, 'jd_member:yes')
    if (!/\bjd_member:yes\b/i.test(nextPrev)) {
      nextPrev = `${nextPrev}\njd_member:yes`
    }
  }
  if (source && nextPrev.includes(`source:${source}`)) return nextPrev.slice(0, 2000)
  return [nextPrev, line].filter(Boolean).join('\n').slice(0, 2000)
}
