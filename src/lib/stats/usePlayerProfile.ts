import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchPlayerProfile } from './espn'
import type { PlayerProfile } from './types'

export function usePlayerProfile(leagueId: LeagueId | null, playerId: string | null) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(async (league: LeagueId, id: string) => {
    const req = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPlayerProfile(league, id)
      if (requestId.current !== req) return
      setProfile(data)
    } catch (err) {
      if (requestId.current !== req) return
      setProfile(null)
      setError(err instanceof Error ? err.message : 'Could not load player profile')
    } finally {
      if (requestId.current === req) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!leagueId || !playerId) {
      requestId.current += 1
      setProfile(null)
      setError(null)
      setLoading(false)
      return
    }
    setProfile(null)
    void load(leagueId, playerId)
  }, [leagueId, playerId, load])

  return { profile, loading, error, reload: load }
}
