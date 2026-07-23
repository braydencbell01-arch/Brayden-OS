import { LEAGUES, isContinentalLeague, isInternationalLeague, type League, type LeagueId } from './leagues'
import type { FavoritePlayer, FavoriteTeam } from './favorites'
import type { Match } from './matches'
import type { PlayerNavRef } from '../components/PlayerProfileScreen'
import { playerHeadshotUrl } from './stats/espn'

export type SearchLeagueHit = {
  kind: 'league'
  league: League
}

export type SearchTeamHit = {
  kind: 'team'
  team: FavoriteTeam
}

export type SearchPlayerHit = {
  kind: 'player'
  player: PlayerNavRef
  subtitle?: string
}

export type SearchHit = SearchLeagueHit | SearchTeamHit | SearchPlayerHit

export type GroupedSearchHits = {
  leagues: SearchLeagueHit[]
  teams: SearchTeamHit[]
  players: SearchPlayerHit[]
}

const ESPN_CODE_TO_LEAGUE_ID: Record<string, LeagueId> = Object.fromEntries(
  LEAGUES.map((league) => [league.espnCode, league.id]),
) as Record<string, LeagueId>

/** Prefer men's senior national comps when ESPN returns several league tags. */
const NATIONAL_LEAGUE_PRIORITY: LeagueId[] = [
  'fifa-world',
  'uefa-nations',
  'uefa-euro',
  'fifa-worldq',
  'conmebol-america',
  'fifa-friendly',
]

export function leagueIdFromEspnCode(code?: string | null): LeagueId | null {
  if (!code) return null
  return ESPN_CODE_TO_LEAGUE_ID[code] ?? null
}

/**
 * Map ESPN club team slugs like eng.arsenal → premier-league via eng.1.
 * Country-only slugs (eng, bra) are national sides — do not map to domestic leagues.
 */
export function leagueIdFromTeamSlug(slug?: string | null): LeagueId | null {
  if (!slug) return null
  const parts = slug.split('.')
  if (parts.length < 2) return null
  const prefix = parts[0]?.toLowerCase()
  if (!prefix) return null
  return leagueIdFromEspnCode(`${prefix}.1`)
}

function teamKindForLeague(leagueId: LeagueId): FavoriteTeam['kind'] {
  return isInternationalLeague(leagueId) ? 'national' : 'club'
}

function pickBestLeagueId(candidates: Array<string | null | undefined>): LeagueId | null {
  const resolved = candidates
    .map((code) => leagueIdFromEspnCode(code))
    .filter((id): id is LeagueId => Boolean(id))
  if (resolved.length === 0) return null
  for (const preferred of NATIONAL_LEAGUE_PRIORITY) {
    if (resolved.includes(preferred)) return preferred
  }
  return resolved[0] ?? null
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase()
}

function includesQuery(haystack: string | undefined, query: string): boolean {
  if (!haystack) return false
  return haystack.toLowerCase().includes(query)
}

export function searchLeaguesLocal(query: string): SearchLeagueHit[] {
  const q = normalizeQuery(query)
  if (!q) return []
  return LEAGUES.filter(
    (league) =>
      includesQuery(league.name, q) ||
      includesQuery(league.short, q) ||
      includesQuery(league.country, q) ||
      (league.kind === 'international' && includesQuery('international', q)) ||
      (league.kind === 'international' && includesQuery('national', q)) ||
      (league.kind === 'continental' && includesQuery('continental', q)) ||
      (league.kind === 'continental' && includesQuery('champions', q)) ||
      (league.kind === 'continental' && includesQuery('europa', q)),
  ).map((league) => ({ kind: 'league' as const, league }))
}

function preferTeamLeagueId(current: LeagueId, next: LeagueId): LeagueId {
  if (current === next) return current
  if (isInternationalLeague(current) && isInternationalLeague(next)) {
    const a = NATIONAL_LEAGUE_PRIORITY.indexOf(current)
    const b = NATIONAL_LEAGUE_PRIORITY.indexOf(next)
    if (a < 0 && b < 0) return current
    if (a < 0) return next
    if (b < 0) return current
    return a <= b ? current : next
  }
  // Prefer international context when a national side also appears in friendlies/cups.
  if (isInternationalLeague(next) && !isInternationalLeague(current)) return next
  if (isInternationalLeague(current) && !isInternationalLeague(next)) return current
  // Club contexts: prefer domestic league over continental cup as the primary profile.
  if (isContinentalLeague(current) && !isContinentalLeague(next)) return next
  if (!isContinentalLeague(current) && isContinentalLeague(next)) return current
  return current
}

