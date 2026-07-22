import { useCallback, useEffect, useState } from 'react'
import type { Match } from '../matches'
import { fetchMatchDetailStats } from './espn'
import type { MatchDetailStats } from './types'

const LIVE_STATS_REFRESH_MS = 45_000

export function useMatchDetailStats(match: Match | null) {
  const [stats, setStats] = useState<MatchDetailStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (current: Match, silent: boolean) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const detail = await fetchMatchDetailStats(
        current.leagueId,
        current.espnEventId,
        current.id,
      )
      setStats(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load match stats')
      if (!silent) setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!match) {
      setStats(null)
      setError(null)
      setLoading(false)
      return
    }

    if (match.status === 'scheduled') {
      setStats(null)
      setError(null)
      setLoading(false)
      return
    }

    void load(match, false)
  }, [match, load])

  useEffect(() => {
    if (!match || match.status !== 'live') return
    const id = window.setInterval(() => {
      void load(match, true)
    }, LIVE_STATS_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [match, load])

  return { stats, loading, error }
}
