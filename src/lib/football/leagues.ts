import type { LeagueId } from './types'

/** API-Football competition IDs for the Big 5. */
export const API_FOOTBALL_LEAGUE_IDS: Record<LeagueId, number> = {
  'premier-league': 39,
  'la-liga': 140,
  bundesliga: 78,
  'serie-a': 135,
  'ligue-1': 61,
}

export const BIG5_API_IDS = Object.values(API_FOOTBALL_LEAGUE_IDS)

export const API_ID_TO_LEAGUE: Record<number, LeagueId> = {
  39: 'premier-league',
  140: 'la-liga',
  78: 'bundesliga',
  135: 'serie-a',
  61: 'ligue-1',
}

export const LEAGUE_LABELS: Record<LeagueId, string> = {
  'premier-league': 'Premier League',
  'la-liga': 'La Liga',
  bundesliga: 'Bundesliga',
  'serie-a': 'Serie A',
  'ligue-1': 'Ligue 1',
}

export function isBig5ApiLeagueId(id: number): id is keyof typeof API_ID_TO_LEAGUE {
  return id in API_ID_TO_LEAGUE
}

/** Live query string for API-Football: 39-140-78-135-61 */
export function big5LiveParam(): string {
  return BIG5_API_IDS.join('-')
}
