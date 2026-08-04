import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import {
  fetchLeagueLeaderSeasons,
  fetchLeagueSeasons,
  fetchLeagueStandingSeasons,
} from './espn'
import { fetchFotmobSeasonOptions } from './fotmob'
import {
  ensureCurrentSeasonOption,
  pickDefaultSeasonYear,
} from './seasonDefaults'
import type { LeagueSeasonOption } from './types'

export type LeagueSeasonMode = 'all' | 'standings' | 'leaders' | 'fotmob'

/**
 * Shared season list + selection for league-scoped profile sections.
 * Defaults to the current Aug–Jul season when ESPN has it; otherwise the
 * newest real edition (so idle cups like Club World Cup open on last played).
 * - `all`: every ESPN season for the league
 * - `standings`: ESPN seasons for the league table
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
        const withCurrent = ensureCurrentSeasonOption(leagueId, options)
        setSeasons(withCurrent)
        setSelectedSeason(pickDefaultSeasonYear(leagueId, withCurrent))
      })
      .catch(() => {
        if (cancelled) return
        const withCurrent = ensureCurrentSeasonOption(leagueId, [])
        setSeasons(withCurrent)
        setSelectedSeason(pickDefaultSeasonYear(leagueId, withCurrent))
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
