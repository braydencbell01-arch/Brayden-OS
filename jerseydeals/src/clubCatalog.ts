/** Expanded club catalog for Jersey Deals favorites + title inference. */

export type ClubLogoKind = 'soccer' | 'country' | 'none'

export type ClubCatalogEntry = {
  id: string
  name: string
  pattern: RegExp
  leagueId: string
  leagueName: string
  /** Lower = more popular worldwide (suggestions order). */
  popularity: number
  espnId?: string
  logoKind: ClubLogoKind
}

export const CLUB_CATALOG: ClubCatalogEntry[] = [
  { id: 'paris-saint-germain', name: "Paris Saint-Germain", pattern: /paris\s*saint[-\s]?germain|\bpsg\b|\bparis\s*sg\b/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 6, espnId: '160', logoKind: 'soccer' },
  { id: 'paris-fc', name: "Paris FC", pattern: /paris\s*fc/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 290, espnId: '6851', logoKind: 'soccer' },
  { id: 'manchester-city', name: "Manchester City", pattern: /manchester\s*city|\bman\s*city\b|\bman\s*c\b|\bmcfc\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 9, espnId: '382', logoKind: 'soccer' },
  { id: 'manchester-united', name: "Manchester United", pattern: /manchester\s*united|\bman\s*utd\b|\bman\s*u\b|\bman\s*united\b|\bmufc\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 3, espnId: '360', logoKind: 'soccer' },
  { id: 'inter-miami', name: "Inter Miami", pattern: /inter\s*miami\b/i, leagueId: 'mls', leagueName: "MLS", popularity: 17, espnId: '20232', logoKind: 'soccer' },
  { id: 'inter-milan', name: "Internazionale", pattern: /inter\s*milan\b|internazionale|\bnerazzurri\b/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 12, espnId: '110', logoKind: 'soccer' },
  { id: 'ac-milan', name: "AC Milan", pattern: /\bac\s*milan\b|(?<!inter\s)\bmilan\b/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 11, espnId: '103', logoKind: 'soccer' },
  { id: 'borussia-dortmund', name: "Borussia Dortmund", pattern: /borussia\s*dortmund|\bdortmund\b|\bbvb\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 13, espnId: '124', logoKind: 'soccer' },
  { id: 'atletico-madrid', name: "Atlético Madrid", pattern: /atl[eé]tico(?:\s*madrid)?|\batleti\b/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 15, espnId: '1068', logoKind: 'soccer' },
  // Require Club/Bilbao — bare "athletic(s)" matches Puma Athletics apparel, not Bilbao.
  { id: 'athletic-bilbao', name: "Athletic Club", pattern: /\bathletic(?:\s+club|\s+bilbao)\b/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 62, espnId: '93', logoKind: 'soccer' },
  { id: 'real-madrid', name: "Real Madrid", pattern: /real\s*madrid|\brma\b/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 1, espnId: '86', logoKind: 'soccer' },
  { id: 'real-betis', name: "Real Betis", pattern: /real\s*betis|\bbetis\b/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 64, espnId: '244', logoKind: 'soccer' },
  { id: 'real-sociedad', name: "Real Sociedad", pattern: /real\s*sociedad/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 63, espnId: '89', logoKind: 'soccer' },
  { id: 'crystal-palace', name: "Crystal Palace", pattern: /crystal\s*palace|\bpalace\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 50, espnId: '384', logoKind: 'soccer' },
  { id: 'nottingham-forest', name: "Nottingham Forest", pattern: /nottingham\s*forest|\bnotts?\s*forest\b|\bnffc\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 58, espnId: '393', logoKind: 'soccer' },
  { id: 'bayer-leverkusen', name: "Bayer Leverkusen", pattern: /bayer(?:\s*0?4)?\s*leverkusen|\bleverkusen\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 25, espnId: '131', logoKind: 'soccer' },
  { id: 'eintracht-frankfurt', name: "Eintracht Frankfurt", pattern: /eintracht\s*frankfurt|\bfrankfurt\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 70, espnId: '125', logoKind: 'soccer' },
  { id: 'rb-leipzig', name: "RB Leipzig", pattern: /rb\s*leipzig|\bleipzig\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 26, espnId: '11420', logoKind: 'soccer' },
  { id: 'union-berlin', name: "1. FC Union Berlin", pattern: /union\s*berlin/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 260, espnId: '598', logoKind: 'soccer' },
  { id: 'monchengladbach', name: "Borussia Mönchengladbach", pattern: /m[oö]nchengladbach|\bgladbach\b|\bm\.?\s*gladbach\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 72, espnId: '268', logoKind: 'soccer' },
  { id: 'brighton', name: "Brighton & Hove Albion", pattern: /brighton(?:\s*&\s*hove)?(?:\s*albion)?|\bbha\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 45, espnId: '331', logoKind: 'soccer' },
  { id: 'deportivo-la-coruna', name: "Deportivo La Coruña", pattern: /deportivo(?:\s*la\s*coru[nñ]a)?|\bdepor\b/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 225, espnId: '90', logoKind: 'soccer' },
  { id: 'tottenham', name: "Tottenham Hotspur", pattern: /tottenham(?:\s*hotspur)?|\bspurs\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 14, espnId: '367', logoKind: 'soccer' },
  { id: 'newcastle', name: "Newcastle United", pattern: /newcastle(?:\s*united)?|\bnufc\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 20, espnId: '361', logoKind: 'soccer' },
  { id: 'racing-santander', name: "Racing Santander", pattern: /racing(?:\s*santander)?/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 232, espnId: '87', logoKind: 'soccer' },
  { id: 'bournemouth', name: "AFC Bournemouth", pattern: /bournemouth|\bafc\s*bournemouth\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 55, espnId: '349', logoKind: 'soccer' },
  { id: 'sc-paderborn-07', name: "SC Paderborn 07", pattern: /paderborn/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 272, espnId: '3307', logoKind: 'soccer' },
  { id: 'rayo-vallecano', name: "Rayo Vallecano", pattern: /rayo(?:\s*vallecano)?/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 233, espnId: '101', logoKind: 'soccer' },
  { id: 'hoffenheim', name: "TSG Hoffenheim", pattern: /hoffenheim/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 275, espnId: '7911', logoKind: 'soccer' },
  { id: 'bayern', name: "Bayern Munich", pattern: /bayern(?:\s*munich)?|\bbayern\s*m[uü]nchen\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 5, espnId: '132', logoKind: 'soccer' },
  { id: 'coventry-city', name: "Coventry City", pattern: /coventry\s+city/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 206, espnId: '388', logoKind: 'soccer' },
  { id: 'sv-elversberg', name: "SV Elversberg", pattern: /elversberg/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 273, espnId: '10388', logoKind: 'soccer' },
  { id: 'rennes', name: "Stade Rennais", pattern: /\brennes\b|stade\s*rennais/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 75, espnId: '169', logoKind: 'soccer' },
  { id: 'stuttgart', name: "VfB Stuttgart", pattern: /stuttgart/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 276, espnId: '134', logoKind: 'soccer' },
  { id: 'werder-bremen', name: "Werder Bremen", pattern: /werder\s*bremen|\bbremen\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 277, espnId: '137', logoKind: 'soccer' },
  { id: 'ipswich-town', name: "Ipswich Town", pattern: /ipswich\s+town/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 211, espnId: '373', logoKind: 'soccer' },
  { id: 'leeds-united', name: "Leeds United", pattern: /leeds\s+united/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 212, espnId: '357', logoKind: 'soccer' },
  { id: 'aston-villa', name: "Aston Villa", pattern: /aston\s*villa|\bvilla\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 32, espnId: '362', logoKind: 'soccer' },
  { id: 'augsburg', name: "FC Augsburg", pattern: /augsburg/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 266, espnId: '3841', logoKind: 'soccer' },
  { id: 'le-havre', name: "Le Havre AC", pattern: /le\s*havre/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 282, espnId: '3236', logoKind: 'soccer' },
  { id: 'freiburg', name: "SC Freiburg", pattern: /freiburg/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 271, espnId: '126', logoKind: 'soccer' },
  { id: 'auxerre', name: "AJ Auxerre", pattern: /auxerre/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 278, espnId: '172', logoKind: 'soccer' },
  { id: 'celta-vigo', name: "Celta Vigo", pattern: /celta(?:\s*vigo)?/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 224, espnId: '85', logoKind: 'soccer' },
  { id: 'cologne', name: "FC Cologne", pattern: /\bcologne\b|\bk[oö]ln\b|\bfc\s*cologne\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 267, espnId: '122', logoKind: 'soccer' },
  { id: 'fiorentina', name: "Fiorentina", pattern: /fiorentina/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 66, espnId: '109', logoKind: 'soccer' },
  { id: 'hamburg', name: "Hamburg SV", pattern: /hamburg(?:er\s*sv)?|\bhsv\b/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 268, espnId: '127', logoKind: 'soccer' },
  { id: 'schalke-04', name: "Schalke 04", pattern: /schalke(?:\s*0?4)?/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 274, espnId: '133', logoKind: 'soccer' },
  { id: 'strasbourg', name: "Strasbourg", pattern: /strasbourg/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 293, espnId: '180', logoKind: 'soccer' },
  { id: 'sunderland', name: "Sunderland", pattern: /sunderland/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 218, espnId: '366', logoKind: 'soccer' },
  { id: 'villarreal', name: "Villarreal", pattern: /villarreal/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 29, espnId: '102', logoKind: 'soccer' },
  { id: 'monaco', name: "AS Monaco", pattern: /\bmonaco\b|as\s*monaco/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 24, espnId: '174', logoKind: 'soccer' },
  { id: 'argentina', name: "Argentina", pattern: /\bargentina\b|\balbiceleste\b/i, leagueId: 'international', leagueName: "International", popularity: 36, espnId: 'arg', logoKind: 'country' },
  { id: 'barcelona', name: "Barcelona", pattern: /fc\s*barcelona|\bbarcelona\b|\bbarca\b|\bbarça\b|\bfcb\b/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 2, espnId: '83', logoKind: 'soccer' },
  { id: 'brentford', name: "Brentford", pattern: /brentford/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 56, espnId: '337', logoKind: 'soccer' },
  { id: 'frosinone', name: "Frosinone", pattern: /frosinone/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 247, espnId: '4057', logoKind: 'soccer' },
  { id: 'hull-city', name: "Hull City", pattern: /hull\s+city/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 210, espnId: '306', logoKind: 'soccer' },
  { id: 'liverpool', name: "Liverpool", pattern: /liverpool(?:\s*fc)?|\blfc\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 4, espnId: '364', logoKind: 'soccer' },
  { id: 'marseille', name: "Marseille", pattern: /marseille/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 22, espnId: '176', logoKind: 'soccer' },
  { id: 'atalanta', name: "Atalanta", pattern: /atalanta/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 67, espnId: '105', logoKind: 'soccer' },
  { id: 'cagliari', name: "Cagliari", pattern: /cagliari/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 244, espnId: '2925', logoKind: 'soccer' },
  { id: 'espanyol', name: "Espanyol", pattern: /espanyol|español/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 227, espnId: '88', logoKind: 'soccer' },
  { id: 'juventus', name: "Juventus", pattern: /juventus|\bjuve\b/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 10, espnId: '111', logoKind: 'soccer' },
  { id: 'sassuolo', name: "Sassuolo", pattern: /sassuolo/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 256, espnId: '3997', logoKind: 'soccer' },
  { id: 'syracuse', name: "Syracuse", pattern: /syracuse(?:\s*orange)?|\bcuse\b/i, leagueId: 'ncaa', leagueName: "NCAA", popularity: 303, espnId: undefined, logoKind: 'none' },
  { id: 'toulouse', name: "Toulouse", pattern: /toulouse/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 294, espnId: '179', logoKind: 'soccer' },
  { id: 'valencia', name: "Valencia", pattern: /valencia(?:\s*cf)?/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 28, espnId: '94', logoKind: 'soccer' },
  { id: 'west-ham', name: "West Ham", pattern: /west\s*ham(?:\s*united)?/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 31, espnId: '371', logoKind: 'soccer' },
  { id: 'roma', name: "AS Roma", pattern: /\bas\s*roma\b|\broma\b/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 19, espnId: '104', logoKind: 'soccer' },
  { id: 'arsenal', name: "Arsenal", pattern: /arsenal(?:\s*fc)?|\bgunners\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 8, espnId: '359', logoKind: 'soccer' },
  { id: 'bologna', name: "Bologna", pattern: /bologna/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 243, espnId: '107', logoKind: 'soccer' },
  { id: 'chelsea', name: "Chelsea", pattern: /chelsea(?:\s*fc)?|\bcfc\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 7, espnId: '363', logoKind: 'soccer' },
  { id: 'everton', name: "Everton", pattern: /everton/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 30, espnId: '368', logoKind: 'soccer' },
  { id: 'germany', name: "Germany", pattern: /germany(?:\s*national)?|\bdfb\b/i, leagueId: 'international', leagueName: "International", popularity: 35, espnId: 'ger', logoKind: 'country' },
  { id: 'le-mans', name: "Le Mans", pattern: /le\s*mans/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 283, espnId: '2697', logoKind: 'soccer' },
  { id: 'levante', name: "Levante", pattern: /levante/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 229, espnId: '1538', logoKind: 'soccer' },
  { id: 'lorient', name: "Lorient", pattern: /lorient/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 286, espnId: '273', logoKind: 'soccer' },
  { id: 'osasuna', name: "Osasuna", pattern: /osasuna/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 231, espnId: '97', logoKind: 'soccer' },
  { id: 'sevilla', name: "Sevilla", pattern: /sevilla(?:\s*fc)?/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 21, espnId: '243', logoKind: 'soccer' },
  { id: 'udinese', name: "Udinese", pattern: /udinese/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 258, espnId: '118', logoKind: 'soccer' },
  { id: 'venezia', name: "Venezia", pattern: /venezia|venice/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 259, espnId: '17530', logoKind: 'soccer' },
  { id: 'alaves', name: "Alavés", pattern: /alav[eé]s/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 220, espnId: '96', logoKind: 'soccer' },
  { id: 'angers', name: "Angers", pattern: /angers/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 280, espnId: '7868', logoKind: 'soccer' },
  { id: 'fulham', name: "Fulham", pattern: /fulham/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 52, espnId: '370', logoKind: 'soccer' },
  { id: 'getafe', name: "Getafe", pattern: /getafe/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 228, espnId: '2922', logoKind: 'soccer' },
  { id: 'mexico', name: "Mexico", pattern: /\bmexico\b|\bel\s*tri\b/i, leagueId: 'international', leagueName: "International", popularity: 39, espnId: 'mex', logoKind: 'country' },
  { id: 'malaga', name: "Málaga", pattern: /m[aá]laga/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 230, espnId: '99', logoKind: 'soccer' },
  { id: 'napoli', name: "Napoli", pattern: /napoli|ssc\s*napoli/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 16, espnId: '114', logoKind: 'soccer' },
  { id: 'torino', name: "Torino", pattern: /torino/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 257, espnId: '239', logoKind: 'soccer' },
  { id: 'troyes', name: "Troyes", pattern: /troyes/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 295, espnId: '170', logoKind: 'soccer' },
  { id: 'wolves', name: "Wolves", pattern: /wolverhampton|\bwolves\b/i, leagueId: 'premier-league', leagueName: "Premier League", popularity: 33, espnId: '380', logoKind: 'soccer' },
  { id: 'brest', name: "Brest", pattern: /\bbrest\b/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 281, espnId: '6997', logoKind: 'soccer' },
  { id: 'elche', name: "Elche", pattern: /elche/i, leagueId: 'la-liga', leagueName: "La Liga", popularity: 226, espnId: '3751', logoKind: 'soccer' },
  { id: 'genoa', name: "Genoa", pattern: /genoa/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 248, espnId: '3263', logoKind: 'soccer' },
  { id: 'lazio', name: "Lazio", pattern: /lazio/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 27, espnId: '112', logoKind: 'soccer' },
  { id: 'lecce', name: "Lecce", pattern: /lecce/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 252, espnId: '113', logoKind: 'soccer' },
  { id: 'lille', name: "Lille", pattern: /\blille\b/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 74, espnId: '166', logoKind: 'soccer' },
  { id: 'mainz', name: "Mainz", pattern: /mainz/i, leagueId: 'bundesliga', leagueName: "Bundesliga", popularity: 269, espnId: '2950', logoKind: 'soccer' },
  { id: 'monza', name: "Monza", pattern: /monza/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 253, espnId: '4007', logoKind: 'soccer' },
  { id: 'parma', name: "Parma", pattern: /parma/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 255, espnId: '115', logoKind: 'soccer' },
  { id: 'spain', name: "Spain", pattern: /\bspain(?:\s*national)?\b|\bla\s*roja\b/i, leagueId: 'international', leagueName: "International", popularity: 37, espnId: 'esp', logoKind: 'country' },
  { id: 'ajax', name: "Ajax", pattern: /ajax(?:\s*amsterdam)?/i, leagueId: 'eredivisie', leagueName: "Eredivisie", popularity: 18, espnId: '139', logoKind: 'soccer' },
  { id: 'como', name: "Como", pattern: /\bcomo\b/i, leagueId: 'serie-a', leagueName: "Serie A", popularity: 245, espnId: '2572', logoKind: 'soccer' },
  { id: 'lens', name: "Lens", pattern: /\blens\b/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 284, espnId: '175', logoKind: 'soccer' },
  { id: 'lyon', name: "Lyon", pattern: /\blyon\b|olympique\s*lyonnais/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 23, espnId: '167', logoKind: 'soccer' },
  { id: 'nice', name: "Nice", pattern: /\bnice\b|ogc\s*nice/i, leagueId: 'ligue-1', leagueName: "Ligue 1", popularity: 76, espnId: '2502', logoKind: 'soccer' },
  { id: 'usa', name: "USA", pattern: /\busa\b|united\s*states|\busmnt\b|\buswnt\b/i, leagueId: 'international', leagueName: "International", popularity: 40, espnId: 'usa', logoKind: 'country' },
]

