import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchTeamClubFacts, type TeamClubFacts } from './teamFacts'

export function useTeamClubFacts(
  leagueId: LeagueId | null,
  teamId: string | null,
  teamName: string | null,
) {
  const [data, setData] = useState<TeamClubFacts | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(async (league: LeagueId, id: string, name: string) => {
    const req = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const facts = await fetchTeamClubFacts(league, id, name)
      if (requestId.current !== req) return
      setData(facts)
    } catch (err) {
      if (requestId.current !== req) return
      setData(null)
      setError(err instanceof Error ? err.message : 'Could not load team facts')
    } finally {
      if (requestId.current === req) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!leagueId || !teamId || !teamName) {
      requestId.current += 1
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    setData(null)
    void load(leagueId, teamId, teamName)
  }, [leagueId, teamId, teamName, load])

  return { data, loading, error, reload: load }
}
