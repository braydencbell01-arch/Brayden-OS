#!/usr/bin/env node
/**
 * Post to the Jersey Deals Facebook Page via Graph API.
 *
 * Required env:
 *   FACEBOOK_PAGE_ID
 *   FACEBOOK_PAGE_ACCESS_TOKEN
 *
 * Optional env / CLI:
 *   MESSAGE / --message
 *   LINK / --link          (optional URL attached to the post)
 *   IMAGE_URL / --image    (optional public image URL → photo post)
 *   DRY_RUN=1              (print payload, do not post)
 *
 * Usage:
 *   MESSAGE="Hello" node jerseydeals/scripts/post-facebook.mjs
 *   node jerseydeals/scripts/post-facebook.mjs --message "Hello" --link "https://jerseydeals.online/"
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

function required(name, value) {
  if (!value || !String(value).trim()) {
    console.error(`Missing ${name}`)
    process.exit(1)
  }
  return String(value).trim()
}

async function graphPost(path, params, token) {
  const body = new URLSearchParams({ ...params, access_token: token })
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    const msg = json.error?.message || res.statusText
    throw new Error(`Graph API error: ${msg}`)
  }
  return json
}

async function main() {
  const pageId = required('FACEBOOK_PAGE_ID', process.env.FACEBOOK_PAGE_ID)
  const token = required(
    'FACEBOOK_PAGE_ACCESS_TOKEN',
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
  )
  const message = required(
    'MESSAGE',
    arg('message') || process.env.MESSAGE,
  )
  const link = (arg('link') || process.env.LINK || '').trim()
  const imageUrl = (arg('image') || process.env.IMAGE_URL || '').trim()
  const dryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run')

  if (dryRun) {
    console.log(
      JSON.stringify(
        { pageId, message, link: link || null, imageUrl: imageUrl || null },
        null,
        2,
      ),
    )
    return
  }

  let result
  if (imageUrl) {
    result = await graphPost(`/${pageId}/photos`, {
      url: imageUrl,
      caption: message,
      published: 'true',
    }, token)
  } else {
    const params = { message, published: 'true' }
    if (link) params.link = link
    result = await graphPost(`/${pageId}/feed`, params, token)
  }

  console.log(JSON.stringify({ ok: true, id: result.id || result.post_id || null, result }, null, 2))
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
