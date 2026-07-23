import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeagueLeaderSeasons, fetchTeamStatLeaders } from './espn'
import type { LeagueSeasonOption, TeamStatLeaders } from './types'

export function useTeamStatLeaders(
  leagueId: LeagueId,
  teamId: string | null,
  enabled: boolean,
) {
  const [data, setData] = useState<TeamStatLeaders | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<LeagueSeasonOption[]>([])
  const [seasonsLoading, setSeasonsLoading] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled || !teamId) return

    let cancelled = false
    setSeasonsLoading(true)
    setData(null)
    setError(null)
    setSelectedSeason(null)

    fetchLeagueLeaderSeasons(leagueId)
      .then((options) => {
        if (cancelled) return
        setSeasons(options)
        setSelectedSeason(options[0]?.year ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setSeasons([])
        setSelectedSeason(null)
      })
      .finally(() => {
        if (!cancelled) setSeasonsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, teamId, enabled])

  useEffect(() => {
    if (!enabled || !teamId) return
    // Wait until seasons resolve so the first paint uses a known-good year when possible.
    if (seasonsLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchTeamStatLeaders(leagueId, teamId, 3, selectedSeason ?? undefined)
      .then((leaders) => {
        if (cancelled) return
        setData(leaders)
        setSelectedSeason((current) => current ?? leaders.season)
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
  }, [leagueId, teamId, enabled, selectedSeason, seasonsLoading])

  const selectSeason = useCallback((year: number) => {
    setSelectedSeason(year)
  }, [])

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
