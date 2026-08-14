/**
 * Phil Royale Cloudflare multiplayer client (Durable Object lobby + battle rooms).
 * Preferred over ntfy when an endpoint is configured / reachable.
 */

export type MpPresence = {
  name: string
  at: number
  trophies?: number
  inBattle?: boolean
  challengeId?: string
}

type MsgHandler = (msg: unknown) => void
type PresenceHandler = (players: Record<string, MpPresence>) => void

const ENDPOINT_FILE = `${import.meta.env.BASE_URL}mp-endpoint.json`

let cachedBase: string | null | undefined
let ws: WebSocket | null = null
let wsCode = ''
let wsName = ''
let reconnectTimer = 0
let pingTimer = 0
let wantOpen = false
const msgHandlers = new Set<MsgHandler>()
const presenceHandlers = new Set<PresenceHandler>()
let lastPresence: Record<string, MpPresence> = {}
/** Last known ping per code even after they drop out of the live presence snapshot. */
const stickyLastSeen: Record<string, number> = {}
let trophies = 0
let inBattle = false
let challengeId: string | undefined

async function resolveBase(): Promise<string | null> {
  if (cachedBase !== undefined) return cachedBase
  const fromEnv = (import.meta.env.VITE_PHILROYALE_MP_URL as string | undefined)?.trim()
  if (fromEnv) {
    cachedBase = fromEnv.replace(/\/+$/, '')
    return cachedBase
  }
  try {
    const res = await fetch(ENDPOINT_FILE, { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { url?: string }
      const url = (data.url || '').trim().replace(/\/+$/, '')
      if (url) {
        cachedBase = url
        return cachedBase
      }
    }
  } catch {
    /* ignore */
  }
  cachedBase = null
  return null
}

export function mpConfigured(): boolean {
  return cachedBase !== null && cachedBase !== undefined
    ? !!cachedBase
    : !!(import.meta.env.VITE_PHILROYALE_MP_URL as string | undefined)?.trim()
}

export async function mpReady(): Promise<boolean> {
  const base = await resolveBase()
  return !!base
}

function toWsUrl(httpBase: string, path: string): string {
  const u = new URL(path, httpBase.endsWith('/') ? httpBase : `${httpBase}/`)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  return u.toString()
}

function emitMsg(msg: unknown) {
  for (const h of msgHandlers) {
    try {
      h(msg)
    } catch {
      /* ignore */
    }
  }
}

function emitPresence(players: Record<string, MpPresence>) {
  for (const [code, p] of Object.entries(lastPresence)) {
    if (p?.at) stickyLastSeen[code] = Math.max(stickyLastSeen[code] ?? 0, p.at)
  }
  for (const [code, p] of Object.entries(players)) {
    if (p?.at) stickyLastSeen[code] = Math.max(stickyLastSeen[code] ?? 0, p.at)
  }
  lastPresence = players
  for (const h of presenceHandlers) {
    try {
      h(players)
    } catch {
      /* ignore */
    }
  }
}

function scheduleReconnect() {
  if (!wantOpen || reconnectTimer) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = 0
    void openSocket()
  }, 1200)
}

async function openSocket() {
  const base = await resolveBase()
  if (!base || !wantOpen || !wsCode) return
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }
  try {
    const url = toWsUrl(
      base,
      `/ws?code=${encodeURIComponent(wsCode)}&name=${encodeURIComponent(wsName || 'Player')}`,
    )
    const socket = new WebSocket(url)
    ws = socket
    socket.onopen = () => {
      sendPing()
      if (pingTimer) window.clearInterval(pingTimer)
      pingTimer = window.setInterval(sendPing, 4000)
    }
    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as {
          op?: string
          msg?: unknown
          players?: Record<string, MpPresence>
        }
        if (data.op === 'msg' && data.msg != null) emitMsg(data.msg)
        else if (data.op === 'presence' && data.players) emitPresence(data.players)
      } catch {
        /* ignore */
      }
    }
    socket.onclose = () => {
      if (ws === socket) ws = null
      if (pingTimer) {
        window.clearInterval(pingTimer)
        pingTimer = 0
      }
      scheduleReconnect()
    }
    socket.onerror = () => {
      try {
        socket.close()
      } catch {
        /* ignore */
      }
    }
  } catch {
    scheduleReconnect()
  }
}

function sendPing() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(
      JSON.stringify({
        op: 'ping',
        name: wsName,
        trophies,
        inBattle,
        challengeId,
      }),
    )
  } catch {
    /* ignore */
  }
}

