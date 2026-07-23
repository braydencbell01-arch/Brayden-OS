import type { FantasyLeague } from './types'
import { normalizeLeague } from './leagueActions'

export type FantasyExportPayload = {
  version: 1
  exportedAt: number
  league: FantasyLeague
}

export function exportLeagueJson(league: FantasyLeague): string {
  const payload: FantasyExportPayload = {
    version: 1,
    exportedAt: Date.now(),
    league,
  }
  return JSON.stringify(payload, null, 2)
}

export function downloadLeagueJson(league: FantasyLeague) {
  const text = exportLeagueJson(league)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${league.name.replace(/[^\w.-]+/g, '_') || 'braystats-league'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseLeagueImport(raw: string): FantasyLeague {
  const parsed = JSON.parse(raw) as FantasyExportPayload | FantasyLeague
  const league =
    parsed && typeof parsed === 'object' && 'league' in parsed && parsed.league
      ? (parsed as FantasyExportPayload).league
      : (parsed as FantasyLeague)
  if (!league || typeof league !== 'object' || !league.id || !league.name) {
    throw new Error('Not a valid BrayStats fantasy league file')
  }
  return normalizeLeague(league)
}
