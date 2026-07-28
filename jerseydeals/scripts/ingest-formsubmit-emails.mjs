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
 *
 * Looks for subjects like:
 *   [Jersey Deals] member · rewards_club
 *   [Jersey Deals] non_member · first_buyer_offer
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
    if (m2?.[1] && !/^(email|source|membership|list|product|site)$/i.test(m2[1].trim())) {
      return m2[1].trim()
    }
  }
  return ''
}

function parseLeadFromMessage({ subject, text, html }) {
  const blob = `${subject || ''}\n${text || ''}\n${html || ''}`
  const subjectMatch = String(subject || '').match(
    /\[Jersey Deals\]\s*(member|non_member)\s*·\s*([^\s|]+)/i,
  )

  let email =
    extractField(blob, ['email', 'Email', '_replyto', 'Reply-To']) ||
    (blob.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i) || [])[0] ||
    ''
  email = normalizeEmail(email)

  let membership = (subjectMatch?.[1] || extractField(blob, ['jd_membership', 'membership', 'Membership']) || '')
    .trim()
    .toLowerCase()
  if (membership !== 'member' && membership !== 'non_member') membership = ''

  let source =
    (
      subjectMatch?.[2] ||
      extractField(blob, ['jd_source', 'source', 'Source']) ||
      ''
    ).trim() || 'landing'
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
    return null
  }
  if (!isValidEmail(email)) return null
  if (!LANDING_SOURCES.has(source) && !MEMBER_SOURCES.has(source)) {
    // Still accept if subject was clearly Jersey Deals.
    if (!/\[Jersey Deals\]/i.test(subject || '')) return null
    source = 'landing'
  }

  return {
    email,
    source,
    membership: membership === 'member' ? 'member' : 'non_member',
    phone,
  }
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

  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    // Search recent messages mentioning Jersey Deals.
    const uids = await client.search({
      since,
      or: [{ subject: 'Jersey Deals' }, { body: 'jerseydeals' }, { body: 'Jersey Deals' }],
    })
    console.log(`IMAP search hits: ${uids.length} (since ${since.toISOString().slice(0, 10)})`)

    for await (const msg of client.fetch(uids, {
      uid: true,
      flags: true,
      source: true,
      envelope: true,
    })) {
      const flags = [...(msg.flags || [])]
      if (flags.some((f) => String(f).toLowerCase() === 'jdprocessed' || String(f) === PROCESSED_FLAG)) {
        skipped.push({ uid: msg.uid, reason: 'already_processed' })
        continue
      }

      const parsed = await simpleParser(msg.source)
      const subject = parsed.subject || msg.envelope?.subject || ''
      if (!/jersey\s*deals/i.test(subject) && !/jerseydeals/i.test(String(parsed.text || ''))) {
        skipped.push({ uid: msg.uid, reason: 'not_jd', subject })
        continue
      }

      const lead = parseLeadFromMessage({
        subject,
        text: parsed.text || '',
        html: typeof parsed.html === 'string' ? parsed.html : '',
      })
      if (!lead) {
        skipped.push({ uid: msg.uid, reason: 'parse_fail', subject })
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
        skipped.push({ uid: msg.uid, reason: result.message, email: lead.email })
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
  } finally {
    lock.release()
    await client.logout().catch(() => {})
  }

  const members = readList(MEMBERS_PATH, 'rewards_members')
  const nonMembers = readList(NON_MEMBERS_PATH, 'non_members')

  console.log(
    JSON.stringify(
      {
        dryRun: DRY,
        ingested: ingested.length,
        skipped: skipped.length,
        members: members.count,
        nonMembers: nonMembers.count,
        sampleIngested: ingested.slice(0, 10),
        sampleSkipped: skipped.slice(0, 10),
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
