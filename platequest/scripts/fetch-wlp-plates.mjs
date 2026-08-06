#!/usr/bin/env node
/**
 * Fetch plate photos + notes from worldlicenseplates.com for all PlateQuest
 * jurisdictions (US, Canada, Mexico, territories, Native American, military, federal).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'plates')
const CATALOG = path.join(ROOT, 'src', 'wlpCatalog.json')
const REQ_MAP = path.join(ROOT, 'public', 'plates', 'US_front_rear_requirements.gif')
const UA = 'Mozilla/5.0 (compatible; PlateQuestBot/1.0; +https://braydencbell01-arch.github.io/Brayden-OS/platequest/)'
const BASE = 'http://www.worldlicenseplates.com'

// Parse jurisdictions from the TS source (avoid TS import in node script).
async function loadJurisdictions() {
  const src = await readFile(path.join(ROOT, 'src', 'jurisdictions.ts'), 'utf8')
  const entries = []
  const re =
    /\{\s*code:\s*'([^']+)'[\s\S]*?name:\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)[\s\S]*?region:\s*'([^']+)'[\s\S]*?wlpPath:\s*'([^']+)'[\s\S]*?wlpStem:\s*'([^']+)'/g
  // Simpler: match objects with wlpPath
  const objRe = /\{[^{}]*code:\s*'([^']+)'[^{}]*name:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")[^{}]*region:\s*'([^']+)'[^{}]*wlpPath:\s*'([^']+)'[^{}]*wlpStem:\s*'([^']+)'[^{}]*\}/g
  // Fallback line-oriented parse
  const blocks = src.split(/\n\s*\{/).slice(1)
  for (const block of blocks) {
    const code = block.match(/code:\s*'([^']+)'/)?.[1]
    const nameMatch =
      block.match(/name:\s*'((?:\\'|[^'])*)'/) ||
      block.match(/name:\s*"((?:\\"|[^"])*)"/)
    const region = block.match(/region:\s*'([^']+)'/)?.[1]
    const wlpPath =
      block.match(/wlpPath:\s*'([^']+)'/)?.[1] ||
      block.match(/wlpPath:\s*"([^"]+)"/)?.[1]
    const wlpStem =
      block.match(/wlpStem:\s*'([^']+)'/)?.[1] ||
      block.match(/wlpStem:\s*"([^"]+)"/)?.[1]
    if (code && nameMatch && region && wlpPath && wlpStem) {
      entries.push({
        code,
        name: nameMatch[1].replace(/\\'/g, "'").replace(/\\"/g, '"'),
        region,
        wlpPath,
        wlpStem,
      })
    }
  }
  // us() helper entries don't have region literal in object - parse us() calls
  const usRe = /us\('([A-Z]{2})',\s*'((?:\\'|[^'])*)'/g
  let m
  while ((m = usRe.exec(src))) {
    const code = m[1]
    if (entries.some((e) => e.code === code)) continue
    entries.push({
      code,
      name: m[2].replace(/\\'/g, "'"),
      region: 'us-state',
      wlpPath: `usa/US_${code}XX.html`,
      wlpStem: `US_${code}XX`,
    })
  }
  return entries
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

function parseImages(html, stem) {
  const imgs = []
  const re = /<(?:IMG|img)\s+[^>]*SRC=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi
  const re2 = /<(?:IMG|img)\s+[^>]*alt=["']([^"']*)["'][^>]*SRC=["']([^"']+)["']/gi
  let m
  while ((m = re.exec(html))) imgs.push({ src: m[1], alt: m[2] || '' })
  while ((m = re2.exec(html))) imgs.push({ src: m[2], alt: m[1] || '' })
  const seen = new Set()
  const out = []
  for (const img of imgs) {
    if (!img.src.includes('/jpglps/')) continue
    const base = path.basename(img.src.split('?')[0])
    if (!base.toUpperCase().includes(stem.toUpperCase())) continue
    if (seen.has(base)) continue
    seen.add(base)
    out.push({
      file: base,
      url: `${BASE}/jpglps/${base}`,
      alt: decodeEntities(img.alt || base),
    })
  }
  return out
}

function parsePassengerRows(html) {
  const rows = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let tr
  while ((tr = trRe.exec(html))) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]))
    if (cells.length < 4) continue
    const [example, introduced, colors, notes] = cells
    if (!example || /Example Shown/i.test(example) || /Base Introduced/i.test(introduced)) continue
    if (!/\d{4}/.test(cells.join(' '))) continue
    rows.push({ example, introduced, colors, notes })
  }
  return rows
}

function categorize(file, alt) {
  const f = file.toUpperCase()
  const a = alt.toLowerCase()
  if (f.includes('_GI3') || a.includes('private/passenger') || a.includes('passenger'))
    return { kind: 'passenger', name: alt && !alt.endsWith('.jpg') ? alt : 'Private / passenger plates' }
  if (f.includes('_GI') || a.includes('history') || a.includes('porcelain'))
    return { kind: 'history', name: alt && !alt.endsWith('.jpg') ? alt : 'Plate history' }
  if (a.includes('military') || f.includes('XAF') || f.includes('XARM') || f.includes('XNAV') || f.includes('XMAR') || f.includes('XNG') || f.includes('XCG') || f.includes('XBAS') || f.includes('XOTH'))
    return { kind: 'military', name: alt && !alt.endsWith('.jpg') ? alt : 'Military plates' }
  if (f.includes('_OT') || a.includes('non-passenger'))
    return { kind: 'other', name: alt && !alt.endsWith('.jpg') ? alt : 'Non-passenger / other plates' }
  if (f.includes('_SI') || a.includes('special') || a.includes('heritage') || a.includes('sports'))
    return { kind: 'specialty', name: alt && !alt.endsWith('.jpg') ? alt : 'Special interest plates' }
  return { kind: 'gallery', name: alt && !alt.endsWith('.jpg') ? alt : file }
}

async function processEntry(entry) {
  const pageUrl = `${BASE}/${entry.wlpPath}`
  const html = await fetchText(pageUrl)
  const images = parseImages(html, entry.wlpStem)
  const passengerRows = parsePassengerRows(html)
  const dir = path.join(OUT_DIR, entry.code.replace(/[^A-Za-z0-9_-]/g, '_'))
  await mkdir(dir, { recursive: true })

  const localImages = []
  for (const img of images) {
    try {
      const buf = await fetchBinary(img.url)
      if (buf.length < 800) continue
      await writeFile(path.join(dir, img.file), buf)
      const cat = categorize(img.file, img.alt)
      localImages.push({
        id: `${entry.code}-${img.file.replace(/\W+/g, '-').toLowerCase()}`,
        file: `plates/${entry.code.replace(/[^A-Za-z0-9_-]/g, '_')}/${img.file}`,
        sourceUrl: img.url,
        pageUrl,
        alt: img.alt,
        name: cat.name,
        kind: cat.kind,
      })
      process.stdout.write('.')
    } catch (err) {
      process.stdout.write('x')
    }
  }

  localImages.sort((a, b) => {
    const rank = (k) =>
      k === 'passenger' ? 0 : k === 'military' ? 1 : k === 'history' ? 2 : k === 'specialty' ? 3 : 4
    return rank(a.kind) - rank(b.kind)
  })

  return {
    code: entry.code,
    name: entry.name,
    region: entry.region,
    pageUrl,
    credit: 'Photos from World License Plates (worldlicenseplates.com)',
    passengerBases: passengerRows.slice(0, 12),
    images: localImages,
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const list = await loadJurisdictions()
  console.log(`Loaded ${list.length} jurisdictions`)

  // Front/rear requirements map from WLP
  try {
    const buf = await fetchBinary(`${BASE}/gifmisc/US_XNTL.gif`)
    await writeFile(REQ_MAP, buf)
    console.log('Saved front/rear requirements map')
  } catch (err) {
    console.warn('Could not save requirements map:', err.message)
  }

  const catalog = {
    source: BASE,
    fetchedAt: new Date().toISOString().slice(0, 10),
    credit: 'License plate photographs courtesy of World License Plates — https://www.worldlicenseplates.com/',
    requirementsMap: 'plates/US_front_rear_requirements.gif',
    states: {},
  }

  for (const entry of list) {
    process.stdout.write(`\n${entry.code} `)
    try {
      catalog.states[entry.code] = await processEntry(entry)
    } catch (err) {
      console.warn(`\nFAILED ${entry.code}: ${err.message}`)
      catalog.states[entry.code] = {
        code: entry.code,
        name: entry.name,
        region: entry.region,
        pageUrl: `${BASE}/${entry.wlpPath}`,
        images: [],
        passengerBases: [],
        error: err.message,
      }
    }
  }

  await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n')
  const ok = Object.values(catalog.states).filter((s) => s.images?.length).length
  console.log(`\n\nWrote ${CATALOG}`)
  console.log(`With images: ${ok}/${list.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
