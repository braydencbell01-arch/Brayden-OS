import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamSchedule, type Match } from '../matches'

/** Extra fixtures from ESPN team schedules (beyond the Match Day cache). */
export function useTeamSchedule(teamId: string | null, leagueId: LeagueId, enabled: boolean) {
  const [data, setData] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !teamId) {
      setData([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTeamSchedule(teamId, leagueId)
      .then((matches) => {
        if (cancelled) return
        setData(matches)
      })
      .catch((err) => {
        if (cancelled) return
        setData([])
        setError(err instanceof Error ? err.message : 'Could not load team fixtures')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, leagueId, enabled])

  return { data, loading, error }
}

/** @deprecated Prefer useTeamSchedule — kept for any remaining national-only call sites. */
export function useNationalTeamSchedule(
  teamId: string | null,
  leagueId: LeagueId,
  enabled: boolean,
) {
  return useTeamSchedule(teamId, leagueId, enabled)
}
