import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LEAGUES, getLeague, type LeagueId } from '../lib/leagues'
import type { FavoritePlayer, FavoriteTeam } from '../lib/favorites'
import type { Match } from '../lib/matches'
import type { PlayerNavRef } from './PlayerProfileScreen'
import {
  collectLocalTeams,
  mergeSearchHits,
  resolvePlayerNavFromSearch,
  searchEspnSoccer,
  searchLeaguesLocal,
  searchPlayersLocal,
  searchTeamsLocal,
  type GroupedSearchHits,
  type SearchHit,
  type SearchPlayerHit,
} from '../lib/search'

const EMPTY_HITS: GroupedSearchHits = { leagues: [], teams: [], players: [] }

function ResultSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-white/10 first:border-t-0">
      <p className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-lime/80">
        {title}
      </p>
      <ul className="flex flex-col">{children}</ul>
    </section>
  )
}

function ResultButton({
  label,
  meta,
  onClick,
}: {
  label: string
  meta: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
      >
        <span className="min-w-0">
          <span className="profile-link block truncate text-sm font-semibold text-cream">{label}</span>
          <span className="block truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
            {meta}
          </span>
        </span>
        <span className="shrink-0 text-lime">→</span>
      </button>
    </li>
  )
}

export function HomeSearch({
  matches,
  favoriteTeams,
  favoritePlayers,
  onOpenLeague,
  onOpenTeam,
  onOpenPlayer,
}: {
  matches: Match[]
  favoriteTeams: FavoriteTeam[]
  favoritePlayers: FavoritePlayer[]
  onOpenLeague: (id: LeagueId) => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [remote, setRemote] = useState<{ teams: GroupedSearchHits['teams']; players: GroupedSearchHits['players'] }>({
    teams: [],
    players: [],
  })
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [openingPlayerId, setOpeningPlayerId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  const localTeams = useMemo(
    () => collectLocalTeams(matches, favoriteTeams),
    [matches, favoriteTeams],
  )

  const localHits = useMemo(() => {
    const q = query.trim()
    if (q.length < 1) return EMPTY_HITS
    return {
      leagues: searchLeaguesLocal(q),
      teams: searchTeamsLocal(q, localTeams),
      players: searchPlayersLocal(q, favoritePlayers),
    }
  }, [query, localTeams, favoritePlayers])

  const hits = useMemo(
    () => mergeSearchHits(localHits, remote),
    [localHits, remote],
  )

  const hasQuery = query.trim().length > 0
  const showPanel = focused
  const total =
    hits.leagues.length + hits.teams.length + hits.players.length

  const quickLeagues = useMemo(() => LEAGUES.slice(0, 5), [])
  const quickTeams = useMemo(() => favoriteTeams.slice(0, 4), [favoriteTeams])
  const quickPlayers = useMemo(() => favoritePlayers.slice(0, 4), [favoritePlayers])
  const hasQuickHits =
    quickLeagues.length > 0 || quickTeams.length > 0 || quickPlayers.length > 0

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      requestId.current += 1
      setRemote({ teams: [], players: [] })
      setLoadingRemote(false)
      return
    }

    const id = ++requestId.current
    setLoadingRemote(true)
    const timer = window.setTimeout(() => {
      void searchEspnSoccer(q)
        .then((result) => {
          if (requestId.current !== id) return
          setRemote(result)
        })
        .catch(() => {
          if (requestId.current !== id) return
          setRemote({ teams: [], players: [] })
        })
        .finally(() => {
          if (requestId.current !== id) return
          setLoadingRemote(false)
        })
    }, 280)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const clearAndClose = () => {
    setQuery('')
    setFocused(false)
    setRemote({ teams: [], players: [] })
  }

  const handleHit = async (hit: SearchHit) => {
    if (hit.kind === 'league') {
      onOpenLeague(hit.league.id)
      clearAndClose()
      return
    }
    if (hit.kind === 'team') {
      onOpenTeam(hit.team)
      clearAndClose()
      return
    }
    setOpeningPlayerId(hit.player.id)
    try {
      const player = await resolvePlayerNavFromSearch(hit as SearchPlayerHit)
      onOpenPlayer(player)
      clearAndClose()
    } finally {
      setOpeningPlayerId(null)
    }
  }

  return (
    <div ref={rootRef} className="relative z-20 mb-3.5">
      <label className="sr-only" htmlFor="home-search">
        Search leagues, teams, and players
      </label>
      <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2 focus-within:border-lime/45 focus-within:bg-white/[0.07]">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden
          className="shrink-0 text-mist/55"
        >
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16.5 16.5L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          id="home-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search leagues, teams, players"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-cream outline-none placeholder:text-mist/40"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setRemote({ teams: [], players: [] })
            }}
            className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/60 transition hover:text-lime"
          >
            Clear
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] max-h-[min(24rem,60vh)] overflow-y-auto border border-white/15 bg-pitch-deep/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          role="listbox"
          aria-label="Search results"
        >
          {!hasQuery ? (
            <>
              <p className="px-3 py-2.5 text-xs text-mist/65">
                Type a club, league, or player — or jump from the shortcuts below.
              </p>
              {hasQuickHits ? (
                <>
                  {quickPlayers.length > 0 ? (
                    <ResultSection title="Your players">
                      {quickPlayers.map((player) => (
                        <ResultButton
                          key={player.id}
                          label={player.name}
                          meta={player.teamName || getLeague(player.leagueId).short}
                          onClick={() => {
                            onOpenPlayer({
                              id: player.id,
                              leagueId: player.leagueId,
                              name: player.name,
                              shortName: player.shortName,
                              photoUrl: player.photoUrl,
                              jerseyUrl: player.jerseyUrl,
                              jersey: player.jersey,
                              teamId: player.teamId,
                              teamName: player.teamName,
                              position: player.position,
                            })
                            clearAndClose()
                          }}
                        />
                      ))}
                    </ResultSection>
                  ) : null}
                  {quickTeams.length > 0 ? (
                    <ResultSection title="Your teams">
                      {quickTeams.map((team) => (
                        <ResultButton
                          key={team.id}
                          label={team.name}
                          meta={getLeague(team.leagueId).short}
                          onClick={() => {
                            onOpenTeam(team)
                            clearAndClose()
                          }}
                        />
                      ))}
                    </ResultSection>
                  ) : null}
                  <ResultSection title="Popular leagues">
                    {quickLeagues.map((league) => (
                      <ResultButton
                        key={league.id}
                        label={league.name}
                        meta={`${league.short} · ${league.country}`}
                        onClick={() => {
                          onOpenLeague(league.id)
                          clearAndClose()
                        }}
                      />
                    ))}
                  </ResultSection>
                </>
              ) : null}
            </>
          ) : (
            <>
              {total === 0 && !loadingRemote ? (
                <p className="px-3 py-3 text-sm text-mist/70">No matches for “{query.trim()}”.</p>
              ) : null}
              {loadingRemote ? (
                <p className="px-3 py-2 text-xs text-mist/60">Searching…</p>
              ) : null}

              {hits.leagues.length > 0 ? (
                <ResultSection title="Leagues">
                  {hits.leagues.map((hit) => (
                    <ResultButton
                      key={hit.league.id}
                      label={hit.league.name}
                      meta={`${hit.league.short} · ${hit.league.country}`}
                      onClick={() => void handleHit(hit)}
                    />
                  ))}
                </ResultSection>
              ) : null}

              {hits.teams.length > 0 ? (
                <ResultSection title="Teams">
                  {hits.teams.map((hit) => (
                    <ResultButton
                      key={hit.team.id}
                      label={hit.team.name}
                      meta={getLeague(hit.team.leagueId).short}
                      onClick={() => void handleHit(hit)}
                    />
                  ))}
                </ResultSection>
              ) : null}

              {hits.players.length > 0 ? (
                <ResultSection title="Players">
                  {hits.players.map((hit) => (
                    <ResultButton
                      key={hit.player.id}
                      label={
                        openingPlayerId === hit.player.id
                          ? `${hit.player.name || hit.player.shortName}…`
                          : hit.player.name || hit.player.shortName || 'Player'
                      }
                      meta={
                        hit.subtitle ||
                        hit.player.teamName ||
                        getLeague(hit.player.leagueId).short
                      }
                      onClick={() => void handleHit(hit)}
                    />
                  ))}
                </ResultSection>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
