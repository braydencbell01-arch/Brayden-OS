import type { FavoritePlayer, FavoriteTeam } from './favorites'
import {
  findLeague,
  getLeague,
  isActiveCompetition,
  LEAGUES,
  type League,
  type LeagueId,
} from './leagues'

/** Page size for Favorites suggestion lists. */
export const SUGGESTION_PAGE_SIZE = 10

/** Curated high-signal competitions, then the rest of BrayStats leagues. */
const PRIORITY_LEAGUE_IDS: readonly LeagueId[] = [
  'premier-league',
  'la-liga',
  'serie-a',
  'bundesliga',
  'ligue-1',
  'uefa-champions',
  'uefa-europa',
  'uefa-conference',
  'mls',
  'eredivisie',
  'brasileirao',
  'liga-mx',
  'liga-profesional',
  'primeira-liga',
  'scottish-premiership',
  'saudi-pro-league',
  'uefa-nations',
  'fifa-world',
  'uefa-euro',
  'conmebol-america',
  'caf-nations',
  'afc-asian-cup',
  'concacaf-gold',
  'fa-cup',
  'copa-del-rey',
  'dfb-pokal',
  'coupe-de-france',
  'coppa-italia',
  'conmebol-libertadores',
  'fifa-club-world-cup',
]

type SuggestedTeam = {
  id: string
  name: string
  shortName: string
  leagueId: LeagueId
  kind: 'club' | 'national'
}

/**
 * Popular clubs + national sides (ESPN team ids).
 * Nationals are interleaved so suggestions are not club-only.
 */
