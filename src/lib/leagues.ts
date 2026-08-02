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
  | 'club-friendly'
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
 * Competition catalog (grouped by country / confederation for readability).
 * Match day / display priority uses `LEAGUE_IMPORTANCE_ORDER` instead — favorites
 * pin above that via `leaguesInDisplayOrder` / `compareLeaguesForDisplay`.
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
    short: 'EPL',
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
    short: 'LAL',
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
    short: 'SEA',
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
    short: 'BUN',
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
    short: 'FL1',
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
    id: 'club-friendly',
    name: 'Club Friendlies',
    short: 'CF',
    country: 'International',
    espnCode: 'club.friendly',
    kind: 'continental',
    format: 'cup',
    hasStandings: false,
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
    short: 'BRZ',
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
    short: 'LMX',
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
    short: 'MLS',
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
    short: 'LPF',
    country: 'Argentina',
    espnCode: 'arg.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'copa-argentina',
    name: 'Copa Argentina',
    short: 'CPA',
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
    short: 'TDA',
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
    short: 'ERE',
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
    short: 'LGP',
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
    short: 'JPL',
    country: 'Belgium',
    espnCode: 'bel.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'turkish-super-lig',
    name: 'Super Lig',
    short: 'TSL',
    country: 'Turkey',
    espnCode: 'tur.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'austrian-bundesliga',
    name: 'Austrian Bundesliga',
    short: 'ABL',
    country: 'Austria',
    espnCode: 'aut.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'swiss-super-league',
    name: 'Super League',
    short: 'SSL',
    country: 'Switzerland',
    espnCode: 'sui.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'scottish-premiership',
    name: 'Scottish Premiership',
    short: 'SPFL',
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
    short: 'DSL',
    country: 'Denmark',
    espnCode: 'den.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'allsvenskan',
    name: 'Allsvenskan',
    short: 'ALL',
    country: 'Sweden',
    espnCode: 'swe.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'eliteserien',
    name: 'Eliteserien',
    short: 'ELI',
    country: 'Norway',
    espnCode: 'nor.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'j1-league',
    name: 'J1 League',
    short: 'J1',
    country: 'Japan',
    espnCode: 'jpn.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'chinese-super-league',
    name: 'Chinese Super League',
    short: 'CSL',
    country: 'China',
    espnCode: 'chn.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'saudi-pro-league',
    name: 'Saudi Pro League',
    short: 'SPL',
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
    short: 'ALM',
    country: 'Australia',
    espnCode: 'aus.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'eng-championship',
    name: 'EFL Championship',
    short: 'CHA',
    country: 'England',
    espnCode: 'eng.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'esp-segunda',
    name: 'La Liga 2',
    short: 'LL2',
    country: 'Spain',
    espnCode: 'esp.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'ita-serie-b',
    name: 'Serie B',
    short: 'SEB',
    country: 'Italy',
    espnCode: 'ita.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'ger-2-bundesliga',
    name: '2. Bundesliga',
    short: '2BL',
    country: 'Germany',
    espnCode: 'ger.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'fra-ligue-2',
    name: 'Ligue 2',
    short: 'FL2',
    country: 'France',
    espnCode: 'fra.2',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'czech-first-league',
    name: 'Czech First League',
    short: 'CZL',
    country: 'Czechia',
    espnCode: 'cze.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  },
  {
    id: 'cyprus-first-division',
    name: 'Cyprus First Division',
    short: 'CYL',
    country: 'Cyprus',
    espnCode: 'cyp.1',
    kind: 'domestic',
    format: 'league',
    hasStandings: true,
  }
]

/**
 * Domestic league-table ESPN codes to probe for a club's historical division
 * (e.g. Premier League ↔ Championship ↔ League One). Cups are excluded.
 */
const DOMESTIC_PYRAMID_BY_COUNTRY: Record<string, string[]> = {
  England: ['eng.1', 'eng.2', 'eng.3', 'eng.4'],
  Spain: ['esp.1', 'esp.2'],
  Italy: ['ita.1', 'ita.2'],
  Germany: ['ger.1', 'ger.2'],
  France: ['fra.1', 'fra.2'],
  Netherlands: ['ned.1', 'ned.2'],
  Portugal: ['por.1', 'por.2'],
  Scotland: ['sco.1', 'sco.2'],
  Belgium: ['bel.1', 'bel.2'],
  Turkey: ['tur.1', 'tur.2'],
  'United States': ['usa.1', 'usa.2'],
  Mexico: ['mex.1', 'mex.2'],
  Brazil: ['bra.1', 'bra.2'],
  Argentina: ['arg.1', 'arg.2'],
}

