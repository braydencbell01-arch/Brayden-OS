/**
 * Cross-device friend / invite sync via public ntfy topics (no server of ours).
 * Each player has a 6-digit friend code; we publish JSON to their topic.
 */

import { ntfyPublish, ntfySubscribe } from './ntfyTransport'

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
  | {
      /** Broadcast so friends can find a friend code while both apps are open. */
      type: 'dir_ping'
      fromPlayerId: string
      fromName: string
      at: string
      trophies?: number
      inBattle?: boolean
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
export const PRESENCE_ONLINE_MS = 60_000
export const PRESENCE_HEARTBEAT_MS = 8_000
/** Shared lobby so friend codes can be discovered while both apps are open. */
export const DIRECTORY_HEARTBEAT_MS = 5_000
const DIRECTORY_TOPIC = 'philroyale-dir-v5'
const DIRECTORY_FRESH_MS = 90_000
const TOPIC_PREFIX = 'philroyale-v5-'

function topicFor(playerId: string): string {
  return `${TOPIC_PREFIX}${playerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)}`
}

type DirEntry = {
  name: string
  /** Sender's claimed timestamp (for ordering). */
  at: number
  /** When we locally received/cached this ping — used for online freshness. */
  seenAt: number
  trophies?: number
  inBattle?: boolean
}
const directoryCache = new Map<string, DirEntry>()

function isPlaceholderName(name: string): boolean {
  const n = name.trim()
  if (!n) return true
  if (/^player(\s|#|-)?\d*$/i.test(n)) return true
  if (/^player\s+\d{3,6}$/i.test(n)) return true
  return false
}

export function rememberDirectoryPing(
  code: string,
  name: string,
  atMs = Date.now(),
  extra?: { trophies?: number; inBattle?: boolean },
): void {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  if (c.length !== 6) return
  const cleaned = name.trim()
  if (!cleaned || isPlaceholderName(cleaned)) {
    // Don't overwrite a real name with a placeholder ping.
    const prev = directoryCache.get(c)
    if (prev && !isPlaceholderName(prev.name)) {
      directoryCache.set(c, {
        ...prev,
        seenAt: Date.now(),
        at: Math.max(prev.at, atMs),
        trophies: extra?.trophies ?? prev.trophies,
        inBattle: extra?.inBattle ?? prev.inBattle,
      })
      return
    }
  }
  const prev = directoryCache.get(c)
  if (prev && prev.at > atMs && !isPlaceholderName(prev.name)) {
    directoryCache.set(c, { ...prev, seenAt: Date.now() })
    return
  }
  directoryCache.set(c, {
    name: cleaned || `Player ${c}`,
    at: atMs,
    seenAt: Date.now(),
    trophies: extra?.trophies ?? prev?.trophies,
    inBattle: extra?.inBattle ?? prev?.inBattle,
  })
}

export function lookupDirectory(code: string): string | null {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  const e = directoryCache.get(c)
  if (!e) return null
  // Freshness is based on when WE saw them — not their possibly-stale `at` clock.
  if (Date.now() - e.seenAt > DIRECTORY_FRESH_MS) return null
  if (isPlaceholderName(e.name)) return null
  return e.name
}

/** Presence snapshot from the public directory (works before you're friends). */
export function lookupDirectoryPresence(code: string): FriendPresenceInfo | null {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  const e = directoryCache.get(c)
  if (!e) return null
  if (Date.now() - e.seenAt > DIRECTORY_FRESH_MS) return null
  return {
    at: e.seenAt,
    inBattle: !!e.inBattle,
    trophies: e.trophies,
  }
}

export async function publishDirectory(
  code: string,
  name: string,
  extra?: { trophies?: number; inBattle?: boolean },
): Promise<boolean> {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  if (c.length !== 6) return false
  rememberDirectoryPing(c, name, Date.now(), extra)
  return ntfyPublish(
    DIRECTORY_TOPIC,
    {
      type: 'dir_ping',
      fromPlayerId: c,
      fromName: name.trim() || `Player ${c}`,
      at: new Date().toISOString(),
      trophies: extra?.trophies,
      inBattle: extra?.inBattle,
    } satisfies SocialMessage,
    { title: 'Phil Royale directory', tags: 'bust_in_silhouette', ttl: 90 },
  )
}

function handleDirectoryRaw(raw: string): void {
  try {
    const data = JSON.parse(raw) as SocialMessage
    if (!data || data.type !== 'dir_ping') return
    rememberDirectoryPing(data.fromPlayerId, data.fromName, Date.parse(data.at) || Date.now(), {
      trophies: data.trophies,
      inBattle: data.inBattle,
    })
    notifySocialWaiters(data)
  } catch {
    /* ignore */
  }
}

/** Pull recent directory pings into the local cache. */
export async function pollDirectory(lookbackSec = 300): Promise<void> {
  try {
    const since = Math.floor(Date.now() / 1000) - lookbackSec
    const res = await fetch(
      `https://ntfy.envs.net/${DIRECTORY_TOPIC}/json?poll=1&since=${since}`,
    )
    if (!res.ok) return
    const text = (await res.text()).trim()
    if (!text) return
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      try {
        const envelope = JSON.parse(line) as { message?: string; event?: string }
        if (envelope.event && envelope.event !== 'message') continue
        if (envelope.message) handleDirectoryRaw(envelope.message)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Actively resolve a 6-digit friend code → display name.
 * Polls the directory and waits for a hello/presence reply from that player.
 */
export async function resolvePlayerName(
  code: string,
  timeoutMs = 14_000,
): Promise<string | null> {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  if (c.length !== 6) return null

  await pollDirectory(300)
  let name = lookupDirectory(c)
  if (name) return name

  let fromReply: string | null = null
  const replyPromise = waitForSocial(
    (msg) =>
      (msg.type === 'dir_ping' ||
        msg.type === 'friend_hello' ||
        msg.type === 'friend_request' ||
        msg.type === 'presence') &&
      msg.fromPlayerId === c &&
      !!msg.fromName &&
      !isPlaceholderName(msg.fromName),
    timeoutMs,
  ).then((reply) => {
    if (reply && 'fromName' in reply && reply.fromName && !isPlaceholderName(reply.fromName)) {
      fromReply = reply.fromName.trim()
      rememberDirectoryPing(c, fromReply, Date.now())
    }
    return fromReply
  })

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (fromReply) return fromReply
    await pollDirectory(180)
    name = lookupDirectory(c)
    if (name) return name
    await new Promise((r) => window.setTimeout(r, 400))
  }

  await replyPromise
  return fromReply || lookupDirectory(c)
}

/** Stay subscribed to the friend-code directory while the app is open. */
export function subscribeDirectory(): () => void {
  if (typeof window === 'undefined') return () => {}
  void pollDirectory()
  return ntfySubscribe(DIRECTORY_TOPIC, (raw) => handleDirectoryRaw(raw), {
    lookbackSec: 300,
    pollMs: 1500,
  })
}

export async function publishSocial(
  toPlayerId: string,
  message: SocialMessage,
): Promise<boolean> {
  if (!toPlayerId.trim()) return false
  const high =
    message.type === 'battle_invite' ||
    message.type === 'battle_accept' ||
    message.type === 'friend_request'
  return ntfyPublish(topicFor(toPlayerId), message, {
    title: 'Phil Royale',
    priority: high ? 'high' : 'default',
    tags: 'video_game',
    ttl: 180,
  })
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

/** Subscribe to inbound social messages (SSE + poll fallback with cache). */
export function subscribeSocial(
  playerId: string,
  onMessage: (msg: SocialMessage) => void,
): () => void {
  if (!playerId.trim() || typeof window === 'undefined') return () => {}

  return ntfySubscribe(
    topicFor(playerId),
    (raw) => {
      const msg = parsePayload(raw)
      if (!msg) return
      notifySocialWaiters(msg)
      onMessage(msg)
    },
    { lookbackSec: 180, pollMs: 800 },
  )
}
