import type { FantasyPlayer } from './types'
import { projectSeasonPoints, projectWeekPoints } from './scoring'

export type FplCatalog = {
  source: string
  generatedAt: string
  currentGw: number
  nextGw: number
  finishedGws: number
  teams: Array<{ id: number; name: string; short: string }>
  players: FantasyPlayer[]
}

let cached: FplCatalog | null = null
let inflight: Promise<FplCatalog> | null = null

function recomputeProjections(catalog: FplCatalog): FplCatalog {
  const remaining = Math.max(0, 38 - catalog.finishedGws)
  const players = catalog.players.map((p) => {
    const weekProjection = projectWeekPoints(p)
    return {
      ...p,
      weekProjection,
      seasonProjection: projectSeasonPoints({ ...p, weekProjection }),
      restOfSeasonProjection: Math.round(weekProjection * remaining * 10) / 10,
    }
  })
  players.sort(
    (a, b) =>
      b.seasonProjection - a.seasonProjection ||
      b.totalPoints - a.totalPoints ||
      a.webName.localeCompare(b.webName),
  )
  return { ...catalog, players }
}

export async function loadFplCatalog(): Promise<FplCatalog> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = (async () => {
    const url = `${import.meta.env.BASE_URL}fantasy/fpl-players.json`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Could not load Premier League fantasy players')
    const data = (await res.json()) as FplCatalog
    cached = recomputeProjections(data)
    return cached
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export function getCachedCatalog(): FplCatalog | null {
  return cached
}

export function playerById(catalog: FplCatalog, id: number): FantasyPlayer | undefined {
  return catalog.players.find((p) => p.id === id)
}

export function draftBoardRanking(catalog: FplCatalog, taken: Set<number>): FantasyPlayer[] {
  return catalog.players.filter((p) => !taken.has(p.id) && p.status !== 'u')
}
