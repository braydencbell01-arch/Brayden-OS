import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeagueLeaders } from './espn'
import type { LeagueLeaders } from './types'
import { useLeagueSeasons } from './useLeagueSeasons'

export function useLeagueLeaders(leagueId: LeagueId, enabled: boolean) {
  const { seasons, seasonsLoading, selectedSeason, selectSeason } = useLeagueSeasons(
    leagueId,
    enabled,
    'leaders',
  )
  const [data, setData] = useState<LeagueLeaders | null>(null)
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

    fetchLeagueLeaders(leagueId, 8, selectedSeason ?? undefined)
      .then((leaders) => {
        if (cancelled) return
        setData(leaders)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load stats leaders')
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
