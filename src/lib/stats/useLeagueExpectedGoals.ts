import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeagueExpectedGoals, hasFotmobAdvancedStats, type LeagueExpectedGoals } from './fotmob'

export function useLeagueExpectedGoals(leagueId: LeagueId, enabled: boolean) {
  const [data, setData] = useState<LeagueExpectedGoals | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !hasFotmobAdvancedStats(leagueId)) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLeagueExpectedGoals(leagueId)
      .then((overview) => {
        if (cancelled) return
        setData(overview)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load expected goals')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, enabled])

  return { data, loading, error, supported: hasFotmobAdvancedStats(leagueId) }
}
