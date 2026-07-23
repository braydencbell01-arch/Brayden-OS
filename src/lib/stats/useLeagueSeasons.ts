import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeagueLeaderSeasons, fetchLeagueSeasons } from './espn'
import { fetchFotmobSeasonOptions } from './fotmob'
import type { LeagueSeasonOption } from './types'

export type LeagueSeasonMode = 'all' | 'leaders' | 'fotmob'

/**
 * Shared season list + selection for league-scoped profile sections.
 * - `all`: every ESPN season for the league
 * - `leaders`: ESPN seasons that have leaderboard data
 * - `fotmob`: FotMob seasons with advanced-stat season links (xG)
 */
export function useLeagueSeasons(
  leagueId: LeagueId,
  enabled: boolean,
  mode: LeagueSeasonMode = 'all',
) {
  const [seasons, setSeasons] = useState<LeagueSeasonOption[]>([])
  const [seasonsLoading, setSeasonsLoading] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setSeasonsLoading(true)
    setSelectedSeason(null)

    const load =
      mode === 'leaders'
        ? fetchLeagueLeaderSeasons
        : mode === 'fotmob'
          ? fetchFotmobSeasonOptions
          : fetchLeagueSeasons
    load(leagueId)
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
  }, [leagueId, enabled, mode])

  const selectSeason = useCallback((year: number) => {
    setSelectedSeason(year)
  }, [])

  return {
    seasons,
    seasonsLoading,
    selectedSeason,
    selectSeason,
  }
}
