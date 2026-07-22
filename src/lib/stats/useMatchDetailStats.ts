import { useCallback, useEffect, useRef, useState } from 'react'
import type { Match } from '../matches'
import { fetchMatchDetailStats } from './espn'
import type { MatchDetailStats } from './types'

const LIVE_STATS_REFRESH_MS = 45_000

export function useMatchDetailStats(match: Match | null) {
  const [stats, setStats] = useState<MatchDetailStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const matchRef = useRef(match)
  matchRef.current = match

  const load = useCallback(async (current: Match, silent: boolean) => {
    const req = ++requestId.current
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      const detail = await fetchMatchDetailStats(
        current.leagueId,
        current.espnEventId,
        current.id,
      )
      if (requestId.current !== req) return
      setStats(detail)
      setError(null)
    } catch (err) {
      if (requestId.current !== req) return
      setError(err instanceof Error ? err.message : 'Could not load match stats')
      if (!silent) setStats(null)
    } finally {
      if (requestId.current === req) setLoading(false)
    }
  }, [])

  const matchId = match?.id ?? null
  const matchStatus = match?.status ?? null
  const espnEventId = match?.espnEventId ?? null
  const leagueId = match?.leagueId ?? null

  useEffect(() => {
    const current = matchRef.current
    if (!matchId || !current || !espnEventId || !leagueId) {
      requestId.current += 1
      setStats(null)
      setError(null)
      setLoading(false)
      return
    }

    if (matchStatus === 'scheduled') {
      requestId.current += 1
      setStats(null)
      setError(null)
      setLoading(false)
      return
    }

    void load(current, false)
  }, [matchId, matchStatus, espnEventId, leagueId, load])

  useEffect(() => {
    if (matchStatus !== 'live') return
    const id = window.setInterval(() => {
      const current = matchRef.current
      if (!current || current.status !== 'live') return
      void load(current, true)
    }, LIVE_STATS_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [matchId, matchStatus, load])

  return { stats, loading, error }
}
