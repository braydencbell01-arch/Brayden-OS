import { useEffect, useState } from 'react'
import { getLeague, type LeagueId } from '../leagues'
import { fetchTeamRoster } from './espn'
import type { TeamRoster } from './types'
import { useLeagueSeasons } from './useLeagueSeasons'

export function useTeamRoster(leagueId: LeagueId, teamId: string | null, enabled: boolean) {
  // Prefer seasons with real tables so the default year is not an empty preseason shell.
  const seasonMode = getLeague(leagueId).hasStandings ? 'standings' : 'all'
  const { seasons, seasonsLoading, selectedSeason, selectSeason } = useLeagueSeasons(
    leagueId,
    enabled && Boolean(teamId),
    seasonMode,
  )
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

    fetchTeamRoster(leagueId, teamId, selectedSeason ?? undefined)
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
  }, [leagueId, teamId, enabled, selectedSeason, seasonsLoading])

  return {
    data,
    loading,
    error,
    seasons,
    seasonsLoading,
    selectedSeason,
    selectSeason,
  }
}