const SUGGESTED_TEAMS: readonly SuggestedTeam[] = [
  { id: '86', name: 'Real Madrid', shortName: 'Real Madrid', leagueId: 'la-liga', kind: 'club' },
  { id: '448', name: 'England', shortName: 'England', leagueId: 'uefa-nations', kind: 'national' },
  { id: '83', name: 'Barcelona', shortName: 'Barcelona', leagueId: 'la-liga', kind: 'club' },
  { id: '205', name: 'Brazil', shortName: 'Brazil', leagueId: 'fifa-world', kind: 'national' },
  { id: '364', name: 'Liverpool', shortName: 'Liverpool', leagueId: 'premier-league', kind: 'club' },
  { id: '202', name: 'Argentina', shortName: 'Argentina', leagueId: 'fifa-world', kind: 'national' },
  { id: '360', name: 'Manchester United', shortName: 'Man United', leagueId: 'premier-league', kind: 'club' },
  { id: '478', name: 'France', shortName: 'France', leagueId: 'uefa-nations', kind: 'national' },
  { id: '132', name: 'Bayern Munich', shortName: 'Bayern', leagueId: 'bundesliga', kind: 'club' },
  { id: '164', name: 'Spain', shortName: 'Spain', leagueId: 'uefa-nations', kind: 'national' },
  { id: '160', name: 'Paris Saint-Germain', shortName: 'PSG', leagueId: 'ligue-1', kind: 'club' },
  { id: '481', name: 'Germany', shortName: 'Germany', leagueId: 'uefa-nations', kind: 'national' },
  { id: '382', name: 'Manchester City', shortName: 'Man City', leagueId: 'premier-league', kind: 'club' },
  { id: '162', name: 'Italy', shortName: 'Italy', leagueId: 'uefa-nations', kind: 'national' },
  { id: '359', name: 'Arsenal', shortName: 'Arsenal', leagueId: 'premier-league', kind: 'club' },
  { id: '482', name: 'Portugal', shortName: 'Portugal', leagueId: 'uefa-nations', kind: 'national' },
  { id: '363', name: 'Chelsea', shortName: 'Chelsea', leagueId: 'premier-league', kind: 'club' },
  { id: '449', name: 'Netherlands', shortName: 'Netherlands', leagueId: 'uefa-nations', kind: 'national' },
  { id: '111', name: 'Juventus', shortName: 'Juventus', leagueId: 'serie-a', kind: 'club' },
  { id: '459', name: 'Belgium', shortName: 'Belgium', leagueId: 'uefa-nations', kind: 'national' },
  { id: '103', name: 'AC Milan', shortName: 'Milan', leagueId: 'serie-a', kind: 'club' },
  { id: '212', name: 'Uruguay', shortName: 'Uruguay', leagueId: 'fifa-world', kind: 'national' },
  { id: '110', name: 'Internazionale', shortName: 'Inter', leagueId: 'serie-a', kind: 'club' },
  { id: '203', name: 'Mexico', shortName: 'Mexico', leagueId: 'concacaf-gold', kind: 'national' },
  { id: '124', name: 'Borussia Dortmund', shortName: 'Dortmund', leagueId: 'bundesliga', kind: 'club' },
  { id: '660', name: 'United States', shortName: 'USA', leagueId: 'concacaf-gold', kind: 'national' },
  { id: '367', name: 'Tottenham Hotspur', shortName: 'Spurs', leagueId: 'premier-league', kind: 'club' },
  { id: '2869', name: 'Morocco', shortName: 'Morocco', leagueId: 'caf-nations', kind: 'national' },
  { id: '1068', name: 'Atlético Madrid', shortName: 'Atlético', leagueId: 'la-liga', kind: 'club' },
  { id: '627', name: 'Japan', shortName: 'Japan', leagueId: 'afc-asian-cup', kind: 'national' },
  { id: '114', name: 'Napoli', shortName: 'Napoli', leagueId: 'serie-a', kind: 'club' },
  { id: '208', name: 'Colombia', shortName: 'Colombia', leagueId: 'conmebol-america', kind: 'national' },
  { id: '104', name: 'AS Roma', shortName: 'Roma', leagueId: 'serie-a', kind: 'club' },
  { id: '654', name: 'Senegal', shortName: 'Senegal', leagueId: 'caf-nations', kind: 'national' },
  { id: '20232', name: 'Inter Miami', shortName: 'Inter Miami', leagueId: 'mls', kind: 'club' },
  { id: '477', name: 'Croatia', shortName: 'Croatia', leagueId: 'uefa-nations', kind: 'national' },
  { id: '139', name: 'Ajax', shortName: 'Ajax', leagueId: 'eredivisie', kind: 'club' },
  { id: '479', name: 'Denmark', shortName: 'Denmark', leagueId: 'uefa-nations', kind: 'national' },
  { id: '176', name: 'Marseille', shortName: 'Marseille', leagueId: 'ligue-1', kind: 'club' },
  { id: '451', name: 'South Korea', shortName: 'Korea Republic', leagueId: 'afc-asian-cup', kind: 'national' },
  { id: '361', name: 'Newcastle United', shortName: 'Newcastle', leagueId: 'premier-league', kind: 'club' },
  { id: '362', name: 'Aston Villa', shortName: 'Aston Villa', leagueId: 'premier-league', kind: 'club' },
  { id: '375', name: 'Leicester City', shortName: 'Leicester', leagueId: 'eng-championship', kind: 'club' },
  { id: '371', name: 'West Ham United', shortName: 'West Ham', leagueId: 'premier-league', kind: 'club' },
  { id: '331', name: 'Brighton & Hove Albion', shortName: 'Brighton', leagueId: 'premier-league', kind: 'club' },
  { id: '112', name: 'Lazio', shortName: 'Lazio', leagueId: 'serie-a', kind: 'club' },
  { id: '105', name: 'Atalanta', shortName: 'Atalanta', leagueId: 'serie-a', kind: 'club' },
  { id: '131', name: 'Bayer Leverkusen', shortName: 'Leverkusen', leagueId: 'bundesliga', kind: 'club' },
  { id: '167', name: 'Lyon', shortName: 'Lyon', leagueId: 'ligue-1', kind: 'club' },
  { id: '174', name: 'Monaco', shortName: 'Monaco', leagueId: 'ligue-1', kind: 'club' },
  { id: '2250', name: 'Sporting CP', shortName: 'Sporting', leagueId: 'primeira-liga', kind: 'club' },
  { id: '1929', name: 'Benfica', shortName: 'Benfica', leagueId: 'primeira-liga', kind: 'club' },
  { id: '437', name: 'Porto', shortName: 'Porto', leagueId: 'primeira-liga', kind: 'club' },
  { id: '819', name: 'Flamengo', shortName: 'Flamengo', leagueId: 'brasileirao', kind: 'club' },
  { id: '929', name: 'Al Hilal', shortName: 'Al Hilal', leagueId: 'saudi-pro-league', kind: 'club' },
  { id: '16', name: 'River Plate', shortName: 'River Plate', leagueId: 'liga-profesional', kind: 'club' },
  { id: '5', name: 'Boca Juniors', shortName: 'Boca Juniors', leagueId: 'liga-profesional', kind: 'club' },
  { id: '227', name: 'Club América', shortName: 'América', leagueId: 'liga-mx', kind: 'club' },
  { id: '256', name: 'Celtic', shortName: 'Celtic', leagueId: 'scottish-premiership', kind: 'club' },
  { id: '380', name: 'Wolverhampton Wanderers', shortName: 'Wolves', leagueId: 'premier-league', kind: 'club' },
  { id: '393', name: 'Nottingham Forest', shortName: 'Nottm Forest', leagueId: 'premier-league', kind: 'club' },
  { id: '370', name: 'Fulham', shortName: 'Fulham', leagueId: 'premier-league', kind: 'club' },
  { id: '368', name: 'Everton', shortName: 'Everton', leagueId: 'premier-league', kind: 'club' },
]

