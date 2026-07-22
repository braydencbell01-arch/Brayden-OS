import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamRoster } from './espn'
import type { TeamRoster } from './types'

export function useTeamRoster(leagueId: LeagueId, teamId: string | null, enabled: boolean) {
  const [data, setData] = useState<TeamRoster | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !teamId) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setData(null)
    setLoading(true)
    setError(null)

    fetchTeamRoster(leagueId, teamId)
      .then((roster) => {
        if (cancelled) return
        setData(roster)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load roster')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, teamId, enabled, reloadToken])

  return { data, loading, error, reload }
}
