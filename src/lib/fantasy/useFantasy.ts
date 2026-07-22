import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadFplCatalog, type FplCatalog } from './fplData'
import {
  addFreeAgent,
  beginDraft,
  createLeague,
  draftPlayer,
  joinLeague,
  proposeTrade,
  randomizeDraftOrder,
  resolveTrade,
  scoreGameweek,
  setDraftOrder,
  setStarters,
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
    if (!parsed.leagues) parsed.leagues = {}
    return parsed
  } catch {
    return {
      identity: { memberId: newMemberId(), displayName: '' },
      leagues: {},
      activeLeagueId: null,
    }
  }
}

function writeStore(state: FantasyStoreState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
    setStore((prev) => ({
      ...prev,
      activeLeagueId: activate ? league.id : prev.activeLeagueId,
      leagues: { ...prev.leagues, [league.id]: league },
    }))
    if (league.syncBlobId) {
      if (pushTimer.current) window.clearTimeout(pushTimer.current)
      pushTimer.current = window.setTimeout(() => {
        void pushLeague(league.syncBlobId!, league).catch((err: unknown) => {
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
    async (name: string, teamCount: number) => {
      const identity = store.identity
      const displayName = identity.displayName.trim() || 'Commissioner'
      let league = createLeague({
        name,
        commissionerId: identity.memberId,
        commissionerName: displayName,
        teamCount,
        currentGw: catalog?.currentGw ?? 1,
      })
      setSyncing(true)
      setSyncError(null)
      try {
        const blobId = await createSyncBlob(league)
        league = {
          ...league,
          syncBlobId: blobId,
          // Full blob id is the invite — friends paste it to join from any device
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
          league = await pullLeague(raw)
        } else {
          // Try local leagues by invite code / short blob prefix
          league =
            Object.values(store.leagues).find(
              (l) =>
                l.inviteCode.toLowerCase() === raw.toLowerCase() ||
                l.syncBlobId?.toLowerCase().startsWith(raw.toLowerCase()) ||
                l.id === raw,
            ) ?? null

          if (!league) {
            // Search known blobs by scanning local short codes won't work remotely.
            // Accept full blob id pasted as invite.
            throw new Error(
              'Invite not found on this device. Paste the full cloud invite link/code from the commissioner.',
            )
          }

          if (league.syncBlobId) {
            try {
              league = await pullLeague(league.syncBlobId)
            } catch {
              // keep local
            }
          }
        }

        if (!league) throw new Error('League not found')

        // If user pasted short code but we have syncBlobId from a shared URL param pattern:
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

  /** Join using full sync blob id (primary remote invite path). */
  const joinByBlob = useCallback(
    async (blobId: string, name?: string) => {
      const displayName = (name ?? store.identity.displayName).trim() || 'Manager'
      setSyncing(true)
      setSyncError(null)
      try {
        let league = await pullLeague(blobId.trim())
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
      const remote = await pullLeague(local.syncBlobId)
      if ((remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
        persistLeague({ ...remote, syncBlobId: local.syncBlobId }, true)
      } else if ((local.updatedAt ?? 0) > (remote.updatedAt ?? 0)) {
        await pushLeague(local.syncBlobId, local)
      } else {
        // heartbeat keeps cloud blob alive
        await pushLeague(local.syncBlobId, local)
      }
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Refresh failed')
    }
  }, [persistLeague, store.activeLeagueId, store.leagues])

  // Poll during draft / lobby for multiplayer
  useEffect(() => {
    const id = store.activeLeagueId
    if (!id) return
    const league = store.leagues[id]
    if (!league?.syncBlobId) return
    if (!['lobby', 'draft_setup', 'drafting'].includes(league.phase)) return
    const timer = window.setInterval(() => {
      void refreshActive()
    }, 2500)
    return () => window.clearInterval(timer)
  }, [refreshActive, store.activeLeagueId, store.leagues])

  const activeLeague = store.activeLeagueId ? store.leagues[store.activeLeagueId] ?? null : null

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
      persistLeague(next, true)
      return next
    },
    [activeLeague, persistLeague],
  )

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
    startDraft: () => updateActive(beginDraft),
    pick: (playerId: number) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => draftPlayer(l, me.id, playerId))
    },
    setMyStarters: (ids: number[]) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => setStarters(l, me.id, ids))
    },
    claimFreeAgent: (playerId: number, dropPlayerId: number | null) => {
      if (!me) throw new Error('You are not in this league')
      return updateActive((l) => addFreeAgent(l, me.id, playerId, dropPlayerId, playerMap))
    },
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
