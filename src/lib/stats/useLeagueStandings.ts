import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeagueStandings } from './espn'
import type { StandingRow } from './types'
import { useLeagueSeasons } from './useLeagueSeasons'

export function useLeagueStandings(leagueId: LeagueId, enabled = true) {
  const { seasons, seasonsLoading, selectedSeason, selectSeason } = useLeagueSeasons(
    leagueId,
    enabled,
    'standings',
  )
  const [rows, setRows] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLeagueStandings(leagueId, selectedSeason ?? undefined)
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load standings')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [leagueId, selectedSeason])

  useEffect(() => {
    if (!enabled) return
    if (seasonsLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchLeagueStandings(leagueId, selectedSeason ?? undefined)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load standings')
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leagueId, enabled, selectedSeason, seasonsLoading])

  return {
    rows,
    loading,
    error,
    reload: load,
    seasons,
    seasonsLoading,
    selectedSeason,
    selectSeason,
  }
}
