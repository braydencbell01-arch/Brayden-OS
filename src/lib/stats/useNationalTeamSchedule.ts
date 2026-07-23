import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { isInternationalLeague } from '../leagues'
import { fetchNationalTeamSchedules, type Match } from '../matches'

/** Extra national-team fixtures from ESPN schedules (beyond the Match Day cache). */
export function useNationalTeamSchedule(
  teamId: string | null,
  leagueId: LeagueId,
  enabled: boolean,
) {
  const [data, setData] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNational = isInternationalLeague(leagueId)

  useEffect(() => {
    if (!enabled || !teamId || !isNational) {
      setData([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchNationalTeamSchedules(teamId, leagueId)
      .then((matches) => {
        if (cancelled) return
        setData(matches)
      })
      .catch((err) => {
        if (cancelled) return
        setData([])
        setError(err instanceof Error ? err.message : 'Could not load national fixtures')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, leagueId, enabled, isNational])

  return { data, loading, error }
}
