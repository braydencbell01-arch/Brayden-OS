import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchMostUsedStartingXi } from './espn'
import type { MostUsedStartingXi } from './types'

export function useMostUsedStartingXi(
  leagueId: LeagueId,
  teamId: string | null,
  seasonYear: number | null,
  enabled: boolean,
  espnCodeOverride?: string,
) {
  const [data, setData] = useState<MostUsedStartingXi | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !teamId || seasonYear == null) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMostUsedStartingXi(leagueId, teamId, seasonYear, espnCodeOverride)
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load starting XI')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, teamId, seasonYear, enabled, espnCodeOverride])

  return { data, loading, error }
}
