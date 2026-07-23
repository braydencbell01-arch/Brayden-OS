export type LeagueId =
  | 'premier-league'
  | 'la-liga'
  | 'serie-a'
  | 'bundesliga'
  | 'ligue-1'
  | 'uefa-champions'
  | 'uefa-europa'
  | 'uefa-conference'
  | 'conmebol-libertadores'
  | 'conmebol-sudamericana'
  | 'caf-champions'
  | 'afc-champions'
  | 'concacaf-champions'
  | 'fifa-club-world-cup'
  | 'uefa-super-cup'
  | 'fifa-world'
  | 'fifa-friendly'
  | 'uefa-nations'
  | 'uefa-euro'
  | 'fifa-worldq'
  | 'conmebol-america'
  | 'caf-nations'
  | 'afc-asian-cup'
  | 'concacaf-gold'
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
  | 'eng-championship'
  | 'esp-segunda'
  | 'ita-serie-b'
  | 'ger-2-bundesliga'
  | 'fra-ligue-2'
  | 'czech-first-league'
  | 'cyprus-first-division'

export type LeagueKind = 'domestic' | 'international' | 'continental'

export type League = {
  id: LeagueId
  name: string
  short: string
  country: string
  espnCode: string
  kind: LeagueKind
  /** False for friendlies / comps without a meaningful table. */
  hasStandings: boolean
  /** When false, skipped in bulk Match day scoreboard polls (still searchable/favoritable). Default true. */
  matchDayPoll?: boolean
}