export function collectLocalTeams(
  matches: Match[],
  favoriteTeams: FavoriteTeam[],
): FavoriteTeam[] {
  const byId = new Map<string, FavoriteTeam>()
  for (const team of favoriteTeams) {
    byId.set(team.id, team)
  }
  for (const match of matches) {
    for (const side of [match.home, match.away]) {
      if (!side.id) continue
      const existing = byId.get(side.id)
      if (!existing) {
        byId.set(side.id, {
          id: side.id,
          name: side.name,
          shortName: side.shortName,
          leagueId: match.leagueId,
          kind: teamKindForLeague(match.leagueId),
        })
        continue
      }
      // Favorites keep their stored league; otherwise upgrade to a better competition tag.
      if (favoriteTeams.some((team) => team.id === side.id)) continue
      const preferred = preferTeamLeagueId(existing.leagueId, match.leagueId)
      if (preferred !== existing.leagueId) {
        byId.set(side.id, {
          ...existing,
          leagueId: preferred,
          kind: teamKindForLeague(preferred),
        })
      }
    }
  }
  return Array.from(byId.values())
}

export function searchTeamsLocal(query: string, teams: FavoriteTeam[]): SearchTeamHit[] {
  const q = normalizeQuery(query)
  if (!q) return []
  return teams
    .filter(
      (team) =>
        includesQuery(team.name, q) ||
        includesQuery(team.shortName, q),
    )
    .slice(0, 12)
    .map((team) => ({ kind: 'team' as const, team }))
}

export function searchPlayersLocal(
  query: string,
  favoritePlayers: FavoritePlayer[],
): SearchPlayerHit[] {
  const q = normalizeQuery(query)
  if (!q) return []
  return favoritePlayers
    .filter(
      (player) =>
        includesQuery(player.name, q) ||
        includesQuery(player.shortName, q) ||
        includesQuery(player.teamName, q),
    )
    .slice(0, 12)
    .map((player) => ({
      kind: 'player' as const,
      player: {
        id: player.id,
        leagueId: player.leagueId,
        name: player.name,
        shortName: player.shortName,
        photoUrl: player.photoUrl || playerHeadshotUrl(player.id),
        jerseyUrl: player.jerseyUrl,
        jersey: player.jersey,
        teamId: player.teamId,
        teamName: player.teamName,
        position: player.position,
      },
      subtitle: player.teamName,
    }))
}

type EspnSearchItem = {
  id?: string
  displayName?: string
  shortName?: string
  name?: string
  abbreviation?: string
  type?: string
  sport?: string
  league?: string
  defaultLeagueSlug?: string
  logos?: Array<{ href?: string }>
  leagueRelationships?: Array<{
    displayName?: string
    core?: { slug?: string; displayName?: string }
  }>
}

function espnSearchUrl(query: string, type?: 'team' | 'player'): string {
  const params = new URLSearchParams({
    query,
    limit: '20',
  })
  if (type) params.set('type', type)
  return `https://site.web.api.espn.com/apis/common/v3/search?${params.toString()}`
}

