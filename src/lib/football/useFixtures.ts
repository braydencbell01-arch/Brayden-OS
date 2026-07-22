import { useEffect, useState } from 'react'
import {
  fetchFixturesByDate,
  fetchLiveFixtures,
  hasInPlay,
  hasLiveApiConfigured,
  mergeLiveScores,
} from './client'
import { getMockFixtures } from './mock'
import type { FixturesResponse, LeagueId, Match } from './types'

const LIVE_POLL_MS = 30_000
const IDLE_POLL_MS = 5 * 60_000

export type UseFixturesState = {
  matches: Match[]
  loading: boolean
  error: string | null
  source: FixturesResponse['source']
  updatedAt: string | null
  usingMock: boolean
}

/**
 * Loads Big 5 fixtures for a calendar day and keeps live scores fresh.
 * Falls back to mock data when VITE_FOOTBALL_API_BASE is unset.
 */
export function useFixtures(date: Date, leagueId?: LeagueId | null): UseFixturesState {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<FixturesResponse['source']>('mock')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const usingMock = !hasLiveApiConfigured()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const apply = (next: Match[], src: FixturesResponse['source'], at: string) => {
      if (cancelled) return
      setMatches(next)
      setSource(src)
      setUpdatedAt(at)
      setError(null)
      setLoading(false)
    }

    const loadMock = () => {
      const next = getMockFixtures(date, leagueId)
      apply(next, 'mock', new Date().toISOString())
    }

    const schedule = (ms: number) => {
      timer = setTimeout(() => {
        void tick(false)
      }, ms)
    }

    const tick = async (initial: boolean) => {
      if (usingMock) {
        loadMock()
        schedule(LIVE_POLL_MS)
        return
      }

      try {
        if (initial) setLoading(true)

        const day = await fetchFixturesByDate(date, leagueId, controller.signal)

        let next = day.matches
        if (hasInPlay(day.matches) || isLikelyMatchWindow()) {
          try {
            const live = await fetchLiveFixtures(leagueId, controller.signal)
            next = mergeLiveScores(day.matches, live.matches)
          } catch {
            // Keep day fixtures if live poll fails.
          }
        }

        apply(next, 'live', new Date().toISOString())
        schedule(hasInPlay(next) ? LIVE_POLL_MS : IDLE_POLL_MS)
      } catch (err) {
        if (cancelled || controller.signal.aborted) return
        if (initial) {
          // Soft-fallback so the app still shows something useful.
          loadMock()
          setError(err instanceof Error ? err.message : 'Failed to load fixtures')
          setSource('mock')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to refresh fixtures')
        }
        schedule(IDLE_POLL_MS)
      }
    }

    void tick(true)

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [date, leagueId, usingMock])

  return { matches, loading, error, source, updatedAt, usingMock }
}

function isLikelyMatchWindow(): boolean {
  const hour = new Date().getHours()
  // Rough Big 5 kickoff window in local time (weekend lunch through late night).
  return hour >= 10 && hour <= 23
}
