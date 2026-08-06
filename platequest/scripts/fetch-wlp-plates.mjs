#!/usr/bin/env node
/**
 * Fetch US state plate photos + notes from worldlicenseplates.com
 * into platequest/public/plates/ and platequest/src/wlpCatalog.json
 *
 * Attribution: images © World License Plates (worldlicenseplates.com)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'plates')
const CATALOG = path.join(ROOT, 'src', 'wlpCatalog.json')
const UA = 'Mozilla/5.0 (compatible; PlateQuestBot/1.0; +https://braydencbell01-arch.github.io/Brayden-OS/platequest/)'
const BASE = 'http://www.worldlicenseplates.com'

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

function pageSlug(code) {
  return `US_${code}XX`
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
}

async function fetchBinary(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*' } })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function parseImages(html, slug) {
  const imgs = []
  const re = /<(?:IMG|img)\s+[^>]*SRC=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi
  const re2 = /<(?:IMG|img)\s+[^>]*alt=["']([^"']*)["'][^>]*SRC=["']([^"']+)["']/gi
  let m
  while ((m = re.exec(html))) {
    imgs.push({ src: m[1], alt: m[2] || '' })
  }
  while ((m = re2.exec(html))) {
    imgs.push({ src: m[2], alt: m[1] || '' })
  }
  // Dedupe by basename
  const seen = new Set()
  const out = []
  for (const img of imgs) {
    if (!img.src.includes('/jpglps/')) continue
    if (!img.src.includes(slug)) continue
    const base = path.basename(img.src.split('?')[0])
    if (seen.has(base)) continue
    seen.add(base)
    const fixed = img.src.includes('../jpglps/')
      ? `${BASE}/jpglps/${base}`
      : img.src.startsWith('http')
        ? img.src
        : `${BASE}/jpglps/${base}`
    out.push({ file: base, url: fixed, alt: decodeEntities(img.alt || base) })
  }
  return out
}

function parsePassengerRows(html) {
  const rows = []
  // Find Private/Passenger table body-ish rows with 4 cells
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let tr
  while ((tr = trRe.exec(html))) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]))
    if (cells.length < 4) continue
    const [example, introduced, colors, notes] = cells
    if (!example || /Example Shown/i.test(example) || /Base Introduced/i.test(introduced)) continue
    if (!/\d{4}/.test(introduced) && !/still valid/i.test(introduced)) {
      // many rows have year in col2
      if (!/\d{4}/.test(cells.join(' '))) continue
    }
    rows.push({
      example,
      introduced,
      colors,
      notes,
    })
  }
  return rows
}

function categorize(file, alt) {
  const f = file.toUpperCase()
  const a = alt.toLowerCase()
  if (f.includes('_GI3') || a.includes('private/passenger')) return { kind: 'passenger', name: 'Private / passenger plates' }
  if (f.includes('_GI1') || f.includes('_GI2') || a.includes('190') || a.includes('history') || a.includes('porcelain') || a.includes('metal'))
    return { kind: 'history', name: alt || 'Plate history' }
  if (f.includes('_OTM') || a.includes('military')) return { kind: 'military', name: alt || 'Military-related plates' }
  if (f.includes('_OT') || a.includes('non-passenger')) return { kind: 'other', name: alt || 'Non-passenger / other plates' }
  if (f.includes('_SIH') || a.includes('heritage')) return { kind: 'specialty', name: alt || 'Heritage & state plates' }
  if (f.includes('_SIM') || a.includes('miscellaneous') || a.includes('support'))
    return { kind: 'specialty', name: alt || 'Miscellaneous & support plates' }
  if (f.includes('_SIS') || a.includes('sports')) return { kind: 'specialty', name: alt || 'Sports-related plates' }
  if (f.includes('_SIV') || a.includes('vanity') || a.includes('optional'))
    return { kind: 'optional', name: alt || 'Vanity / optional bases' }
  if (f.includes('_SI')) return { kind: 'specialty', name: alt || 'Special interest plates' }
  return { kind: 'gallery', name: alt || file }
}

async function processState(code) {
  const slug = pageSlug(code)
  const pageUrl = `${BASE}/usa/${slug}.html`
  const html = await fetchText(pageUrl)
  const images = parseImages(html, slug)
  const passengerRows = parsePassengerRows(html)
  const dir = path.join(OUT_DIR, code)
  await mkdir(dir, { recursive: true })

  const localImages = []
  for (const img of images) {
    try {
      const buf = await fetchBinary(img.url)
      if (buf.length < 1000) continue
      const dest = path.join(dir, img.file)
      await writeFile(dest, buf)
      const cat = categorize(img.file, img.alt)
      localImages.push({
        id: `${code}-${img.file.replace(/\W+/g, '-').toLowerCase()}`,
        file: `plates/${code}/${img.file}`,
        sourceUrl: img.url,
        pageUrl,
        alt: img.alt,
        name: cat.name,
        kind: cat.kind,
      })
      process.stdout.write('.')
    } catch (err) {
      console.warn(`\n  skip ${img.url}: ${err.message}`)
    }
  }

  // Prefer passenger collage as main
  localImages.sort((a, b) => {
    const rank = (k) => (k === 'passenger' ? 0 : k === 'history' ? 1 : k === 'specialty' ? 2 : 3)
    return rank(a.kind) - rank(b.kind)
  })

  return {
    code,
    pageUrl,
    credit: 'Photos from World License Plates (worldlicenseplates.com)',
    passengerBases: passengerRows.slice(0, 12),
    images: localImages,
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const catalog = {
    source: BASE,
    fetchedAt: new Date().toISOString().slice(0, 10),
    credit: 'License plate photographs courtesy of World License Plates — https://www.worldlicenseplates.com/',
    states: {},
  }

  for (const code of STATES) {
    process.stdout.write(`\n${code} `)
    try {
      catalog.states[code] = await processState(code)
    } catch (err) {
      console.warn(`\nFAILED ${code}: ${err.message}`)
      catalog.states[code] = { code, pageUrl: `${BASE}/usa/${pageSlug(code)}.html`, images: [], passengerBases: [], error: err.message }
    }
  }

  await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n')
  console.log(`\n\nWrote ${CATALOG}`)
  const ok = Object.values(catalog.states).filter((s) => s.images?.length).length
  console.log(`States with images: ${ok}/${STATES.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
