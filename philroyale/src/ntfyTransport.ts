/**
 * Shared ntfy transport for Phil Royale social / battle / club sync.
 *
 * ntfy.sh stopped retaining anonymous topic history (poll always empty),
 * which broke in-app friend adds, battle invites, and online presence unless
 * a text/URL link was used. ntfy.envs.net still caches — use it as primary.
 */

export const NTFY_PRIMARY = 'https://ntfy.envs.net'
/** Live fan-out only (no reliable history on the public instance). */
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
  /** Also POST to ntfy.sh for devices that already have a live SSE open there. */
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
    TTL: String(opts.ttl ?? 180),
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

  const primary = await post(NTFY_PRIMARY)
  if (opts.mirrorLive !== false) {
    void post(NTFY_LIVE)
  }
  return primary
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
 * Subscribe via SSE + aggressive poll on the primary (cached) server.
 * Dedupes by ntfy message id.
 */
export function ntfySubscribe(
  topic: string,
  onRaw: (raw: string, id?: string) => void,
  opts?: { lookbackSec?: number; pollMs?: number },
): () => void {
  if (!topic || typeof window === 'undefined') return () => {}

  let stopped = false
  const lookback = opts?.lookbackSec ?? 180
  let lastSince = Math.floor(Date.now() / 1000) - lookback
  const seen = new Set<string>()
  const pollMs = opts?.pollMs ?? 900

  function handle(raw: string, id?: string) {
    if (id) {
      if (seen.has(id)) return
      seen.add(id)
      if (seen.size > 400) {
        const first = seen.values().next().value
        if (first) seen.delete(first)
      }
    }
    onRaw(raw, id)
  }

  async function pollOnce() {
    if (stopped) return
    try {
      const res = await fetch(
        `${ntfyUrl(topic)}/json?poll=1&since=${lastSince}`,
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

  let es: EventSource | null = null
  try {
    es = new EventSource(`${ntfyUrl(topic)}/sse`)
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

  void pollOnce()
  const poll = window.setInterval(() => void pollOnce(), pollMs)

  return () => {
    stopped = true
    window.clearInterval(poll)
    es?.close()
  }
}
