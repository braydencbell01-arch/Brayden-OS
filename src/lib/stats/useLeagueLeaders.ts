import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeagueLeaders } from './espn'
import type { LeagueLeaders } from './types'

export function useLeagueLeaders(leagueId: LeagueId, enabled: boolean) {
  const [data, setData] = useState<LeagueLeaders | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLeagueLeaders(leagueId)
      .then((leaders) => {
        if (cancelled) return
        setData(leaders)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load stats leaders')
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
