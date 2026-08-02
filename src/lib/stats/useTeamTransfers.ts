import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamTransfers, type TeamTransfer } from './teamTransfers'

export function useTeamTransfers(
  leagueId: LeagueId,
  teamId: string | null,
  enabled: boolean,
) {
  const [data, setData] = useState<TeamTransfer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !teamId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTeamTransfers(leagueId, teamId)
      .then((rows) => {
        if (cancelled) return
        setData(rows)
      })
      .catch((err) => {
        if (cancelled) return
        setData([])
        setError(err instanceof Error ? err.message : 'Could not load transfers')
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
