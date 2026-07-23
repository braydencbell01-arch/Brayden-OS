import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addDays,
  CALENDAR_INITIAL_FORWARD_DAYS,
  CALENDAR_INITIAL_PAST_DAYS,
  MATCH_FETCH_CHUNK_DAYS,
  MATCH_FORWARD_DISCOVERY_MAX_DAYS,
  MATCH_FORWARD_EMPTY_CHUNKS_TO_STOP,
  startOfDay,
  toDateKey,
} from '../dates'
import { fetchBigFiveWindow, type Match } from '../matches'

const LIVE_REFRESH_MS = 45_000
const IDLE_REFRESH_MS = 5 * 60_000
/** Near-term window re-fetched on the live/idle poll (scores stay fresh). */
const CORE_FORWARD_REFRESH_DAYS = 21

function mergeMatches(existing: Match[], incoming: Match[]): Match[] {
  const map = new Map(existing.map((match) => [match.id, match]))
  for (const match of incoming) map.set(match.id, match)
  return Array.from(map.values()).sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

function chunkRange(from: Date, to: Date, chunkDays: number): Array<{ from: Date; to: Date }> {
  const chunks: Array<{ from: Date; to: Date }> = []
  let cursor = startOfDay(from)
  const end = startOfDay(to)
  while (cursor <= end) {
    const rawEnd = addDays(cursor, chunkDays - 1)
    const chunkEnd = rawEnd > end ? end : startOfDay(rawEnd)
    chunks.push({ from: cursor, to: chunkEnd })
    cursor = addDays(chunkEnd, 1)
  }
  return chunks
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

function latestMatchDate(matches: Match[], todayKey: string): Date | null {
  let latest: string | null = null
  for (const match of matches) {
    if (match.dateKey < todayKey) continue
    if (!latest || match.dateKey > latest) latest = match.dateKey
  }
  if (!latest) return null
  const [y, m, d] = latest.split('-').map(Number)
  return startOfDay(new Date(y, m - 1, d))
}

export function useLiveBigFiveMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  /** Inclusive days from today through the last published upcoming fixture (or probed empty stop). */
  const [knownForwardDays, setKnownForwardDays] = useState(CALENDAR_INITIAL_FORWARD_DAYS)
  const hasLoadedRef = useRef(false)
  const loadedFromRef = useRef<Date | null>(null)
  const loadedToRef = useRef<Date | null>(null)
  const queueRef = useRef(Promise.resolve())
  const discoveryStartedRef = useRef(false)
  /** Nested ensureRange / poll / discovery must not clear each other's Syncing… state. */
  const refreshDepthRef = useRef(0)

  const beginRefresh = useCallback(() => {
    refreshDepthRef.current += 1
    setRefreshing(true)
  }, [])

  const endRefresh = useCallback(() => {
    refreshDepthRef.current = Math.max(0, refreshDepthRef.current - 1)
    if (refreshDepthRef.current === 0) setRefreshing(false)
  }, [])

  const fetchAndMerge = useCallback(async (from: Date, to: Date) => {
    const { matches: data, failedLeagues } = await fetchBigFiveWindow(from, to)
    setMatches((prev) => mergeMatches(prev, data))
    setUpdatedAt(Date.now())
    hasLoadedRef.current = true
    // Partial ESPN failures must not permanently mark the span as loaded.
    const complete = failedLeagues.length === 0
    if (!complete) {
      setError(
        `Some leagues failed to load (${failedLeagues.slice(0, 3).join(', ')}${
          failedLeagues.length > 3 ? '…' : ''
        }). Pull to refresh or reopen the day.`,
      )
    } else {
      setError(null)
    }
    return { data, complete }
  }, [])

  const expandLoadedBounds = useCallback((from: Date, to: Date) => {
    const start = startOfDay(from)
    const end = startOfDay(to)
    if (!loadedFromRef.current || start < loadedFromRef.current) loadedFromRef.current = start
    if (!loadedToRef.current || end > loadedToRef.current) loadedToRef.current = end
  }, [])

  const bumpKnownForward = useCallback((through: Date) => {
    const today = startOfDay(new Date())
    const days = Math.max(CALENDAR_INITIAL_FORWARD_DAYS, daysBetween(today, through))
    setKnownForwardDays((current) => Math.max(current, days))
  }, [])

  const ensureRange = useCallback(
    (from: Date, to: Date) => {
      const start = startOfDay(from)
      const end = startOfDay(to)
      if (end < start) return queueRef.current

      const run = async () => {
        const gaps: Array<{ from: Date; to: Date }> = []
        const loadedFrom = loadedFromRef.current
        const loadedTo = loadedToRef.current

        if (!loadedFrom || !loadedTo) {
          gaps.push({ from: start, to: end })
        } else {
          if (start < loadedFrom) {
            gaps.push({ from: start, to: addDays(loadedFrom, -1) })
          }
          if (end > loadedTo) {
            gaps.push({ from: addDays(loadedTo, 1), to: end })
          }
        }

        if (gaps.length === 0) return

        beginRefresh()
        setError(null)
        try {
          for (const gap of gaps) {
            for (const chunk of chunkRange(gap.from, gap.to, MATCH_FETCH_CHUNK_DAYS)) {
              const { data, complete } = await fetchAndMerge(chunk.from, chunk.to)
              if (complete) expandLoadedBounds(chunk.from, chunk.to)
              const todayKey = toDateKey(startOfDay(new Date()))
              const latest = latestMatchDate(data, todayKey)
              if (latest) bumpKnownForward(latest)
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not load fixtures')
          if (!hasLoadedRef.current) setMatches([])
        } finally {
          endRefresh()
        }
      }

      queueRef.current = queueRef.current.then(run, run)
      return queueRef.current
    },
    [beginRefresh, bumpKnownForward, endRefresh, expandLoadedBounds, fetchAndMerge],
  )

  const ensureDate = useCallback(
    (date: Date) => {
      const day = startOfDay(date)
      return ensureRange(addDays(day, -MATCH_FETCH_CHUNK_DAYS), addDays(day, MATCH_FETCH_CHUNK_DAYS))
    },
    [ensureRange],
  )

  const discoverForwardHorizon = useCallback(async () => {
    const today = startOfDay(new Date())
    const todayKey = toDateKey(today)
    const hardStop = addDays(today, MATCH_FORWARD_DISCOVERY_MAX_DAYS)
    let lastFixtureThrough: Date | null = null

    const noteFixtures = (data: Match[]) => {
      const latest = latestMatchDate(data, todayKey)
      if (latest) {
        lastFixtureThrough = !lastFixtureThrough || latest > lastFixtureThrough ? latest : lastFixtureThrough
        bumpKnownForward(latest)
      }
    }

    // Cover the initial forward window first.
    const initialTo = addDays(today, CALENDAR_INITIAL_FORWARD_DAYS)
    if (!loadedToRef.current || loadedToRef.current < initialTo) {
      const from = loadedToRef.current ? addDays(loadedToRef.current, 1) : today
      for (const chunk of chunkRange(from, initialTo, MATCH_FETCH_CHUNK_DAYS)) {
        const { data, complete } = await fetchAndMerge(chunk.from, chunk.to)
        if (complete) expandLoadedBounds(chunk.from, chunk.to)
        noteFixtures(data)
      }
    }

    let cursor = addDays(loadedToRef.current ?? initialTo, 1)
    let emptyStreak = 0
    while (cursor <= hardStop && emptyStreak < MATCH_FORWARD_EMPTY_CHUNKS_TO_STOP) {
      const chunkEnd = addDays(cursor, MATCH_FETCH_CHUNK_DAYS - 1)
      const end = chunkEnd > hardStop ? hardStop : chunkEnd
      const { data, complete } = await fetchAndMerge(cursor, end)
      if (complete) expandLoadedBounds(cursor, end)
      if (data.length === 0) {
        emptyStreak += 1
      } else {
        emptyStreak = 0
        noteFixtures(data)
      }
      cursor = addDays(end, 1)
    }

    if (lastFixtureThrough) bumpKnownForward(lastFixtureThrough)
    else bumpKnownForward(initialTo)
  }, [bumpKnownForward, expandLoadedBounds, fetchAndMerge])

  const loadCore = useCallback(
    (silent: boolean) => {
      const run = async () => {
        const today = startOfDay(new Date())
        const from = addDays(today, -CALENDAR_INITIAL_PAST_DAYS)
        const to = addDays(today, CORE_FORWARD_REFRESH_DAYS)

        if (!silent) setLoading(true)
        else beginRefresh()
        setError(null)

        try {
          const { complete } = await fetchAndMerge(from, to)
          if (complete) expandLoadedBounds(from, to)
          // Show today's fixtures immediately; keep long-range discovery under refreshing.
          if (!silent) setLoading(false)

          if (!discoveryStartedRef.current) {
            beginRefresh()
            try {
              await discoverForwardHorizon()
              discoveryStartedRef.current = true
            } finally {
              endRefresh()
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not load fixtures')
          if (!hasLoadedRef.current) setMatches([])
        } finally {
          setLoading(false)
          if (silent) endRefresh()
        }
      }

      queueRef.current = queueRef.current.then(run, run)
      return queueRef.current
    },
    [beginRefresh, discoverForwardHorizon, endRefresh, expandLoadedBounds, fetchAndMerge],
  )

  useEffect(() => {
    void loadCore(false)
  }, [loadCore])

  const hasLive = matches.some((match) => match.status === 'live')

  useEffect(() => {
    if (loading && !hasLoadedRef.current) return
    const intervalMs = hasLive ? LIVE_REFRESH_MS : IDLE_REFRESH_MS
    const id = window.setInterval(() => {
      void loadCore(true)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [hasLive, loadCore, loading])

  return {
    matches,
    loading,
    error,
    updatedAt,
    refreshing,
    hasLive,
    knownForwardDays,
    refresh: () => loadCore(true),
    ensureRange,
    ensureDate,
  }
}
