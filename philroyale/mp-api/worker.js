/**
 * Phil Royale multiplayer — Cloudflare Worker + Durable Objects.
 *
 * Routes:
 *   GET  /health
 *   GET  /ws?code=123456&name=Brayden   → WebSocket (presence + inbox)
 *   POST /publish                       → { to?: code, room?: challengeId, msg }
 *   GET  /presence                      → { players: { code: { name, at, ... } } }
 *   GET  /leaderboard                   → { players: [{ code, name, trophies, ... }] }
 *   GET  /poll?code=123456&since=ms     → missed inbox messages
 *   GET  /ws/battle?room=id&code=…      → WebSocket battle room relay
 *
 * CORS open for GitHub Pages + localhost.
 */

const ONLINE_MS = 90_000
const INBOX_MAX = 80
const INBOX_TTL_MS = 300_000

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function json(body, status = 200, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  })
}

function cleanCode(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 6)
}

function cleanRoom(raw) {
  return String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64)
}

/** @param {Env} env */
function lobbyStub(env) {
  return env.LOBBY.get(env.LOBBY.idFromName('philroyale-lobby-v1'))
}

/** @param {Env} env @param {string} room */
function battleStub(env, room) {
  return env.BATTLE.get(env.BATTLE.idFromName(room || 'lobby'))
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   */
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*'
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (path === '/health' || path === '/') {
      return json({ ok: true, service: 'philroyale-mp' }, 200, origin)
    }

    if (path === '/presence' && request.method === 'GET') {
      return lobbyStub(env).fetch(new Request('https://do/presence', { method: 'GET' }))
    }

    if (path === '/leaderboard' && request.method === 'GET') {
      return lobbyStub(env).fetch(new Request('https://do/leaderboard', { method: 'GET' }))
    }

    if (path === '/leaderboard/report' && request.method === 'POST') {
      return lobbyStub(env).fetch(
        new Request('https://do/leaderboard/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: await request.text(),
        }),
      )
    }

    if (path === '/poll' && request.method === 'GET') {
      const code = cleanCode(url.searchParams.get('code'))
      const since = url.searchParams.get('since') || '0'
      return lobbyStub(env).fetch(
        new Request(`https://do/poll?code=${code}&since=${since}`, { method: 'GET' }),
      )
    }

    if (path === '/publish' && request.method === 'POST') {
      const body = await request.text()
      return lobbyStub(env).fetch(
        new Request('https://do/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
      )
    }

    if (path === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const code = cleanCode(url.searchParams.get('code'))
      const name = (url.searchParams.get('name') || 'Player').slice(0, 32)
      if (code.length !== 6) {
        return json({ ok: false, error: 'code required' }, 400, origin)
      }
      return lobbyStub(env).fetch(
        new Request(`https://do/ws?code=${code}&name=${encodeURIComponent(name)}`, request),
      )
    }

    if (path === '/ws/battle' && request.headers.get('Upgrade') === 'websocket') {
      const room = cleanRoom(url.searchParams.get('room'))
      const code = cleanCode(url.searchParams.get('code'))
      if (!room) return json({ ok: false, error: 'room required' }, 400, origin)
      return battleStub(env, room).fetch(
        new Request(`https://do/ws?code=${code}`, request),
      )
    }

    if (path === '/battle/publish' && request.method === 'POST') {
      const raw = await request.json().catch(() => null)
      const room = cleanRoom(raw?.room)
      if (!room) return json({ ok: false, error: 'room required' }, 400, origin)
      return battleStub(env, room).fetch(
        new Request('https://do/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(raw?.msg ?? raw),
        }),
      )
    }

    return json({ ok: false, error: 'not found' }, 404, origin)
  },
}

/**
 * Global lobby: WebSocket sessions, presence, directed inbox + lobby fanout.
 */
