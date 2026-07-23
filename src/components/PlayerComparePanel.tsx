import { useEffect, useMemo, useRef, useState } from 'react'
import { MISSING_SHORT, missingShort } from '../lib/display'
import type { FavoritePlayer } from '../lib/favorites'
import { getLeague } from '../lib/leagues'
import {
  resolvePlayerNavFromSearch,
  searchEspnSoccer,
  searchPlayersLocal,
  type SearchPlayerHit,
} from '../lib/search'
import { fetchPlayerProfile } from '../lib/stats/espn'
import type { PlayerProfile, PlayerSeasonStatLine } from '../lib/stats/types'
import type { PlayerNavRef } from './PlayerProfileScreen'

type Side = {
  nav: PlayerNavRef
  profile: PlayerProfile | null
  loading: boolean
  error: string | null
}

function StatRow({ label, a, b }: { label: string; a: string; b: string }) {
  const aNum = Number(a.replace(/[^0-9.-]/g, ''))
  const bNum = Number(b.replace(/[^0-9.-]/g, ''))
  const comparable = Number.isFinite(aNum) && Number.isFinite(bNum) && a !== b
  const aWins = comparable && aNum > bNum
  const bWins = comparable && bNum > aNum

  return (
    <div className="grid grid-cols-3 gap-2 border-b border-white/10 py-2 text-sm">
      <span
        className={`text-right tabular-nums ${aWins ? 'font-semibold text-lime' : 'text-cream'}`}
      >
        {a}
      </span>
      <span className="text-center text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
        {label}
      </span>
      <span className={`tabular-nums ${bWins ? 'font-semibold text-lime' : 'text-cream'}`}>{b}</span>
    </div>
  )
}