export function clubLogoUrl(club: Pick<ClubCatalogEntry, 'espnId' | 'logoKind'>): string | null {
  if (!club.espnId || club.logoKind === 'none') return null
  if (club.logoKind === 'country') {
    return `https://a.espncdn.com/i/teamlogos/countries/500/${encodeURIComponent(club.espnId)}.png`
  }
  return `https://a.espncdn.com/i/teamlogos/soccer/500/${encodeURIComponent(club.espnId)}.png`
}

export function getClubById(id: string): ClubCatalogEntry | undefined {
  return CLUB_CATALOG.find((club) => club.id === id)
}

export function searchClubs(query: string): ClubCatalogEntry[] {
  const q = query.trim().toLowerCase()
  const rows = [...CLUB_CATALOG].sort((a, b) => a.popularity - b.popularity || a.name.localeCompare(b.name))
  if (!q) return rows
  return rows.filter((club) => {
    if (club.name.toLowerCase().includes(q) || club.id.includes(q.replace(/\s+/g, '-'))) return true
    if (club.leagueName.toLowerCase().includes(q)) return true
    return club.pattern.test(q)
  })
}

export function popularClubSuggestions(limit = 24, excludeIds?: Set<string>): ClubCatalogEntry[] {
  return [...CLUB_CATALOG]
    .filter((club) => !(excludeIds && excludeIds.has(club.id)))
    .sort((a, b) => a.popularity - b.popularity || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export const LEAGUE_BY_CLUB_ID: Record<string, { id: string; name: string }> = Object.fromEntries(
  CLUB_CATALOG.map((club) => [club.id, { id: club.leagueId, name: club.leagueName }]),
)

