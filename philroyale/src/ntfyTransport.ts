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

  // Race both relays — envs.net has history; ntfy.sh is usually faster.
  // Success if either accepts (fixes "Network was flaky" when one host is slow).
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
 * Subscribe via SSE + poll on the cached primary, plus live SSE on ntfy.sh.
 * Dedupes by ntfy message id / payload fingerprint.
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
    const key = id || `p:${raw.length}:${raw.slice(0, 96)}`
    if (seen.has(key)) return
    seen.add(key)
    if (seen.size > 500) {
      const first = seen.values().next().value
      if (first) seen.delete(first)
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

  function attachSse(base: string): EventSource | null {
    try {
      const es = new EventSource(`${ntfyUrl(topic, base)}/sse`)
      es.onmessage = (ev) => {
        try {
          const envelope = JSON.parse(ev.data) as NtfyEnvelope
          if (envelope.time && base === NTFY_PRIMARY) {
            lastSince = Math.max(lastSince, envelope.time)
          }
          if (envelope.message) handle(envelope.message, envelope.id)
        } catch {
          /* ignore */
        }
      }
      return es
    } catch {
      return null
    }
  }

  const esPrimary = attachSse(NTFY_PRIMARY)
  const esLive = attachSse(NTFY_LIVE)

  void pollOnce()
  const poll = window.setInterval(() => void pollOnce(), pollMs)

  return () => {
    stopped = true
    window.clearInterval(poll)
    esPrimary?.close()
    esLive?.close()
  }
}
