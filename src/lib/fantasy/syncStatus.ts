import type { FantasyLeague } from './types'

export type FantasySyncKind = 'demo' | 'synced' | 'device'

/** How this league is stored / shared. */
export function fantasySyncKind(league: FantasyLeague): FantasySyncKind {
  if (league.inviteCode === 'DEMO24' || league.id.startsWith('demo_')) return 'demo'
  if (league.syncBlobId) return 'synced'
  return 'device'
}

export function fantasySyncLabel(kind: FantasySyncKind): string {
  switch (kind) {
    case 'demo':
      return 'Demo'
    case 'synced':
      return 'Cloud synced'
    case 'device':
      return 'This device only'
  }
}

export function fantasySyncBanner(kind: FantasySyncKind): string {
  switch (kind) {
    case 'demo':
      return 'Spectator demo — not shared across devices. You are not a manager here.'
    case 'synced':
      return 'Cloud synced — share the invite link so friends can join from other phones.'
    case 'device':
      return 'Saved on this device only — short invite codes will not work on other phones until cloud sync is available.'
  }
}

export function fantasySyncBadgeClass(kind: FantasySyncKind): string {
  switch (kind) {
    case 'demo':
      return 'border-white/20 bg-white/10 text-mist'
    case 'synced':
      return 'border-lime/40 bg-lime/15 text-lime'
    case 'device':
      return 'border-star/35 bg-star/10 text-star'
  }
}
