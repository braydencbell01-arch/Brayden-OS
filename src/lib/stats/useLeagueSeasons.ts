import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import {
  fetchLeagueLeaderSeasons,
  fetchLeagueSeasons,
  fetchLeagueStandingSeasons,
} from './espn'
import { fetchFotmobSeasonOptions } from './fotmob'
import type { LeagueSeasonOption } from './types'

export type LeagueSeasonMode = 'all' | 'standings' | 'leaders' | 'fotmob'

/**
 * Shared season list + selection for league-scoped profile sections.
 * All modes return seasons newest-first (current / upcoming at the top);
 * the default selection is always `options[0]`.
 * - `all`: every ESPN season for the league
 * - `standings`: ESPN seasons for the league table (same chronological order)
 * - `leaders`: ESPN seasons that have leaderboard data
 * - `fotmob`: FotMob seasons with xG boards
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
          : mode === 'standings'
            ? fetchLeagueStandingSeasons
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