type SuggestedPlayer = {
  id: string
  name: string
  shortName: string
  leagueId: LeagueId
  teamId?: string
  teamName?: string
  position?: string
  citizenship?: string
}

/** Popular players with ESPN athlete ids for Favorites suggestions. */
const SUGGESTED_PLAYERS: readonly SuggestedPlayer[] = [
  {
    id: '231388',
    name: 'Kylian Mbappé',
    shortName: 'Mbappé',
    leagueId: 'la-liga',
    teamId: '86',
    teamName: 'Real Madrid',
    position: 'F',
    citizenship: 'France',
  },
  {
    id: '253989',
    name: 'Erling Haaland',
    shortName: 'Haaland',
    leagueId: 'premier-league',
    teamId: '382',
    teamName: 'Manchester City',
    position: 'F',
    citizenship: 'Norway',
  },
  {
    id: '45843',
    name: 'Lionel Messi',
    shortName: 'Messi',
    leagueId: 'mls',
    teamId: '20232',
    teamName: 'Inter Miami',
    position: 'F',
    citizenship: 'Argentina',
  },
  {
    id: '22774',
    name: 'Cristiano Ronaldo',
    shortName: 'Ronaldo',
    leagueId: 'saudi-pro-league',
    teamId: '929',
    teamName: 'Al Hilal',
    position: 'F',
    citizenship: 'Portugal',
  },
  {
    id: '173896',
    name: 'Mohamed Salah',
    shortName: 'Salah',
    leagueId: 'premier-league',
    teamId: '364',
    teamName: 'Liverpool',
    position: 'F',
    citizenship: 'Egypt',
  },
  {
    id: '291281',
    name: 'Jude Bellingham',
    shortName: 'Bellingham',
    leagueId: 'la-liga',
    teamId: '86',
    teamName: 'Real Madrid',
    position: 'M',
    citizenship: 'England',
  },
  {
    id: '252107',
    name: 'Vinícius Júnior',
    shortName: 'Vinícius',
    leagueId: 'la-liga',
    teamId: '86',
    teamName: 'Real Madrid',
    position: 'F',
    citizenship: 'Brazil',
  },
  {
    id: '280555',
    name: 'Bukayo Saka',
    shortName: 'Saka',
    leagueId: 'premier-league',
    teamId: '359',
    teamName: 'Arsenal',
    position: 'F',
    citizenship: 'England',
  },
  {
    id: '362150',
    name: 'Lamine Yamal',
    shortName: 'Yamal',
    leagueId: 'la-liga',
    teamId: '83',
    teamName: 'Barcelona',
    position: 'F',
    citizenship: 'Spain',
  },
  {
    id: '142200',
    name: 'Harry Kane',
    shortName: 'Kane',
    leagueId: 'bundesliga',
    teamId: '132',
    teamName: 'Bayern Munich',
    position: 'F',
    citizenship: 'England',
  },
  {
    id: '250465',
    name: 'Pedri',
    shortName: 'Pedri',
    leagueId: 'la-liga',
    teamId: '83',
    teamName: 'Barcelona',
    position: 'M',
    citizenship: 'Spain',
  },
  {
    id: '231828',
    name: 'Rodri',
    shortName: 'Rodri',
    leagueId: 'premier-league',
    teamId: '382',
    teamName: 'Manchester City',
    position: 'M',
    citizenship: 'Spain',
  },
  {
    id: '296395',
    name: 'Cole Palmer',
    shortName: 'Palmer',
    leagueId: 'premier-league',
    teamId: '363',
    teamName: 'Chelsea',
    position: 'M',
    citizenship: 'England',
  },
  {
    id: '250787',
    name: 'Phil Foden',
    shortName: 'Foden',
    leagueId: 'premier-league',
    teamId: '382',
    teamName: 'Manchester City',
    position: 'M',
    citizenship: 'England',
  },
  {
    id: '238262',
    name: 'Declan Rice',
    shortName: 'Rice',
    leagueId: 'premier-league',
    teamId: '359',
    teamName: 'Arsenal',
    position: 'M',
    citizenship: 'England',
  },
  {
    id: '303821',
    name: 'Jamal Musiala',
    shortName: 'Musiala',
    leagueId: 'bundesliga',
    teamId: '132',
    teamName: 'Bayern Munich',
    position: 'M',
    citizenship: 'Germany',
  },
  {
    id: '303748',
    name: 'Florian Wirtz',
    shortName: 'Wirtz',
    leagueId: 'bundesliga',
    teamId: '131',
    teamName: 'Bayer Leverkusen',
    position: 'M',
    citizenship: 'Germany',
  },
  {
    id: '277385',
    name: 'William Saliba',
    shortName: 'Saliba',
    leagueId: 'premier-league',
    teamId: '359',
    teamName: 'Arsenal',
    position: 'D',
    citizenship: 'France',
  },
  {
    id: '203669',
    name: 'Martin Ødegaard',
    shortName: 'Ødegaard',
    leagueId: 'premier-league',
    teamId: '359',
    teamName: 'Arsenal',
    position: 'M',
    citizenship: 'Norway',
  },
  {
    id: '235818',
    name: 'Federico Valverde',
    shortName: 'Valverde',
    leagueId: 'la-liga',
    teamId: '86',
    teamName: 'Real Madrid',
    position: 'M',
    citizenship: 'Uruguay',
  },
  {
    id: '219713',
    name: 'Lautaro Martínez',
    shortName: 'Lautaro',
    leagueId: 'serie-a',
    teamId: '110',
    teamName: 'Internazionale',
    position: 'F',
    citizenship: 'Argentina',
  },
  {
    id: '204441',
    name: 'Nicolò Barella',
    shortName: 'Barella',
    leagueId: 'serie-a',
    teamId: '110',
    teamName: 'Internazionale',
    position: 'M',
    citizenship: 'Italy',
  },
  {
    id: '140416',
    name: 'Antoine Griezmann',
    shortName: 'Griezmann',
    leagueId: 'la-liga',
    teamId: '1068',
    teamName: 'Atlético Madrid',
    position: 'F',
    citizenship: 'France',
  },
  {
    id: '228296',
    name: 'Victor Osimhen',
    shortName: 'Osimhen',
    leagueId: 'serie-a',
    teamId: '114',
    teamName: 'Napoli',
    position: 'F',
    citizenship: 'Nigeria',
  },
  {
    id: '125824',
    name: 'Robert Lewandowski',
    shortName: 'Lewandowski',
    leagueId: 'la-liga',
    teamId: '83',
    teamName: 'Barcelona',
    position: 'F',
    citizenship: 'Poland',
  },
  {
    id: '149945',
    name: 'Son Heung-Min',
    shortName: 'Son',
    leagueId: 'premier-league',
    teamId: '367',
    teamName: 'Tottenham Hotspur',
    position: 'F',
    citizenship: 'South Korea',
  },
  {
    id: '286319',
    name: 'Luis Díaz',
    shortName: 'Díaz',
    leagueId: 'premier-league',
    teamId: '364',
    teamName: 'Liverpool',
    position: 'F',
    citizenship: 'Colombia',
  },
  {
    id: '283672',
    name: 'Jérémy Doku',
    shortName: 'Doku',
    leagueId: 'premier-league',
    teamId: '382',
    teamName: 'Manchester City',
    position: 'F',
    citizenship: 'Belgium',
  },
  {
    id: '132948',
    name: 'Neymar',
    shortName: 'Neymar',
    leagueId: 'saudi-pro-league',
    teamId: '929',
    teamName: 'Al Hilal',
    position: 'F',
    citizenship: 'Brazil',
  },
  {
    id: '172850',
    name: 'Jack Grealish',
    shortName: 'Grealish',
    leagueId: 'premier-league',
    teamId: '382',
    teamName: 'Manchester City',
    position: 'M',
    citizenship: 'England',
  },
]

