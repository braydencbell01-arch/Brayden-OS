/**
 * Live club sync over ntfy — one topic per club invite code.
 * Creator + joiners announce themselves; everyone merges the shared roster.
 */

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

const TOPIC_PREFIX = 'philroyale-club-v1-'
export const CLUB_HEARTBEAT_MS = 12_000

function topicFor(code: string): string {
  const clean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12)
  return `${TOPIC_PREFIX}${clean || 'lobby'}`
}

function endpoint(code: string): string {
  return `https://ntfy.sh/${topicFor(code)}`
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
  try {
    const res = await fetch(endpoint(c), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Title: 'Phil Royale club',
        Priority: 'default',
        Tags: 'house',
      },
      body: JSON.stringify({ ...message, code: c }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function subscribeClub(
  code: string,
  onMessage: (msg: ClubMessage) => void,
): () => void {
  const c = normalizeClubCode(code)
  if (c.length < 4 || typeof window === 'undefined') return () => {}

  let stopped = false
  let lastSince = Math.floor(Date.now() / 1000) - 60
  const seen = new Set<string>()

  function handleRaw(raw: string, id?: string) {
    if (id && seen.has(id)) return
    if (id) {
      seen.add(id)
      if (seen.size > 250) {
        const first = seen.values().next().value
        if (first) seen.delete(first)
      }
    }
    try {
      const data = JSON.parse(raw) as ClubMessage
      if (!data?.type || normalizeClubCode(data.code) !== c) return
      onMessage(data)
    } catch {
      /* ignore */
    }
  }

  let es: EventSource | null = null
  try {
    es = new EventSource(`${endpoint(c)}/sse`)
    es.onmessage = (ev) => {
      try {
        const envelope = JSON.parse(ev.data) as {
          id?: string
          message?: string
          time?: number
        }
        if (envelope.time) lastSince = Math.max(lastSince, envelope.time)
        if (envelope.message) handleRaw(envelope.message, envelope.id)
      } catch {
        /* ignore */
      }
    }
  } catch {
    es = null
  }

  const poll = window.setInterval(() => {
    if (stopped) return
    void (async () => {
      try {
        const res = await fetch(`${endpoint(c)}/json?poll=1&since=${lastSince}`)
        if (!res.ok) return
        const text = (await res.text()).trim()
        if (!text) return
        for (const line of text.split('\n')) {
          if (!line.trim()) continue
          try {
            const envelope = JSON.parse(line) as {
              id?: string
              message?: string
              time?: number
              event?: string
            }
            if (envelope.event && envelope.event !== 'message') continue
            if (envelope.time) lastSince = Math.max(lastSince, envelope.time + 1)
            if (envelope.message) handleRaw(envelope.message, envelope.id)
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    })()
  }, 2500)

  return () => {
    stopped = true
    window.clearInterval(poll)
    es?.close()
  }
}
