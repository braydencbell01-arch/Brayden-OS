import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamSeasonOptions } from './espn'
import type { LeagueSeasonOption } from './types'

/**
 * Club season list labeled by the division the team actually played
 * (or "All competitions" for the Stats tab).
 */
export function useTeamSeasons(
  leagueId: LeagueId,
  teamId: string | null,
  enabled: boolean,
  labelMode: 'division' | 'all-competitions' = 'division',
) {
  const [seasons, setSeasons] = useState<LeagueSeasonOption[]>([])
  const [seasonsLoading, setSeasonsLoading] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedEspnCode, setSelectedEspnCode] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!enabled || !teamId) return

    let cancelled = false
    setSeasonsLoading(true)
    setSelectedSeason(null)
    setSelectedKey(null)
    setSelectedEspnCode(undefined)

    fetchTeamSeasonOptions(leagueId, teamId, { labelMode })
      .then((options) => {
        if (cancelled) return
        setSeasons(options)
        const first = options[0]
        setSelectedSeason(first?.year ?? null)
        setSelectedKey(first?.key ?? null)
        setSelectedEspnCode(first?.espnCode)
      })
      .catch(() => {
        if (cancelled) return
        setSeasons([])
        setSelectedSeason(null)
        setSelectedKey(null)
        setSelectedEspnCode(undefined)
      })
      .finally(() => {
        if (!cancelled) setSeasonsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leagueId, teamId, enabled, labelMode])

  const selectSeason = useCallback((year: number, option?: LeagueSeasonOption) => {
    setSelectedSeason(year)
    if (option) {
      setSelectedKey(option.key ?? `${option.espnCode ?? ''}:${year}`)
      setSelectedEspnCode(option.espnCode)
      return
    }
    setSelectedKey(null)
    setSelectedEspnCode(undefined)
  }, [])

  return {
    seasons,
    seasonsLoading,
    selectedSeason,
    selectedKey,
    selectedEspnCode,
    selectSeason,
  }
}