export class LobbyDO {
  /** @param {DurableObjectState} state */
  constructor(state) {
    this.state = state
    /** @type {Map<string, Set<WebSocket>>} */
    this.sockets = new Map()
    /** @type {Map<string, { name: string, at: number, trophies?: number, inBattle?: boolean, challengeId?: string }>} */
    this.presence = new Map()
    /** Persistent trophy board — all players who have ever pinged. */
    /** @type {Map<string, { name: string, trophies: number, updatedAt: number }>} */
    this.leaderboard = new Map()
    /** @type {Array<{ id: string, to: string, at: number, msg: unknown }>} */
    this.inbox = []
    this._boardDirty = false
    this.state.blockConcurrencyWhile(async () => {
      const raw = (await this.state.storage.get('leaderboard')) || {}
      if (raw && typeof raw === 'object') {
        for (const [code, row] of Object.entries(raw)) {
          if (!row || typeof row !== 'object') continue
          this.leaderboard.set(code, {
            name: String(row.name || 'Player').slice(0, 32),
            trophies: Math.max(0, Number(row.trophies) || 0),
            updatedAt: Number(row.updatedAt) || Date.now(),
          })
        }
      }
    })
    this.state.getWebSockets().forEach((ws) => {
      const code = ws.deserializeAttachment()?.code
      if (!code) {
        try {
          ws.close(1011, 'no code')
        } catch {
          /* ignore */
        }
        return
      }
      let set = this.sockets.get(code)
      if (!set) {
        set = new Set()
        this.sockets.set(code, set)
      }
      set.add(ws)
    })
  }

  /** @param {Request} request */
  async fetch(request) {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/presence') {
      this.prunePresence()
      const players = {}
      for (const [code, p] of this.presence) {
        if (Date.now() - p.at > ONLINE_MS) continue
        players[code] = p
      }
      return json({ ok: true, players })
    }

    if (path === '/leaderboard') {
      const rows = [...this.leaderboard.entries()]
        .map(([code, row]) => ({
          code,
          name: row.name,
          trophies: row.trophies,
          updatedAt: row.updatedAt,
          online: (() => {
            const p = this.presence.get(code)
            return !!(p && Date.now() - p.at <= ONLINE_MS)
          })(),
          inBattle: (() => {
            const p = this.presence.get(code)
            return !!(p && Date.now() - p.at <= ONLINE_MS && p.inBattle)
          })(),
        }))
        .sort((a, b) => b.trophies - a.trophies || a.name.localeCompare(b.name))
      return json({ ok: true, players: rows, now: Date.now() })
    }

    if (path === '/leaderboard/report' && request.method === 'POST') {
      const raw = await request.json().catch(() => null)
      const list = Array.isArray(raw?.players) ? raw.players : Array.isArray(raw) ? raw : []
      let n = 0
      for (const row of list) {
        if (!row || typeof row !== 'object') continue
        const code = cleanCode(row.code || row.playerId || '')
        if (code.length !== 6) continue
        this.upsertLeaderboard(code, row.name || 'Player', row.trophies)
        n++
      }
      await this.flushLeaderboard()
      return json({ ok: true, upserted: n, total: this.leaderboard.size })
    }

    if (path === '/poll') {
      const code = cleanCode(url.searchParams.get('code'))
      const since = Number(url.searchParams.get('since') || 0) || 0
      this.pruneInbox()
      const messages = this.inbox
        .filter((m) => m.to === code && m.at > since)
        .map((m) => ({ at: m.at, msg: m.msg }))
      return json({ ok: true, messages, now: Date.now() })
    }

    if (path === '/publish' && request.method === 'POST') {
      const raw = await request.json().catch(() => null)
      if (!raw || typeof raw !== 'object') {
        return json({ ok: false, error: 'bad json' }, 400)
      }
      // { to?: code, lobby?: boolean, msg }
      const msg = raw.msg ?? raw
      const to = cleanCode(raw.to || msg?.toPlayerId || '')
      const lobby = !!raw.lobby || !to
      this.deliver(msg, { to: to || null, lobby })
      return json({ ok: true })
    }

    if (path === '/ws') {
      const code = cleanCode(url.searchParams.get('code'))
      const name = decodeURIComponent(url.searchParams.get('name') || 'Player').slice(0, 32)
      if (code.length !== 6) return json({ ok: false, error: 'bad code' }, 400)

      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]
      this.state.acceptWebSocket(server)
      server.serializeAttachment({ code, name })

