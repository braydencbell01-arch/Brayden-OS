/**
 * Cross-device friend / invite sync via public ntfy topics (no server of ours).
 * Each player has a long random playerId; we publish JSON to their topic.
 */

export type GameMode = 'classic' | 'touchdown'

export type SocialMessage =
  | {
      type: 'friend_hello'
      fromPlayerId: string
      fromName: string
      at: string
    }
  | {
      type: 'friend_request'
      fromPlayerId: string
      fromName: string
      toPlayerId: string
      at: string
    }
  | {
      type: 'presence'
      fromPlayerId: string
      fromName: string
      at: string
      /** True while this player is in an active match (bot or friend). */
      inBattle?: boolean
      /** Battle room id friends can subscribe to for spectate. */
      challengeId?: string
      mode?: GameMode
      opponentName?: string
      /** Friend's camera in that room — spectator mirrors this view. */
      battleRole?: 'host' | 'guest'
      trophies?: number
    }
  | {
      type: 'battle_invite'
      challengeId: string
      fromPlayerId: string
      fromName: string
      toPlayerId: string
      toName: string
      mode: GameMode
      at: string
    }
  | {
      type: 'battle_accept'
      challengeId: string
      fromPlayerId: string
      fromName: string
      mode: GameMode
      at: string
    }
  | {
      type: 'battle_decline'
      challengeId: string
      fromPlayerId: string
      fromName: string
      at: string
    }
  | {
      type: 'club_invite'
      fromPlayerId: string
      fromName: string
      clubCode: string
      clubName: string
      at: string
    }

/** Latest presence snapshot for a friend (from heartbeats). */
export type FriendPresenceInfo = {
  at: number
  inBattle?: boolean
  challengeId?: string
  mode?: GameMode
  opponentName?: string
  battleRole?: 'host' | 'guest'
  trophies?: number
}

/** How recently a presence ping counts as "online". */
export const PRESENCE_ONLINE_MS = 45_000
export const PRESENCE_HEARTBEAT_MS = 15_000

const TOPIC_PREFIX = 'philroyale-v2-'

function topicFor(playerId: string): string {
  return `${TOPIC_PREFIX}${playerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)}`
}

function endpoint(playerId: string): string {
  return `https://ntfy.sh/${topicFor(playerId)}`
}

export async function publishSocial(
  toPlayerId: string,
  message: SocialMessage,
): Promise<boolean> {
  if (!toPlayerId.trim()) return false
  try {
    const res = await fetch(endpoint(toPlayerId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Title: 'Phil Royale',
        Priority: message.type.includes('battle') ? 'high' : 'default',
        Tags: 'video_game',
      },
      body: JSON.stringify(message),
    })
    return res.ok
  } catch {
    return false
  }
}

function parsePayload(raw: string): SocialMessage | null {
  try {
    const data = JSON.parse(raw) as SocialMessage
    if (!data || typeof data !== 'object' || !('type' in data)) return null
    return data
  } catch {
    return null
  }
}

type SocialWaiter = {
  filter: (msg: SocialMessage) => boolean
  resolve: (msg: SocialMessage | null) => void
  timer: number
}

const socialWaiters: SocialWaiter[] = []

/** Used by App when a social message arrives — also resolves waitForSocial. */
export function notifySocialWaiters(msg: SocialMessage): void {
  for (let i = socialWaiters.length - 1; i >= 0; i--) {
    const w = socialWaiters[i]!
    if (!w.filter(msg)) continue
    window.clearTimeout(w.timer)
    socialWaiters.splice(i, 1)
    w.resolve(msg)
  }
}

/** Wait until a matching inbound social message (or timeout → null). */
export function waitForSocial(
  filter: (msg: SocialMessage) => boolean,
  timeoutMs = 15_000,
): Promise<SocialMessage | null> {
  return new Promise((resolve) => {
    const waiter: SocialWaiter = {
      filter,
      resolve,
      timer: window.setTimeout(() => {
        const idx = socialWaiters.indexOf(waiter)
        if (idx >= 0) socialWaiters.splice(idx, 1)
        resolve(null)
      }, timeoutMs),
    }
    socialWaiters.push(waiter)
  })
}

/** Subscribe to inbound social messages (SSE + poll fallback). */
export function subscribeSocial(
  playerId: string,
  onMessage: (msg: SocialMessage) => void,
): () => void {
  if (!playerId.trim() || typeof window === 'undefined') return () => {}

  let stopped = false
  let lastSince = Math.floor(Date.now() / 1000) - 30
  const seen = new Set<string>()

  function handleRaw(raw: string, id?: string) {
    if (id && seen.has(id)) return
    if (id) {
      seen.add(id)
      if (seen.size > 200) {
        const first = seen.values().next().value
        if (first) seen.delete(first)
      }
    }
    const msg = parsePayload(raw)
    if (msg) {
      notifySocialWaiters(msg)
      onMessage(msg)
    }
  }

  let es: EventSource | null = null
  try {
    es = new EventSource(`${endpoint(playerId)}/sse`)
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
        const url = `${endpoint(playerId)}/json?poll=1&since=${lastSince}`
        const res = await fetch(url)
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
            /* ignore line */
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
