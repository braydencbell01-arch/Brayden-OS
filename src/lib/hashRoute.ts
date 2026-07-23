import type { LeagueId } from './leagues'
import type { FavoriteTeam } from './favorites'
import type { PlayerNavRef } from '../components/PlayerProfileScreen'

export type HashRoute =
  | { kind: 'tab'; tab: 'home' | 'stats' | 'leagues' | 'fantasy' | 'favorites' }
  | { kind: 'league'; leagueId: LeagueId }
  | { kind: 'team'; team: FavoriteTeam }
  | { kind: 'player'; player: PlayerNavRef }
  | { kind: 'compare'; a?: string; b?: string }
  | { kind: 'settings' }
  | { kind: 'fantasy-join'; blobId: string }
  | null

function qs(params: Record<string, string | undefined>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }
  return parts.join('&')
}

export function buildHash(route: Exclude<HashRoute, null>): string {
  if (route.kind === 'tab') return `#tab=${route.tab}`
  if (route.kind === 'league') return `#league=${route.leagueId}`
  if (route.kind === 'team') {
    return `#team=${qs({
      id: route.team.id,
      league: route.team.leagueId,
      name: route.team.name,
      short: route.team.shortName,
      kind: route.team.kind,
    })}`
  }
  if (route.kind === 'player') {
    return `#player=${qs({
      id: route.player.id,
      league: route.player.leagueId,
      name: route.player.name,
      short: route.player.shortName,
      teamId: route.player.teamId,
      teamName: route.player.teamName,
      position: route.player.position,
    })}`
  }
  if (route.kind === 'compare') return `#compare=${qs({ a: route.a, b: route.b })}`
  if (route.kind === 'settings') return '#settings'
  return `#fantasy-join=${route.blobId}`
}

function parseQs(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of raw.split('&')) {
    if (!part) continue
    const [k, ...rest] = part.split('=')
    if (!k) continue
    out[decodeURIComponent(k)] = decodeURIComponent(rest.join('=') || '')
  }
  return out
}

export function parseHash(hash: string): HashRoute {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null

  if (raw.startsWith('fantasy-join=')) {
    return { kind: 'fantasy-join', blobId: decodeURIComponent(raw.slice('fantasy-join='.length)) }
  }
  if (raw === 'settings') return { kind: 'settings' }
  if (raw.startsWith('tab=')) {
    const tab = decodeURIComponent(raw.slice(4))
    if (
      tab === 'home' ||
      tab === 'stats' ||
      tab === 'leagues' ||
      tab === 'fantasy' ||
      tab === 'favorites'
    ) {
      return { kind: 'tab', tab }
    }
  }
  if (raw.startsWith('league=')) {
    return { kind: 'league', leagueId: decodeURIComponent(raw.slice(7)) as LeagueId }
  }
  if (raw.startsWith('team=')) {
    const p = parseQs(raw.slice(5))
    if (!p.id || !p.league || !p.name) return null
    return {
      kind: 'team',
      team: {
        id: p.id,
        leagueId: p.league as LeagueId,
        name: p.name,
        shortName: p.short || p.name,
        kind: p.kind === 'national' ? 'national' : 'club',
      },
    }
  }
  if (raw.startsWith('player=')) {
    const p = parseQs(raw.slice(7))
    if (!p.id || !p.league) return null
    return {
      kind: 'player',
      player: {
        id: p.id,
        leagueId: p.league as LeagueId,
        name: p.name,
        shortName: p.short || p.name,
        teamId: p.teamId,
        teamName: p.teamName,
        position: p.position,
      },
    }
  }
  if (raw === 'compare' || raw.startsWith('compare=')) {
    const p = parseQs(raw.includes('=') ? raw.slice(raw.indexOf('=') + 1) : '')
    return { kind: 'compare', a: p.a, b: p.b }
  }
  return null
}

export function shareUrlForHash(hash: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`
  const clean = hash.startsWith('#') ? hash : `#${hash}`
  return `${base.replace(/\/?$/, '/')}${clean}`
}
