import { useCallback, useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchPlayerProfile } from './espn'
import type { PlayerProfile } from './types'

export function usePlayerProfile(leagueId: LeagueId | null, playerId: string | null) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (league: LeagueId, id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPlayerProfile(league, id)
      setProfile(data)
    } catch (err) {
      setProfile(null)
      setError(err instanceof Error ? err.message : 'Could not load player profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!leagueId || !playerId) {
      setProfile(null)
      setError(null)
      setLoading(false)
      return
    }
    void load(leagueId, playerId)
  }, [leagueId, playerId, load])

  return { profile, loading, error, reload: load }
}
