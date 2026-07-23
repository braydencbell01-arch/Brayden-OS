import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeaguePlayerStatsOverview } from './espn'
import type { LeaguePlayerStatsOverview } from './types'
import { useLeagueSeasons } from './useLeagueSeasons'

export function useLeaguePlayerStats(leagueId: LeagueId, enabled: boolean) {
  const { seasons, seasonsLoading, selectedSeason, selectSeason } = useLeagueSeasons(
    leagueId,
    enabled,
    'leaders',
  )
  const [data, setData] = useState<LeaguePlayerStatsOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    if (seasonsLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLeaguePlayerStatsOverview(leagueId, 5, selectedSeason ?? undefined)
      .then((overview) => {
        if (cancelled) return
        setData(overview)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load player stats')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, enabled, selectedSeason, seasonsLoading])

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
