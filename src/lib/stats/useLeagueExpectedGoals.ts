import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import {
  fetchLeagueExpectedGoals,
  hasFotmobAdvancedStats,
  type LeagueExpectedGoals,
} from './fotmob'
import { useLeagueSeasons } from './useLeagueSeasons'

/**
 * League xG boards. Pass `withSeasonPicker: true` to resolve FotMob seasons
 * first (league Expected goals accordion). Team profile facts omit the picker
 * and load the latest available season immediately.
 */
export function useLeagueExpectedGoals(
  leagueId: LeagueId,
  enabled: boolean,
  options?: { withSeasonPicker?: boolean },
) {
  const withPicker = Boolean(options?.withSeasonPicker)
  const supported = hasFotmobAdvancedStats(leagueId)
  const seasonsState = useLeagueSeasons(leagueId, enabled && supported && withPicker, 'fotmob')
  const [data, setData] = useState<LeagueExpectedGoals | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !supported) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    if (withPicker && seasonsState.seasonsLoading) return
    if (withPicker && seasonsState.selectedSeason == null && seasonsState.seasons.length > 0) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const year = withPicker ? seasonsState.selectedSeason ?? undefined : undefined
    fetchLeagueExpectedGoals(leagueId, 10, year)
      .then((overview) => {
        if (cancelled) return
        setData(overview)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load expected goals')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    leagueId,
    enabled,
    supported,
    withPicker,
    seasonsState.seasonsLoading,
    seasonsState.selectedSeason,
    seasonsState.seasons.length,
  ])

  return {
    data,
    loading,
    error,
    supported,
    seasons: seasonsState.seasons,
    seasonsLoading: seasonsState.seasonsLoading,
    selectedSeason: seasonsState.selectedSeason,
    selectSeason: seasonsState.selectSeason,
  }
}
