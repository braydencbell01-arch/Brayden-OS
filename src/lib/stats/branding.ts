/** Branding helpers — ESPN logos + safe team / league color accents. */

import type { LeagueId } from '../leagues'

export type EspnLogo = {
  href?: string
  rel?: string[]
}

/**
 * Soft brand accents for major competitions (used on league profiles / lists).
 * Authentic kit / identity hues — kept readable on dark pitch UI via safeAccentColor.
 */
const LEAGUE_BRAND_COLORS: Partial<Record<LeagueId, string>> = {
  'premier-league': '#3d195b',
  'la-liga': '#ee8707',
  'serie-a': '#024494',
  bundesliga: '#d20515',
  'ligue-1': '#091c3e',
  'uefa-champions': '#1a2b6d',
  'uefa-europa': '#f5a623',
  'uefa-conference': '#1ba27a',
  mls: '#c8102e',
  brasileirao: '#009b3a',
  eredivisie: '#ee7a00',
  'primeira-liga': '#006341',
  'liga-mx': '#006847',
  'scottish-premiership': '#1a3c6e',
  'saudi-pro-league': '#00a651',
  'a-league': '#e31837',
  'fifa-world': '#326295',
  'uefa-euro': '#003399',
  'conmebol-libertadores': '#f5c518',
  'uefa-nations': '#0b1f4a',
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

/**
 * Pick a readable accent for dark pitch UI.
 * Very light colors get dimmed; near-black colors get a slight lift.
 */
export function safeAccentColor(raw: string | null | undefined, fallback = '#c8f542'): string {
  const hex = normalizeHexColor(raw)
  if (!hex) return fallback
  const lum = relativeLuminance(hex)
  if (lum > 0.72) {
    // Too bright on dark UI — mix toward pitch green
    return mixHex(hex, '#0b3d2e', 0.45)
  }
  if (lum < 0.08) {
    return mixHex(hex, '#c8f542', 0.35)
  }
  return hex
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

export function withAlpha(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex) || hex
  const raw = normalized.replace('#', '')
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function leagueAccentColor(leagueId: LeagueId): string | null {
  const raw = LEAGUE_BRAND_COLORS[leagueId]
  return raw ? safeAccentColor(raw) : null
}
