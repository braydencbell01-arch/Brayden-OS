import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamStatLeaders } from './espn'
import type { TeamStatLeaders } from './types'

export function useTeamStatLeaders(
  leagueId: LeagueId,
  teamId: string | null,
  enabled: boolean,
) {
  const [data, setData] = useState<TeamStatLeaders | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !teamId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTeamStatLeaders(leagueId, teamId)
      .then((leaders) => {
        if (cancelled) return
        setData(leaders)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load stat leaders')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, teamId, enabled])

  return { data, loading, error }
}
