export const API_FOOTBALL_LEAGUE_IDS = {
  'premier-league': 39,
  'la-liga': 140,
  bundesliga: 78,
  'serie-a': 135,
  'ligue-1': 61,
} as const

export type LeagueId = keyof typeof API_FOOTBALL_LEAGUE_IDS

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