function competitionPool(favoritedLeagueIds: Set<string>): League[] {
  const seen = new Set<string>()
  const ordered: League[] = []
  for (const id of PRIORITY_LEAGUE_IDS) {
    if (favoritedLeagueIds.has(id) || seen.has(id) || !findLeague(id)) continue
    if (!isActiveCompetition(id)) continue
    seen.add(id)
    ordered.push(getLeague(id))
  }
  for (const league of LEAGUES) {
    if (favoritedLeagueIds.has(league.id) || seen.has(league.id)) continue
    if (!isActiveCompetition(league)) continue
    seen.add(league.id)
    ordered.push(league)
  }
  return ordered
}

function teamPool(
  favoritedTeamIds: Set<string>,
  favoritedLeagueIds: Set<string>,
): FavoriteTeam[] {
  const seen = new Set<string>()
  return [...SUGGESTED_TEAMS]
    .filter((team) => {
      if (!findLeague(team.leagueId) || favoritedTeamIds.has(team.id) || seen.has(team.id)) {
        return false
      }
      seen.add(team.id)
      return true
    })
    .sort((a, b) => {
      const aBoost = favoritedLeagueIds.has(a.leagueId) ? 0 : 1
      const bBoost = favoritedLeagueIds.has(b.leagueId) ? 0 : 1
      if (aBoost !== bBoost) return aBoost - bBoost
      return 0
    })
    .map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      leagueId: team.leagueId,
      kind: team.kind,
    }))
}