/** ESPN league slugs to check when resolving a club's division for a season. */
export function domesticPyramidEspnCodes(leagueId: LeagueId): string[] {
  const league = getLeague(leagueId)
  if (league.kind !== 'domestic' || league.format !== 'league') {
    return [league.espnCode]
  }
  const pyramid = DOMESTIC_PYRAMID_BY_COUNTRY[league.country]
  if (pyramid?.length) {
    return pyramid.includes(league.espnCode)
      ? pyramid
      : [league.espnCode, ...pyramid.filter((code) => code !== league.espnCode)]
  }
  const sameCountry = LEAGUES.filter(
    (item) =>
      item.country === league.country &&
      item.kind === 'domestic' &&
      item.format === 'league',
  ).map((item) => item.espnCode)
  return [...new Set([league.espnCode, ...sameCountry])]
}

export function findLeague(id: string | null | undefined): League | undefined {
  if (!id) return undefined
  return LEAGUES.find((item) => item.id === id)
}

export function isLeagueId(id: string | null | undefined): id is LeagueId {
  return Boolean(findLeague(id))
}

export function getLeague(id: LeagueId): League {
  const league = findLeague(id)
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

/** Club / international friendlies — never listed as profile “competitions”. */
export function isFriendlyLeagueId(id: LeagueId): boolean {
  return id === 'club-friendly' || id === 'fifa-friendly'
}

/**
 * Domestic knockout cups a club from this league enters each season.
 * Excludes supercups (invite-only) and friendlies.
 */
export function regularSeasonCupsForLeague(leagueId: LeagueId): LeagueId[] {
  const league = getLeague(leagueId)
  if (league.kind !== 'domestic' || league.format !== 'league') return []

  if (league.country === 'England') {
    if (leagueId === 'premier-league') return ['fa-cup', 'efl-cup']
    if (leagueId === 'eng-championship') return ['fa-cup', 'efl-cup', 'efl-trophy']
    return ['fa-cup', 'efl-cup']
  }

  return domesticCupsForCountry(league.country)
    .filter((cup) => cup.format === 'cup')
    .map((cup) => cup.id)
}

/**
 * Soccer seasons are labeled by start year (2026 → 26/27).
 * Treat June onward as the new season’s start year.
 */
export function inferSoccerSeasonStartYear(date = new Date()): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  return month >= 5 ? year : year - 1
}

/** FIFA confederations shown on national-team cards instead of “FR”. */
export type ConfederationId = 'UEFA' | 'CONCACAF' | 'CONMEBOL' | 'CAF' | 'AFC' | 'OFC'

const CONFEDERATION_LEAGUE_ID: Record<ConfederationId, LeagueId> = {
  UEFA: 'uefa-nations',
  CONCACAF: 'concacaf-gold',
  CONMEBOL: 'conmebol-america',
  CAF: 'caf-nations',
  AFC: 'afc-asian-cup',
  OFC: 'fifa-worldq',
}

/** Normalize country / team labels for confederation lookup. */
function normalizeNationKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Country name / common alias → confederation.
 * Keys are normalized with `normalizeNationKey`.
 */
