#!/usr/bin/env node
/**
 * Detect newly added Rewards offers and email members at most once per day.
 *
 * Source of truth: src/rewardsOffersCatalog.json
 * (Same file the app uses so My offers and email stay in sync.)
 * A copy is mirrored to public/rewards-offers-catalog.json for ops visibility.
 *
 * - Diffs catalog ids vs committed known set
 * - Queues new offers into pending[]
 * - Sends a short plain-text digest to AUDIENCE=rewards when pending is
 *   non-empty and we have not already emailed an offer digest today
 *   (America/New_York)
 * - First run bootstraps known ids WITHOUT emailing
 *
 * Env:
 *   DRY_RUN=1 / FORCE_SEND=1 / SKIP_SEND=1 / SMTP_*
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '../public')
const CATALOG_PATH = join(__dirname, '../src/rewardsOffersCatalog.json')
const STATE_PATH = join(PUBLIC, 'rewards-new-offers-state.json')
const PUBLIC_CATALOG_PATH = join(PUBLIC, 'rewards-offers-catalog.json')
const SITE = 'https://jerseydeals.online/'
const OFFERS_URL = 'https://JerseyDeals.online/#offers'
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

function mirrorCatalogToPublic(catalogPayload) {
  try {
    writeFileSync(PUBLIC_CATALOG_PATH, `${JSON.stringify(catalogPayload, null, 2)}\n`)
  } catch {
    /* ignore */
  }
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

function catalogOffers(payload) {
  const rows = Array.isArray(payload?.offers) ? payload.offers : []
  return rows
    .map((row) => ({
      id: String(row?.id || '')
        .trim()
        .toLowerCase(),
      title: String(row?.title || 'New offer').trim(),
      detail: String(row?.detail || '').trim(),
      audience: String(row?.audience || 'rewards').trim().toLowerCase(),
    }))
    .filter((row) => row.id && (row.audience === 'rewards' || row.audience === 'all'))
}

function buildDigest(pending) {
  const n = pending.length
  const subject =
    n === 1 ? 'New Rewards offer at Jersey Deals' : `${n} new Rewards offers at Jersey Deals`

  const lines = pending.slice(0, 8).flatMap((p) => {
    const block = [`• ${p.title}`]
    if (p.detail) block.push(`  ${p.detail}`)
    return block
  })

  const body = [
    'Hey —',
    '',
    n === 1
      ? 'A new Rewards offer just dropped for you:'
      : 'New Rewards offers just dropped for you:',
    '',
    ...lines,
    '',
    'They’re in My offers — activate one in your cart at checkout:',
    OFFERS_URL,
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
  const catalogPayload = readJson(CATALOG_PATH, null)
  if (!catalogPayload) {
    console.error('Missing rewards-offers-catalog.json — nothing to notify.')
    process.exit(1)
  }

  const live = catalogOffers(catalogPayload)
  const liveById = new Map(live.map((row) => [row.id, row]))
  const liveIds = [...liveById.keys()]

  let state = readJson(STATE_PATH, null) || emptyState()
  if (!Array.isArray(state.knownIds)) state.knownIds = []
  if (!Array.isArray(state.pending)) state.pending = []

  if (!state.bootstrappedAt) {
    state = {
      ...emptyState(),
      bootstrappedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      knownIds: [...liveIds].sort(),
      pending: [],
    }
    if (!DRY) {
      writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)
      mirrorCatalogToPublic(catalogPayload)
    }
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
  for (const id of liveIds) {
    if (known.has(id) || pendingById.has(id)) continue
    const row = liveById.get(id)
    const entry = {
      id,
      title: row.title,
      detail: row.detail,
      seenAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    }
    pendingById.set(id, entry)
    newlyFound.push(entry)
  }

  // Keep pending only for offers still in the catalog.
  for (const id of [...pendingById.keys()]) {
    if (!liveById.has(id)) pendingById.delete(id)
  }

  for (const id of liveIds) known.add(id)

  state.knownIds = [...known].sort()
  state.pending = [...pendingById.values()].sort((a, b) => a.title.localeCompare(b.title))
  state.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  const today = dayKey()
  const alreadyToday = state.lastEmailedDay === today
  const smtpReady = Boolean((process.env.SMTP_USER || '').trim() && process.env.SMTP_PASS)

  let emailed = false
  const wantsSend =
    state.pending.length > 0 && (FORCE || !alreadyToday) && !SKIP_SEND

  if (wantsSend && !smtpReady && !DRY) {
    console.log(
      JSON.stringify(
        {
          willSend: false,
          reason: 'missing_smtp_secrets',
          pending: state.pending.length,
        },
        null,
        2,
      ),
    )
  } else if (wantsSend && (smtpReady || DRY)) {
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

  if (!DRY) {
    writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`)
    mirrorCatalogToPublic(catalogPayload)
  }
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
