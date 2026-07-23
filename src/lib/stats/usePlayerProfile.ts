import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeagueId } from '../leagues'
import { getLeague } from '../leagues'
import {
  fetchNextPlayerRatingsBatch,
  fetchPlayerProfile,
  fetchPlayerSeasonOptions,
  fetchPlayerSeasonStatsForYear,
  formatSeasonShortLabel,
} from './espn'
import type { LeagueSeasonOption, PlayerProfile, PlayerRatingsCursor } from './types'

export function usePlayerProfile(leagueId: LeagueId | null, playerId: string | null) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMoreRatings, setLoadingMoreRatings] = useState(false)
  const [hasMoreRatings, setHasMoreRatings] = useState(false)
  const [ratingsMoreError, setRatingsMoreError] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<LeagueSeasonOption[]>([])
  const [seasonsLoading, setSeasonsLoading] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const requestId = useRef(0)
  const ratingsCursor = useRef<PlayerRatingsCursor | null>(null)
  const loadMoreLock = useRef(false)

  const load = useCallback(async (league: LeagueId, id: string) => {
    const req = ++requestId.current
    setLoading(true)
    setError(null)
    setRatingsMoreError(null)
    setHasMoreRatings(false)
    setSeasons([])
    setSelectedSeason(null)
    ratingsCursor.current = null
    try {
      const data = await fetchPlayerProfile(league, id)
      if (requestId.current !== req) return
      setProfile(data.profile)
      setSelectedSeason(data.profile.seasonYear ?? data.profile.availableSeasonYears?.[0] ?? null)
      ratingsCursor.current = data.ratingsCursor
      setHasMoreRatings(!data.ratingsCursor.done)

      // Build picker options in the background from years already known on the profile.
      const years = data.profile.availableSeasonYears ?? []
      if (years.length > 0) {
        setSeasonsLoading(true)
        fetchPlayerSeasonOptions(league, id)
          .then((options) => {
            if (requestId.current !== req) return
            setSeasons(options.length > 0 ? options : years.map((year) => ({
              year,
              label: `${year} season`,
              shortLabel: formatSeasonShortLabel(year),
            })))
          })
          .catch(() => {
            if (requestId.current !== req) return
            setSeasons(
              years.map((year) => ({
                year,
                label: `${year} season`,
                shortLabel: formatSeasonShortLabel(year),
              })),
            )
          })
          .finally(() => {
            if (requestId.current === req) setSeasonsLoading(false)
          })
      }
    } catch (err) {
      if (requestId.current !== req) return
      setProfile(null)
      setError(err instanceof Error ? err.message : 'Could not load player profile')
    } finally {
      if (requestId.current === req) setLoading(false)
    }
  }, [])

  const selectSeason = useCallback(
    (year: number) => {
      if (!leagueId || !playerId || !profile) return
      if (selectedSeason === year) return
      setSelectedSeason(year)
      setStatsLoading(true)
      const req = requestId.current
      fetchPlayerSeasonStatsForYear(leagueId, playerId, year)
        .then((bundle) => {
          if (requestId.current !== req) return
          setProfile((current) => {
            if (!current) return current
            return {
              ...current,
              seasonStats: bundle.stats,
              seasonStatsLabel: bundle.seasonLabel || current.seasonStatsLabel,
              seasonYear: bundle.seasonYear,
              previousSeasonStats: bundle.previousStats,
              previousSeasonStatsLabel: bundle.previousSeasonLabel || undefined,
            }
          })
        })
        .catch(() => {
          // Keep prior stats visible; picker still reflects the attempted year.
        })
        .finally(() => {
          if (requestId.current === req) setStatsLoading(false)
        })
    },
    [leagueId, playerId, profile, selectedSeason],
  )

  const loadMoreRatings = useCallback(async () => {
    if (!leagueId || !playerId || !profile) return
    if (!ratingsCursor.current || ratingsCursor.current.done) return
    if (loadMoreLock.current || loadingMoreRatings) return

    loadMoreLock.current = true
    setLoadingMoreRatings(true)
    setRatingsMoreError(null)
    const req = requestId.current
    try {
      const league = getLeague(leagueId)
      const exclude = new Set(profile.recentRatings.map((row) => row.eventId))
      const batch = await fetchNextPlayerRatingsBatch(
        league.espnCode,
        playerId,
        profile.positionAbbrev,
        ratingsCursor.current,
        exclude,
      )
      if (requestId.current !== req) return
      ratingsCursor.current = batch.cursor
      setHasMoreRatings(!batch.cursor.done)
      if (batch.ratings.length > 0) {
        setProfile((current) => {
          if (!current) return current
          const seen = new Set(current.recentRatings.map((row) => row.eventId))
          const appended = batch.ratings.filter((row) => !seen.has(row.eventId))
          if (appended.length === 0) return current
          return {
            ...current,
            recentRatings: [...current.recentRatings, ...appended],
          }
        })
      }
    } catch {
      if (requestId.current === req) {
        setRatingsMoreError('Could not load more ratings')
      }
    } finally {
      loadMoreLock.current = false
      if (requestId.current === req) setLoadingMoreRatings(false)
    }
  }, [leagueId, loadingMoreRatings, playerId, profile])

  useEffect(() => {
    if (!leagueId || !playerId) {
      requestId.current += 1
      setProfile(null)
      setError(null)
      setRatingsMoreError(null)
      setLoading(false)
      setHasMoreRatings(false)
      setSeasons([])
      setSelectedSeason(null)
      setStatsLoading(false)
      ratingsCursor.current = null
      return
    }
    setProfile(null)
    void load(leagueId, playerId)
  }, [leagueId, playerId, load])

  return {
    profile,
    loading,
    error,
    reload: load,
    loadMoreRatings,
    loadingMoreRatings,
    hasMoreRatings,
    ratingsMoreError,
    seasons,
    seasonsLoading,
    selectedSeason,
    selectSeason,
    statsLoading,
  }
}
