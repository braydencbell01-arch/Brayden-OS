import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addDays,
  CALENDAR_FORWARD_DAYS,
  CALENDAR_INITIAL_PAST_DAYS,
  MATCH_FETCH_CHUNK_DAYS,
  startOfDay,
} from '../dates'
import { fetchBigFiveWindow, type Match } from '../matches'

const LIVE_REFRESH_MS = 45_000
const IDLE_REFRESH_MS = 5 * 60_000

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

export function useLiveBigFiveMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedRef = useRef(false)
  const loadedFromRef = useRef<Date | null>(null)
  const loadedToRef = useRef<Date | null>(null)
  const queueRef = useRef(Promise.resolve())

  const coreWindow = useCallback(() => {
    const today = startOfDay(new Date())
    return {
      from: addDays(today, -CALENDAR_INITIAL_PAST_DAYS),
      to: addDays(today, CALENDAR_FORWARD_DAYS),
    }
  }, [])

  const fetchAndMerge = useCallback(async (from: Date, to: Date) => {
    const data = await fetchBigFiveWindow(from, to)
    setMatches((prev) => mergeMatches(prev, data))
    setUpdatedAt(Date.now())
    hasLoadedRef.current = true
  }, [])

  const expandLoadedBounds = useCallback((from: Date, to: Date) => {
    const start = startOfDay(from)
    const end = startOfDay(to)
    if (!loadedFromRef.current || start < loadedFromRef.current) loadedFromRef.current = start
    if (!loadedToRef.current || end > loadedToRef.current) loadedToRef.current = end
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

        setRefreshing(true)
        setError(null)
        try {
          for (const gap of gaps) {
            for (const chunk of chunkRange(gap.from, gap.to, MATCH_FETCH_CHUNK_DAYS)) {
              await fetchAndMerge(chunk.from, chunk.to)
              expandLoadedBounds(chunk.from, chunk.to)
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not load fixtures')
          if (!hasLoadedRef.current) setMatches([])
        } finally {
          setRefreshing(false)
        }
      }

      queueRef.current = queueRef.current.then(run, run)
      return queueRef.current
    },
    [expandLoadedBounds, fetchAndMerge],
  )

  const ensureDate = useCallback(
    (date: Date) => {
      const day = startOfDay(date)
      return ensureRange(addDays(day, -MATCH_FETCH_CHUNK_DAYS), addDays(day, MATCH_FETCH_CHUNK_DAYS))
    },
    [ensureRange],
  )

  const loadCore = useCallback(
    async (silent: boolean) => {
      const { from, to } = coreWindow()

      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError(null)

      try {
        await fetchAndMerge(from, to)
        expandLoadedBounds(from, to)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load fixtures')
        if (!hasLoadedRef.current) setMatches([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [coreWindow, expandLoadedBounds, fetchAndMerge],
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
    refresh: () => loadCore(true),
    ensureRange,
    ensureDate,
  }
}
