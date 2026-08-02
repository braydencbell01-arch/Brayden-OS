import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamRoster } from './espn'
import type { TeamRoster } from './types'
import { useTeamSeasons } from './useTeamSeasons'

export function useTeamRoster(leagueId: LeagueId, teamId: string | null, enabled: boolean) {
  const {
    seasons,
    seasonsLoading,
    selectedSeason,
    selectedKey,
    selectedEspnCode,
    selectSeason,
  } = useTeamSeasons(leagueId, teamId, enabled && Boolean(teamId), 'division')
  const [data, setData] = useState<TeamRoster | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !teamId) {
      setLoading(false)
      return
    }
    if (seasonsLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTeamRoster(leagueId, teamId, selectedSeason ?? undefined, selectedEspnCode)
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
  }, [leagueId, teamId, enabled, selectedSeason, selectedEspnCode, seasonsLoading])

  return {
    data,
    loading,
    error,
    seasons,
    seasonsLoading,
    selectedSeason,
    selectedKey,
    selectSeason,
  }
}