const NATION_TO_CONFEDERATION: Record<string, ConfederationId> = {
  // CONCACAF
  'united states': 'CONCACAF',
  usa: 'CONCACAF',
  usmnt: 'CONCACAF',
  mexico: 'CONCACAF',
  canada: 'CONCACAF',
  'costa rica': 'CONCACAF',
  jamaica: 'CONCACAF',
  panama: 'CONCACAF',
  honduras: 'CONCACAF',
  'el salvador': 'CONCACAF',
  guatemala: 'CONCACAF',
  haiti: 'CONCACAF',
  'trinidad and tobago': 'CONCACAF',
  cuba: 'CONCACAF',
  nicaragua: 'CONCACAF',
  belize: 'CONCACAF',
  bermuda: 'CONCACAF',
  curacao: 'CONCACAF',
  suriname: 'CONCACAF',
  guyana: 'CONCACAF',
  // CONMEBOL
  brazil: 'CONMEBOL',
  argentina: 'CONMEBOL',
  uruguay: 'CONMEBOL',
  chile: 'CONMEBOL',
  colombia: 'CONMEBOL',
  peru: 'CONMEBOL',
  ecuador: 'CONMEBOL',
  paraguay: 'CONMEBOL',
  bolivia: 'CONMEBOL',
  venezuela: 'CONMEBOL',
  // UEFA
  england: 'UEFA',
  scotland: 'UEFA',
  wales: 'UEFA',
  'northern ireland': 'UEFA',
  'republic of ireland': 'UEFA',
  ireland: 'UEFA',
  france: 'UEFA',
  germany: 'UEFA',
  spain: 'UEFA',
  italy: 'UEFA',
  portugal: 'UEFA',
  netherlands: 'UEFA',
  belgium: 'UEFA',
  croatia: 'UEFA',
  denmark: 'UEFA',
  sweden: 'UEFA',
  norway: 'UEFA',
  switzerland: 'UEFA',
  austria: 'UEFA',
  poland: 'UEFA',
  'czech republic': 'UEFA',
  czechia: 'UEFA',
  slovakia: 'UEFA',
  hungary: 'UEFA',
  romania: 'UEFA',
  serbia: 'UEFA',
  ukraine: 'UEFA',
  turkey: 'UEFA',
  greece: 'UEFA',
  'bosnia and herzegovina': 'UEFA',
  bosnia: 'UEFA',
  slovenia: 'UEFA',
  albania: 'UEFA',
  'north macedonia': 'UEFA',
  macedonia: 'UEFA',
  finland: 'UEFA',
  iceland: 'UEFA',
  georgia: 'UEFA',
  armenia: 'UEFA',
  azerbaijan: 'UEFA',
  kazakhstan: 'UEFA',
  israel: 'UEFA',
  cyprus: 'UEFA',
  malta: 'UEFA',
  luxembourg: 'UEFA',
  andorra: 'UEFA',
  'faroe islands': 'UEFA',
  gibraltar: 'UEFA',
  moldova: 'UEFA',
  montenegro: 'UEFA',
  kosovo: 'UEFA',
  latvia: 'UEFA',
  lithuania: 'UEFA',
  estonia: 'UEFA',
  bulgaria: 'UEFA',
  belarus: 'UEFA',
  russia: 'UEFA',
  // CAF
  egypt: 'CAF',
  morocco: 'CAF',
  senegal: 'CAF',
  nigeria: 'CAF',
  ghana: 'CAF',
  'ivory coast': 'CAF',
  "cote d ivoire": 'CAF',
  cameroon: 'CAF',
  algeria: 'CAF',
  tunisia: 'CAF',
  'south africa': 'CAF',
  mali: 'CAF',
  'burkina faso': 'CAF',
  'dr congo': 'CAF',
  congo: 'CAF',
  kenya: 'CAF',
  uganda: 'CAF',
  zambia: 'CAF',
  zimbabwe: 'CAF',
  angola: 'CAF',
  guinea: 'CAF',
  gabon: 'CAF',
  // AFC
  japan: 'AFC',
  'south korea': 'AFC',
  korea: 'AFC',
  australia: 'AFC',
  'saudi arabia': 'AFC',
  iran: 'AFC',
  iraq: 'AFC',
  qatar: 'AFC',
  uae: 'AFC',
  'united arab emirates': 'AFC',
  china: 'AFC',
  'china pr': 'AFC',
  uzbekistan: 'AFC',
  jordan: 'AFC',
  bahrain: 'AFC',
  oman: 'AFC',
  kuwait: 'AFC',
  thailand: 'AFC',
  vietnam: 'AFC',
  indonesia: 'AFC',
  india: 'AFC',
  // OFC
  'new zealand': 'OFC',
  fiji: 'OFC',
  'papua new guinea': 'OFC',
  'solomon islands': 'OFC',
  tahiti: 'OFC',
  'new caledonia': 'OFC',
}

/** Infer FIFA confederation from a national team name or short code. */
export function confederationForNationalTeam(input: {
  name?: string | null
  shortName?: string | null
  slug?: string | null
}): ConfederationId | null {
  const candidates = [input.slug, input.shortName, input.name]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map(normalizeNationKey)
  for (const key of candidates) {
    const hit = NATION_TO_CONFEDERATION[key]
    if (hit) return hit
  }
  // Soft match: “United States of America”, “Korea Republic”, etc.
  for (const key of candidates) {
    for (const [nation, confederation] of Object.entries(NATION_TO_CONFEDERATION)) {
      if (nation.length < 4) continue
      if (key === nation || key.includes(nation) || (key.length >= 4 && nation.includes(key))) {
        return confederation
      }
    }
  }
  return null
}

export function leagueIdForConfederation(confederation: ConfederationId): LeagueId {
  return CONFEDERATION_LEAGUE_ID[confederation]
}

/**
 * Subtitle under a team name: confederation for national sides (CONCACAF),
 * otherwise the competition short code (EPL, UCL, FR for friendlies fixtures).
 */
export function teamSubtitleLabel(team: {
  name: string
  shortName?: string
  leagueId: LeagueId
  kind?: 'club' | 'national'
}): string {
  const national =
    team.kind === 'national' || (team.kind == null && isInternationalLeague(team.leagueId))
  if (national) {
    const confederation = confederationForNationalTeam({
      name: team.name,
      shortName: team.shortName,
    })
    if (confederation) return confederation
  }
  return getLeague(team.leagueId).short
}

