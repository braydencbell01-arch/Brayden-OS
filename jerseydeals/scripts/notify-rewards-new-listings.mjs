#!/usr/bin/env node
/**
 * Detect newly listed kits and email Rewards members at most once per day.
 *
 * - Compares live listings.json to a committed known-id set
 * - Queues new kits into pending[]
 * - Sends a short plain-text digest to AUDIENCE=rewards when pending is
 *   non-empty and we have not already emailed today (America/New_York)
 * - First run bootstraps known ids WITHOUT emailing (avoids blasting the
 *   whole current catalog)
 *
 * Env:
 *   DRY_RUN=1           — update nothing / send nothing (print plan)
 *   FORCE_SEND=1        — ignore once-per-day gate
 *   SKIP_SEND=1         — queue only, never SMTP
 *   SMTP_*              — same secrets as send-smtp-email.mjs
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '../public')
const LISTINGS_PATH = join(PUBLIC, 'listings.json')
const STATE_PATH = join(PUBLIC, 'rewards-new-listings-state.json')
const SITE = 'https://jerseydeals.online/'
const TZ = 'America/New_York'

const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const FORCE = process.env.FORCE_SEND === '1' || process.env.FORCE_SEND === 'true'
const SKIP_SEND = process.env.SKIP_SEND === '1' || process.env.SKIP_SEND === 'true'

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function dayKey(iso = new Date().toISOString()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function listingKey(row) {
  return String(row?.sku || row?.id || '')
    .trim()
    .toLowerCase()
}

function activeListings(payload) {
  const rows = Array.isArray(payload?.listings) ? payload.listings : []
  return rows.filter((row) => Number(row?.quantity ?? 0) > 0 && listingKey(row))
}

function emptyState() {
  return {
    updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    bootstrappedAt: null,
    knownIds: [],
    pending: [],
    lastEmailedAt: null,
    lastEmailedDay: null,
    lastEmailedIds: [],
  }
}

function buildDigest(pending) {
  const n = pending.length
  const subject =
    n === 1 ? 'New kit at Jersey Deals' : `${n} new kits at Jersey Deals`

  const lines = pending.slice(0, 12).map((p) => {
    const title = String(p.title || 'New kit').trim()
    const price =
      typeof p.price === 'number' && Number.isFinite(p.price)
        ? ` — $${p.price.toFixed(2)}`
        : ''
    return `• ${title}${price}`
  })
  if (pending.length > 12) lines.push(`• +${pending.length - 12} more`)

  const body = [
    'Hey —',
    '',
    n === 1
      ? 'Something new just hit Jersey Deals:'
      : 'A few new kits just hit Jersey Deals:',
    '',
    ...lines,
    '',
    'Members hear about it first:',
    SITE,
    '',
    'Brayden',
    'Jersey Deals',
    'shop@jerseydeals.online',
  ].join('\n')

  return { subject, body }
}

function sendRewardsEmail({ subject, body }) {
  const env = {
    ...process.env,
    AUDIENCE: 'rewards',
    SUBJECT: subject,
    BODY: body,
    PLAIN_TEXT_ONLY: '1',
    LINK: SITE,
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

function main() {
  const listingsPayload = readJson(LISTINGS_PATH, null)
  if (!listingsPayload) {
    console.error('Missing listings.json — nothing to notify.')
    process.exit(1)
  }

  const live = activeListings(listingsPayload)
  const liveByKey = new Map(live.map((row) => [listingKey(row), row]))
  const liveKeys = [...liveByKey.keys()]

  let state = readJson(STATE_PATH, null) || emptyState()
  if (!Array.isArray(state.knownIds)) state.knownIds = []
  if (!Array.isArray(state.pending)) state.pending = []

  // Bootstrap: remember current inventory without emailing.
  if (!state.bootstrappedAt) {
    state = {
      ...emptyState(),
      bootstrappedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      knownIds: [...liveKeys].sort(),
      pending: [],
    }
    if (!DRY) writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)
    console.log(
      JSON.stringify(
        {
          bootstrapped: true,
          known: state.knownIds.length,
          emailed: false,
          dryRun: DRY,
        },
        null,
        2,
      ),
    )
    return
  }

  const known = new Set(state.knownIds.map((id) => String(id).toLowerCase()))
  const pendingById = new Map(
    state.pending.map((p) => [String(p.id).toLowerCase(), p]),
  )

  const newlyFound = []
  for (const key of liveKeys) {
    if (known.has(key) || pendingById.has(key)) continue
    const row = liveByKey.get(key)
    const entry = {
      id: key,
      title: String(row.title || 'New kit').trim(),
      url: String(row.url || SITE).trim(),
      price: typeof row.price === 'number' ? row.price : null,
      seenAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    }
    pendingById.set(key, entry)
    newlyFound.push(entry)
  }

  // Drop pending items that vanished before we emailed (sold/delisted).
  for (const id of [...pendingById.keys()]) {
    if (!liveByKey.has(id)) pendingById.delete(id)
  }

  // Grow known set so we don't re-detect the same keys after send.
  for (const key of liveKeys) known.add(key)

  state.knownIds = [...known].sort()
  state.pending = [...pendingById.values()].sort((a, b) =>
    a.title.localeCompare(b.title),
  )
  state.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  const today = dayKey()
  const alreadyToday = state.lastEmailedDay === today
  const smtpReady = Boolean((process.env.SMTP_USER || '').trim() && process.env.SMTP_PASS)
  const canSend =
    state.pending.length > 0 && (FORCE || !alreadyToday) && !SKIP_SEND && smtpReady

  let emailed = false
  if (state.pending.length > 0 && (FORCE || !alreadyToday) && !SKIP_SEND && !smtpReady) {
    console.log(
      JSON.stringify(
        {
          willSend: false,
          reason: 'missing_smtp_secrets',
          pending: state.pending.length,
          note: 'Queued for next run once SMTP_USER/SMTP_PASS are available.',
        },
        null,
        2,
      ),
    )
  } else if (canSend) {
    const digest = buildDigest(state.pending)
    console.log(
      JSON.stringify(
        {
          willSend: true,
          recipients: 'rewards',
          count: state.pending.length,
          subject: digest.subject,
          dryRun: DRY,
        },
        null,
        2,
      ),
    )
    if (!DRY) {
      sendRewardsEmail(digest)
      state.lastEmailedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      state.lastEmailedDay = today
      state.lastEmailedIds = state.pending.map((p) => p.id)
      state.pending = []
      emailed = true
    }
  } else {
    console.log(
      JSON.stringify(
        {
          willSend: false,
          reason: SKIP_SEND
            ? 'SKIP_SEND'
            : state.pending.length === 0
              ? 'no_pending'
              : alreadyToday
                ? 'already_emailed_today'
                : 'blocked',
          pending: state.pending.length,
          newlyFound: newlyFound.length,
          lastEmailedDay: state.lastEmailedDay,
          today,
          dryRun: DRY,
        },
        null,
        2,
      ),
    )
  }

  if (!DRY) writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)
  console.log(
    JSON.stringify(
      {
        emailed,
        pending: state.pending.length,
        known: state.knownIds.length,
        newlyFound: newlyFound.length,
        dryRun: DRY,
      },
      null,
      2,
    ),
  )
}

main()
