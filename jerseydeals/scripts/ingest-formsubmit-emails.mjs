#!/usr/bin/env node
/**
 * Ingest Jersey Deals FormSubmit lead emails from the shop inbox (IMAP)
 * into permanent member / non-member JSON lists.
 *
 * Env:
 *   SMTP_USER / SMTP_PASS  (IONOS mailbox — same as SMTP send)
 *   IMAP_HOST (default imap.ionos.com)
 *   IMAP_PORT (default 993)
 *   DRY_RUN=1  (parse only, do not write lists / mark mail)
 *   IMAP_LOOKBACK_DAYS (default 30)
 *
 * Looks for subjects like:
 *   [Jersey Deals] member · rewards_club
 *   [Jersey Deals] non_member · first_buyer_offer
 *   [Jersey Deals / Square] new info · …
 */

import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import {
  LANDING_SOURCES,
  MEMBER_SOURCES,
  membershipFromSource,
  normalizeEmail,
  isValidEmail,
  recordEmailCapture,
  readList,
  MEMBERS_PATH,
  NON_MEMBERS_PATH,
} from './lib/email-lists.mjs'

const USER = (process.env.SMTP_USER || process.env.IMAP_USER || '').trim()
const PASS = process.env.SMTP_PASS || process.env.IMAP_PASS || ''
const HOST = (process.env.IMAP_HOST || 'imap.ionos.com').trim()
const PORT = Number(process.env.IMAP_PORT || '993')
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const LOOKBACK_DAYS = Number(process.env.IMAP_LOOKBACK_DAYS || '30')
const PROCESSED_FLAG = '$JDProcessed'

const IGNORE_EMAILS = new Set([
  normalizeEmail(USER),
  'shop@jerseydeals.online',
  'noreply@formsubmit.co',
  'form@formsubmit.co',
  'noreply@square.com',
  'noreply@mail.squareup.com',
])

function log(...args) {
  // Always flush — stdout is often fully buffered when piped in Actions.
  console.log(...args)
  if (typeof process.stdout.write === 'function') {
    try {
      process.stdout.write('')
    } catch {
      /* ignore */
    }
  }
}

function extractField(text, keys) {
  const raw = String(text || '')
  for (const key of keys) {
    const re = new RegExp(
      `(?:^|\\n|\\r|<[^>]+>)\\s*${key}\\s*[:\\-]\\s*([^\\n\\r<]+)`,
      'i',
    )
    const m = raw.match(re)
    if (m?.[1]) return m[1].trim()
    // FormSubmit table style: label on one line, value on the next.
    const re2 = new RegExp(`(?:^|\\n)\\s*${key}\\s*(?:\\n|\\r\\n)\\s*([^\\n\\r<]+)`, 'i')
    const m2 = raw.match(re2)
    if (m2?.[1] && !/^(email|source|membership|list|product|site|phone|name)$/i.test(m2[1].trim())) {
      return m2[1].trim()
    }
    // HTML table cells: <td>email</td><td>user@x.com</td>
    const re3 = new RegExp(
      `<t[dh][^>]*>\\s*${key}\\s*</t[dh]>\\s*<t[dh][^>]*>\\s*([^<]+)\\s*</t[dh]>`,
      'i',
    )
    const m3 = raw.match(re3)
    if (m3?.[1]) return m3[1].trim()
  }
  return ''
}

function addressFromParsed(parsed, field) {
  const block = parsed?.[field]
  if (!block) return ''
  const vals = Array.isArray(block.value) ? block.value : []
  for (const v of vals) {
    const addr = normalizeEmail(v?.address || '')
    if (isValidEmail(addr) && !IGNORE_EMAILS.has(addr)) return addr
  }
  return ''
}

function firstLeadEmail(blob) {
  const matches = String(blob || '').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []
  for (const raw of matches) {
    const email = normalizeEmail(raw)
    if (!isValidEmail(email)) continue
    if (IGNORE_EMAILS.has(email)) continue
    if (/formsubmit\.co$/i.test(email)) continue
    if (/squareup?\.com$/i.test(email)) continue
    if (/ionos\./i.test(email)) continue
    return email
  }
  return ''
}

