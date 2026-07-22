import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadFplCatalog, type FplCatalog } from './fplData'
import {
  addFreeAgent,
  autoSetStarters,
  beginDraft,
  cancelWaiverClaim,
  createLeague,
  draftPlayer,
  dropToWaivers,
  joinLeague,
  normalizeLeague,
  processWaiverClaims,
  proposeTrade,
  randomizeDraftOrder,
  resolveTrade,
  runDraftTick,
  scoreGameweek,
  setDraftClockSeconds,
  setDraftOrder,
  setMemberAutodraft,
  setStarters,
  submitWaiverClaim,
} from './leagueActions'
import { createSyncBlob, looksLikeBlobId, pullLeague, pushLeague } from './sync'
import type { FantasyIdentity, FantasyLeague, FantasyStoreState } from './types'

const STORAGE_KEY = 'brayden-stats-fantasy-v1'

function newMemberId(): string {
  return `mgr_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-3)}`
}

function readStore(): FantasyStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        identity: { memberId: newMemberId(), displayName: '' },
        leagues: {},
        activeLeagueId: null,
      }
    }
    const parsed = JSON.parse(raw) as FantasyStoreState
    if (!parsed.identity?.memberId) {
      parsed.identity = { memberId: newMemberId(), displayName: parsed.identity?.displayName || '' }
    }
    const leagues: Record<string, FantasyLeague> = {}
    for (const [id, league] of Object.entries(parsed.leagues ?? {})) {
      leagues[id] = normalizeLeague(league)
    }
    return { identity: parsed.identity, leagues, activeLeagueId: parsed.activeLeagueId ?? null }
  } catch {
    return {
      identity: { memberId: newMemberId(), displayName: '' },
      leagues: {},
      activeLeagueId: null,
    }
  }
}

function writeStore(state: FantasyStoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota / private mode — keep in-memory fantasy state for this session.
  }
}

