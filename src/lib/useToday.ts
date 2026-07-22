import { useEffect, useMemo, useState } from 'react'
import { startOfDay, toDateKey } from './dates'

/**
 * Calendar "today" that updates after midnight (and when the tab becomes visible),
 * so long-lived sessions do not keep a frozen day key.
 */
export function useTodayKey(): string {
  const [todayKey, setTodayKey] = useState(() => toDateKey(startOfDay(new Date())))

  useEffect(() => {
    const sync = () => {
      const next = toDateKey(startOfDay(new Date()))
      setTodayKey((prev) => (prev === next ? prev : next))
    }
    const id = window.setInterval(sync, 60_000)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  return todayKey
}

export function useToday(): Date {
  const todayKey = useTodayKey()
  return useMemo(() => {
    const [y, m, d] = todayKey.split('-').map(Number)
    return startOfDay(new Date(y, m - 1, d))
  }, [todayKey])
}
