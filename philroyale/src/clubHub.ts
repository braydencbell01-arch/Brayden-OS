/**
 * Live club sync over ntfy — one topic per club invite code.
 * Creator + joiners announce themselves; everyone merges the shared roster.
 */

import { ntfyPublish, ntfySubscribe } from './ntfyTransport'

export type ClubRole = 'leader' | 'coLeader' | 'elder' | 'member'

export type ClubHubMember = {
  playerId: string
  name: string
  role: ClubRole
  trophies: number
}

export type ClubMessage =
  | {
      type: 'club_state'
      code: string
      name: string
      description: string
      badge: number
      members: ClubHubMember[]
      fromPlayerId: string
      at: string
    }
  | {
      type: 'club_join'
      code: string
      fromPlayerId: string
      fromName: string
      trophies: number
      at: string
    }
  | {
      type: 'club_leave'
      code: string
      fromPlayerId: string
      fromName: string
      at: string
    }
  | {
      type: 'club_chat'
      code: string
      fromPlayerId: string
      fromName: string
      text: string
      at: string
    }

const TOPIC_PREFIX = 'philroyale-club-v2-'
export const CLUB_HEARTBEAT_MS = 12_000

function topicFor(code: string): string {
  const clean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12)
  return `${TOPIC_PREFIX}${clean || 'lobby'}`
}

export function normalizeClubCode(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

export async function publishClub(
  code: string,
  message: ClubMessage,
): Promise<boolean> {
  const c = normalizeClubCode(code)
  if (c.length < 4) return false
  return ntfyPublish(topicFor(c), { ...message, code: c }, {
    title: 'Phil Royale club',
    tags: 'house',
    ttl: 180,
  })
}

export function subscribeClub(
  code: string,
  onMessage: (msg: ClubMessage) => void,
): () => void {
  const c = normalizeClubCode(code)
  if (c.length < 4 || typeof window === 'undefined') return () => {}

  return ntfySubscribe(
    topicFor(c),
    (raw) => {
      try {
        const data = JSON.parse(raw) as ClubMessage
        if (!data?.type || normalizeClubCode(data.code) !== c) return
        onMessage(data)
      } catch {
        /* ignore */
      }
    },
    { lookbackSec: 120, pollMs: 1500 },
  )
}