export async function searchEspnSoccer(
  query: string,
): Promise<{ teams: SearchTeamHit[]; players: SearchPlayerHit[] }> {
  const q = query.trim()
  if (q.length < 2) return { teams: [], players: [] }

  const [teamRes, playerRes] = await Promise.all([
    fetch(espnSearchUrl(q, 'team')),
    fetch(espnSearchUrl(q, 'player')),
  ])

  const teamJson = teamRes.ok
    ? ((await teamRes.json()) as { items?: EspnSearchItem[] })
    : { items: [] }
  const playerJson = playerRes.ok
    ? ((await playerRes.json()) as { items?: EspnSearchItem[] })
    : { items: [] }

  const teams: SearchTeamHit[] = []
  const seenTeams = new Set<string>()
  for (const item of teamJson.items ?? []) {
    if (item.type !== 'team' || item.sport !== 'soccer' || !item.id || !item.displayName) continue
    const leagueId = pickBestLeagueId([item.defaultLeagueSlug, item.league])
    if (!leagueId) continue
    if (seenTeams.has(item.id)) continue
    seenTeams.add(item.id)
    teams.push({
      kind: 'team',
      team: {
        id: item.id,
        name: item.displayName,
        shortName: item.abbreviation || item.name || item.displayName,
        leagueId,
        kind: teamKindForLeague(leagueId),
      },
    })
    if (teams.length >= 10) break
  }

  const players: SearchPlayerHit[] = []
  const seenPlayers = new Set<string>()
  for (const item of playerJson.items ?? []) {
    if (item.type !== 'player' || item.sport !== 'soccer' || !item.id || !item.displayName) {
      continue
    }
    if (seenPlayers.has(item.id)) continue
    seenPlayers.add(item.id)

    const relatedSlugs = (item.leagueRelationships ?? [])
      .map((rel) => rel.core?.slug)
      .filter(Boolean) as string[]
    const leagueId = pickBestLeagueId([
      ...relatedSlugs,
      item.league,
      item.defaultLeagueSlug,
    ])

    // Skip unresolved leagues — avoid fake Premier League defaults in results.
    if (!leagueId) continue

    const relatedLabel =
      (item.leagueRelationships ?? []).find((rel) => leagueIdFromEspnCode(rel.core?.slug))
        ?.displayName ||
      (item.leagueRelationships ?? [])[0]?.displayName

    players.push({
      kind: 'player',
      player: {
        id: item.id,
        leagueId,
        name: item.displayName,
        shortName: item.shortName || item.displayName,
        photoUrl: playerHeadshotUrl(item.id),
      },
      subtitle: relatedLabel,
    })
    if (players.length >= 10) break
  }

  return { teams, players }
}

/**
 * ESPN player search often tags the wrong default league. Resolve via athlete club slug.
 */
export async function resolvePlayerNavFromSearch(
  hit: SearchPlayerHit,
): Promise<PlayerNavRef> {
  try {
    const res = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${hit.player.id}`,
    )
    if (!res.ok) return hit.player

    const json = (await res.json()) as {
      athlete?: {
        id?: string
        displayName?: string
        shortName?: string
        jersey?: string
        headshot?: { href?: string }
        position?: { abbreviation?: string; displayName?: string }
        team?: {
          id?: string
          displayName?: string
          shortDisplayName?: string
          slug?: string
        }
      }
    }
    const athlete = json.athlete
    if (!athlete?.id) return hit.player

    const fromSlug = leagueIdFromTeamSlug(athlete.team?.slug)

    return {
      id: athlete.id,
      leagueId: fromSlug || hit.player.leagueId,
      name: athlete.displayName || hit.player.name,
      shortName: athlete.shortName || hit.player.shortName,
      photoUrl: athlete.headshot?.href || hit.player.photoUrl || playerHeadshotUrl(athlete.id),
      jersey: athlete.jersey,
      teamId: athlete.team?.id,
      teamName: athlete.team?.displayName || athlete.team?.shortDisplayName,
      position: athlete.position?.abbreviation || athlete.position?.displayName,
    }
  } catch {
    return hit.player
  }
}

export function mergeSearchHits(
  local: GroupedSearchHits,
  remote: { teams: SearchTeamHit[]; players: SearchPlayerHit[] },
): GroupedSearchHits {
  const teamIds = new Set(local.teams.map((hit) => hit.team.id))
  const playerIds = new Set(local.players.map((hit) => hit.player.id))

  const teams = [
    ...local.teams,
    ...remote.teams.filter((hit) => !teamIds.has(hit.team.id)),
  ].slice(0, 12)

  const players = [
    ...local.players,
    ...remote.players.filter((hit) => !playerIds.has(hit.player.id)),
  ].slice(0, 12)

  return {
    leagues: local.leagues.slice(0, 8),
    teams,
    players,
  }
}
