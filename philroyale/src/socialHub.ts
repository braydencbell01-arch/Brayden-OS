/**
 * Cross-device friend / invite sync via public ntfy topics (no server of ours).
 *
 * Critical path: one shared LOBBY topic both phones always listen to.
 * Personal + pair topics are backups only — mobile SSE limits made them flaky.
 */

import { ntfyPublish, ntfySubscribe } from './ntfyTransport'

export type GameMode = 'classic' | 'touchdown'

export type SocialMessage =
  | {
      type: 'friend_hello'
      fromPlayerId: string
      fromName: string
      at: string
      toPlayerId?: string
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
      toPlayerId?: string
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
      toPlayerId?: string
    }
  | {
      type: 'battle_decline'
      challengeId: string
      fromPlayerId: string
      fromName: string
      at: string
      toPlayerId?: string
    }
  | {
      type: 'club_invite'
      fromPlayerId: string
      fromName: string
      clubCode: string
      clubName: string
      at: string
      toPlayerId?: string
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
export const PRESENCE_ONLINE_MS = 90_000
export const PRESENCE_HEARTBEAT_MS = 5_000
/** Shared lobby so friend codes / invites work while both apps are open. */
export const DIRECTORY_HEARTBEAT_MS = 4_000
/** One bus both phones always share — invites + friend adds + presence. */
const LOBBY_TOPIC = 'philroyale-lobby-v6'
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
    directoryCache.set(c, {
      ...prev,
      seenAt: Date.now(),
      trophies: extra?.trophies ?? prev.trophies,
      inBattle: extra?.inBattle ?? prev.inBattle,
    })
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
    LOBBY_TOPIC,
    {
      type: 'dir_ping',
      fromPlayerId: c,
      fromName: name.trim() || `Player ${c}`,
      at: new Date().toISOString(),
      trophies: extra?.trophies,
      inBattle: extra?.inBattle,
    } satisfies SocialMessage,
    { title: 'Phil Royale lobby', tags: 'bust_in_silhouette', ttl: 120 },
  )
}

/** Publish to the shared lobby both phones always read (invites / friend adds). */
export async function publishLobby(message: SocialMessage): Promise<boolean> {
  const high =
    message.type === 'battle_invite' ||
    message.type === 'battle_accept' ||
    message.type === 'friend_request'
  return ntfyPublish(LOBBY_TOPIC, message, {
    title: 'Phil Royale lobby',
    priority: high ? 'high' : 'default',
    tags: 'video_game',
    ttl: high ? 300 : 120,
  })
}

function handleLobbyRaw(raw: string): void {
  try {
    const data = JSON.parse(raw) as SocialMessage
    if (!data || typeof data !== 'object' || !('type' in data)) return
    if (data.type === 'dir_ping') {
      rememberDirectoryPing(data.fromPlayerId, data.fromName, Date.parse(data.at) || Date.now(), {
        trophies: data.trophies,
        inBattle: data.inBattle,
      })
    }
    if (
      data.type === 'presence' ||
      data.type === 'friend_hello' ||
      data.type === 'friend_request'
    ) {
      rememberDirectoryPing(
        data.fromPlayerId,
        data.fromName,
        Date.parse(data.at) || Date.now(),
        'trophies' in data
          ? { trophies: data.trophies, inBattle: 'inBattle' in data ? data.inBattle : undefined }
          : undefined,
      )
    }
    notifySocialWaiters(data)
    for (const fn of lobbyListeners) {
      try {
        fn(data)
      } catch {
        /* ignore listener errors */
      }
    }
  } catch {
    /* ignore */
  }
}

