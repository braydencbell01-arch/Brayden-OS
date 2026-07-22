import { useEffect, useState } from 'react'
import type { LeagueId } from '../leagues'
import { fetchLeagueStandings } from './espn'
import type { StandingRow } from './types'

export function useLeagueStandings(leagueId: LeagueId) {
  const [rows, setRows] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchLeagueStandings(leagueId)
        if (!cancelled) setRows(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load standings')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [leagueId])

  return { rows, loading, error }
}