export function useFantasy() {
  const [store, setStore] = useState<FantasyStoreState>(() =>
    typeof window === 'undefined'
      ? { identity: { memberId: 'ssr', displayName: '' }, leagues: {}, activeLeagueId: null }
      : readStore(),
  )
  const [catalog, setCatalog] = useState<FplCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const pushTimer = useRef<number | null>(null)

  useEffect(() => {
    writeStore(store)
  }, [store])

  useEffect(() => {
    let alive = true
    loadFplCatalog()
      .then((data) => {
        if (alive) setCatalog(data)
      })
      .catch((err: unknown) => {
        if (alive) setCatalogError(err instanceof Error ? err.message : 'Failed to load players')
      })
    return () => {
      alive = false
    }
  }, [])

  const persistLeague = useCallback((league: FantasyLeague, activate = true) => {
    const normalized = normalizeLeague(league)
    setStore((prev) => ({
      ...prev,
      activeLeagueId: activate ? normalized.id : prev.activeLeagueId,
      leagues: { ...prev.leagues, [normalized.id]: normalized },
    }))
    if (normalized.syncBlobId) {
      if (pushTimer.current) window.clearTimeout(pushTimer.current)
      pushTimer.current = window.setTimeout(() => {
        void pushLeague(normalized.syncBlobId!, normalized).catch((err: unknown) => {
          setSyncError(err instanceof Error ? err.message : 'Sync failed')
        })
      }, 400)
    }
  }, [])

  const setDisplayName = useCallback((displayName: string) => {
    setStore((prev) => ({
      ...prev,
      identity: { ...prev.identity, displayName: displayName.trim() },
    }))
  }, [])

  const create = useCallback(
    async (name: string, teamCount: number, draftClockSeconds?: number) => {
      const identity = store.identity
      const displayName = identity.displayName.trim() || 'Commissioner'
      let league = createLeague({
        name,
        commissionerId: identity.memberId,
        commissionerName: displayName,
        teamCount,
        draftClockSeconds,
        currentGw: catalog?.currentGw ?? 1,
      })
      setSyncing(true)
      setSyncError(null)
      try {
        const blobId = await createSyncBlob(league)
        league = {
          ...league,
          syncBlobId: blobId,
          inviteCode: blobId,
        }
        await pushLeague(blobId, league)
      } catch (err: unknown) {
        setSyncError(
          err instanceof Error
            ? `${err.message}. League saved on this device only — share via export.`
            : 'Cloud sync unavailable',
        )
      } finally {
        setSyncing(false)
      }
      persistLeague(league, true)
      setStore((prev) => ({
        ...prev,
        identity: { ...prev.identity, displayName },
      }))
      return league
    },
    [catalog?.currentGw, persistLeague, store.identity],
  )

  const join = useCallback(
    async (codeOrBlob: string, name?: string) => {
      const raw = codeOrBlob.trim()
      if (!raw) throw new Error('Enter an invite code')
      const displayName = (name ?? store.identity.displayName).trim() || 'Manager'
      setSyncing(true)
      setSyncError(null)
      try {
        let league: FantasyLeague | null = null

        if (looksLikeBlobId(raw)) {
          league = normalizeLeague(await pullLeague(raw))
        } else {
          league =
            Object.values(store.leagues).find(
              (l) =>
                l.inviteCode.toLowerCase() === raw.toLowerCase() ||
                l.syncBlobId?.toLowerCase().startsWith(raw.toLowerCase()) ||
                l.id === raw,
            ) ?? null

          if (!league) {
            throw new Error(
              'Invite not found on this device. Paste the full cloud invite link/code from the commissioner.',
            )
          }

          if (league.syncBlobId) {
            try {
              league = normalizeLeague(await pullLeague(league.syncBlobId))
            } catch {
              // keep local
            }
          }
        }

        if (!league) throw new Error('League not found')

        league = joinLeague(league, store.identity.memberId, displayName)
        if (league.syncBlobId) {
          await pushLeague(league.syncBlobId, league)
        }
        persistLeague(league, true)
        setStore((prev) => ({
          ...prev,
          identity: { ...prev.identity, displayName },
        }))
        return league
      } finally {
        setSyncing(false)
      }
    },
    [persistLeague, store.identity.displayName, store.identity.memberId, store.leagues],
  )

  const joinByBlob = useCallback(
    async (blobId: string, name?: string) => {
      const displayName = (name ?? store.identity.displayName).trim() || 'Manager'
      setSyncing(true)
      setSyncError(null)
      try {
        let league = normalizeLeague(await pullLeague(blobId.trim()))
        league = joinLeague(league, store.identity.memberId, displayName)
        league = { ...league, syncBlobId: blobId.trim() }
        await pushLeague(blobId.trim(), league)
        persistLeague(league, true)
        setStore((prev) => ({
          ...prev,
          identity: { ...prev.identity, displayName },
        }))
        return league
      } catch (err: unknown) {
        setSyncError(err instanceof Error ? err.message : 'Join failed')
        throw err
      } finally {
        setSyncing(false)
      }
    },
    [persistLeague, store.identity.displayName, store.identity.memberId],
  )

  const refreshActive = useCallback(async () => {
    const id = store.activeLeagueId
    if (!id) return
    const local = store.leagues[id]
    if (!local?.syncBlobId) return
    try {
      const remote = normalizeLeague(await pullLeague(local.syncBlobId))
      if ((remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
        persistLeague({ ...remote, syncBlobId: local.syncBlobId }, true)
      } else if ((local.updatedAt ?? 0) > (remote.updatedAt ?? 0)) {
        await pushLeague(local.syncBlobId, local)
      } else {
        await pushLeague(local.syncBlobId, local)
      }
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Refresh failed')
    }
  }, [persistLeague, store.activeLeagueId, store.leagues])

  useEffect(() => {
    const id = store.activeLeagueId
    if (!id) return
    const league = store.leagues[id]
    if (!league?.syncBlobId) return
    // Keep multi-manager leagues fresh through the season (not only draft).
    if (league.phase === 'complete') return
    const intervalMs = ['lobby', 'draft_setup', 'drafting'].includes(league.phase) ? 2500 : 8000
    const timer = window.setInterval(() => {
      void refreshActive()
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [refreshActive, store.activeLeagueId, store.leagues])

  const activeLeague = store.activeLeagueId
    ? (store.leagues[store.activeLeagueId] ?? null)
    : null

  const me = useMemo(() => {
    if (!activeLeague) return null
    return activeLeague.members.find((m) => m.id === store.identity.memberId) ?? null
  }, [activeLeague, store.identity.memberId])

  const playerMap = useMemo(() => {
    const map = new Map<number, import('./types').FantasyPlayer>()
    catalog?.players.forEach((p) => map.set(p.id, p))
    return map
  }, [catalog])

  const updateActive = useCallback(
    (fn: (league: FantasyLeague) => FantasyLeague) => {
      if (!activeLeague) throw new Error('No active league')
      const next = fn(activeLeague)
      if (next.updatedAt === activeLeague.updatedAt && next.draftPickIndex === activeLeague.draftPickIndex) {
        // allow no-op ticks
        if (next === activeLeague) return next
      }
      persistLeague(next, true)
      return next
    },
    [activeLeague, persistLeague],
  )

  // Draft clock + autodraft ticker
  useEffect(() => {
    if (!activeLeague || activeLeague.phase !== 'drafting') return
    if (playerMap.size === 0) return
    const leagueId = activeLeague.id
    const timer = window.setInterval(() => {
      setStore((prev) => {
        const league = prev.leagues[leagueId]
        if (!league || league.phase !== 'drafting') return prev
        const next = runDraftTick(league, playerMap)
        if (next.updatedAt === league.updatedAt && next.draftPickIndex === league.draftPickIndex) {
          return prev
        }
        if (next.syncBlobId) {
          void pushLeague(next.syncBlobId, next).catch(() => {})
        }
        return {
          ...prev,
          leagues: { ...prev.leagues, [next.id]: next },
        }
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [activeLeague, playerMap])

  return {
    identity: store.identity as FantasyIdentity,
    leagues: Object.values(store.leagues).sort((a, b) => b.updatedAt - a.updatedAt),
    activeLeague,
    me,
    catalog,
    catalogError,
    syncError,
    syncing,
    playerMap,
    setDisplayName,
    setActiveLeagueId: (id: string | null) =>
      setStore((prev) => ({ ...prev, activeLeagueId: id })),
    create,
    join,
    joinByBlob,
    refreshActive,
    randomizeOrder: () => updateActive(randomizeDraftOrder),
    setOrder: (order: string[]) => updateActive((l) => setDraftOrder(l, order)),
    setClock: (seconds: number) => updateActive((l) => setDraftClockSeconds(l, seconds)),
    startDraft: () => updateActive(beginDraft),
    setAutodraft: (enabled: boolean) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => setMemberAutodraft(l, me.id, enabled))
    },
    pick: (playerId: number) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => draftPlayer(l, me.id, playerId, playerMap))
    },
    setMyStarters: (ids: number[]) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => setStarters(l, me.id, ids, playerMap))
    },
    optimizeLineup: () => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => autoSetStarters(l, me.id, playerMap))
    },
    claimFreeAgent: (playerId: number, dropPlayerId: number | null) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => addFreeAgent(l, me.id, playerId, dropPlayerId, playerMap))
    },
    dropPlayer: (playerId: number) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => dropToWaivers(l, me.id, playerId, playerMap))
    },
    submitClaim: (addPlayerId: number, dropPlayerId: number | null) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => submitWaiverClaim(l, me.id, addPlayerId, dropPlayerId))
    },
    cancelClaim: (claimId: string) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => cancelWaiverClaim(l, me.id, claimId))
    },
    processWaivers: () => updateActive((l) => processWaiverClaims(l, playerMap)),
    sendTrade: (toMemberId: string, offer: number[], request: number[]) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => proposeTrade(l, me.id, toMemberId, offer, request))
    },
    decideTrade: (tradeId: string, decision: 'accepted' | 'rejected' | 'canceled') => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => resolveTrade(l, tradeId, me.id, decision, playerMap))
    },
    runScoreGw: (gw: number) => updateActive((l) => scoreGameweek(l, gw, playerMap)),
  }
}

export type FantasyApi = ReturnType<typeof useFantasy>
