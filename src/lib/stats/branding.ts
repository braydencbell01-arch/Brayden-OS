/** Branding helpers — ESPN logos + safe team / league color accents. */

import type { LeagueId } from '../leagues'

export type EspnLogo = {
  href?: string
  rel?: string[]
}

/**
 * Brand / identity hues for every competition in the app.
 * Prefer official crest / kit colors; `safeAccentColor` lifts dark hues for the pitch UI.
 */
export const LEAGUE_BRAND_COLORS: Record<LeagueId, string> = {
  // England
  'premier-league': '#37003c', // official PL purple (lion crest)
  'fa-cup': '#e30613',
  'efl-cup': '#e30613',
  'community-shield': '#37003c',
  'efl-trophy': '#1d3557',
  'eng-championship': '#1d3557',

  // Spain
  'la-liga': '#ee8707',
  'copa-del-rey': '#c60b1e',
  'spanish-supercopa': '#ee8707',
  'esp-segunda': '#ee8707',

  // Italy
  'serie-a': '#024494',
  'coppa-italia': '#009246',
  'italian-supercoppa': '#024494',
  'ita-serie-b': '#1a5fad',

  // Germany
  bundesliga: '#d20515',
  'dfb-pokal': '#000000',
  'german-supercup': '#d20515',
  'ger-2-bundesliga': '#d20515',

  // France
  'ligue-1': '#091c3e',
  'coupe-de-france': '#002395',
  'trophee-des-champions': '#091c3e',
  'coupe-de-la-ligue': '#e30613',
  'fra-ligue-2': '#0a2a52',

  // UEFA / FIFA continental & world club
  'uefa-champions': '#0e1e5b',
  'uefa-europa': '#f5a623',
  'uefa-conference': '#1ba27a',
  'uefa-super-cup': '#0e1e5b',
  'conmebol-libertadores': '#f5c518',
  'conmebol-sudamericana': '#e87722',
  'caf-champions': '#e30613',
  'afc-champions': '#c8102e',
  'concacaf-champions': '#c8102e',
  'fifa-club-world-cup': '#326295',

  // International / nations
  'fifa-world': '#326295',
  'fifa-friendly': '#1b4f72',
  'fifa-worldq': '#326295',
  'uefa-nations': '#0b1f4a',
  'uefa-euro': '#003399',
  'conmebol-america': '#74acdf',
  'caf-nations': '#e30613',
  'afc-asian-cup': '#c8102e',
  'concacaf-gold': '#c5a572',

  // Americas domestic
  brasileirao: '#009b3a',
  'copa-do-brasil': '#009c3b',
  'brazilian-supercopa': '#ffdf00',
  'liga-mx': '#006847',
  'copa-mx': '#006847',
  'campeon-de-campeones': '#ce1126',
  mls: '#c8102e',
  'us-open-cup': '#002868',
  'liga-profesional': '#74acdf',
  'copa-argentina': '#74acdf',
  'argentine-supercopa': '#74acdf',
  'trofeo-de-campeones': '#74acdf',

  // Europe domestic (rest)
  eredivisie: '#ee7a00',
  'knvb-beker': '#ff6600',
  'johan-cruyff-shield': '#ee7a00',
  'primeira-liga': '#006341',
  'taca-de-portugal': '#006600',
  'belgian-pro-league': '#ed2939',
  'turkish-super-lig': '#e30a17',
  'austrian-bundesliga': '#ed2939',
  'swiss-super-league': '#d52b1e',
  'scottish-premiership': '#1a3c6e',
  'scottish-cup': '#005eb8',
  'scottish-league-cup': '#1a3c6e',
  'scottish-challenge-cup': '#005eb8',
  superliga: '#c8102e',
  allsvenskan: '#006aa7',
  eliteserien: '#ba0c2f',
  'czech-first-league': '#d7141a',
  'cyprus-first-division': '#d4762c',

  // Asia / Oceania / Middle East
  'j1-league': '#e60012',
  'chinese-super-league': '#de2910',
  'saudi-pro-league': '#00a651',
  'saudi-kings-cup': '#006c35',
  'a-league': '#e31837',
}

/** Prefer default (or dark) logo href from ESPN `logos[]`. */
export function pickEspnLogoUrl(
  logos: EspnLogo[] | undefined | null,
  prefer: 'default' | 'dark' = 'default',
): string | undefined {
  if (!logos?.length) return undefined
  const ranked = [...logos].sort((a, b) => {
    const score = (logo: EspnLogo) => {
      const rel = logo.rel || []
      if (prefer === 'dark' && rel.includes('dark')) return 0
      if (prefer === 'default' && rel.includes('default') && !rel.includes('dark')) return 0
      if (rel.includes('default')) return 1
      if (rel.includes('full')) return 2
      return 3
    }
    return score(a) - score(b)
  })
  return ranked.find((logo) => logo.href)?.href
}

export function teamLogoUrl(teamId: string): string {
  return `https://a.espncdn.com/i/teamlogos/soccer/500/${encodeURIComponent(teamId)}.png`
}

export function leagueLogoUrl(espnLeagueNumericId: string | number): string {
  return `https://a.espncdn.com/i/leaguelogos/soccer/500/${espnLeagueNumericId}.png`
}

/** Normalize ESPN hex (`e20520` / `#e20520`) → `#rrggbb`. */
export function normalizeHexColor(raw: string | null | undefined): string | null {
  if (!raw) return null
  let value = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    value = value
      .split('')
      .map((ch) => ch + ch)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return `#${value.toLowerCase()}`
}

function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => {
    const c = Number.parseInt(raw.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) =>
    [0, 2, 4].map((i) => Number.parseInt(hex.replace('#', '').slice(i, i + 2), 16))
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t)
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(mix(ar!, br!))}${to(mix(ag!, bg!))}${to(mix(ab!, bb!))}`
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '')
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = l * 255
    return [v, v, v]
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ]
}

/** Raise lightness (keep hue) so dark crest colors read on pitch green. */
function liftDarkBrand(hex: string, targetL = 0.38): string {
  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  if (l >= targetL) return hex
  // Near-black / grey crests stay neutral; vivid crests keep hue but soft-cap saturation
  // so PL purple stays royal (not neon magenta).
  const sat = s < 0.08 ? 0 : Math.min(0.7, s)
  const [nr, ng, nb] = hslToRgb(h, sat, targetL)
  return rgbToHex(nr, ng, nb)
}

/**
 * Pick a readable accent for dark pitch UI while keeping brand hue.
 * Dark crests (PL purple, Ligue 1 navy) are lightened in HSL — not mixed with lime.
 */
export function safeAccentColor(raw: string | null | undefined, fallback = '#c8f542'): string {
  const hex = normalizeHexColor(raw)
  if (!hex) return fallback
  const lum = relativeLuminance(hex)
  if (lum > 0.72) {
    // Too bright on dark UI — mix toward pitch green
    return mixHex(hex, '#0b3d2e', 0.4)
  }
  const [, , hslL] = rgbToHsl(...hexToRgb(hex))
  // Only lift when the color is actually dark in HSL (saturated reds can have low
  // relative luminance while already reading brightly).
  if (lum < 0.18 && hslL < 0.4) {
    return liftDarkBrand(hex, hslL < 0.14 ? 0.4 : 0.36)
  }
  return hex
}

export function withAlpha(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex) || hex
  const raw = normalized.replace('#', '')
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Always returns a readable brand accent for any competition. */
export function leagueAccentColor(leagueId: LeagueId): string {
  return safeAccentColor(LEAGUE_BRAND_COLORS[leagueId])
}