/** League to open when tapping a national-team association subtitle. */
export function teamSubtitleLeagueId(team: {
  name: string
  shortName?: string
  leagueId: LeagueId
  kind?: 'club' | 'national'
}): LeagueId {
  const national =
    team.kind === 'national' || (team.kind == null && isInternationalLeague(team.leagueId))
  if (national) {
    const confederation = confederationForNationalTeam({
      name: team.name,
      shortName: team.shortName,
    })
    if (confederation) return leagueIdForConfederation(confederation)
  }
  return team.leagueId
}

/**
 * Biggest / most important competitions first for Match day (and display sorts).
 * Favorites still pin above this via `compareLeaguesForDisplay`.
 * Kept separate from the `LEAGUES` catalog array so country grouping there can stay readable.
 */
export const LEAGUE_IMPORTANCE_ORDER: readonly LeagueId[] = [
  // Elite club competitions
  'uefa-champions',
  'premier-league',
  'la-liga',
  'serie-a',
  'bundesliga',
  'ligue-1',
  'uefa-europa',
  'uefa-conference',
  'fifa-club-world-cup',
  'uefa-super-cup',
  'conmebol-libertadores',
  'conmebol-sudamericana',
  'caf-champions',
  'afc-champions',
  'concacaf-champions',

  // Major national-team tournaments
  'fifa-world',
  'uefa-euro',
  'conmebol-america',
  'caf-nations',
  'afc-asian-cup',
  'concacaf-gold',
  'uefa-nations',
  'fifa-worldq',
  'fifa-friendly',

  // Other strong domestic top flights
  'brasileirao',
  'liga-mx',
  'mls',
  'liga-profesional',
  'eredivisie',
  'primeira-liga',
  'belgian-pro-league',
  'turkish-super-lig',
  'scottish-premiership',
  'saudi-pro-league',
  'austrian-bundesliga',
  'swiss-super-league',
  'superliga',
  'allsvenskan',
  'eliteserien',
  'j1-league',
  'chinese-super-league',
  'a-league',
  'czech-first-league',
  'cyprus-first-division',

  // Domestic cups (big five, then others)
  'fa-cup',
  'copa-del-rey',
  'coppa-italia',
  'dfb-pokal',
  'coupe-de-france',
  'efl-cup',
  'copa-do-brasil',
  'copa-mx',
  'us-open-cup',
  'copa-argentina',
  'knvb-beker',
  'taca-de-portugal',
  'scottish-cup',
  'scottish-league-cup',
  'saudi-kings-cup',
  'efl-trophy',
  'scottish-challenge-cup',
  'coupe-de-la-ligue',

  // Super cups / shields
  'community-shield',
  'spanish-supercopa',
  'italian-supercoppa',
  'german-supercup',
  'trophee-des-champions',
  'brazilian-supercopa',
  'campeon-de-campeones',
  'argentine-supercopa',
  'trofeo-de-campeones',
  'johan-cruyff-shield',

  // Second tiers
  'eng-championship',
  'esp-segunda',
  'ita-serie-b',
  'ger-2-bundesliga',
  'fra-ligue-2',

  // Lowest priority scoreboard noise
  'club-friendly',
]

const LEAGUE_IMPORTANCE_RANK = new Map(
  LEAGUE_IMPORTANCE_ORDER.map((id, index) => [id, index]),
)

if (import.meta.env.DEV) {
  const missing = LEAGUES.filter((league) => !LEAGUE_IMPORTANCE_RANK.has(league.id))
  if (missing.length > 0) {
    console.warn(
      'LEAGUE_IMPORTANCE_ORDER missing:',
      missing.map((league) => league.id).join(', '),
    )
  }
}

/** Lower = more important. Unknown ids sort last. */
export function leagueImportanceRank(id: LeagueId): number {
  return LEAGUE_IMPORTANCE_RANK.get(id) ?? Number.MAX_SAFE_INTEGER
}

/**
 * Favorited leagues first (still by importance among themselves),
 * then the preferred league (optional), then biggest competitions first.
 */
export function compareLeaguesForDisplay(
  a: LeagueId,
  b: LeagueId,
  favoriteLeagueIds?: Set<string> | null,
  preferredLeagueId?: string | null,
): number {
  const aFav = favoriteLeagueIds?.has(a) ? 0 : 1
  const bFav = favoriteLeagueIds?.has(b) ? 0 : 1
  if (aFav !== bFav) return aFav - bFav
  if (preferredLeagueId) {
    const aPref = a === preferredLeagueId ? 0 : 1
    const bPref = b === preferredLeagueId ? 0 : 1
    if (aPref !== bPref) return aPref - bPref
  }
  return leagueImportanceRank(a) - leagueImportanceRank(b)
}

export function leaguesInDisplayOrder(
  favoriteLeagueIds?: Set<string> | null,
  preferredLeagueId?: string | null,
): League[] {
  return [...LEAGUES].sort((a, b) =>
    compareLeaguesForDisplay(a.id, b.id, favoriteLeagueIds, preferredLeagueId),
  )
}
