import { useCallback, useEffect, useMemo, useState } from 'react'
import { LEAGUES, type LeagueId } from './leagues'

const STORAGE_KEY = 'brayden-stats-favorites-v1'
const KNOWN_LEAGUE_IDS = new Set<string>(LEAGUES.map((league) => league.id))

export type FavoriteTeam = {
  id: string
  name: string
  shortName: string
  leagueId: LeagueId
}

export type FavoritePlayer = {
  id: string
  name: string
  shortName: string
  photoUrl?: string
  jerseyUrl?: string
  jersey?: string
  position?: string
  leagueId: LeagueId
  teamId?: string
  teamName?: string
}

type FavoritesState = {
  leagues: LeagueId[]
  teams: FavoriteTeam[]
  players: FavoritePlayer[]
}

const EMPTY: FavoritesState = {
  leagues: [],
  teams: [],
  players: [],
}

function isLeagueId(value: unknown): value is LeagueId {
  return typeof value === 'string' && KNOWN_LEAGUE_IDS.has(value)
}

function readStorage(): FavoritesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<FavoritesState>
    const leagues = Array.isArray(parsed.leagues)
      ? parsed.leagues.filter(isLeagueId)
      : []
    const teams = Array.isArray(parsed.teams)
      ? parsed.teams.filter(
          (team): team is FavoriteTeam =>
            Boolean(team) &&
            typeof team.id === 'string' &&
            typeof team.name === 'string' &&
            typeof team.shortName === 'string' &&
            isLeagueId(team.leagueId),
        )
      : []
    const players = Array.isArray(parsed.players)
      ? parsed.players.filter(
          (player): player is FavoritePlayer =>
            Boolean(player) &&
            typeof player.id === 'string' &&
            typeof player.name === 'string' &&
            typeof player.shortName === 'string' &&
            isLeagueId(player.leagueId),
        )
      : []
    return { leagues, teams, players }
  } catch {
    return EMPTY
  }
}

function writeStorage(state: FavoritesState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function useFavorites() {
  const [state, setState] = useState<FavoritesState>(() => readStorage())

  useEffect(() => {
    // Re-sync if another tab mutated storage.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setState(readStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const leagueIds = useMemo(() => new Set(state.leagues), [state.leagues])
  const teamIds = useMemo(() => new Set(state.teams.map((team) => team.id)), [state.teams])
  const playerIds = useMemo(
    () => new Set(state.players.map((player) => player.id)),
    [state.players],
  )
  const favoritePlayerTeamIds = useMemo(() => {
    const ids = new Set<string>()
    for (const player of state.players) {
      if (player.teamId) ids.add(player.teamId)
    }
    return ids
  }, [state.players])

  const isLeagueFavorite = useCallback(
    (id: LeagueId) => leagueIds.has(id),
    [leagueIds],
  )

  const isTeamFavorite = useCallback(
    (id: string) => teamIds.has(id),
    [teamIds],
  )

  const isPlayerFavorite = useCallback(
    (id: string) => playerIds.has(id),
    [playerIds],
  )

  const toggleLeague = useCallback((id: LeagueId) => {
    setState((prev) => {
      const leagues = prev.leagues.includes(id)
        ? prev.leagues.filter((leagueId) => leagueId !== id)
        : [...prev.leagues, id]
      const next = { ...prev, leagues }
      writeStorage(next)
      return next
    })
  }, [])

  const toggleTeam = useCallback((team: FavoriteTeam) => {
    setState((prev) => {
      const exists = prev.teams.some((item) => item.id === team.id)
      const teams = exists
        ? prev.teams.filter((item) => item.id !== team.id)
        : [...prev.teams, team]
      const next = { ...prev, teams }
      writeStorage(next)
      return next
    })
  }, [])

  const togglePlayer = useCallback((player: FavoritePlayer) => {
    setState((prev) => {
      const exists = prev.players.some((item) => item.id === player.id)
      const players = exists
        ? prev.players.filter((item) => item.id !== player.id)
        : [...prev.players, player]
      const next = { ...prev, players }
      writeStorage(next)
      return next
    })
  }, [])

  return {
    leagues: state.leagues,
    teams: state.teams,
    players: state.players,
    leagueIds,
    teamIds,
    playerIds,
    favoritePlayerTeamIds,
    isLeagueFavorite,
    isTeamFavorite,
    isPlayerFavorite,
    toggleLeague,
    toggleTeam,
    togglePlayer,
  }
}

export type FavoritesApi = ReturnType<typeof useFavorites>
