import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LeagueId } from './leagues'

const STORAGE_KEY = 'brayden-stats-favorites-v1'

export type FavoriteTeam = {
  id: string
  name: string
  shortName: string
  leagueId: LeagueId
}

export type FavoritePlayer = {
  id: string
  name: string
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

function readStorage(): FavoritesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<FavoritesState>
    return {
      leagues: Array.isArray(parsed.leagues) ? (parsed.leagues as LeagueId[]) : [],
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      players: Array.isArray(parsed.players) ? parsed.players : [],
    }
  } catch {
    return EMPTY
  }
}

function writeStorage(state: FavoritesState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function useFavorites() {
  const [state, setState] = useState<FavoritesState>(EMPTY)

  useEffect(() => {
    setState(readStorage())
  }, [])

  const persist = useCallback((next: FavoritesState) => {
    setState(next)
    writeStorage(next)
  }, [])

  const leagueIds = useMemo(() => new Set(state.leagues), [state.leagues])
  const teamIds = useMemo(() => new Set(state.teams.map((team) => team.id)), [state.teams])

  const isLeagueFavorite = useCallback(
    (id: LeagueId) => leagueIds.has(id),
    [leagueIds],
  )

  const isTeamFavorite = useCallback(
    (id: string) => teamIds.has(id),
    [teamIds],
  )

  const toggleLeague = useCallback(
    (id: LeagueId) => {
      const leagues = leagueIds.has(id)
        ? state.leagues.filter((leagueId) => leagueId !== id)
        : [...state.leagues, id]
      persist({ ...state, leagues })
    },
    [leagueIds, persist, state],
  )

  const toggleTeam = useCallback(
    (team: FavoriteTeam) => {
      const teams = teamIds.has(team.id)
        ? state.teams.filter((item) => item.id !== team.id)
        : [...state.teams, team]
      persist({ ...state, teams })
    },
    [persist, state, teamIds],
  )

  return {
    leagues: state.leagues,
    teams: state.teams,
    players: state.players,
    leagueIds,
    teamIds,
    isLeagueFavorite,
    isTeamFavorite,
    toggleLeague,
    toggleTeam,
  }
}

export type FavoritesApi = ReturnType<typeof useFavorites>
