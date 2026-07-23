import { useEffect, useState } from 'react'
import { fetchPlayerCareerSeasons } from './espn'
import type { PlayerCareerSeason, PlayerClubStint } from './types'

export function usePlayerCareer(
  playerId: string | null,
  clubHistory: PlayerClubStint[] | undefined,
  positionAbbrev: string | undefined,
  enabled: boolean,
  options?: { national?: boolean },
) {
  const [seasons, setSeasons] = useState<PlayerCareerSeason[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const national = options?.national === true

  useEffect(() => {
    if (!enabled || !playerId || !clubHistory) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchPlayerCareerSeasons(playerId, clubHistory, positionAbbrev, { national })
      .then((rows) => {
        if (cancelled) return
        setSeasons(rows)
      })
      .catch((err) => {
        if (cancelled) return
        setSeasons([])
        setError(err instanceof Error ? err.message : 'Could not load career')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, playerId, clubHistory, positionAbbrev, national])

  return { seasons, loading, error }
}
