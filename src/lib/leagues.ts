export type LeagueId =
  | 'premier-league'
  | 'la-liga'
  | 'bundesliga'
  | 'serie-a'
  | 'ligue-1'
  | 'eredivisie'

export type League = {
  id: LeagueId
  name: string
  short: string
  country: string
  espnCode: string
}

export const LEAGUES: League[] = [
  {
    id: 'premier-league',
    name: 'Premier League',
    short: 'ENG',
    country: 'England',
    espnCode: 'eng.1',
  },
  {
    id: 'la-liga',
    name: 'La Liga',
    short: 'ESP',
    country: 'Spain',
    espnCode: 'esp.1',
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    short: 'GER',
    country: 'Germany',
    espnCode: 'ger.1',
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    short: 'ITA',
    country: 'Italy',
    espnCode: 'ita.1',
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    short: 'FRA',
    country: 'France',
    espnCode: 'fra.1',
  },
  {
    id: 'eredivisie',
    name: 'Eredivisie',
    short: 'NED',
    country: 'NED',
    espnCode: 'ned.1',
  },
]

export function getLeague(id: LeagueId): League {
  const league = LEAGUES.find((item) => item.id === id)
  if (!league) throw new Error(`Unknown league: ${id}`)
  return league
}
