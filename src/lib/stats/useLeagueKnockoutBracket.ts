import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import {
  fetchLeagueKnockoutBracket,
  type KnockoutBracket,
} from './knockoutBracket'
import { useLeagueSeasons } from './useLeagueSeasons'

export function useLeagueKnockoutBracket(leagueId: LeagueId, enabled = true) {
  const { seasons, seasonsLoading, selectedSeason, selectSeason } = useLeagueSeasons(
    leagueId,
    enabled,
    'all',
  )
  const [data, setData] = useState<KnockoutBracket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (selectedSeason == null) return
    setLoading(true)
    setError(null)
    try {
      const bracket = await fetchLeagueKnockoutBracket(leagueId, selectedSeason)
      setData(bracket)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load knockout bracket')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [leagueId, selectedSeason])

  useEffect(() => {
    if (!enabled) return
    if (seasonsLoading) return
    if (selectedSeason == null) {
      setLoading(false)
      setData(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchLeagueKnockoutBracket(leagueId, selectedSeason)
      .then((bracket) => {
        if (!cancelled) setData(bracket)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load knockout bracket',
          )
          setData(null)
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
    data,
    loading: loading || seasonsLoading,
    error,
    reload: load,
    seasons,
    seasonsLoading,
    selectedSeason,
    selectSeason,
  }
}