function parseLeadFromMessage({ subject, text, html, replyTo, from }) {
  const blob = `${subject || ''}\n${text || ''}\n${html || ''}`
  const subjectMatch = String(subject || '').match(
    /\[Jersey Deals(?:\s*\/\s*Square)?\]\s*(member|non_member|new info|lead)?\s*(?:·|-)?\s*([^\s|]+)?/i,
  )

  let email =
    extractField(blob, ['email', 'Email', '_replyto', 'Reply-To']) ||
    replyTo ||
    firstLeadEmail(blob) ||
    from ||
    ''
  email = normalizeEmail(email)
  if (IGNORE_EMAILS.has(email)) email = ''

  let membership = (subjectMatch?.[1] || extractField(blob, ['jd_membership', 'membership', 'Membership']) || '')
    .trim()
    .toLowerCase()
  if (membership === 'new info' || membership === 'lead') membership = ''
  if (membership !== 'member' && membership !== 'non_member') membership = ''

  let source = (
    (subjectMatch?.[2] && !/^(member|non_member|lead)$/i.test(subjectMatch[2])
      ? subjectMatch[2]
      : '') ||
    extractField(blob, ['jd_source', 'source', 'Source']) ||
    ''
  )
    .trim()
  source = source.replace(/[^\w.-]+/g, '').slice(0, 80) || 'landing'

  const list = extractField(blob, ['list', 'List']).toLowerCase()
  if (!membership) {
    if (list.includes('rewards_members') || MEMBER_SOURCES.has(source)) membership = 'member'
    else membership = membershipFromSource(source)
  }

  const phone = extractField(blob, ['phone', 'Phone', 'phone_number']) || undefined
  const product = extractField(blob, ['product', 'Product', 'site', 'Site'])

  // Ignore BrayStats / other products.
  if (/braystats/i.test(`${product}\n${subject}\n${blob.slice(0, 400)}`)) {
    return { ok: false, reason: 'braystats' }
  }
  if (!isValidEmail(email)) return { ok: false, reason: 'no_email', subject }
  if (!LANDING_SOURCES.has(source) && !MEMBER_SOURCES.has(source)) {
    // Still accept if subject was clearly Jersey Deals.
    if (!/\[Jersey Deals/i.test(subject || '') && !/jersey\s*deals/i.test(subject || '')) {
      return { ok: false, reason: 'bad_source', source, subject }
    }
    source = 'landing'
  }

  return {
    ok: true,
    email,
    source,
    membership: membership === 'member' ? 'member' : 'non_member',
    phone,
  }
}

function tally(map, key) {
  map.set(key, (map.get(key) || 0) + 1)
}

async function main() {
  if (!USER || !PASS) {
    console.error('Missing SMTP_USER/SMTP_PASS (or IMAP_USER/IMAP_PASS) for inbox ingest.')
    process.exit(1)
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const client = new ImapFlow({
    host: HOST,
    port: PORT,
    secure: true,
    auth: { user: USER, pass: PASS },
    logger: false,
  })

  const ingested = []
  const skipped = []
  const skipReasons = new Map()

  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    const uids = await client.search({
      since,
      or: [{ subject: 'Jersey Deals' }, { body: 'jerseydeals' }, { body: 'Jersey Deals' }],
    })
    log(`IMAP search hits: ${uids.length} (since ${since.toISOString().slice(0, 10)})`)

    if (!uids.length) {
      // fall through to summary
    } else {
      for await (const msg of client.fetch(uids, {
        uid: true,
        flags: true,
        source: true,
        envelope: true,
      })) {
        const flags = [...(msg.flags || [])]
        if (
          flags.some(
            (f) => String(f).toLowerCase() === 'jdprocessed' || String(f) === PROCESSED_FLAG,
          )
        ) {
          skipped.push({ uid: msg.uid, reason: 'already_processed' })
          tally(skipReasons, 'already_processed')
          continue
        }

        const parsed = await simpleParser(msg.source)
        const subject = parsed.subject || msg.envelope?.subject || ''
        const text = parsed.text || ''
        const html = typeof parsed.html === 'string' ? parsed.html : ''
        if (
          !/jersey\s*deals/i.test(subject) &&
          !/jerseydeals/i.test(`${text}\n${html}`.slice(0, 2000))
        ) {
          skipped.push({ uid: msg.uid, reason: 'not_jd', subject })
          tally(skipReasons, 'not_jd')
          continue
        }

        const lead = parseLeadFromMessage({
          subject,
          text,
          html,
          replyTo: addressFromParsed(parsed, 'replyTo'),
          from: addressFromParsed(parsed, 'from'),
        })
        if (!lead.ok) {
          skipped.push({ uid: msg.uid, reason: lead.reason, subject, source: lead.source })
          tally(skipReasons, lead.reason || 'parse_fail')
          continue
        }

        if (DRY) {
          ingested.push({ ...lead, uid: msg.uid, dry: true })
          continue
        }

        const result = recordEmailCapture({
          email: lead.email,
          source: lead.source,
          membership: lead.membership,
          phone: lead.phone,
          at: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
        })
        if (!result.ok) {
          skipped.push({ uid: msg.uid, reason: result.message, email: lead.email, subject })
          tally(skipReasons, result.message || 'record_fail')
          continue
        }

        try {
          await client.messageFlagsAdd(msg.uid, [PROCESSED_FLAG], { uid: true })
        } catch {
          // Custom flags may be unsupported — fall back to Seen.
          await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true }).catch(() => {})
        }

        ingested.push({
          email: lead.email,
          membership: result.membership,
          source: lead.source,
          uid: msg.uid,
        })
      }
    }
  } finally {
    lock.release()
    await client.logout().catch(() => {})
  }

  const members = readList(MEMBERS_PATH, 'rewards_members')
  const nonMembers = readList(NON_MEMBERS_PATH, 'non_members')
  const uniqueIngested = [...new Set(ingested.map((r) => r.email))]

  const summary = {
    dryRun: DRY,
    ingested: ingested.length,
    uniqueIngested: uniqueIngested.length,
    skipped: skipped.length,
    skipReasons: Object.fromEntries(skipReasons),
    members: members.count,
    nonMembers: nonMembers.count,
    sampleIngested: ingested.slice(0, 20),
    sampleSkipped: skipped.filter((s) => s.reason !== 'already_processed').slice(0, 20),
  }
  log(JSON.stringify(summary, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
