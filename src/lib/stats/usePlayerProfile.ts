import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeagueId } from '../leagues'
import { getLeague } from '../leagues'
import {
  fetchNextPlayerRatingsBatch,
  sortRatingsNewestFirst,
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
  const [selectedSeasonKey, setSelectedSeasonKey] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const requestId = useRef(0)
  // Dedicated generation for season-stats fetches so out-of-order responses
  // (fast picker changes) can't overwrite the latest requested season.
  const seasonStatsReq = useRef(0)
  // Tracks whether the user manually picked a season, so the async season
  // options resolution below doesn't snap the selection back to the newest year.
  const userPickedSeason = useRef(false)
  const ratingsCursor = useRef<PlayerRatingsCursor | null>(null)
  const loadMoreLock = useRef(false)

  const load = useCallback(async (league: LeagueId, id: string) => {
    const req = ++requestId.current
    seasonStatsReq.current += 1
    userPickedSeason.current = false
    setLoading(true)
    setError(null)
    setRatingsMoreError(null)
    setHasMoreRatings(false)
    setSeasons([])
    setSelectedSeason(null)
    setSelectedSeasonKey(null)
    ratingsCursor.current = null
    try {
      const data = await fetchPlayerProfile(league, id)
      if (requestId.current !== req) return
      setProfile(data.profile)
      const newestYear =
        data.profile.availableSeasonYears?.[0] ?? data.profile.seasonYear ?? null
      setSelectedSeason(newestYear)
      ratingsCursor.current = data.ratingsCursor
      setHasMoreRatings(!data.ratingsCursor.done)

      // Career-wide domestic seasons (every club), not only the current team league.
      setSeasonsLoading(true)
      fetchPlayerSeasonOptions(data.profile.leagueId, id)
        .then((options) => {
          if (requestId.current !== req) return
          const years = data.profile.availableSeasonYears ?? []
          const ordered =
            options.length > 0
              ? [...options].sort((a, b) => b.year - a.year)
              : [...years]
                  .sort((a, b) => b - a)
                  .map((year) => ({
                    year,
                    label: `${year} season`,
                    shortLabel: formatSeasonShortLabel(year),
                    key: String(year),
                  }))
          setSeasons(ordered)
          const top = ordered[0] ?? null
          // Don't override a season the user picked while options were loading.
          if (top != null && !userPickedSeason.current) {
            setSelectedSeason(top.year)
            setSelectedSeasonKey(top.key ?? String(top.year))
          }
        })
        .catch(() => {
          if (requestId.current !== req) return
          const years = data.profile.availableSeasonYears ?? []
          setSeasons(
            [...years]
              .sort((a, b) => b - a)
              .map((year) => ({
                year,
                label: `${year} season`,
                shortLabel: formatSeasonShortLabel(year),
                key: String(year),
              })),
          )
        })
        .finally(() => {
          if (requestId.current === req) setSeasonsLoading(false)
        })

      // Keep season stats aligned with the newest year when profile loaded another.
      if (
        newestYear != null &&
        data.profile.seasonYear != null &&
        newestYear !== data.profile.seasonYear
      ) {
        setStatsLoading(true)
        const statsReq = ++seasonStatsReq.current
        fetchPlayerSeasonStatsForYear(data.profile.leagueId, id, newestYear)
          .then((bundle) => {
            if (requestId.current !== req || seasonStatsReq.current !== statsReq) return
            if (bundle.seasonYear != null && bundle.seasonYear !== newestYear) return
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
            /* keep initial profile stats */
          })
          .finally(() => {
            if (requestId.current === req && seasonStatsReq.current === statsReq) {
              setStatsLoading(false)
            }
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
    (year: number, option?: LeagueSeasonOption) => {
      if (!playerId || !profile) return
      const nextKey = option?.key ?? selectedSeasonKey ?? String(year)
      if (selectedSeason === year && selectedSeasonKey === nextKey && option == null) return
      if (option?.key && selectedSeasonKey === option.key) return
      userPickedSeason.current = true
      setSelectedSeason(year)
      setSelectedSeasonKey(nextKey)
      setStatsLoading(true)
      // Bump the season-stats generation so a slower earlier request can't
      // land after this one and show the wrong season.
      const req = ++seasonStatsReq.current
      const espnCode =
        option?.espnCode ||
        seasons.find((row) => (row.key ?? String(row.year)) === nextKey)?.espnCode
      const teamId =
        option?.teamId ||
        seasons.find((row) => (row.key ?? String(row.year)) === nextKey)?.teamId
      fetchPlayerSeasonStatsForYear(profile.leagueId, playerId, year, espnCode, teamId)
        .then((bundle) => {
          if (seasonStatsReq.current !== req) return
          // Keep picker honest — only accept rows for the requested year.
          if (bundle.seasonYear != null && bundle.seasonYear !== year) return
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
          if (seasonStatsReq.current === req) setStatsLoading(false)
        })
    },
    [playerId, profile, seasons, selectedSeason, selectedSeasonKey],
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
      const league = getLeague(profile.leagueId)
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
            recentRatings: sortRatingsNewestFirst([
              ...current.recentRatings,
              ...appended,
            ]),
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
      seasonStatsReq.current += 1
      userPickedSeason.current = false
      setProfile(null)
      setError(null)
      setRatingsMoreError(null)
      setLoading(false)
      setHasMoreRatings(false)
      setSeasons([])
      setSelectedSeason(null)
      setSelectedSeasonKey(null)
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
    selectedSeasonKey,
    selectSeason,
    statsLoading,
  }
}