/** Keep a lobby WebSocket open for this player (presence + inbox). */
export function mpConnect(code: string, name: string): () => void {
  if (typeof window === 'undefined') return () => {}
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  if (c.length !== 6) return () => {}
  wsCode = c
  wsName = (name || 'Player').trim().slice(0, 32) || 'Player'
  wantOpen = true
  void openSocket()
  return () => {
    wantOpen = false
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = 0
    }
    if (pingTimer) {
      window.clearInterval(pingTimer)
      pingTimer = 0
    }
    try {
      ws?.close()
    } catch {
      /* ignore */
    }
    ws = null
  }
}

export function mpSetStatus(opts: {
  name?: string
  trophies?: number
  inBattle?: boolean
  challengeId?: string
}) {
  if (opts.name) wsName = opts.name.trim().slice(0, 32) || wsName
  if (opts.trophies != null) trophies = opts.trophies
  if (opts.inBattle != null) inBattle = opts.inBattle
  if ('challengeId' in opts) challengeId = opts.challengeId
  sendPing()
}

export function mpOnMessage(handler: MsgHandler): () => void {
  msgHandlers.add(handler)
  return () => {
    msgHandlers.delete(handler)
  }
}

export function mpOnPresence(handler: PresenceHandler): () => void {
  presenceHandlers.add(handler)
  if (Object.keys(lastPresence).length) handler(lastPresence)
  return () => {
    presenceHandlers.delete(handler)
  }
}

export function mpLastPresence(): Record<string, MpPresence> {
  return lastPresence
}

/** Last known presence time for a code (includes players who since went offline). */
export function mpPeekLastSeen(code: string): number | null {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  if (!c) return null
  const live = lastPresence[c]?.at ?? 0
  const sticky = stickyLastSeen[c] ?? 0
  const best = Math.max(live, sticky)
  return best > 0 ? best : null
}

/** Publish a directed social message (and optional lobby fanout). */
export async function mpPublish(opts: {
  to?: string
  lobby?: boolean
  msg: unknown
}): Promise<boolean> {
  const base = await resolveBase()
  if (!base) return false

  // Prefer live socket for lowest latency.
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      if (opts.to) {
        ws.send(JSON.stringify({ op: 'to', to: opts.to, lobby: !!opts.lobby, msg: opts.msg }))
      } else {
        ws.send(JSON.stringify({ op: 'lobby', msg: opts.msg }))
      }
      // Still POST so offline recipients can poll.
    } catch {
      /* fall through to HTTP */
    }
  }

  try {
    const res = await fetch(`${base}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: opts.to,
        lobby: opts.lobby ?? !opts.to,
        msg: opts.msg,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function mpFetchPresence(): Promise<Record<string, MpPresence>> {
  const base = await resolveBase()
  if (!base) return {}
  try {
    const res = await fetch(`${base}/presence`, { cache: 'no-store' })
    if (!res.ok) return {}
    const data = (await res.json()) as { players?: Record<string, MpPresence> }
    if (data.players) emitPresence(data.players)
    return data.players || {}
  } catch {
    return {}
  }
}

/** Poll inbox for a code (backup if WebSocket missed messages). */
export async function mpPollInbox(
  code: string,
  sinceMs: number,
): Promise<{ at: number; msg: unknown }[]> {
  const base = await resolveBase()
  if (!base) return []
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  if (c.length !== 6) return []
  try {
    const res = await fetch(`${base}/poll?code=${c}&since=${sinceMs}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { messages?: { at: number; msg: unknown }[] }
    return data.messages || []
  } catch {
    return []
  }
}

/** Battle room WebSocket relay. */
export function mpSubscribeBattle(
  room: string,
  code: string,
  onMessage: (msg: unknown) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  let socket: WebSocket | null = null
  let stopped = false
  let timer = 0

  const connect = async () => {
    if (stopped) return
    const base = await resolveBase()
    if (!base) return
    try {
      const url = toWsUrl(
        base,
        `/ws/battle?room=${encodeURIComponent(room)}&code=${encodeURIComponent(code)}`,
      )
      const s = new WebSocket(url)
      socket = s
      s.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data))
          // Server may wrap or pass through.
          if (data && typeof data === 'object' && data.op === 'joined') return
          onMessage(data?.msg ?? data)
        } catch {
          /* ignore */
        }
      }
      s.onclose = () => {
        if (stopped) return
        timer = window.setTimeout(() => void connect(), 1000)
      }
    } catch {
      if (!stopped) timer = window.setTimeout(() => void connect(), 1500)
    }
  }

  void connect()

  return () => {
    stopped = true
    if (timer) window.clearTimeout(timer)
    try {
      socket?.close()
    } catch {
      /* ignore */
    }
  }
}

export async function mpPublishBattle(room: string, msg: unknown): Promise<boolean> {
  const base = await resolveBase()
  if (!base) return false
  try {
    const res = await fetch(`${base}/battle/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, msg }),
    })
    return res.ok
  } catch {
    return false
  }
}
// mp endpoint live