/**
 * Display / Match day order: most important competitions first.
 * Favorited leagues are pinned above this order via `leaguesInDisplayOrder`.
 *
 * Only include competitions with a working ESPN scoreboard slug.
 * Continental entries are club cups (UCL etc.) — not national-team tournaments.
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
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'la-liga',
    name: 'La Liga',
    short: 'ESP',
    country: 'Spain',
    espnCode: 'esp.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    short: 'ITA',
    country: 'Italy',
    espnCode: 'ita.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    short: 'GER',
    country: 'Germany',
    espnCode: 'ger.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    short: 'FRA',
    country: 'France',
    espnCode: 'fra.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'uefa-champions',
    name: 'UEFA Champions League',
    short: 'UCL',
    country: 'Europe',
    espnCode: 'uefa.champions',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'uefa-europa',
    name: 'UEFA Europa League',
    short: 'UEL',
    country: 'Europe',
    espnCode: 'uefa.europa',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'uefa-conference',
    name: 'UEFA Conference League',
    short: 'UECL',
    country: 'Europe',
    espnCode: 'uefa.europa.conf',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'conmebol-libertadores',
    name: 'Copa Libertadores',
    short: 'LIB',
    country: 'South America',
    espnCode: 'conmebol.libertadores',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'conmebol-sudamericana',
    name: 'Copa Sudamericana',
    short: 'SUD',
    country: 'South America',
    espnCode: 'conmebol.sudamericana',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'caf-champions',
    name: 'CAF Champions League',
    short: 'CAF',
    country: 'Africa',
    espnCode: 'caf.champions',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'afc-champions',
    name: 'AFC Champions League Elite',
    short: 'AFC',
    country: 'Asia',
    espnCode: 'afc.champions',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'concacaf-champions',
    name: 'CONCACAF Champions Cup',
    short: 'CCC',
    country: 'North America',
    espnCode: 'concacaf.champions_cup',
    kind: 'continental',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'fifa-club-world-cup',
    name: 'FIFA Club World Cup',
    short: 'CWC',
    country: 'International',
    espnCode: 'fifa.cwc',
    kind: 'continental',
    hasStandings: true,
  },
  {
    id: 'uefa-super-cup',
    name: 'UEFA Super Cup',
    short: 'USC',
    country: 'Europe',
    espnCode: 'uefa.super_cup',
    kind: 'continental',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'fifa-world',
    name: 'FIFA World Cup',
    short: 'WC',
    country: 'International',
    espnCode: 'fifa.world',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'fifa-friendly',
    name: 'International Friendlies',
    short: 'FR',
    country: 'International',
    espnCode: 'fifa.friendly',
    kind: 'international',
    hasStandings: false,
  },
  {
    id: 'uefa-nations',
    name: 'UEFA Nations League',
    short: 'UNL',
    country: 'Europe',
    espnCode: 'uefa.nations',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'uefa-euro',
    name: 'UEFA European Championship',
    short: 'EURO',
    country: 'Europe',
    espnCode: 'uefa.euro',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'fifa-worldq',
    name: 'World Cup Qualifying',
    short: 'WCQ',
    country: 'International',
    espnCode: 'fifa.worldq',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'conmebol-america',
    name: 'Copa América',
    short: 'CA',
    country: 'South America',
    espnCode: 'conmebol.america',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'caf-nations',
    name: 'Africa Cup of Nations',
    short: 'AFCON',
    country: 'Africa',
    espnCode: 'caf.nations',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'afc-asian-cup',
    name: 'AFC Asian Cup',
    short: 'AAC',
    country: 'Asia',
    espnCode: 'afc.asian.cup',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'concacaf-gold',
    name: 'CONCACAF Gold Cup',
    short: 'GOLD',
    country: 'North America',
    espnCode: 'concacaf.gold',
    kind: 'international',
    hasStandings: true,
  },
  {
    id: 'brasileirao',
    name: 'Brasileirão',
    short: 'BRA',
    country: 'Brazil',
    espnCode: 'bra.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'liga-mx',
    name: 'Liga MX',
    short: 'MEX',
    country: 'Mexico',
    espnCode: 'mex.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'mls',
    name: 'MLS',
    short: 'USA',
    country: 'USA',
    espnCode: 'usa.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'liga-profesional',
    name: 'Liga Profesional',
    short: 'ARG',
    country: 'Argentina',
    espnCode: 'arg.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'eredivisie',
    name: 'Eredivisie',
    short: 'NED',
    country: 'Netherlands',
    espnCode: 'ned.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'primeira-liga',
    name: 'Primeira Liga',
    short: 'POR',
    country: 'Portugal',
    espnCode: 'por.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'belgian-pro-league',
    name: 'Pro League',
    short: 'BEL',
    country: 'Belgium',
    espnCode: 'bel.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'turkish-super-lig',
    name: 'Super Lig',
    short: 'TUR',
    country: 'Turkey',
    espnCode: 'tur.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'austrian-bundesliga',
    name: 'Austrian Bundesliga',
    short: 'AUT',
    country: 'Austria',
    espnCode: 'aut.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'swiss-super-league',
    name: 'Super League',
    short: 'SUI',
    country: 'Switzerland',
    espnCode: 'sui.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'scottish-premiership',
    name: 'Scottish Premiership',
    short: 'SCO',
    country: 'Scotland',
    espnCode: 'sco.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'superliga',
    name: 'Superliga',
    short: 'DEN',
    country: 'Denmark',
    espnCode: 'den.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'allsvenskan',
    name: 'Allsvenskan',
    short: 'SWE',
    country: 'Sweden',
    espnCode: 'swe.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'eliteserien',
    name: 'Eliteserien',
    short: 'NOR',
    country: 'Norway',
    espnCode: 'nor.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'j1-league',
    name: 'J1 League',
    short: 'JPN',
    country: 'Japan',
    espnCode: 'jpn.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'chinese-super-league',
    name: 'Chinese Super League',
    short: 'CHN',
    country: 'China',
    espnCode: 'chn.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'saudi-pro-league',
    name: 'Saudi Pro League',
    short: 'KSA',
    country: 'Saudi Arabia',
    espnCode: 'ksa.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'a-league',
    name: 'A-League Men',
    short: 'AUS',
    country: 'Australia',
    espnCode: 'aus.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'eng-championship',
    name: 'EFL Championship',
    short: 'ENG2',
    country: 'England',
    espnCode: 'eng.2',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'esp-segunda',
    name: 'La Liga 2',
    short: 'ESP2',
    country: 'Spain',
    espnCode: 'esp.2',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'ita-serie-b',
    name: 'Serie B',
    short: 'ITA2',
    country: 'Italy',
    espnCode: 'ita.2',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'ger-2-bundesliga',
    name: '2. Bundesliga',
    short: 'GER2',
    country: 'Germany',
    espnCode: 'ger.2',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'fra-ligue-2',
    name: 'Ligue 2',
    short: 'FRA2',
    country: 'France',
    espnCode: 'fra.2',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'czech-first-league',
    name: 'Czech First League',
    short: 'CZE',
    country: 'Czechia',
    espnCode: 'cze.1',
    kind: 'domestic',
    hasStandings: true,
  },
  {
    id: 'cyprus-first-division',
    name: 'Cyprus First Division',
    short: 'CYP',
    country: 'Cyprus',
    espnCode: 'cyp.1',
    kind: 'domestic',
    hasStandings: true,
  },
]

export function getLeague(id: LeagueId): League {
  const league = LEAGUES.find((item) => item.id === id)
  if (!league) throw new Error(`Unknown league: ${id}`)
  return league
}

export function isInternationalLeague(id: LeagueId): boolean {
  return getLeague(id).kind === 'international'
}

export function isContinentalLeague(id: LeagueId): boolean {
  return getLeague(id).kind === 'continental'
}

export function internationalLeagues(): League[] {
  return LEAGUES.filter((league) => league.kind === 'international')
}

export function continentalLeagues(): League[] {
  return LEAGUES.filter((league) => league.kind === 'continental')
}

export function domesticLeagues(): League[] {
  return LEAGUES.filter((league) => league.kind === 'domestic')
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