      let set = this.sockets.get(code)
      if (!set) {
        set = new Set()
        this.sockets.set(code, set)
      }
      set.add(server)

      this.touchPresence(code, name, {})
      this.send(server, { op: 'hello', code, now: Date.now() })
      this.broadcastPresence()

      // Flush recent inbox to this socket.
      this.pruneInbox()
      const recent = this.inbox.filter((m) => m.to === code && Date.now() - m.at < INBOX_TTL_MS)
      for (const m of recent.slice(-20)) {
        this.send(server, { op: 'msg', msg: m.msg, at: m.at })
      }

      return new Response(null, { status: 101, webSocket: client })
    }

    return json({ ok: false, error: 'not found' }, 404)
  }

  /** @param {WebSocket} ws @param {ArrayBuffer|string} message */
  async webSocketMessage(ws, message) {
    const att = ws.deserializeAttachment() || {}
    const code = cleanCode(att.code)
    let data
    try {
      data = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    } catch {
      return
    }
    if (!data || typeof data !== 'object') return

    if (data.op === 'ping' || data.op === 'presence') {
      this.touchPresence(code, data.name || att.name || 'Player', {
        trophies: data.trophies,
        inBattle: data.inBattle,
        challengeId: data.challengeId,
      })
      att.name = data.name || att.name
      ws.serializeAttachment(att)
      this.broadcastPresence()
      this.send(ws, { op: 'pong', now: Date.now() })
      return
    }

    if (data.op === 'to' && data.msg) {
      const to = cleanCode(data.to || data.msg.toPlayerId)
      this.deliver(data.msg, { to, lobby: !!data.lobby })
      return
    }

    if (data.op === 'lobby' && data.msg) {
      this.deliver(data.msg, { to: cleanCode(data.msg.toPlayerId) || null, lobby: true })
      return
    }
  }

  /** @param {WebSocket} ws */
  async webSocketClose(ws) {
    this.dropSocket(ws)
  }

  /** @param {WebSocket} ws */
  async webSocketError(ws) {
    this.dropSocket(ws)
  }

  dropSocket(ws) {
    const code = cleanCode(ws.deserializeAttachment()?.code)
    if (!code) return
    const set = this.sockets.get(code)
    if (set) {
      set.delete(ws)
      if (set.size === 0) this.sockets.delete(code)
    }
  }

  touchPresence(code, name, extra) {
    if (code.length !== 6) return
    const prev = this.presence.get(code) || {}
    const next = {
      name: String(name || prev.name || 'Player').slice(0, 32),
      at: Date.now(),
      trophies: extra.trophies ?? prev.trophies,
      inBattle: extra.inBattle ?? prev.inBattle ?? false,
      challengeId: extra.challengeId ?? prev.challengeId,
    }
    this.presence.set(code, next)
    this.upsertLeaderboard(code, next.name, next.trophies)
  }

  /**
   * @param {string} code
   * @param {string} name
   * @param {number|undefined} trophies
   */
  upsertLeaderboard(code, name, trophies) {
    if (code.length !== 6) return
    const prev = this.leaderboard.get(code)
    // Reports / pings only raise trophies (never wipe a higher score with a stale 0).
    const finalT =
      typeof trophies === 'number' && Number.isFinite(trophies)
        ? Math.max(prev?.trophies ?? 0, Math.max(0, Math.floor(trophies)))
        : (prev?.trophies ?? 0)
    const nextName = String(name || prev?.name || 'Player').slice(0, 32)
    this.leaderboard.set(code, {
      name: nextName,
      trophies: finalT,
      updatedAt: Date.now(),
    })
    if (this.leaderboard.size > 5000) {
      const ranked = [...this.leaderboard.entries()].sort(
        (a, b) => b[1].trophies - a[1].trophies || b[1].updatedAt - a[1].updatedAt,
      )
      this.leaderboard = new Map(ranked.slice(0, 4000))
    }
    this._boardDirty = true
    void this.flushLeaderboard()
  }

  async flushLeaderboard() {
    if (!this._boardDirty) return
    this._boardDirty = false
    await this.state.storage.put('leaderboard', Object.fromEntries(this.leaderboard))
  }

  prunePresence() {
    const now = Date.now()
    for (const [code, p] of this.presence) {
      if (now - p.at > ONLINE_MS * 2) this.presence.delete(code)
    }
  }

  pruneInbox() {
    const now = Date.now()
    this.inbox = this.inbox.filter((m) => now - m.at < INBOX_TTL_MS).slice(-INBOX_MAX * 4)
  }

  /**
   * @param {unknown} msg
   * @param {{ to: string | null, lobby: boolean }} opts
   */
  deliver(msg, opts) {
    const at = Date.now()
    const id = `${at}-${Math.random().toString(36).slice(2, 8)}`

    // Directed inbox (friend request, battle invite, etc.)
    if (opts.to && opts.to.length === 6) {
      this.inbox.push({ id, to: opts.to, at, msg })
      this.pruneInbox()
      const set = this.sockets.get(opts.to)
      if (set) {
        for (const ws of set) this.send(ws, { op: 'msg', msg, at })
      }
    }

    // Lobby fanout — every connected socket (dir_ping / broadcasts).
    // Skip re-sending to `to` if we already directed (still OK to send twice; client dedupes).
    if (opts.lobby) {
      // Also treat dir_ping as presence update.
      if (msg && typeof msg === 'object' && msg.type === 'dir_ping') {
        this.touchPresence(cleanCode(msg.fromPlayerId), msg.fromName, {
          trophies: msg.trophies,
          inBattle: msg.inBattle,
        })
      }
      for (const set of this.sockets.values()) {
        for (const ws of set) this.send(ws, { op: 'msg', msg, at })
      }
      this.broadcastPresence()
    }
  }

  broadcastPresence() {
    this.prunePresence()
    const players = {}
    for (const [code, p] of this.presence) {
      if (Date.now() - p.at > ONLINE_MS) continue
      players[code] = p
    }
    const payload = { op: 'presence', players, now: Date.now() }
    for (const set of this.sockets.values()) {
      for (const ws of set) this.send(ws, payload)
    }
  }

  /** @param {WebSocket} ws @param {unknown} obj */
  send(ws, obj) {
    try {
      ws.send(JSON.stringify(obj))
    } catch {
      this.dropSocket(ws)
    }
  }
}

