export type LeagueId =
  | 'premier-league'
  | 'la-liga'
  | 'serie-a'
  | 'bundesliga'
  | 'ligue-1'
  | 'brasileirao'
  | 'liga-mx'
  | 'mls'
  | 'liga-profesional'
  | 'eredivisie'
  | 'primeira-liga'
  | 'belgian-pro-league'
  | 'turkish-super-lig'
  | 'austrian-bundesliga'
  | 'swiss-super-league'
  | 'scottish-premiership'
  | 'superliga'
  | 'allsvenskan'
  | 'eliteserien'
  | 'j1-league'
  | 'chinese-super-league'
  | 'saudi-pro-league'
  | 'a-league'
  | 'czech-first-league'
  | 'cyprus-first-division'

export type League = {
  id: LeagueId
  name: string
  short: string
  country: string
  espnCode: string
}

/**
 * Display / Match day order: most important competitions first.
 * Favorited leagues are pinned above this order via `leaguesInDisplayOrder`.
 *
 * Only include leagues with a working ESPN scoreboard slug.
 * ESPN does not serve Serbian SuperLiga (or POL/CRO/UKR domestic leagues).
 * Chinese Super League is included via chn.1.
 */
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
    id: 'serie-a',
    name: 'Serie A',
    short: 'ITA',
    country: 'Italy',
    espnCode: 'ita.1',
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    short: 'GER',
    country: 'Germany',
    espnCode: 'ger.1',
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    short: 'FRA',
    country: 'France',
    espnCode: 'fra.1',
  },
  {
    id: 'brasileirao',
    name: 'Brasileirão',
    short: 'BRA',
    country: 'Brazil',
    espnCode: 'bra.1',
  },
  {
    id: 'liga-mx',
    name: 'Liga MX',
    short: 'MEX',
    country: 'Mexico',
    espnCode: 'mex.1',
  },
  {
    id: 'mls',
    name: 'MLS',
    short: 'USA',
    country: 'USA',
    espnCode: 'usa.1',
  },
  {
    id: 'liga-profesional',
    name: 'Liga Profesional',
    short: 'ARG',
    country: 'Argentina',
    espnCode: 'arg.1',
  },
  {
    id: 'eredivisie',
    name: 'Eredivisie',
    short: 'NED',
    country: 'Netherlands',
    espnCode: 'ned.1',
  },
  {
    id: 'primeira-liga',
    name: 'Primeira Liga',
    short: 'POR',
    country: 'Portugal',
    espnCode: 'por.1',
  },
  {
    id: 'belgian-pro-league',
    name: 'Pro League',
    short: 'BEL',
    country: 'Belgium',
    espnCode: 'bel.1',
  },
  {
    id: 'turkish-super-lig',
    name: 'Super Lig',
    short: 'TUR',
    country: 'Turkey',
    espnCode: 'tur.1',
  },
  {
    id: 'austrian-bundesliga',
    name: 'Austrian Bundesliga',
    short: 'AUT',
    country: 'Austria',
    espnCode: 'aut.1',
  },
  {
    id: 'swiss-super-league',
    name: 'Super League',
    short: 'SUI',
    country: 'Switzerland',
    espnCode: 'sui.1',
  },
  {
    id: 'scottish-premiership',
    name: 'Scottish Premiership',
    short: 'SCO',
    country: 'Scotland',
    espnCode: 'sco.1',
  },
  {
    id: 'superliga',
    name: 'Superliga',
    short: 'DEN',
    country: 'Denmark',
    espnCode: 'den.1',
  },
  {
    id: 'allsvenskan',
    name: 'Allsvenskan',
    short: 'SWE',
    country: 'Sweden',
    espnCode: 'swe.1',
  },
  {
    id: 'eliteserien',
    name: 'Eliteserien',
    short: 'NOR',
    country: 'Norway',
    espnCode: 'nor.1',
  },
  {
    id: 'j1-league',
    name: 'J1 League',
    short: 'JPN',
    country: 'Japan',
    espnCode: 'jpn.1',
  },
  {
    id: 'chinese-super-league',
    name: 'Chinese Super League',
    short: 'CHN',
    country: 'China',
    espnCode: 'chn.1',
  },
  {
    id: 'saudi-pro-league',
    name: 'Saudi Pro League',
    short: 'KSA',
    country: 'Saudi Arabia',
    espnCode: 'ksa.1',
  },
  {
    id: 'a-league',
    name: 'A-League Men',
    short: 'AUS',
    country: 'Australia',
    espnCode: 'aus.1',
  },
  {
    id: 'czech-first-league',
    name: 'Czech First League',
    short: 'CZE',
    country: 'Czechia',
    espnCode: 'cze.1',
  },
  {
    id: 'cyprus-first-division',
    name: 'Cyprus First Division',
    short: 'CYP',
    country: 'Cyprus',
    espnCode: 'cyp.1',
  },
]

export function getLeague(id: LeagueId): League {
  const league = LEAGUES.find((item) => item.id === id)
  if (!league) throw new Error(`Unknown league: ${id}`)
  return league
}

const LEAGUE_IMPORTANCE_RANK = new Map(LEAGUES.map((league, index) => [league.id, index]))

/** Lower = more important. Unknown ids sort last. */
export function leagueImportanceRank(id: LeagueId): number {
  return LEAGUE_IMPORTANCE_RANK.get(id) ?? Number.MAX_SAFE_INTEGER
}

/**
 * Favorited leagues first (still by importance among themselves),
 * then the rest in LEAGUES priority order.
 */
export function compareLeaguesForDisplay(
  a: LeagueId,
  b: LeagueId,
  favoriteLeagueIds?: Set<string> | null,
): number {
  const aFav = favoriteLeagueIds?.has(a) ? 0 : 1
  const bFav = favoriteLeagueIds?.has(b) ? 0 : 1
  if (aFav !== bFav) return aFav - bFav
  return leagueImportanceRank(a) - leagueImportanceRank(b)
}

export function leaguesInDisplayOrder(favoriteLeagueIds?: Set<string> | null): League[] {
  return [...LEAGUES].sort((a, b) => compareLeaguesForDisplay(a.id, b.id, favoriteLeagueIds))
}
