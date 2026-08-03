import type { FavoriteTeam } from './favorites'
import { findLeague, getLeague, type League, type LeagueId } from './leagues'

/** High-signal competitions for Favorites suggestions (not already starred). */
const SUGGESTED_LEAGUE_IDS: readonly LeagueId[] = [
  'premier-league',
  'la-liga',
  'serie-a',
  'bundesliga',
  'ligue-1',
  'uefa-champions',
  'uefa-europa',
  'mls',
  'eredivisie',
  'brasileirao',
  'liga-mx',
  'uefa-nations',
]

type SuggestedClub = {
  id: string
  name: string
  shortName: string
  leagueId: LeagueId
}

/**
 * Popular clubs with ESPN team ids (same ids BrayStats logos / profiles use).
 * Ordered roughly by worldwide recognition.
 */
const SUGGESTED_CLUBS: readonly SuggestedClub[] = [
  { id: '86', name: 'Real Madrid', shortName: 'Real Madrid', leagueId: 'la-liga' },
  { id: '83', name: 'Barcelona', shortName: 'Barcelona', leagueId: 'la-liga' },
  { id: '364', name: 'Liverpool', shortName: 'Liverpool', leagueId: 'premier-league' },
  { id: '360', name: 'Manchester United', shortName: 'Man United', leagueId: 'premier-league' },
  { id: '132', name: 'Bayern Munich', shortName: 'Bayern', leagueId: 'bundesliga' },
  { id: '160', name: 'Paris Saint-Germain', shortName: 'PSG', leagueId: 'ligue-1' },
  { id: '382', name: 'Manchester City', shortName: 'Man City', leagueId: 'premier-league' },
  { id: '359', name: 'Arsenal', shortName: 'Arsenal', leagueId: 'premier-league' },
  { id: '363', name: 'Chelsea', shortName: 'Chelsea', leagueId: 'premier-league' },
  { id: '111', name: 'Juventus', shortName: 'Juventus', leagueId: 'serie-a' },
  { id: '103', name: 'AC Milan', shortName: 'Milan', leagueId: 'serie-a' },
  { id: '110', name: 'Internazionale', shortName: 'Inter', leagueId: 'serie-a' },
  { id: '124', name: 'Borussia Dortmund', shortName: 'Dortmund', leagueId: 'bundesliga' },
  { id: '367', name: 'Tottenham Hotspur', shortName: 'Spurs', leagueId: 'premier-league' },
  { id: '1068', name: 'Atlético Madrid', shortName: 'Atlético', leagueId: 'la-liga' },
  { id: '114', name: 'Napoli', shortName: 'Napoli', leagueId: 'serie-a' },
  { id: '104', name: 'AS Roma', shortName: 'Roma', leagueId: 'serie-a' },
  { id: '20232', name: 'Inter Miami', shortName: 'Inter Miami', leagueId: 'mls' },
  { id: '139', name: 'Ajax', shortName: 'Ajax', leagueId: 'eredivisie' },
  { id: '176', name: 'Marseille', shortName: 'Marseille', leagueId: 'ligue-1' },
]

export function suggestedLeagues(
  favoritedLeagueIds: Set<string>,
  limit = 6,
): League[] {
  return SUGGESTED_LEAGUE_IDS.filter((id) => findLeague(id) && !favoritedLeagueIds.has(id))
    .slice(0, limit)
    .map((id) => getLeague(id))
}

export function suggestedTeams(
  favoritedTeamIds: Set<string>,
  favoritedLeagueIds: Set<string>,
  limit = 8,
): FavoriteTeam[] {
  const ranked = [...SUGGESTED_CLUBS]
    .filter((club) => findLeague(club.leagueId) && !favoritedTeamIds.has(club.id))
    .sort((a, b) => {
      const aBoost = favoritedLeagueIds.has(a.leagueId) ? 0 : 1
      const bBoost = favoritedLeagueIds.has(b.leagueId) ? 0 : 1
      return aBoost - bBoost
    })

  return ranked.slice(0, limit).map((club) => ({
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    leagueId: club.leagueId,
    kind: 'club' as const,
  }))
}
