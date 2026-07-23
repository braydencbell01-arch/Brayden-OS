import { useEffect, useState } from 'react'
import { fetchPlayerAdvancedExtras, type PlayerAdvancedExtras } from './fotmob'

export function usePlayerAdvancedExtras(playerName: string | null, enabled: boolean) {
  const [data, setData] = useState<PlayerAdvancedExtras | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !playerName?.trim()) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchPlayerAdvancedExtras(playerName)
      .then((extras) => {
        if (cancelled) return
        setData(extras)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Could not load advanced stats')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playerName, enabled])

  return { data, loading, error }
}
