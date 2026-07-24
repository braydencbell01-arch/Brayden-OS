import { useCallback, useEffect, useRef, useState } from 'react'
import { getLeague, type LeagueId } from '../leagues'
import { pickEspnLogoUrl } from './branding'

type EspnScoreboardLeague = {
  id?: string | number
  logos?: Array<{ href?: string; rel?: string[] }>
}

const cache = new Map<string, string | null>()

export async function fetchLeagueLogoUrl(leagueId: LeagueId): Promise<string | null> {
  if (cache.has(leagueId)) return cache.get(leagueId) ?? null
  const league = getLeague(leagueId)
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnCode}/scoreboard?limit=1`,
    )
    if (!res.ok) {
      cache.set(leagueId, null)
      return null
    }
    const data = (await res.json()) as { leagues?: EspnScoreboardLeague[] }
    const entry = data.leagues?.[0]
    const href = pickEspnLogoUrl(entry?.logos, 'default') || null
    cache.set(leagueId, href)
    return href
  } catch {
    cache.set(leagueId, null)
    return null
  }
}

export function useLeagueLogo(leagueId: LeagueId | null) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(async (id: LeagueId) => {
    const req = ++requestId.current
    setLoading(true)
    try {
      const href = await fetchLeagueLogoUrl(id)
      if (requestId.current !== req) return
      setLogoUrl(href)
    } finally {
      if (requestId.current === req) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!leagueId) {
      requestId.current += 1
      setLogoUrl(null)
      setLoading(false)
      return
    }
    setLogoUrl(null)
    void load(leagueId)
  }, [leagueId, load])

  return { logoUrl, loading }
}
