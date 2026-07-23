export type LeagueId =
  | 'premier-league'
  | 'fa-cup'
  | 'efl-cup'
  | 'community-shield'
  | 'efl-trophy'
  | 'la-liga'
  | 'copa-del-rey'
  | 'spanish-supercopa'
  | 'serie-a'
  | 'coppa-italia'
  | 'italian-supercoppa'
  | 'bundesliga'
  | 'dfb-pokal'
  | 'german-supercup'
  | 'ligue-1'
  | 'coupe-de-france'
  | 'trophee-des-champions'
  | 'coupe-de-la-ligue'
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
  | 'copa-do-brasil'
  | 'brazilian-supercopa'
  | 'liga-mx'
  | 'copa-mx'
  | 'campeon-de-campeones'
  | 'mls'
  | 'us-open-cup'
  | 'liga-profesional'
  | 'copa-argentina'
  | 'argentine-supercopa'
  | 'trofeo-de-campeones'
  | 'eredivisie'
  | 'knvb-beker'
  | 'johan-cruyff-shield'
  | 'primeira-liga'
  | 'taca-de-portugal'
  | 'belgian-pro-league'
  | 'turkish-super-lig'
  | 'austrian-bundesliga'
  | 'swiss-super-league'
  | 'scottish-premiership'
  | 'scottish-cup'
  | 'scottish-league-cup'
  | 'scottish-challenge-cup'
  | 'superliga'
  | 'allsvenskan'
  | 'eliteserien'
  | 'j1-league'
  | 'chinese-super-league'
  | 'saudi-pro-league'
  | 'saudi-kings-cup'
  | 'a-league'
  | 'eng-championship'
  | 'esp-segunda'
  | 'ita-serie-b'
  | 'ger-2-bundesliga'
  | 'fra-ligue-2'
  | 'czech-first-league'
  | 'cyprus-first-division'

export type LeagueKind = 'domestic' | 'international' | 'continental'

/** How the competition is structured — cups stay `kind: 'domestic'`. */
export type LeagueFormat = 'league' | 'cup' | 'supercup'

export type League = {
  id: LeagueId
  name: string
  short: string
  country: string
  espnCode: string
  kind: LeagueKind
  format: LeagueFormat
  /** False for friendlies / knockout cups without a meaningful table. */
  hasStandings: boolean
  /** When false, skipped in bulk Match day scoreboard polls (still searchable/favoritable). Default true. */
  matchDayPoll?: boolean
}

