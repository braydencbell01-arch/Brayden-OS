#!/usr/bin/env node
/**
 * Send email via IONOS SMTP (shop@jerseydeals.online).
 *
 * Env (GitHub Actions secrets):
 *   SMTP_HOST (default smtp.ionos.com)
 *   SMTP_PORT (default 587)
 *   SMTP_USER
 *   SMTP_PASS
 *   SMTP_FROM (default "Jersey Deals <shop@jerseydeals.online>")
 *
 * Optional:
 *   TO            Comma-separated recipients (overrides audience list)
 *   AUDIENCE      "test" | "rewards" | "non_members" (default test)
 *   SUBJECT
 *   BODY          Plain-text body (use \n for newlines)
 *   ITEM_NAME     Optional — fills the “new kit” template if BODY empty
 *   LINK          Default https://jerseydeals.online/
 *   REPLY_TO      Default shop@jerseydeals.online
 *   UNSUBSCRIBE_MAILTO  Default shop@jerseydeals.online
 *   UNSUBSCRIBE_URL     Default https://jerseydeals.online/#rewards
 *   DRY_RUN=1     Print payload only
 */

import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const SHOP = 'shop@jerseydeals.online'
const SITE = 'https://jerseydeals.online/'

function loadNodemailer() {
  try {
    return require('nodemailer')
  } catch {
    console.error('nodemailer is required. In CI: npm install nodemailer')
    process.exit(1)
  }
}

function parseList(raw) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
}

function emailsFromListFile(filename) {
  const path = join(__dirname, '../public', filename)
  if (!existsSync(path)) return []
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    const fromEntries = Array.isArray(raw.entries)
      ? raw.entries.map((e) => String(e.email || '').trim().toLowerCase())
      : []
    const fromEmails = Array.isArray(raw.emails)
      ? raw.emails.map((e) => String(e).trim().toLowerCase())
      : []
    return [
      ...new Set(
        [...fromEntries, ...fromEmails].filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
      ),
    ]
  } catch {
    return []
  }
}

function rewardsEmails() {
  return emailsFromListFile('rewards-members.json')
}

function nonMemberEmails() {
  return emailsFromListFile('non-member-emails.json')
}

function defaultNewItemBody(itemName, link) {
  return [
    'Hey —',
    '',
    `${itemName || 'A new jersey'} just hit inventory at Jersey Deals.`,
    '',
    'Tap in, grab your size before it’s gone:',
    link,
    '',
    'As a Rewards member, you’re hearing about it first.',
    '',
    '— Jersey Deals',
    SHOP,
  ].join('\n')
}

function withFooter(body, { unsubMailto, unsubUrl }) {
  const text = String(body || '').trim()
  if (/unsubscribe/i.test(text)) return text
  return [
    text,
    '',
    '—',
    'Jersey Deals · shop@jerseydeals.online · https://JerseyDeals.online/',
    `Not interested? Reply “unsubscribe” or email ${unsubMailto} — or visit ${unsubUrl}`,
  ].join('\n')
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtml(text) {
  const lines = String(text || '').split('\n')
  const parts = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      parts.push('<br>')
      continue
    }
    // Autolink bare URLs.
    const linked = escapeHtml(line).replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" style="color:#0b57d0;text-decoration:underline;">$1</a>',
    )
    parts.push(`${linked}<br>`)
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jersey Deals</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;background:#f6f4ef;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#666;margin-bottom:18px;">Jersey Deals</div>
    <div style="background:#fff;border:1px solid #e6e1d6;padding:22px 20px;">
      ${parts.join('\n')}
    </div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#666;margin-top:16px;">
      Sent by Jersey Deals · <a href="https://JerseyDeals.online/" style="color:#666;">JerseyDeals.online</a>
    </div>
  </div>
</body>
</html>`
}

async function main() {
  const host = (process.env.SMTP_HOST || 'smtp.ionos.com').trim()
  const port = Number(process.env.SMTP_PORT || '587')
  const user = (process.env.SMTP_USER || '').trim()
  const pass = process.env.SMTP_PASS || ''
  const from = (process.env.SMTP_FROM || `Jersey Deals <${SHOP}>`).trim()
  const replyTo = (process.env.REPLY_TO || SHOP).trim()
  const link = (process.env.LINK || SITE).trim()
  const itemName = (process.env.ITEM_NAME || '').trim()
  const audience = (process.env.AUDIENCE || 'test').trim().toLowerCase()
  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
  const unsubMailto = (process.env.UNSUBSCRIBE_MAILTO || SHOP).trim()
  const unsubUrl = (process.env.UNSUBSCRIBE_URL || `${SITE}#rewards`).trim()
  const subject =
    (process.env.SUBJECT || '').trim() ||
    (itemName ? `New kit just dropped: ${itemName}` : 'New kit just dropped')
  const rawBody =
    (process.env.BODY || '').replace(/\\n/g, '\n').trim() || defaultNewItemBody(itemName, link)
  const body = withFooter(rawBody, { unsubMailto, unsubUrl })
  const html = textToHtml(body)

  let to = parseList(process.env.TO)
  if (!to.length) {
    if (audience === 'rewards') to = rewardsEmails()
    else if (audience === 'non_members' || audience === 'non-members') to = nonMemberEmails()
    else to = parseList(user || SHOP)
  }

  if (!user || !pass) {
    console.error('Missing SMTP_USER or SMTP_PASS')
    process.exit(1)
  }
  if (!to.length) {
    console.error(
      audience === 'rewards'
        ? 'No Rewards members in public/rewards-members.json (and no TO override).'
        : audience === 'non_members' || audience === 'non-members'
          ? 'No non-members in public/non-member-emails.json (and no TO override).'
          : 'No recipients. Set TO=email@example.com',
    )
    process.exit(1)
  }

  const listUnsub = `<mailto:${unsubMailto}?subject=unsubscribe>, <${unsubUrl}>`

  const payload = {
    from,
    replyTo,
    to,
    subject,
    text: body,
    host,
    port,
    audience,
    dryRun,
    headers: {
      'List-Unsubscribe': listUnsub,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'List-Id': '<rewards.jerseydeals.online>',
    },
  }
  console.log(JSON.stringify({ ...payload, pass: '[redacted]', htmlBytes: html.length }, null, 2))

  if (dryRun) {
    console.log('Dry run — not sent.')
    return
  }

  const nodemailer = loadNodemailer()
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Prefer STARTTLS identity aligned with the From domain.
    name: 'jerseydeals.online',
  })

  await transporter.verify()

  // Send one message per recipient so addresses stay private.
  const results = []
  for (const recipient of to) {
    const messageId = `<${randomUUID()}@jerseydeals.online>`
    const info = await transporter.sendMail({
      from,
      replyTo,
      to: recipient,
      subject,
      text: body,
      html,
      messageId,
      headers: {
        'List-Unsubscribe': listUnsub,
        // Gmail expects this paired with an HTTPS one-click endpoint eventually.
        // Mailto + URL still helps reputation vs bare marketing blasts.
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'List-Id': '<rewards.jerseydeals.online>',
        'Feedback-ID': `jd:rewards:${audience}:jerseydeals`,
        'X-JerseyDeals-Audience': audience,
      },
    })
    results.push({ to: recipient, id: info.messageId || info.response })
    console.log('Sent:', recipient, info.messageId || info.response)
  }
  console.log(JSON.stringify({ sent: results.length, results }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
