import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import {
  fetchLeagueOverviewFacts,
  type LeagueOverviewFacts,
} from './leagueOverviewFacts'

export function useLeagueOverviewFacts(leagueId: LeagueId, enabled = true) {
  const [data, setData] = useState<LeagueOverviewFacts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchLeagueOverviewFacts(leagueId)
      .then((facts) => {
        if (!cancelled) setData(facts)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load league facts',
          )
          setData(null)
        }
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