/**
 * Display / Match day order: most important competitions first.
 * Favorited leagues are pinned above this order via `leaguesInDisplayOrder`.
 *
 * Only include competitions with a working ESPN scoreboard slug.
 * Domestic cups share `kind: 'domestic'` with top flights; use `format` to tell them apart.
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
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'fa-cup',
    name: 'FA Cup',
    short: 'FAC',
    country: 'England',
    espnCode: 'eng.fa',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'efl-cup',
    name: 'Carabao Cup',
    short: 'EFL',
    country: 'England',
    espnCode: 'eng.league_cup',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'community-shield',
    name: 'FA Community Shield',
    short: 'CS',
    country: 'England',
    espnCode: 'eng.charity',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
  },
  {
    id: 'efl-trophy',
    name: 'EFL Trophy',
    short: 'EFLT',
    country: 'England',
    espnCode: 'eng.trophy',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'la-liga',
    name: 'La Liga',
    short: 'ESP',
    country: 'Spain',
    espnCode: 'esp.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'copa-del-rey',
    name: 'Copa del Rey',
    short: 'CDR',
    country: 'Spain',
    espnCode: 'esp.copa_del_rey',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'spanish-supercopa',
    name: 'Spanish Supercopa',
    short: 'SSC',
    country: 'Spain',
    espnCode: 'esp.super_cup',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    short: 'ITA',
    country: 'Italy',
    espnCode: 'ita.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'coppa-italia',
    name: 'Coppa Italia',
    short: 'CI',
    country: 'Italy',
    espnCode: 'ita.coppa_italia',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'italian-supercoppa',
    name: 'Italian Supercoppa',
    short: 'SCI',
    country: 'Italy',
    espnCode: 'ita.super_cup',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    short: 'GER',
    country: 'Germany',
    espnCode: 'ger.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'dfb-pokal',
    name: 'DFB-Pokal',
    short: 'DFB',
    country: 'Germany',
    espnCode: 'ger.dfb_pokal',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'german-supercup',
    name: 'German Supercup',
    short: 'GSC',
    country: 'Germany',
    espnCode: 'ger.super_cup',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    short: 'FRA',
    country: 'France',
    espnCode: 'fra.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'coupe-de-france',
    name: 'Coupe de France',
    short: 'CDF',
    country: 'France',
    espnCode: 'fra.coupe_de_france',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'trophee-des-champions',
    name: 'Trophée des Champions',
    short: 'TDC',
    country: 'France',
    espnCode: 'fra.super_cup',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
  },
  {
    id: 'coupe-de-la-ligue',
    name: 'Coupe de la Ligue',
    short: 'CDL',
    country: 'France',
    espnCode: 'fra.coupe_de_la_ligue',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'uefa-champions',
    name: 'UEFA Champions League',
    short: 'UCL',
    country: 'Europe',
    espnCode: 'uefa.champions',
    kind: 'continental',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'uefa-europa',
    name: 'UEFA Europa League',
    short: 'UEL',
    country: 'Europe',
    espnCode: 'uefa.europa',
    kind: 'continental',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'uefa-conference',
    name: 'UEFA Conference League',
    short: 'UECL',
    country: 'Europe',
    espnCode: 'uefa.europa.conf',
    kind: 'continental',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'conmebol-libertadores',
    name: 'Copa Libertadores',
    short: 'LIB',
    country: 'South America',
    espnCode: 'conmebol.libertadores',
    kind: 'continental',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'conmebol-sudamericana',
    name: 'Copa Sudamericana',
    short: 'SUD',
    country: 'South America',
    espnCode: 'conmebol.sudamericana',
    kind: 'continental',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'caf-champions',
    name: 'CAF Champions League',
    short: 'CAF',
    country: 'Africa',
    espnCode: 'caf.champions',
    kind: 'continental',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'afc-champions',
    name: 'AFC Champions League Elite',
    short: 'AFC',
    country: 'Asia',
    espnCode: 'afc.champions',
    kind: 'continental',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'concacaf-champions',
    name: 'CONCACAF Champions Cup',
    short: 'CCC',
    country: 'North America',
    espnCode: 'concacaf.champions_cup',
    kind: 'continental',
    format: 'cup',
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
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'uefa-super-cup',
    name: 'UEFA Super Cup',
    short: 'USC',
    country: 'Europe',
    espnCode: 'uefa.super_cup',
    kind: 'continental',
    format: 'cup',
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
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'fifa-friendly',
    name: 'International Friendlies',
    short: 'FR',
    country: 'International',
    espnCode: 'fifa.friendly',
    kind: 'international',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'uefa-nations',
    name: 'UEFA Nations League',
    short: 'UNL',
    country: 'Europe',
    espnCode: 'uefa.nations',
    kind: 'international',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'uefa-euro',
    name: 'UEFA European Championship',
    short: 'EURO',
    country: 'Europe',
    espnCode: 'uefa.euro',
    kind: 'international',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'fifa-worldq',
    name: 'World Cup Qualifying',
    short: 'WCQ',
    country: 'International',
    espnCode: 'fifa.worldq',
    kind: 'international',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'conmebol-america',
    name: 'Copa América',
    short: 'CA',
    country: 'South America',
    espnCode: 'conmebol.america',
    kind: 'international',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'caf-nations',
    name: 'Africa Cup of Nations',
    short: 'AFCON',
    country: 'Africa',
    espnCode: 'caf.nations',
    kind: 'international',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'afc-asian-cup',
    name: 'AFC Asian Cup',
    short: 'AAC',
    country: 'Asia',
    espnCode: 'afc.asian.cup',
    kind: 'international',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'concacaf-gold',
    name: 'CONCACAF Gold Cup',
    short: 'GOLD',
    country: 'North America',
    espnCode: 'concacaf.gold',
    kind: 'international',
    format: 'cup',
    hasStandings: true,
  },
  {
    id: 'brasileirao',
    name: 'Brasileirão',
    short: 'BRA',
    country: 'Brazil',
    espnCode: 'bra.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'copa-do-brasil',
    name: 'Copa do Brasil',
    short: 'CDB',
    country: 'Brazil',
    espnCode: 'bra.copa_do_brazil',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'brazilian-supercopa',
    name: 'Supercopa do Brasil',
    short: 'SDB',
    country: 'Brazil',
    espnCode: 'bra.supercopa_do_brazil',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
  },
  {
    id: 'liga-mx',
    name: 'Liga MX',
    short: 'MEX',
    country: 'Mexico',
    espnCode: 'mex.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'copa-mx',
    name: 'Copa MX',
    short: 'CMX',
    country: 'Mexico',
    espnCode: 'mex.copa_mx',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'campeon-de-campeones',
    name: 'Campeón de Campeones',
    short: 'CDC',
    country: 'Mexico',
    espnCode: 'mex.campeon',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'mls',
    name: 'MLS',
    short: 'USA',
    country: 'USA',
    espnCode: 'usa.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'us-open-cup',
    name: 'U.S. Open Cup',
    short: 'USOC',
    country: 'USA',
    espnCode: 'usa.open',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'liga-profesional',
    name: 'Liga Profesional',
    short: 'ARG',
    country: 'Argentina',
    espnCode: 'arg.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'copa-argentina',
    name: 'Copa Argentina',
    short: 'CA',
    country: 'Argentina',
    espnCode: 'arg.copa',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'argentine-supercopa',
    name: 'Supercopa Argentina',
    short: 'SA',
    country: 'Argentina',
    espnCode: 'arg.supercopa',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'trofeo-de-campeones',
    name: 'Trofeo de Campeones',
    short: 'TDC',
    country: 'Argentina',
    espnCode: 'arg.trofeo_de_campeones',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'eredivisie',
    name: 'Eredivisie',
    short: 'NED',
    country: 'Netherlands',
    espnCode: 'ned.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'knvb-beker',
    name: 'KNVB Beker',
    short: 'KNVB',
    country: 'Netherlands',
    espnCode: 'ned.cup',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'johan-cruyff-shield',
    name: 'Johan Cruyff Shield',
    short: 'JCS',
    country: 'Netherlands',
    espnCode: 'ned.supercup',
    kind: 'domestic',
    format: 'supercup',
    hasStandings: false,
  },
  {
    id: 'primeira-liga',
    name: 'Primeira Liga',
    short: 'POR',
    country: 'Portugal',
    espnCode: 'por.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'taca-de-portugal',
    name: 'Taça de Portugal',
    short: 'TP',
    country: 'Portugal',
    espnCode: 'por.taca.portugal',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'belgian-pro-league',
    name: 'Pro League',
    short: 'BEL',
    country: 'Belgium',
    espnCode: 'bel.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'turkish-super-lig',
    name: 'Super Lig',
    short: 'TUR',
    country: 'Turkey',
    espnCode: 'tur.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'austrian-bundesliga',
    name: 'Austrian Bundesliga',
    short: 'AUT',
    country: 'Austria',
    espnCode: 'aut.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'swiss-super-league',
    name: 'Super League',
    short: 'SUI',
    country: 'Switzerland',
    espnCode: 'sui.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'scottish-premiership',
    name: 'Scottish Premiership',
    short: 'SCO',
    country: 'Scotland',
    espnCode: 'sco.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'scottish-cup',
    name: 'Scottish Cup',
    short: 'SC',
    country: 'Scotland',
    espnCode: 'sco.tennents',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'scottish-league-cup',
    name: 'Scottish League Cup',
    short: 'SLC',
    country: 'Scotland',
    espnCode: 'sco.cis',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'scottish-challenge-cup',
    name: 'Scottish Challenge Cup',
    short: 'SCC',
    country: 'Scotland',
    espnCode: 'sco.challenge',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
    matchDayPoll: false,
  },
  {
    id: 'superliga',
    name: 'Superliga',
    short: 'DEN',
    country: 'Denmark',
    espnCode: 'den.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'allsvenskan',
    name: 'Allsvenskan',
    short: 'SWE',
    country: 'Sweden',
    espnCode: 'swe.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'eliteserien',
    name: 'Eliteserien',
    short: 'NOR',
    country: 'Norway',
    espnCode: 'nor.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'j1-league',
    name: 'J1 League',
    short: 'JPN',
    country: 'Japan',
    espnCode: 'jpn.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'chinese-super-league',
    name: 'Chinese Super League',
    short: 'CHN',
    country: 'China',
    espnCode: 'chn.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'saudi-pro-league',
    name: 'Saudi Pro League',
    short: 'KSA',
    country: 'Saudi Arabia',
    espnCode: 'ksa.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'saudi-kings-cup',
    name: "King's Cup",
    short: 'KC',
    country: 'Saudi Arabia',
    espnCode: 'ksa.kings.cup',
    kind: 'domestic',
    format: 'cup',
    hasStandings: false,
  },
  {
    id: 'a-league',
    name: 'A-League Men',
    short: 'AUS',
    country: 'Australia',
    espnCode: 'aus.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'eng-championship',
    name: 'EFL Championship',
    short: 'ENG2',
    country: 'England',
    espnCode: 'eng.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'esp-segunda',
    name: 'La Liga 2',
    short: 'ESP2',
    country: 'Spain',
    espnCode: 'esp.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'ita-serie-b',
    name: 'Serie B',
    short: 'ITA2',
    country: 'Italy',
    espnCode: 'ita.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'ger-2-bundesliga',
    name: '2. Bundesliga',
    short: 'GER2',
    country: 'Germany',
    espnCode: 'ger.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'fra-ligue-2',
    name: 'Ligue 2',
    short: 'FRA2',
    country: 'France',
    espnCode: 'fra.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'czech-first-league',
    name: 'Czech First League',
    short: 'CZE',
    country: 'Czechia',
    espnCode: 'cze.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'cyprus-first-division',
    name: 'Cyprus First Division',
    short: 'CYP',
    country: 'Cyprus',
    espnCode: 'cyp.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  }
]

export function getLeague(id: LeagueId): League {
  const league = LEAGUES.find((item) => item.id === id)
  if (!league) throw new Error(`Unknown league: ${id}`)
  return league
}

export function isKnownLeagueId(id: string): id is LeagueId {
  return LEAGUES.some((item) => item.id === id)
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

/** Domestic knockout / super cups (still `kind: 'domestic'`). */
export function isDomesticCup(id: LeagueId): boolean {
  const league = getLeague(id)
  return league.kind === 'domestic' && league.format !== 'league'
}

export function isCupFormat(id: LeagueId): boolean {
  return getLeague(id).format !== 'league'
}

/** Top-flight / table domestic competitions only. */
export function domesticTableLeagues(): League[] {
  return LEAGUES.filter((league) => league.kind === 'domestic' && league.format === 'league')
}

/** Domestic cups + super cups. */
export function domesticCupCompetitions(): League[] {
  return LEAGUES.filter((league) => league.kind === 'domestic' && league.format !== 'league')
}

/** Cups tied to the same country as a club's domestic league. */
export function domesticCupsForCountry(country: string): League[] {
  return domesticCupCompetitions().filter((league) => league.country === country)
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