/** Pull recent lobby messages into the local cache / listeners. */
export async function pollDirectory(lookbackSec = 300): Promise<void> {
  try {
    const since = Math.floor(Date.now() / 1000) - lookbackSec
    const bases = ['https://ntfy.envs.net', 'https://ntfy.sh']
    await Promise.all(
      bases.map(async (base) => {
        try {
          const res = await fetch(`${base}/${LOBBY_TOPIC}/json?poll=1&since=${since}`)
          if (!res.ok) return
          const text = (await res.text()).trim()
          if (!text) return
          for (const line of text.split('\n')) {
            if (!line.trim()) continue
            try {
              const envelope = JSON.parse(line) as { message?: string; event?: string }
              if (envelope.event && envelope.event !== 'message') continue
              if (envelope.message) handleLobbyRaw(envelope.message)
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* ignore */
        }
      }),
    )
  } catch {
    /* ignore */
  }
}

/**
 * Actively resolve a 6-digit friend code → display name.
 * Polls the lobby and waits for a hello/presence reply from that player.
 */
export async function resolvePlayerName(
  code: string,
  timeoutMs = 14_000,
): Promise<string | null> {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  if (c.length !== 6) return null

  await pollDirectory(120)
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
    await pollDirectory(90)
    name = lookupDirectory(c)
    if (name) return name
    await new Promise((r) => window.setTimeout(r, 350))
  }

  await replyPromise
  return fromReply || lookupDirectory(c)
}

type LobbyListener = (msg: SocialMessage) => void
const lobbyListeners: LobbyListener[] = []
let lobbyUnsub: (() => void) | null = null
let lobbyRefCount = 0

function ensureLobbySubscribed(): void {
  if (lobbyUnsub) return
  void pollDirectory()
  lobbyUnsub = ntfySubscribe(LOBBY_TOPIC, (raw) => handleLobbyRaw(raw), {
    lookbackSec: 300,
    pollMs: 800,
    sse: true,
  })
}

/** Stay subscribed to the shared lobby (presence + invites + friend adds). */
export function subscribeDirectory(onMessage?: LobbyListener): () => void {
  if (typeof window === 'undefined') return () => {}
  ensureLobbySubscribed()
  lobbyRefCount++
  if (onMessage) lobbyListeners.push(onMessage)
  return () => {
    if (onMessage) {
      const i = lobbyListeners.indexOf(onMessage)
      if (i >= 0) lobbyListeners.splice(i, 1)
    }
    lobbyRefCount = Math.max(0, lobbyRefCount - 1)
    if (lobbyRefCount === 0 && lobbyUnsub) {
      lobbyUnsub()
      lobbyUnsub = null
    }
  }
}

/**
 * Publish to a player's personal topic AND the shared lobby.
 * Lobby delivery is what makes two phones actually connect.
 */
export async function publishSocial(
  toPlayerId: string,
  message: SocialMessage,
): Promise<boolean> {
  if (!toPlayerId.trim()) return false
  const high =
    message.type === 'battle_invite' ||
    message.type === 'battle_accept' ||
    message.type === 'friend_request'
  const withTo =
    'toPlayerId' in message && message.toPlayerId
      ? message
      : message.type === 'friend_hello' ||
          message.type === 'battle_accept' ||
          message.type === 'battle_decline' ||
          message.type === 'club_invite' ||
          message.type === 'presence'
        ? { ...message, toPlayerId }
        : message

  const [personal, lobby] = await Promise.all([
    ntfyPublish(topicFor(toPlayerId), withTo, {
      title: 'Phil Royale',
      priority: high ? 'high' : 'default',
      tags: 'video_game',
      ttl: high ? 300 : 120,
    }),
    // Always mirror critical + presence onto the lobby both phones read.
    high ||
    message.type === 'friend_hello' ||
    message.type === 'battle_decline' ||
    message.type === 'presence'
      ? publishLobby(withTo as SocialMessage)
      : Promise.resolve(false),
  ])
  return personal || lobby
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

/** Subscribe to inbound personal-topic messages (poll + one SSE). */
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
    { lookbackSec: 300, pollMs: 900, sse: true },
  )
}

/** Stable shared mailbox for two friend codes — backup channel. */
export function pairTopicFor(codeA: string, codeB: string): string {
  const a = String(codeA || '').replace(/\D/g, '').slice(0, 6)
  const b = String(codeB || '').replace(/\D/g, '').slice(0, 6)
  const [x, y] = [a, b].sort()
  return `philroyale-pair-v5-${x}-${y}`
}

export async function publishPair(
  codeA: string,
  codeB: string,
  message: SocialMessage,
): Promise<boolean> {
  const a = String(codeA || '').replace(/\D/g, '').slice(0, 6)
  const b = String(codeB || '').replace(/\D/g, '').slice(0, 6)
  if (a.length !== 6 || b.length !== 6) return false
  // Lobby is primary; pair is a small backup (poll-only on subscribe).
  const high =
    message.type === 'battle_invite' ||
    message.type === 'battle_accept' ||
    message.type === 'friend_request'
  return ntfyPublish(pairTopicFor(a, b), message, {
    title: 'Phil Royale friends',
    priority: high ? 'high' : 'default',
    tags: 'busts_in_silhouette',
    ttl: 300,
  })
}

export function subscribePair(
  codeA: string,
  codeB: string,
  onMessage: (msg: SocialMessage) => void,
): () => void {
  const a = String(codeA || '').replace(/\D/g, '').slice(0, 6)
  const b = String(codeB || '').replace(/\D/g, '').slice(0, 6)
  if (a.length !== 6 || b.length !== 6 || typeof window === 'undefined') return () => {}

  // Poll only — no SSE (saves mobile connection slots for lobby + inbox).
  return ntfySubscribe(
    pairTopicFor(a, b),
    (raw) => {
      const msg = parsePayload(raw)
      if (!msg) return
      notifySocialWaiters(msg)
      onMessage(msg)
    },
    { lookbackSec: 300, pollMs: 1200, sse: false },
  )
}

/** True if this lobby/social message is addressed to me (or is a broadcast ping). */
export function socialMessageForMe(msg: SocialMessage, myId: string): boolean {
  if (!myId) return false
  if (msg.type === 'dir_ping') return false
  if ('fromPlayerId' in msg && msg.fromPlayerId === myId) return false
  if ('toPlayerId' in msg && msg.toPlayerId) return msg.toPlayerId === myId
  // Untargeted hello/presence from someone else — treat as for me only if we're listening personally.
  return msg.type === 'friend_hello' || msg.type === 'presence'
}