function playerPool(favoritedPlayerIds: Set<string>): FavoritePlayer[] {
  return SUGGESTED_PLAYERS.filter(
    (player) => findLeague(player.leagueId) && !favoritedPlayerIds.has(player.id),
  ).map((player) => ({ ...player }))
}

export function suggestedLeagues(
  favoritedLeagueIds: Set<string>,
  limit = SUGGESTION_PAGE_SIZE,
): League[] {
  return competitionPool(favoritedLeagueIds).slice(0, limit)
}

export function suggestedLeagueCount(favoritedLeagueIds: Set<string>): number {
  return competitionPool(favoritedLeagueIds).length
}

export function suggestedTeams(
  favoritedTeamIds: Set<string>,
  favoritedLeagueIds: Set<string>,
  limit = SUGGESTION_PAGE_SIZE,
): FavoriteTeam[] {
  return teamPool(favoritedTeamIds, favoritedLeagueIds).slice(0, limit)
}

export function suggestedTeamCount(
  favoritedTeamIds: Set<string>,
  favoritedLeagueIds: Set<string>,
): number {
  return teamPool(favoritedTeamIds, favoritedLeagueIds).length
}

export function suggestedPlayers(
  favoritedPlayerIds: Set<string>,
  limit = SUGGESTION_PAGE_SIZE,
): FavoritePlayer[] {
  return playerPool(favoritedPlayerIds).slice(0, limit)
}

export function suggestedPlayerCount(favoritedPlayerIds: Set<string>): number {
  return playerPool(favoritedPlayerIds).length
}
