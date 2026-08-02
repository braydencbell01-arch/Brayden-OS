import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamStatLeaders } from './espn'
import type { TeamStatLeaders } from './types'
import { useTeamSeasons } from './useTeamSeasons'

export function useTeamStatLeaders(
  leagueId: LeagueId,
  teamId: string | null,
  enabled: boolean,
) {
  const {
    seasons,
    seasonsLoading,
    selectedSeason,
    selectedKey,
    selectedEspnCode,
    selectSeason,
  } = useTeamSeasons(leagueId, teamId, enabled && Boolean(teamId), 'all-competitions')
  const [data, setData] = useState<TeamStatLeaders | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !teamId) {
      setLoading(false)
      return
    }
    // Wait until seasons resolve so the first paint uses a known-good year when possible.
    if (seasonsLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTeamStatLeaders(
      leagueId,
      teamId,
      3,
      selectedSeason ?? undefined,
      selectedEspnCode,
    )
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
