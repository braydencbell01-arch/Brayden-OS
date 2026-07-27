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
 *   AUDIENCE      "test" | "rewards" (default test)
 *   SUBJECT
 *   BODY          Plain-text body (use \n for newlines)
 *   ITEM_NAME     Optional — fills the “new kit” template if BODY empty
 *   LINK          Default https://jerseydeals.online/
 *   DRY_RUN=1     Print payload only
 */

import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

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

function rewardsEmails() {
  const path = join(__dirname, '../public/rewards-members.json')
  if (!existsSync(path)) return []
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    const fromEntries = Array.isArray(raw.entries)
      ? raw.entries.map((e) => String(e.email || '').trim().toLowerCase())
      : []
    const fromEmails = Array.isArray(raw.emails) ? raw.emails.map((e) => String(e).trim().toLowerCase()) : []
    return [...new Set([...fromEntries, ...fromEmails].filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
  } catch {
    return []
  }
}

function defaultNewItemBody(itemName, link) {
  const kit = itemName ? `**${itemName}**` : 'A new jersey'
  return [
    'Hey —',
    '',
    `${kit.replace(/\*\*/g, '')} just hit inventory at Jersey Deals.`,
    '',
    'Tap in, grab your size before it’s gone:',
    link,
    '',
    'As a Rewards member, you’re hearing about it first.',
    '',
    '— Jersey Deals',
    'shop@jerseydeals.online',
  ].join('\n')
}

async function main() {
  const host = (process.env.SMTP_HOST || 'smtp.ionos.com').trim()
  const port = Number(process.env.SMTP_PORT || '587')
  const user = (process.env.SMTP_USER || '').trim()
  const pass = process.env.SMTP_PASS || ''
  const from = (process.env.SMTP_FROM || 'Jersey Deals <shop@jerseydeals.online>').trim()
  const link = (process.env.LINK || 'https://jerseydeals.online/').trim()
  const itemName = (process.env.ITEM_NAME || '').trim()
  const audience = (process.env.AUDIENCE || 'test').trim().toLowerCase()
  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
  const subject =
    (process.env.SUBJECT || '').trim() ||
    (itemName ? `New kit just dropped: ${itemName}` : 'New kit just dropped')
  const body =
    (process.env.BODY || '').replace(/\\n/g, '\n').trim() || defaultNewItemBody(itemName, link)

  let to = parseList(process.env.TO)
  if (!to.length) {
    if (audience === 'rewards') {
      to = rewardsEmails()
    } else {
      to = parseList(user || 'shop@jerseydeals.online')
    }
  }

  if (!user || !pass) {
    console.error('Missing SMTP_USER or SMTP_PASS')
    process.exit(1)
  }
  if (!to.length) {
    console.error(
      audience === 'rewards'
        ? 'No Rewards members in public/rewards-members.json (and no TO override).'
        : 'No recipients. Set TO=email@example.com',
    )
    process.exit(1)
  }

  const payload = { from, to, subject, text: body, host, port, audience, dryRun }
  console.log(JSON.stringify({ ...payload, pass: '[redacted]' }, null, 2))

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
  })

  await transporter.verify()
  const info = await transporter.sendMail({
    from,
    to: to.join(', '),
    subject,
    text: body,
  })
  console.log('Sent:', info.messageId || info.response)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
