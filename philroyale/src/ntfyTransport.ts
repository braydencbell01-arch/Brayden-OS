/**
 * Shared ntfy transport for Phil Royale social / battle / club sync.
 *
 * Mobile browsers cap concurrent connections per host (~6). Opening SSE on
 * every personal + pair + directory topic starves delivery — friend adds and
 * battle invites silently never arrive. Keep ONE SSE per subscribe + poll.
 */

export const NTFY_PRIMARY = 'https://ntfy.envs.net'
/** Mirror publish target (fan-out). Poll only — no extra SSE. */
export const NTFY_LIVE = 'https://ntfy.sh'

export function ntfyUrl(topic: string, base = NTFY_PRIMARY): string {
  const clean = topic.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 72)
  return `${base}/${clean || 'lobby'}`
}

type PublishOpts = {
  title?: string
  priority?: 'default' | 'high' | 'urgent'
  tags?: string
  /** Seconds to retain on servers that support cache. */
  ttl?: number
  /** Also POST to ntfy.sh (default true). */
  mirrorLive?: boolean
}

export async function ntfyPublish(
  topic: string,
  body: unknown,
  opts: PublishOpts = {},
): Promise<boolean> {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Title: opts.title ?? 'Phil Royale',
    Priority: opts.priority ?? 'default',
    Cache: 'yes',
    TTL: String(opts.ttl ?? 300),
  }
  if (opts.tags) headers.Tags = opts.tags

  const post = async (base: string) => {
    try {
      const res = await fetch(ntfyUrl(topic, base), {
        method: 'POST',
        headers,
        body: payload,
      })
      return res.ok
    } catch {
      return false
    }
  }

  if (opts.mirrorLive === false) {
    return post(NTFY_PRIMARY)
  }
  const results = await Promise.all([post(NTFY_PRIMARY), post(NTFY_LIVE)])
  return results[0] || results[1]
}

export type NtfyEnvelope = {
  id?: string
  message?: string
  time?: number
  event?: string
}

function parseEnvelopeLine(line: string): NtfyEnvelope | null {
  try {
    return JSON.parse(line) as NtfyEnvelope
  } catch {
    return null
  }
}

/**
 * One SSE on the cached primary + aggressive poll (primary + live).
 * Avoids dual-SSE which blows mobile connection limits.
 */
export function ntfySubscribe(
  topic: string,
  onRaw: (raw: string, id?: string) => void,
  opts?: { lookbackSec?: number; pollMs?: number; sse?: boolean },
): () => void {
  if (!topic || typeof window === 'undefined') return () => {}

  let stopped = false
  const lookback = opts?.lookbackSec ?? 300
  let lastSince = Math.floor(Date.now() / 1000) - lookback
  const seen = new Set<string>()
  const pollMs = opts?.pollMs ?? 700
  const useSse = opts?.sse !== false

  function handle(raw: string, id?: string) {
    const key = id || `p:${raw.length}:${raw.slice(0, 120)}`
    if (seen.has(key)) return
    seen.add(key)
    if (seen.size > 800) {
      const first = seen.values().next().value
      if (first) seen.delete(first)
    }
    onRaw(raw, id)
  }

  async function pollBase(base: string) {
    if (stopped) return
    try {
      const res = await fetch(
        `${ntfyUrl(topic, base)}/json?poll=1&since=${lastSince}`,
      )
      if (!res.ok) return
      const text = (await res.text()).trim()
      if (!text) return
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        const envelope = parseEnvelopeLine(line)
        if (!envelope) continue
        if (envelope.event && envelope.event !== 'message') continue
        if (envelope.time) lastSince = Math.max(lastSince, envelope.time + 1)
        if (envelope.message) handle(envelope.message, envelope.id)
      }
    } catch {
      /* ignore */
    }
  }

  async function pollOnce() {
    await Promise.all([pollBase(NTFY_PRIMARY), pollBase(NTFY_LIVE)])
  }

  let es: EventSource | null = null
  if (useSse) {
    try {
      es = new EventSource(`${ntfyUrl(topic, NTFY_PRIMARY)}/sse`)
      es.onmessage = (ev) => {
        try {
          const envelope = JSON.parse(ev.data) as NtfyEnvelope
          if (envelope.time) lastSince = Math.max(lastSince, envelope.time)
          if (envelope.message) handle(envelope.message, envelope.id)
        } catch {
          /* ignore */
        }
      }
    } catch {
      es = null
    }
  }

  void pollOnce()
  const poll = window.setInterval(() => void pollOnce(), pollMs)

  return () => {
    stopped = true
    window.clearInterval(poll)
    es?.close()
  }
}
