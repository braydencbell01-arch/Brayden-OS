import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MISSING_LONG, missingShort } from '../lib/display'
import { LEAGUES, getLeague, teamSubtitleLabel, type LeagueId } from '../lib/leagues'
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
import { teamLogoUrl } from '../lib/stats/branding'
import { EntityLogo } from './EntityLogo'
import { LeagueLogoMark } from './LeagueLogoMark'

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
  leading,
}: {
  label: string
  meta: string
  onClick: () => void
  leading?: ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset"
      >
        {leading}
        <span className="min-w-0">
          <span className="profile-link block truncate text-sm font-semibold text-cream">{label}</span>
          <span className="block truncate text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
            {meta}
          </span>
        </span>
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
  inputId = 'home-search',
  placeholder = 'Try Arsenal, Premier League, Messi…',
}: {
  matches: Match[]
  favoriteTeams: FavoriteTeam[]
  favoritePlayers: FavoritePlayer[]
  onOpenLeague: (id: LeagueId) => void
  onOpenTeam: (team: FavoriteTeam) => void
  onOpenPlayer: (player: PlayerNavRef) => void
  inputId?: string
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  /** Results panel only after Enter / blue search button — not while typing. */
  const [resultsOpen, setResultsOpen] = useState(false)
  const [remote, setRemote] = useState<{ teams: GroupedSearchHits['teams']; players: GroupedSearchHits['players'] }>({
    teams: [],
    players: [],
  })
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [openingPlayerId, setOpeningPlayerId] = useState<string | null>(null)
  const [openPlayerError, setOpenPlayerError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)
  const openPlayerRequestId = useRef(0)

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
  const showPanel = resultsOpen
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
      setRemoteError(null)
      setLoadingRemote(false)
      return
    }

    const id = ++requestId.current
    // Drop previous ESPN hits immediately so typing never mixes stale remote rows.
    setRemote({ teams: [], players: [] })
    setLoadingRemote(true)
    setRemoteError(null)
    const timer = window.setTimeout(() => {
      void searchEspnSoccer(q)
        .then((result) => {
          if (requestId.current !== id) return
          setRemote(result)
          setRemoteError(null)
        })
        .catch(() => {
          if (requestId.current !== id) return
          setRemote({ teams: [], players: [] })
          setRemoteError('Search is temporarily unavailable. Local results still show.')
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
        setResultsOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    if (!resultsOpen && !focused) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFocused(false)
        setResultsOpen(false)
        setOpenPlayerError(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focused, resultsOpen])

  const clearAndClose = () => {
    setQuery('')
    setFocused(false)
    setResultsOpen(false)
    setRemote({ teams: [], players: [] })
    setRemoteError(null)
    setOpenPlayerError(null)
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
    setOpenPlayerError(null)
    const req = ++openPlayerRequestId.current
    try {
      const player = await resolvePlayerNavFromSearch(hit as SearchPlayerHit)
      if (openPlayerRequestId.current !== req) return
      onOpenPlayer(player)
      clearAndClose()
    } catch {
      if (openPlayerRequestId.current !== req) return
      setOpenPlayerError('Could not open that player. Try again.')
    } finally {
      if (openPlayerRequestId.current === req) setOpeningPlayerId(null)
    }
  }

  const submitSearch = () => {
    setFocused(true)
    setResultsOpen(true)
    setOpenPlayerError(null)
  }

  return (
    <div ref={rootRef} className="relative z-20 mb-2">
      <label className="sr-only" htmlFor={inputId}>
        Search any league, club, or player
      </label>
      <form
        className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] py-1.5 pl-3 pr-1.5 focus-within:border-lime/45 focus-within:bg-white/[0.07]"
        onSubmit={(event) => {
          event.preventDefault()
          submitSearch()
        }}
      >
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
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-base text-cream outline-none placeholder:text-mist/40"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResultsOpen(false)
              setRemote({ teams: [], players: [] })
              setRemoteError(null)
            }}
            className="shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/60 transition hover:text-lime"
          >
            Clear
          </button>
        ) : null}
      </form>

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
                          meta={teamSubtitleLabel(team)}
                          leading={
                            <EntityLogo name={team.name} src={teamLogoUrl(team.id)} size="sm" />
                          }
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
                        leading={
                          <LeagueLogoMark leagueId={league.id} name={league.name} size="sm" />
                        }
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
              {remoteError ? (
                <p className="px-3 py-2 text-xs text-mist/70">{remoteError}</p>
              ) : null}
              {openPlayerError ? (
                <p className="px-3 py-2 text-xs text-star">{openPlayerError}</p>
              ) : null}
              {total === 0 && !loadingRemote ? (
                <p className="px-3 py-3 text-sm text-mist/70">
                  {remoteError
                    ? `No local matches for “${query.trim()}”.`
                    : `No matches for “${query.trim()}”.`}
                </p>
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
                      leading={
                        <LeagueLogoMark
                          leagueId={hit.league.id}
                          name={hit.league.name}
                          size="sm"
                        />
                      }
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
                      meta={teamSubtitleLabel(hit.team)}
                      leading={
                        <EntityLogo
                          name={hit.team.name}
                          src={teamLogoUrl(hit.team.id)}
                          size="sm"
                        />
                      }
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
                          ? `${missingShort(hit.player.name || hit.player.shortName)}…`
                          : missingShort(hit.player.name || hit.player.shortName)
                      }
                      meta={
                        hit.subtitle ||
                        hit.player.teamName ||
                        getLeague(hit.player.leagueId).short ||
                        MISSING_LONG
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
