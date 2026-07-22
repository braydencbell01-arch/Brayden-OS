import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, CALENDAR_RADIUS_DAYS, startOfDay } from '../dates'
import { fetchBigFiveWindow, type Match } from '../matches'

const LIVE_REFRESH_MS = 45_000
const IDLE_REFRESH_MS = 5 * 60_000

export function useLiveBigFiveMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedRef = useRef(false)

  const load = useCallback(async (silent: boolean) => {
    const today = startOfDay(new Date())
    const from = addDays(today, -CALENDAR_RADIUS_DAYS)
    const to = addDays(today, CALENDAR_RADIUS_DAYS)

    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const data = await fetchBigFiveWindow(from, to)
      setMatches(data)
      setUpdatedAt(Date.now())
      hasLoadedRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load fixtures')
      if (!hasLoadedRef.current) setMatches([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  const hasLive = matches.some((match) => match.status === 'live')

  useEffect(() => {
    if (loading && !hasLoadedRef.current) return
    const intervalMs = hasLive ? LIVE_REFRESH_MS : IDLE_REFRESH_MS
    const id = window.setInterval(() => {
      void load(true)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [hasLive, load, loading])

  return {
    matches,
    loading,
    error,
    updatedAt,
    refreshing,
    hasLive,
    refresh: () => load(true),
  }
}
