import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeaguePlayerStatsOverview } from './espn'
import type { LeaguePlayerStatsOverview } from './types'

export function useLeaguePlayerStats(leagueId: LeagueId, enabled: boolean) {
  const [data, setData] = useState<LeaguePlayerStatsOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLeaguePlayerStatsOverview(leagueId)
      .then((overview) => {
        if (cancelled) return
        setData(overview)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load player stats')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, enabled])

  return { data, loading, error }
}