function PlayerPick({
  label,
  favoritePlayers,
  value,
  onChange,
}: {
  label: string
  favoritePlayers: FavoritePlayer[]
  value: PlayerNavRef | null
  onChange: (player: PlayerNavRef | null) => void
}) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<SearchPlayerHit[]>([])
  const [loading, setLoading] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const localHits = useMemo(
    () => searchPlayersLocal(query, favoritePlayers).slice(0, 6),
    [favoritePlayers, query],
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setRemote([])
      setLoading(false)
      return
    }
    const req = ++requestId.current
    setLoading(true)
    const timer = window.setTimeout(() => {
      void searchEspnSoccer(q)
        .then((result) => {
          if (requestId.current !== req) return
          setRemote(result.players.slice(0, 8))
          setError(null)
        })
        .catch(() => {
          if (requestId.current !== req) return
          setRemote([])
          setError('Search failed')
        })
        .finally(() => {
          if (requestId.current === req) setLoading(false)
        })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query])

  const pickHit = async (hit: SearchPlayerHit) => {
    setOpeningId(hit.player.id)
    setError(null)
    try {
      const player = await resolvePlayerNavFromSearch(hit)
      onChange(player)
      setQuery('')
      setRemote([])
    } catch {
      setError('Could not open that player')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">{label}</p>
      {value ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-cream">
              {missingShort(value.name || value.shortName)}
            </span>
            <span className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
              {value.teamName || getLeague(value.leagueId).short}
              {value.position ? ` · ${value.position}` : ''}
            </span>
          </span>
          <button type="button" className="shrink-0 text-xs text-lime" onClick={() => onChange(null)}>
            Clear
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player…"
            className="mt-2 w-full rounded-lg border border-white/15 bg-pitch px-3 py-2 text-sm text-cream outline-none focus:border-lime/45"
          />
          {loading ? <p className="mt-1 text-xs text-mist/55">Searching…</p> : null}
          {error ? <p className="mt-1 text-xs text-mist/80">{error}</p> : null}
          <ul className="mt-1 max-h-48 overflow-y-auto">
            {localHits.map((hit) => (
              <li key={`local-${hit.player.id}`}>
                <button
                  type="button"
                  disabled={openingId === hit.player.id}
                  onClick={() => void pickHit(hit)}
                  className="w-full px-1 py-1.5 text-left text-sm text-cream hover:text-lime disabled:opacity-60"
                >
                  {hit.player.name} · {hit.player.teamName || getLeague(hit.player.leagueId).short}
                </button>
              </li>
            ))}
            {remote
              .filter((hit) => !localHits.some((local) => local.player.id === hit.player.id))
              .map((hit) => (
                <li key={`remote-${hit.player.id}`}>
                  <button
                    type="button"
                    disabled={openingId === hit.player.id}
                    onClick={() => void pickHit(hit)}
                    className="w-full px-1 py-1.5 text-left text-sm text-cream hover:text-lime disabled:opacity-60"
                  >
                    {hit.player.name}
                    {hit.subtitle ? ` · ${hit.subtitle}` : ''}
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  )
}

function valueForLabel(stats: PlayerSeasonStatLine[], label: string): string {
  return stats.find((row) => row.label === label)?.value ?? MISSING_SHORT
}

function mergeStatLabels(a: PlayerSeasonStatLine[], b: PlayerSeasonStatLine[]): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const row of [...a, ...b]) {
    if (seen.has(row.label)) continue
    seen.add(row.label)
    labels.push(row.label)
  }
  return labels
}

async function loadSide(nav: PlayerNavRef): Promise<Omit<Side, 'nav'>> {
  try {
    const { profile } = await fetchPlayerProfile(nav.leagueId, nav.id)
    return { profile, loading: false, error: null }
  } catch (err) {
    return {
      profile: null,
      loading: false,
      error: err instanceof Error ? err.message : 'Could not load stats',
    }
  }
}

/**
 * Head-to-head compare using real ESPN season stats (not FPL).
 */
export function PlayerComparePanel({
  favoritePlayers,
  onOpenPlayer,
}: {
  favoritePlayers: FavoritePlayer[]
  onOpenPlayer: (player: PlayerNavRef) => void
}) {
  const [navA, setNavA] = useState<PlayerNavRef | null>(null)
  const [navB, setNavB] = useState<PlayerNavRef | null>(null)
  const [sideA, setSideA] = useState<Side | null>(null)
  const [sideB, setSideB] = useState<Side | null>(null)

  useEffect(() => {
    if (!navA) {
      setSideA(null)
      return
    }
    let cancelled = false
    setSideA({ nav: navA, profile: null, loading: true, error: null })
    void loadSide(navA).then((result) => {
      if (cancelled) return
      setSideA({ nav: navA, ...result })
    })
    return () => {
      cancelled = true
    }
  }, [navA])

  useEffect(() => {
    if (!navB) {
      setSideB(null)
      return
    }
    let cancelled = false
    setSideB({ nav: navB, profile: null, loading: true, error: null })
    void loadSide(navB).then((result) => {
      if (cancelled) return
      setSideB({ nav: navB, ...result })
    })
    return () => {
      cancelled = true
    }
  }, [navB])

  const profileA = sideA?.profile
  const profileB = sideB?.profile
  const labels =
    profileA && profileB
      ? mergeStatLabels(profileA.seasonStats, profileB.seasonStats)
      : []

  return (
    <div className="space-y-3">
      <p className="text-sm text-mist/70">
        Compare two players on club season stats — goals, appearances, shots, and more from the live
        boards.
      </p>
      <PlayerPick
        label="Player A"
        favoritePlayers={favoritePlayers}
        value={navA}
        onChange={setNavA}
      />
      <PlayerPick
        label="Player B"
        favoritePlayers={favoritePlayers}
        value={navB}
        onChange={setNavB}
      />

      {sideA?.loading || sideB?.loading ? (
        <p className="text-sm text-mist/70">Loading season stats…</p>
      ) : null}
      {sideA?.error ? <p className="text-sm text-mist/80">{sideA.error}</p> : null}
      {sideB?.error ? <p className="text-sm text-mist/80">{sideB.error}</p> : null}

      {profileA && profileB ? (
        <div className="border border-white/10 bg-white/[0.03] px-3 py-3">
          <div className="mb-2 grid grid-cols-3 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-mist/55">
            <button
              type="button"
              className="truncate text-lime"
              onClick={() => onOpenPlayer(navA!)}
            >
              {missingShort(profileA.shortName || profileA.name)}
            </button>
            <span>vs</span>
            <button
              type="button"
              className="truncate text-lime"
              onClick={() => onOpenPlayer(navB!)}
            >
              {missingShort(profileB.shortName || profileB.name)}
            </button>
          </div>
          <p className="mb-2 text-center text-[0.65rem] text-mist/55">
            {profileA.seasonStatsLabel || getLeague(profileA.leagueId).short}
            {' · '}
            {profileB.seasonStatsLabel || getLeague(profileB.leagueId).short}
          </p>
          <StatRow
            label="Rating"
            a={
              profileA.averageRating != null ? profileA.averageRating.toFixed(1) : MISSING_SHORT
            }
            b={
              profileB.averageRating != null ? profileB.averageRating.toFixed(1) : MISSING_SHORT
            }
          />
          <StatRow
            label="Club"
            a={missingShort(profileA.teamName)}
            b={missingShort(profileB.teamName)}
          />
          <StatRow
            label="League"
            a={getLeague(profileA.leagueId).short}
            b={getLeague(profileB.leagueId).short}
          />
          {labels.length === 0 ? (
            <p className="py-3 text-center text-sm text-mist/70">
              No season stat lines available for one or both players yet.
            </p>
          ) : (
            labels.map((label) => (
              <StatRow
                key={label}
                label={label}
                a={valueForLabel(profileA.seasonStats, label)}
                b={valueForLabel(profileB.seasonStats, label)}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