/**
 * Per-challenge battle room — relays host state + guest deploys.
 */
export class BattleRoomDO {
  /** @param {DurableObjectState} state */
  constructor(state) {
    this.state = state
    /** @type {Set<WebSocket>} */
    this.sockets = new Set()
    this.state.getWebSockets().forEach((ws) => this.sockets.add(ws))
  }

  /** @param {Request} request */
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/publish' && request.method === 'POST') {
      const msg = await request.json().catch(() => null)
      if (!msg) return json({ ok: false }, 400)
      this.broadcast(msg)
      return json({ ok: true })
    }
    if (url.pathname === '/ws') {
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]
      this.state.acceptWebSocket(server)
      const code = cleanCode(url.searchParams.get('code'))
      server.serializeAttachment({ code })
      this.sockets.add(server)
      this.send(server, { op: 'joined', room: true, now: Date.now() })
      return new Response(null, { status: 101, webSocket: client })
    }
    return json({ ok: false, error: 'not found' }, 404)
  }

  /** @param {WebSocket} ws @param {ArrayBuffer|string} message */
  async webSocketMessage(ws, message) {
    let data
    try {
      data = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    } catch {
      return
    }
    // Relay to everyone else in the room (and optionally self for ack-free sync).
    for (const peer of this.sockets) {
      if (peer === ws) continue
      this.send(peer, data?.msg ?? data)
    }
  }

  async webSocketClose(ws) {
    this.sockets.delete(ws)
  }

  async webSocketError(ws) {
    this.sockets.delete(ws)
  }

  broadcast(msg) {
    for (const ws of this.sockets) this.send(ws, msg)
  }

  send(ws, obj) {
    try {
      ws.send(JSON.stringify(obj))
    } catch {
      this.sockets.delete(ws)
    }
  }
}
