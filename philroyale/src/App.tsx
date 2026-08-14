import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BattleScreen } from './BattleScreen'
import { CharactersScreen } from './CharactersScreen'
import { TopStatusBar } from './CurrencyBar'
import { EventsScreen } from './EventsScreen'
import { FriendsScreen } from './FriendsScreen'
import { HomeScreen } from './HomeScreen'
import { ProfileScreen } from './ProfileScreen'
import { ShopScreen } from './ShopScreen'
import { TouchdownDraft } from './TouchdownDraft'
import { PartyModeLobby } from './PartyModeLobby'
import { TrophyRoadScreen } from './TrophyRoadScreen'
import type { BattleNet } from './battleSync'
import { publishBattle, subscribeBattle } from './battleSync'
import { isPartyMode, modeLabel } from './gameModes'
import { joinClubVerified, startClubSync } from './clubSync'
import { mpConnect, mpOnPresence, mpReady, mpSetStatus } from './mpClient'
import {
  DIRECTORY_HEARTBEAT_MS,
  PRESENCE_HEARTBEAT_MS,
  lookupDirectory,
  lookupDirectoryPresence,
  publishDirectory,
  publishLobby,
  publishPair,
  publishSocial,
  resolvePlayerName,
  subscribeDirectory,
  subscribePair,
  subscribeSocial,
  type FriendPresenceInfo,
  type SocialMessage,
} from './socialHub'
import {
  botLevelForTrophies,
  botNameForTrophies,
} from './progression'
import {
  BATTLE_CHANNEL_NAME,
  clearBattleAccepted,
  clearIncomingChallenge,
  clearOutgoingChallenge,
  clubInviteUrl,
  countUnclaimedRoadRewards,
  createBattleChallenge,
  isChallengeForMe,
  isFriendCode,
  loadBattleAccepted,
  loadCardProgress,
  loadFriends,
  loadIncomingChallenge,
  loadIncomingClubInvite,
  loadLegacyPlayerIds,
  loadOutgoingChallenge,
  loadPendingFriendLink,
  loadPlayerId,
  loadPlayerName,
  loadProfile,
  loadRichClub,
  normalizeFriendCode,
  parseBattleChallengeFromUrl,
  parseFriendInviteFromUrl,
  postBattleMessage,
  repairBrokenLocalClub,
  saveBattleAccepted,
  saveIncomingChallenge,
  saveIncomingClubInvite,
  savePendingFriendLink,
  savePlayerName,
  applyNamedPlayerCardGrants,
  shareText,
  battleInviteUrl,
  upsertFriend,
  saveFriendTrophies,
  saveFriendClub,
  touchFriendLastOnline,
  type BattleChallenge,
  type BattleChannelMessage,
  type ClubInviteIncoming,
  type GameMode,
} from './storage'

function directoryClubExtra(): { clubCode?: string; clubName?: string } {
  const club = loadRichClub()
  if (!club?.code) return {}
  return { clubCode: club.code, clubName: club.name }
}

type TabId = 'shop' | 'cards' | 'home' | 'social' | 'profile'

const TABS: { id: TabId; label: string }[] = [
  { id: 'shop', label: 'Shop' },
  { id: 'cards', label: 'Cards' },
  { id: 'home', label: 'Battle' },
  { id: 'social', label: 'Social' },
  { id: 'profile', label: 'Profile' },
]

function TabGlyph({ id, active }: { id: TabId; active: boolean }) {
  const stroke = active ? '#1a1410' : '#f5d76e'
  if (id === 'shop') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill={stroke} d="M4 9h16l-1.2 11H5.2L4 9zm2-5h12l1 4H5l1-4z" />
      </svg>
    )
  }
  if (id === 'cards') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="5" width="10" height="14" rx="1.5" fill={stroke} opacity="0.55" />
        <rect x="7" y="3" width="10" height="14" rx="1.5" fill={stroke} opacity="0.8" />
        <rect x="11" y="1" width="10" height="14" rx="1.5" fill={stroke} />
      </svg>
    )
  }
  if (id === 'home') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path
          fill={stroke}
          d="M7 20 4 8l6 3 2-7 2 7 6-3-3 12H7zm5-6.5c-1.1 0-2 .7-2 1.5s.9 1.5 2 1.5 2-.7 2-1.5-.9-1.5-2-1.5z"
        />
      </svg>
    )
  }
  if (id === 'social') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <circle cx="8" cy="9" r="3" fill={stroke} />
        <circle cx="16" cy="9" r="3" fill={stroke} />
        <circle cx="12" cy="15" r="3" fill={stroke} />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8" r="4" fill={stroke} />
      <path fill={stroke} d="M4 20c1.8-3.5 4.5-5 8-5s6.2 1.5 8 5H4z" />
    </svg>
  )
}

function clearUrlParams(keys: string[]): void {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (changed) window.history.replaceState({}, '', url.toString())
}

export default function App() {
  const [tab, setTab] = useState<TabId>(() => {
    try {
      return new URLSearchParams(window.location.search).has('philShopPaid')
        ? 'shop'
        : 'home'
    } catch {
      return 'home'
    }
  })
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [nameDraft, setNameDraft] = useState(() => loadPlayerName())
  const [friendToast, setFriendToast] = useState<string | null>(null)
  const [battle, setBattle] = useState(false)
  const [battleMode, setBattleMode] = useState<GameMode>('classic')
  const [battleNet, setBattleNet] = useState<BattleNet | null>(null)
  const [draftingTouchdown, setDraftingTouchdown] = useState(false)
  const [draftingParty, setDraftingParty] = useState(false)
  const [touchdownDeck, setTouchdownDeck] = useState<string[] | null>(null)
  const [partyDeck, setPartyDeck] = useState<string[] | null>(null)
  const [opponent, setOpponent] = useState<string | null>(null)
  /** Bumps every solo/friend match so BattleScreen remounts with a fresh CPU deck. */
  const [battleSession, setBattleSession] = useState(0)
  const [showRoad, setShowRoad] = useState(false)
  const [showEvents, setShowEvents] = useState(false)
  const [incomingChallenge, setIncomingChallenge] = useState<BattleChallenge | null>(null)
  const [outgoingChallenge, setOutgoingChallenge] = useState<BattleChallenge | null>(() =>
    loadOutgoingChallenge(),
  )
  const [clubInvite, setClubInvite] = useState<ClubInviteIncoming | null>(() =>
    loadIncomingClubInvite(),
  )
  const [friendPresence, setFriendPresence] = useState<Record<string, FriendPresenceInfo>>(
    {},
  )
  const [spectating, setSpectating] = useState(false)
  const [incomingFriendReq, setIncomingFriendReq] = useState<{
    fromPlayerId: string
    fromName: string
  } | null>(null)
  const needsName = !playerName.trim()
  /** Keep re-broadcasting battle invites until this time (host waiting for Accept). */
  const hostInviteUntilRef = useRef(0)
  /** Mirrors `battle` for invite handlers (avoid Accept popups mid-match). */
  const battleRef = useRef(false)
  battleRef.current = battle
  const battleNetRef = useRef(battleNet)
  battleNetRef.current = battleNet
  /** No social popup / toast more than once every 10s (stops friend-add spam). */
  const POPUP_COOLDOWN_MS = 10_000
  const lastPopupAtRef = useRef(0)
  /** Survive effect remounts — friend_request is retried for several seconds. */
  const seenFriendReqRef = useRef(new Set<string>())
  const seenInviteRef = useRef(new Set<string>())

  const claimPopupSlot = useCallback(() => {
    const now = Date.now()
    if (now - lastPopupAtRef.current < POPUP_COOLDOWN_MS) return false
    lastPopupAtRef.current = now
    return true
  }, [])

  const flashFriend = useCallback(
    (msg: string) => {
      if (battleRef.current) return
      if (!claimPopupSlot()) return
      setFriendToast(msg)
      window.setTimeout(() => setFriendToast(null), 2800)
    },
    [claimPopupSlot],
  )

  const startMatch = useCallback(
    (name?: string | null, mode: GameMode = 'classic', net: BattleNet | null = null) => {
      const trophies = loadProfile().trophies
      setOpponent(name ?? botNameForTrophies(trophies))
      setBattleMode(mode)

      // Only use a BattleNet when the caller explicitly provides one (friend/shared match).
      // CPU / solo matches always run with net=null so the AI branch in useBattle fires.
      const room: BattleNet | null = net ?? null

      setBattleNet(room)
      setSpectating(false)
      setShowRoad(false)
      setBattleSession((n) => n + 1)
      // Clear social popups so nothing sits on top of the arena.
      setIncomingChallenge(null)
      clearIncomingChallenge()
      setIncomingFriendReq(null)
      setClubInvite(null)
      setFriendToast(null)
      setOutgoingChallenge(null)
      clearOutgoingChallenge()

      if (isPartyMode(mode)) {
        if (!room) {
          flashFriend('Party modes need a friend invite — no trophies.')
          return
        }
        // Touchdown keeps its own draft UI; other party modes share PartyModeLobby.
        if (mode === 'touchdown') {
          setDraftingTouchdown(true)
          setDraftingParty(false)
          setTouchdownDeck(null)
          setPartyDeck(null)
          setBattle(false)
          return
        }
        setDraftingParty(true)
        setDraftingTouchdown(false)
        setPartyDeck(null)
        setTouchdownDeck(null)
        setBattle(false)
        return
      }

      setDraftingTouchdown(false)
      setDraftingParty(false)
      setTouchdownDeck(null)
      setPartyDeck(null)
      setBattle(true)
    },
    [flashFriend],
  )

  const startSpectate = useCallback(
    (friendName: string, info: FriendPresenceInfo) => {
      if (!info.challengeId || !info.inBattle) {
        flashFriend(`${friendName} is not in a battle right now.`)
        return
      }
      setOpponent(friendName)
      setBattleMode(info.mode ?? 'classic')
      setBattleNet({
        challengeId: info.challengeId,
        role: 'spectator',
        viewAs: info.battleRole === 'guest' ? 'guest' : 'host',
      })
      setSpectating(true)
      setDraftingTouchdown(false)
      setDraftingParty(false)
      setTouchdownDeck(null)
      setPartyDeck(null)
      setShowRoad(false)
      setBattle(true)
      flashFriend(`Spectating ${friendName}…`)
    }, [flashFriend],
  )

  // Must stay above name / draft / battle early returns (Rules of Hooks).
  // Previously these sat after those returns and crashed to a black screen on
  // first-time name submit and when opening Touchdown draft.
  const handlePeerLinkFailed = useCallback(() => {
    setBattleNet(null)
    flashFriend("Friend didn't connect — training match vs bot.")
  }, [flashFriend])

  /** Friend linked into the room — stop invite spam; battle UI stays clean. */
  const handlePeerLinked = useCallback(() => {
    hostInviteUntilRef.current = 0
    setIncomingChallenge(null)
    clearIncomingChallenge()
    setOutgoingChallenge(null)
    clearOutgoingChallenge()
    setFriendToast(null)
  }, [])

  const completeFriendLink = useCallback(
    async (link: { playerId: string; name: string }) => {
      const me = loadPlayerName().trim()
      const myId = loadPlayerId()
      if (!me) {
        savePendingFriendLink(link)
        return
      }
      if (link.playerId === myId) return
      const realId = link.playerId.startsWith('name:') ? undefined : link.playerId
      upsertFriend({ name: link.name || 'Friend', playerId: realId })
      window.dispatchEvent(new Event('philroyale-friends-changed'))
      if (realId) {
        // Mutual: tell them we accepted so they add us back on their screen.
        await publishSocial(realId, {
          type: 'friend_request',
          fromPlayerId: myId,
          fromName: me,
          toPlayerId: realId,
          at: new Date().toISOString(),
        })
        await publishSocial(realId, {
          type: 'friend_hello',
          fromPlayerId: myId,
          fromName: me,
          at: new Date().toISOString(),
        })
      }
      savePendingFriendLink(null)
      flashFriend(`You're now friends with ${link.name}!`)
      setTab('social')
    },
    [flashFriend],
  )

  const showIncoming = useCallback(
    (challenge: BattleChallenge) => {
      // Never cover an active battle with Accept / Decline.
      if (battleRef.current) return
      // Same room we're already in (host re-broadcast) — ignore.
      if (battleNetRef.current?.challengeId === challenge.challengeId) return
      if (!isChallengeForMe(challenge)) return
      const outgoing = loadOutgoingChallenge()
      if (outgoing && outgoing.challengeId === challenge.challengeId) return
      if (challenge.fromPlayerId || challenge.fromName) {
        upsertFriend({
          name: challenge.fromName,
          playerId: challenge.fromPlayerId,
        })
      }
      // Already showing this invite — don't re-trigger / reset cooldown.
      if (incomingChallenge?.challengeId === challenge.challengeId) {
        saveIncomingChallenge(challenge)
        return
      }
      if (!claimPopupSlot()) return
      saveIncomingChallenge(challenge)
      setIncomingChallenge(challenge)
    },
    [claimPopupSlot, incomingChallenge?.challengeId],
  )

  const handleAcceptChallenge = useCallback(() => {
    if (!incomingChallenge) return
    const { challengeId, fromName, mode, fromPlayerId } = incomingChallenge
    const acceptedBy = loadPlayerName().trim() || incomingChallenge.toName
    const modeFinal = mode ?? 'classic'
    saveBattleAccepted({
      challengeId,
      acceptedBy,
      acceptedAt: new Date().toISOString(),
    })
    postBattleMessage({ type: 'accept', challengeId, acceptedBy, mode: modeFinal })

    const burstAccept = () => {
      const at = new Date().toISOString()
      const myId = loadPlayerId()
      if (fromPlayerId) {
        const acceptMsg = {
          type: 'battle_accept' as const,
          challengeId,
          fromPlayerId: myId,
          fromName: acceptedBy,
          toPlayerId: fromPlayerId,
          mode: modeFinal,
          at,
        }
        void publishSocial(fromPlayerId, acceptMsg)
        void publishLobby(acceptMsg)
        void publishPair(myId, fromPlayerId, acceptMsg)
      }
      void publishBattle(challengeId, {
        type: 'battle_peer_accept',
        challengeId,
        fromName: acceptedBy,
        fromPlayerId: myId,
        mode: modeFinal,
        at,
      })
      void publishBattle(challengeId, {
        type: 'battle_ready',
        challengeId,
        role: 'guest',
        name: acceptedBy,
        at,
      })
    }
    // Burst so the challenger (host) always picks up accept even if one channel hiccups.
    burstAccept()
    ;[300, 800, 1600, 2800, 4500].forEach((ms) => window.setTimeout(burstAccept, ms))

    clearIncomingChallenge()
    setIncomingChallenge(null)
    clearUrlParams(['battleFrom', 'battleTo', 'challenge', 'mode', 'fromId', 'toId'])
    setBattle(false)
    setDraftingTouchdown(false)
    setTouchdownDeck(null)
    setShowRoad(false)
    // Guest enters the shared room immediately — both screens show the same match.
    hostInviteUntilRef.current = 0
    startMatch(fromName, modeFinal, {
      challengeId,
      role: 'guest',
      peerPlayerId: fromPlayerId,
    })
  }, [incomingChallenge, startMatch])

  const handleDeclineChallenge = useCallback(() => {
    if (!incomingChallenge) return
    postBattleMessage({ type: 'decline', challengeId: incomingChallenge.challengeId })
    if (incomingChallenge.fromPlayerId) {
      void publishSocial(incomingChallenge.fromPlayerId, {
        type: 'battle_decline',
        challengeId: incomingChallenge.challengeId,
        fromPlayerId: loadPlayerId(),
        fromName: loadPlayerName().trim() || 'Player',
        at: new Date().toISOString(),
      })
    }
    clearIncomingChallenge()
    setIncomingChallenge(null)
    clearUrlParams(['battleFrom', 'battleTo', 'challenge', 'mode', 'fromId', 'toId'])
  }, [incomingChallenge])

  const cancelOutgoingChallenge = useCallback(() => {
    clearOutgoingChallenge()
    setOutgoingChallenge(null)
  }, [])

  const requestBattle = useCallback(
    async (friendName: string, opts?: { mode?: GameMode; playerId?: string }) => {
      const mode = opts?.mode ?? 'classic'
      const toPlayerId = opts?.playerId?.trim()
      if (!toPlayerId || !isFriendCode(toPlayerId)) {
        flashFriend('Add this friend with their 6-digit friend code first.')
        return
      }
      if (friendPresence[toPlayerId]?.inBattle) {
        flashFriend(`${friendName} is already in a battle — spectate from their profile.`)
        return
      }
      const challenge = createBattleChallenge(friendName, {
        mode,
        toPlayerId,
      })
      // Host the room IMMEDIATELY so Accept joins a live match (no Waiting→Linking deadlock).
      clearOutgoingChallenge()
      setOutgoingChallenge(null)
      startMatch(friendName, mode, {
        challengeId: challenge.challengeId,
        role: 'host',
        peerPlayerId: toPlayerId,
      })
      hostInviteUntilRef.current = Date.now() + 40_000

      const invitePayload = {
        type: 'battle_invite' as const,
        challengeId: challenge.challengeId,
        fromPlayerId: loadPlayerId(),
        fromName: challenge.fromName,
        toPlayerId,
        toName: friendName,
        mode,
        at: challenge.createdAt,
      }
      const myId = loadPlayerId()
      const pushInvite = (at = new Date().toISOString()) => {
        const payload = { ...invitePayload, at }
        void publishSocial(toPlayerId, payload)
        void publishLobby(payload)
        void publishPair(myId, toPlayerId, payload)
      }
      pushInvite(challenge.createdAt)
      // Keep pinging while the other phone may still be waking up / polling.
      ;[500, 1500, 3000, 5000, 8000, 12000, 18000, 25000].forEach((ms) => {
        window.setTimeout(() => pushInvite(), ms)
      })
      flashFriend(`Battle started — ${friendName} should see Accept on their phone now.`)
    },
    [flashFriend, friendPresence, startMatch],
  )

  const addFriendByCode = useCallback(
    async (rawCode: string) => {
      const code = normalizeFriendCode(rawCode)
      const me = loadPlayerName().trim()
      const myId = loadPlayerId()
      if (!me) return { ok: false, message: 'Set your name first.' }
      if (!isFriendCode(code)) {
        const alnum = String(rawCode || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
        return {
          ok: false,
          message:
            alnum.length === 6 && /[A-Z]/.test(alnum)
              ? 'That looks like a club code — use Club → Join instead.'
              : 'Friend codes are 6 digits (example 482913). Both of you: hard-refresh, open Friends, and copy the new code.',
        }
      }
      if (code === myId) return { ok: false, message: "That's your own code." }

      // Instant add — never block the UI for a long name lookup.
      const cached = lookupDirectory(code)
      upsertFriend({ name: cached || `Player ${code}`, playerId: code })
      window.dispatchEvent(new Event('philroyale-friends-changed'))

      const trophies = loadProfile().trophies
      void publishDirectory(myId, me, { trophies, ...directoryClubExtra() })
      const pushAdd = () => {
        const at = new Date().toISOString()
        const req = {
          type: 'friend_request' as const,
          fromPlayerId: myId,
          fromName: me,
          toPlayerId: code,
          at,
        }
        const hello = {
          type: 'friend_hello' as const,
          fromPlayerId: myId,
          fromName: me,
          toPlayerId: code,
          at,
        }
        void publishSocial(code, req)
        void publishLobby(req)
        void publishPair(myId, code, req)
        void publishSocial(code, hello)
        void publishLobby(hello)
      }
      pushAdd()
      ;[900].forEach((ms) => {
        window.setTimeout(pushAdd, ms)
      })

      // Background: pull real name and update the list (no waiting here).
      void (async () => {
        const name = cached || (await resolvePlayerName(code, 8_000))
        if (!name) return
        upsertFriend({ name, playerId: code })
        window.dispatchEvent(new Event('philroyale-friends-changed'))
        if (!cached) flashFriend(`Friend name: ${name}`)
      })()

      return {
        ok: true,
        message: cached
          ? `Added ${cached}!`
          : `Added — looking up their name now (keep both apps open).`,
      }
    },
    [flashFriend],
  )

  const inviteToClub = useCallback(async (friendName: string, playerId?: string) => {
    const club = loadRichClub()
    if (!club) {
      flashFriend('Join or create a club first.')
      setTab('social')
      return
    }
    const me = loadPlayerName().trim() || 'Player'
    if (playerId) {
      await publishSocial(playerId, {
        type: 'club_invite',
        fromPlayerId: loadPlayerId(),
        fromName: me,
        clubCode: club.code,
        clubName: club.name,
        at: new Date().toISOString(),
      })
    }
    await shareText(
      'Phil Royale club',
      `${me} invited you to join club ${club.name}:`,
      clubInviteUrl(club.code),
    )
    flashFriend(`Club invite sent to ${friendName}`)
  }, [flashFriend])

  function commitName() {
    const name = nameDraft.trim()
    if (name.length < 2) return
    savePlayerName(name)
    loadPlayerId()
    setPlayerName(name)
    const pending = loadPendingFriendLink()
    if (pending) void completeFriendLink(pending)
  }

  useEffect(() => {
    const id = loadPlayerId()
    applyNamedPlayerCardGrants()
    const flag = 'philroyale.friendCodeRelayV5.v1'
    if (!localStorage.getItem(flag)) {
      localStorage.setItem(flag, '1')
      flashFriend(`Friends & multiplayer relay upgraded. Your code is ${id} — both of you hard-refresh, then re-add.`)
    }
    repairBrokenLocalClub()
    const friendLink = parseFriendInviteFromUrl()
    if (friendLink) {
      clearUrlParams(['addFriend', 'friendName', 'friend'])
      void completeFriendLink(friendLink)
    }
    const clubCode = new URLSearchParams(window.location.search).get('club')
    if (clubCode) {
      clearUrlParams(['club'])
      setTab('social')
      void joinClubVerified(clubCode).then((res) => {
        flashFriend(res.message)
        window.dispatchEvent(new Event('philroyale-club-changed'))
      })
    }
  }, [completeFriendLink, flashFriend])

  // Club roster sync on every screen so joins work even if Social isn't open.
  const [clubSyncKey, setClubSyncKey] = useState(0)
  const [friendsTick, setFriendsTick] = useState(0)
  useEffect(() => {
    const bump = () => setClubSyncKey((k) => k + 1)
    window.addEventListener('philroyale-club-changed', bump)
    return () => window.removeEventListener('philroyale-club-changed', bump)
  }, [])
  useEffect(() => {
    const bump = () => setFriendsTick((k) => k + 1)
    window.addEventListener('philroyale-friends-changed', bump)
    return () => window.removeEventListener('philroyale-friends-changed', bump)
  }, [])
  useEffect(() => {
    repairBrokenLocalClub()
    return startClubSync(() => {
      window.dispatchEvent(new Event('philroyale-club-changed'))
    })
  }, [clubSyncKey, playerName])

  useEffect(() => {
    const fromUrl = parseBattleChallengeFromUrl()
    if (fromUrl) {
      showIncoming(fromUrl)
      clearUrlParams(['battleFrom', 'battleTo', 'challenge', 'mode', 'fromId', 'toId'])
    } else {
      const stored = loadIncomingChallenge()
      if (stored && isChallengeForMe(stored)) {
        setIncomingChallenge(stored)
      }
    }

    const outgoing = loadOutgoingChallenge()
    if (outgoing) setOutgoingChallenge(outgoing)

    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(BATTLE_CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent<BattleChannelMessage>) => {
      const msg = event.data
      if (!msg?.type) return

      if (msg.type === 'challenge') {
        showIncoming(msg.challenge)
        return
      }

      if (msg.type === 'accept') {
        const outgoingNow = loadOutgoingChallenge()
        if (outgoingNow && outgoingNow.challengeId === msg.challengeId) {
          const opponentName = outgoingNow.toName
          const mode = msg.mode ?? outgoingNow.mode ?? 'classic'
          const challengeId = outgoingNow.challengeId
          clearOutgoingChallenge()
          clearBattleAccepted()
          setOutgoingChallenge(null)
          startMatch(opponentName, mode, {
            challengeId,
            role: 'host',
            peerPlayerId: outgoingNow.toPlayerId,
          })
        }
        return
      }

      if (msg.type === 'decline') {
        const outgoingNow = loadOutgoingChallenge()
        if (outgoingNow && outgoingNow.challengeId === msg.challengeId) {
          clearOutgoingChallenge()
          setOutgoingChallenge(null)
        }
      }
    }

    return () => channel.close()
  }, [showIncoming, startMatch])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === 'philroyale.battleAccepted' && event.newValue) {
        try {
          const accepted = JSON.parse(event.newValue) as {
            challengeId: string
            acceptedBy: string
          }
          const outgoingNow = loadOutgoingChallenge()
          if (outgoingNow && outgoingNow.challengeId === accepted.challengeId) {
            const opponentName = outgoingNow.toName
            const challengeId = outgoingNow.challengeId
            clearOutgoingChallenge()
            clearBattleAccepted()
            setOutgoingChallenge(null)
            startMatch(opponentName, outgoingNow.mode ?? 'classic', {
              challengeId,
              role: 'host',
              peerPlayerId: outgoingNow.toPlayerId,
            })
          }
        } catch {
          /* ignore */
        }
      }
      if (event.key === 'philroyale.battleIncoming' && event.newValue) {
        try {
          const challenge = JSON.parse(event.newValue) as BattleChallenge
          if (isChallengeForMe(challenge)) {
            setIncomingChallenge(challenge)
          }
        } catch {
          /* ignore */
        }
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [startMatch])

  useEffect(() => {
    if (!outgoingChallenge) return

    const challengeId = outgoingChallenge.challengeId
    const opponentName = outgoingChallenge.toName
    const mode = outgoingChallenge.mode ?? 'classic'
    const peerPlayerId = outgoingChallenge.toPlayerId
    let started = false

    const begin = (role: 'host' | 'guest', peerName?: string, peerId?: string) => {
      if (started) return
      started = true
      clearOutgoingChallenge()
      clearBattleAccepted()
      setOutgoingChallenge(null)
      startMatch(peerName || opponentName, mode, {
        challengeId,
        role,
        peerPlayerId: peerId || peerPlayerId,
      })
    }

    // Listen on the shared battle room — works even when social inbox misses accept.
    const unsubBattle = subscribeBattle(challengeId, (msg) => {
      // Peer already running the sim (guest took over) — join as guest mirror.
      if (msg.type === 'battle_state') {
        begin('guest', opponentName, peerPlayerId)
        return
      }
      if (msg.type === 'battle_peer_accept' && msg.challengeId === challengeId) {
        begin('host', msg.fromName, msg.fromPlayerId)
      }
      if (msg.type === 'battle_ready' && msg.role === 'guest') {
        begin('host', msg.name !== 'guest' ? msg.name : undefined, peerPlayerId)
      }
    })

    const interval = window.setInterval(() => {
      const accepted = loadBattleAccepted()
      if (accepted && accepted.challengeId === challengeId) {
        begin('host', accepted.acceptedBy, peerPlayerId)
      }
    }, 500)

    return () => {
      unsubBattle()
      window.clearInterval(interval)
    }
  }, [outgoingChallenge, startMatch])

  useEffect(() => {
    const myId = loadPlayerId()
    const inboxIds = [myId, ...loadLegacyPlayerIds()]
    void friendsTick

    const onSocial = (msg: SocialMessage) => {
      // Lobby broadcasts everything — only handle what is for this phone.
      if (msg.type === 'dir_ping') {
        if (msg.fromPlayerId === myId) return
        const at = Date.now()
        if (typeof msg.trophies === 'number') saveFriendTrophies(msg.fromPlayerId, msg.trophies)
        if (msg.clubCode) saveFriendClub(msg.fromPlayerId, { clubCode: msg.clubCode, clubName: msg.clubName })
        touchFriendLastOnline(msg.fromPlayerId, at)
        setFriendPresence((prev) => ({
          ...prev,
          [msg.fromPlayerId]: {
            ...prev[msg.fromPlayerId],
            at,
            inBattle: !!msg.inBattle,
            trophies: msg.trophies ?? prev[msg.fromPlayerId]?.trophies,
            clubCode: msg.clubCode ?? prev[msg.fromPlayerId]?.clubCode,
            clubName: msg.clubName ?? prev[msg.fromPlayerId]?.clubName,
          },
        }))
        return
      }

      if (msg.type === 'presence') {
        if (msg.fromPlayerId === myId) return
        // Presence may be lobbied to a specific friend; accept untargeted or for me.
        if (msg.toPlayerId && msg.toPlayerId !== myId) return
        const at = Date.parse(msg.at) || Date.now()
        if (typeof msg.trophies === 'number') saveFriendTrophies(msg.fromPlayerId, msg.trophies)
        touchFriendLastOnline(msg.fromPlayerId, at)
        setFriendPresence((prev) => ({
          ...prev,
          [msg.fromPlayerId]: {
            at,
            inBattle: !!msg.inBattle,
            challengeId: msg.challengeId,
            mode: msg.mode,
            opponentName: msg.opponentName,
            battleRole: msg.battleRole,
            trophies: msg.trophies,
          },
        }))
        if (msg.fromName) {
          const prev = loadFriends().find((f) => f.playerId === msg.fromPlayerId)?.name
          upsertFriend({ name: msg.fromName, playerId: msg.fromPlayerId })
          if (prev !== msg.fromName) {
            window.dispatchEvent(new Event('philroyale-friends-changed'))
          }
        }
        return
      }
      if (msg.type === 'friend_request') {
        if (msg.fromPlayerId === myId) return
        if (msg.toPlayerId !== myId) return
        // Session-wide dedupe — retries used to reopen the modal every ~2s.
        if (seenFriendReqRef.current.has(msg.fromPlayerId)) return
        seenFriendReqRef.current.add(msg.fromPlayerId)
        const me = loadPlayerName().trim() || 'Player'
        const trophies = loadProfile().trophies
        upsertFriend({ name: msg.fromName, playerId: msg.fromPlayerId })
        window.dispatchEvent(new Event('philroyale-friends-changed'))
        // Reply on lobby + personal so the adder always gets our real name.
        void publishDirectory(myId, me, { trophies, ...directoryClubExtra() })
        const hello = {
          type: 'friend_hello' as const,
          fromPlayerId: myId,
          fromName: me,
          toPlayerId: msg.fromPlayerId,
          at: new Date().toISOString(),
        }
        void publishSocial(msg.fromPlayerId, hello)
        void publishLobby(hello)
        window.setTimeout(() => {
          void publishDirectory(myId, me, { trophies, ...directoryClubExtra() })
          void publishLobby({ ...hello, at: new Date().toISOString() })
        }, 800)
        if (!battleRef.current && claimPopupSlot()) {
          setIncomingFriendReq({ fromPlayerId: msg.fromPlayerId, fromName: msg.fromName })
          setFriendToast(`${msg.fromName} added you as a friend!`)
          window.setTimeout(() => setFriendToast(null), 2800)
        }
        return
      }
      if (msg.type === 'friend_hello') {
        if (msg.fromPlayerId === myId) return
        if (msg.toPlayerId && msg.toPlayerId !== myId) return
        upsertFriend({ name: msg.fromName, playerId: msg.fromPlayerId })
        window.dispatchEvent(new Event('philroyale-friends-changed'))
        return
      }
      if (msg.type === 'battle_invite') {
        if (battleRef.current) return
        if (battleNetRef.current?.challengeId === msg.challengeId) return
        if (msg.toPlayerId !== myId) return
        if (msg.fromPlayerId === myId) return
        if (seenInviteRef.current.has(msg.challengeId)) return
        seenInviteRef.current.add(msg.challengeId)
        showIncoming({
          challengeId: msg.challengeId,
          fromName: msg.fromName,
          toName: msg.toName,
          fromPlayerId: msg.fromPlayerId,
          toPlayerId: msg.toPlayerId,
          mode: msg.mode,
          createdAt: msg.at,
        })
        try {
          navigator.vibrate?.(200)
        } catch {
          /* ignore */
        }
        return
      }
      if (msg.type === 'battle_accept') {
        if (msg.toPlayerId && msg.toPlayerId !== myId) return
        const outgoingNow = loadOutgoingChallenge()
        if (outgoingNow && outgoingNow.challengeId === msg.challengeId) {
          const challengeId = outgoingNow.challengeId
          const mode = msg.mode ?? outgoingNow.mode ?? 'classic'
          clearOutgoingChallenge()
          clearBattleAccepted()
          setOutgoingChallenge(null)
          setBattle(false)
          setDraftingTouchdown(false)
          setTouchdownDeck(null)
          setShowRoad(false)
          startMatch(msg.fromName || outgoingNow.toName, mode, {
            challengeId,
            role: 'host',
            peerPlayerId: msg.fromPlayerId || outgoingNow.toPlayerId,
          })
        }
        return
      }
      if (msg.type === 'battle_decline') {
        if (msg.toPlayerId && msg.toPlayerId !== myId) return
        const outgoingNow = loadOutgoingChallenge()
        if (outgoingNow && outgoingNow.challengeId === msg.challengeId) {
          clearOutgoingChallenge()
          setOutgoingChallenge(null)
          flashFriend(`${msg.fromName} declined.`)
        }
        return
      }
      if (msg.type === 'club_invite') {
        if (msg.toPlayerId && msg.toPlayerId !== myId) return
        if (!claimPopupSlot()) return
        const invite: ClubInviteIncoming = {
          fromPlayerId: msg.fromPlayerId,
          fromName: msg.fromName,
          clubCode: msg.clubCode,
          clubName: msg.clubName,
          at: msg.at,
        }
        saveIncomingClubInvite(invite)
        setClubInvite(invite)
      }
    }

    // Lobby first — both phones always share this channel.
    const unsubs = [subscribeDirectory(onSocial)]
    for (const id of inboxIds) unsubs.push(subscribeSocial(id, onSocial))
    // Pair mailboxes (poll-only) as a backup.
    for (const f of loadFriends()) {
      if (!f.playerId || !isFriendCode(f.playerId)) continue
      unsubs.push(subscribePair(myId, f.playerId, onSocial))
    }
    return () => {
      for (const u of unsubs) u()
    }
  }, [flashFriend, showIncoming, startMatch, friendsTick, claimPopupSlot])

  // Cloudflare multiplayer socket — presence + invites (ntfy is backup only).
  useEffect(() => {
    if (needsName) return
    const myId = loadPlayerId()
    const me = loadPlayerName().trim() || 'Player'
    let unsub = () => {}
    void mpReady().then((ok) => {
      if (!ok) return
      unsub = mpConnect(myId, me)
      mpSetStatus({ name: me, trophies: loadProfile().trophies })
    })
    const unsubPres = mpOnPresence((players) => {
      const friendIds = new Set(
        loadFriends()
          .map((f) => f.playerId)
          .filter(Boolean) as string[],
      )
      for (const [code, p] of Object.entries(players)) {
        if (!p?.at) continue
        if (friendIds.has(code) || [...friendIds].some((id) => id.replace(/\D/g, '').slice(0, 6) === code)) {
          touchFriendLastOnline(code, p.at)
        }
      }
    })
    return () => {
      unsub()
      unsubPres()
    }
  }, [needsName, playerName])

  // Merge lobby presence into friend online dots often.
  useEffect(() => {
    if (needsName) return
    const merge = () => {
      setFriendPresence((prev) => {
        const next = { ...prev }
        let changed = false
        for (const f of loadFriends()) {
          if (!f.playerId) continue
          const dir = lookupDirectoryPresence(f.playerId)
          if (!dir) continue
          touchFriendLastOnline(f.playerId, dir.at)
          const older = next[f.playerId]
          if (!older || dir.at >= (older.at ?? 0)) {
            next[f.playerId] = {
              ...older,
              at: dir.at,
              inBattle: dir.inBattle ?? older?.inBattle,
              trophies: dir.trophies ?? older?.trophies,
            }
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
    merge()
    const id = window.setInterval(merge, 2000)
    return () => window.clearInterval(id)
  }, [needsName, friendsTick])

  // Persist any in-memory presence timestamps even when Social tab is closed.
  useEffect(() => {
    for (const [pid, info] of Object.entries(friendPresence)) {
      if (info?.at) touchFriendLastOnline(pid, info.at)
    }
  }, [friendPresence])

  // Heartbeat: lobby ping only (online status). Don't spam every friend's topic.
  useEffect(() => {
    if (needsName) return
    const beat = () => {
      const me = loadPlayerName().trim() || 'Player'
      const myId = loadPlayerId()
      const inMatch = battle && !!battleNet && !spectating
      const trophies = loadProfile().trophies
      void publishDirectory(myId, me, { trophies, inBattle: inMatch, ...directoryClubExtra() })

      // While hosting and still waiting for the friend to link, keep re-sending the invite.
      // Stop as soon as invite window ends (cleared when peer links).
      if (
        inMatch &&
        battleNet?.role === 'host' &&
        battleNet.peerPlayerId &&
        battleNet.challengeId &&
        Date.now() < hostInviteUntilRef.current
      ) {
        const toPlayerId = battleNet.peerPlayerId
        const invitePayload = {
          type: 'battle_invite' as const,
          challengeId: battleNet.challengeId,
          fromPlayerId: myId,
          fromName: me,
          toPlayerId,
          toName: opponent || 'Friend',
          mode: battleMode,
          at: new Date().toISOString(),
        }
        void publishSocial(toPlayerId, invitePayload)
        void publishLobby(invitePayload)
      }

      setFriendPresence((prev) => {
        const next = { ...prev }
        for (const f of loadFriends()) {
          if (!f.playerId) continue
          const dir = lookupDirectoryPresence(f.playerId)
          if (!dir) continue
          touchFriendLastOnline(f.playerId, dir.at)
          const older = next[f.playerId]
          if (!older || dir.at >= older.at) {
            next[f.playerId] = {
              ...older,
              at: dir.at,
              inBattle: dir.inBattle ?? older?.inBattle,
              trophies: dir.trophies ?? older?.trophies,
            }
          }
          const nm = lookupDirectory(f.playerId)
          if (nm && (/^player\s/i.test(f.name) || f.name === `Player ${f.playerId}`)) {
            upsertFriend({ name: nm, playerId: f.playerId })
            window.dispatchEvent(new Event('philroyale-friends-changed'))
          }
        }
        return next
      })
    }
    beat()
    const id = window.setInterval(beat, Math.min(PRESENCE_HEARTBEAT_MS, DIRECTORY_HEARTBEAT_MS))
    return () => window.clearInterval(id)
  }, [needsName, playerName, battle, battleNet, battleMode, opponent, spectating])

  const socialOverlays = (
    <>
      {friendToast ? (
        <div className="pointer-events-none fixed inset-x-0 top-[max(3.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
          <p className="rounded-lg bg-[#1a7a3a] px-4 py-2 text-sm font-extrabold text-white shadow-lg">
            {friendToast}
          </p>
        </div>
      ) : null}

      {incomingChallenge ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="battle-challenge-title"
        >
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088, inset 0 1px 0 #c9a22744',
            }}
          >
            <h2
              id="battle-challenge-title"
              className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]"
            >
              {modeLabel(incomingChallenge.mode)} invite
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/85">
              <span className="font-extrabold text-white">{incomingChallenge.fromName}</span>{' '}
              invited you to {modeLabel(incomingChallenge.mode)}
              {isPartyMode(incomingChallenge.mode) ? ' (party — no trophies)' : ''}.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDeclineChallenge}
                className="flex-1 rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-[#ff8a7a] ring-1 ring-white/15"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAcceptChallenge}
                className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
                style={{
                  background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)',
                  boxShadow: '0 3px 0 #1a7a3a',
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {incomingFriendReq ? (
        <div
          className="fixed inset-0 z-[69] flex items-center justify-center bg-black/65 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088, inset 0 1px 0 #c9a22744',
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              New friend
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/85">
              <span className="font-extrabold text-white">{incomingFriendReq.fromName}</span> added
              you. They&apos;re on your friends list — invite them to battle anytime.
            </p>
            <button
              type="button"
              onClick={() => {
                // Restart the 10s cooldown so nothing reopens immediately.
                lastPopupAtRef.current = Date.now()
                setIncomingFriendReq(null)
                setFriendToast(null)
                setTab('social')
              }}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
              style={{
                background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
                boxShadow: '0 3px 0 #8a6a12',
              }}
            >
              Open Friends
            </button>
          </div>
        </div>
      ) : null}

      {clubInvite ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088, inset 0 1px 0 #c9a22744',
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              Club invite
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/85">
              <span className="font-extrabold text-white">{clubInvite.fromName}</span> invited you
              to join <span className="font-extrabold text-white">{clubInvite.clubName}</span>.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  saveIncomingClubInvite(null)
                  setClubInvite(null)
                }}
                className="flex-1 rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-[#ff8a7a] ring-1 ring-white/15"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => {
                  const invite = clubInvite
                  saveIncomingClubInvite(null)
                  setClubInvite(null)
                  setTab('social')
                  flashFriend(`Joining ${invite.clubName}…`)
                  void joinClubVerified(invite.clubCode).then((res) => {
                    flashFriend(res.message)
                    window.dispatchEvent(new Event('philroyale-club-changed'))
                  })
                }}
                className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
                style={{
                  background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)',
                  boxShadow: '0 3px 0 #1a7a3a',
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {outgoingChallenge ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="battle-waiting-title"
        >
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088, inset 0 1px 0 #c9a22744',
            }}
          >
            <h2
              id="battle-waiting-title"
              className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]"
            >
              Waiting for opponent
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/85">
              Waiting for{' '}
              <span className="font-extrabold text-white">{outgoingChallenge.toName}</span> to
              accept{' '}
              {modeLabel(outgoingChallenge.mode)}…
            </p>
            <p className="mt-1 text-xs font-semibold text-white/50">
              They need Phil Royale open for Accept / Decline. You can also text them the battle
              link from the share sheet.
            </p>
            <button
              type="button"
              onClick={() => {
                const c = outgoingChallenge
                const link = battleInviteUrl(
                  c.fromName,
                  c.toName,
                  c.challengeId,
                  c.mode,
                  c.fromPlayerId,
                  c.toPlayerId,
                )
                void shareText(
                  'Phil Royale battle',
                  `Battle me on Phil Royale (${modeLabel(c.mode)})!`,
                  link,
                )
              }}
              className="mt-3 w-full rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-[#4a9eff] ring-1 ring-white/15"
            >
              Text / share battle link
            </button>
            <button
              type="button"
              onClick={cancelOutgoingChallenge}
              className="mt-4 w-full rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-[#ff8a7a] ring-1 ring-white/15"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  )

  if (needsName) {
    return (
      <div className="relative flex h-full min-h-0 flex-col items-center justify-center bg-[#140e0a] px-4">
        <div
          className="w-full max-w-sm rounded-xl p-5"
          style={{
            background: 'linear-gradient(180deg,#3a2418,#1a100c)',
            boxShadow: '0 12px 40px #00000088, inset 0 1px 0 #c9a22744',
          }}
        >
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[#f5d76e]">
            Welcome to Phil Royale
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/80">
            Pick a name friends will see. You&apos;ll get a 6-digit friend code — keep
            Phil Royale open so friends see you online and can invite you.
          </p>
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
            }}
            placeholder="Your name"
            maxLength={20}
            className="mt-4 w-full rounded-lg bg-[#221610] px-3 py-3 text-base font-semibold text-white outline-none ring-1 ring-white/20 placeholder:text-white/35"
          />
          <button
            type="button"
            disabled={nameDraft.trim().length < 2}
            onClick={commitName}
            className="mt-3 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410] disabled:opacity-45"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: '0 3px 0 #8a6a12',
            }}
          >
            Let&apos;s go
          </button>
        </div>
        {socialOverlays}
      </div>
    )
  }

  if (draftingTouchdown) {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <TopStatusBar onShop={() => setTab('shop')} />
        <div className="min-h-0 flex-1">
          <TouchdownDraft
            onCancel={() => {
              setDraftingTouchdown(false)
              setOpponent(null)
              setBattleNet(null)
            }}
            onReady={(ids) => {
              setTouchdownDeck(ids)
              setDraftingTouchdown(false)
              setBattle(true)
            }}
          />
        </div>
        {battleNet ? <DraftPeerKeepalive net={battleNet} /> : null}
        {socialOverlays}
      </div>
    )
  }

  if (draftingParty && battleNet && isPartyMode(battleMode)) {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <TopStatusBar onShop={() => setTab('shop')} />
        <div className="min-h-0 flex-1">
          <PartyModeLobby
            mode={battleMode as 'draft' | 'undraft' | 'infiniteElixir'}
            net={battleNet}
            onCancel={() => {
              setDraftingParty(false)
              setOpponent(null)
              setBattleNet(null)
              setPartyDeck(null)
              setBattleMode('classic')
            }}
            onReady={(ids) => {
              setPartyDeck(ids)
              setDraftingParty(false)
              setBattle(true)
            }}
          />
        </div>
        {socialOverlays}
      </div>
    )
  }

  if (battle) {
    const trophies = loadProfile().trophies
    const levels = loadCardProgress().levels
    const evolutions = loadCardProgress().evolutions ?? []
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <BattleScreen
          key={
            battleNet?.challengeId ?? `local-${battleSession}-${opponent ?? 'bot'}`
          }
          opponentName={opponent}
          opponentClanName={battleNet ? null : 'Bot Clan'}
          opponentTrophies={
            battleNet?.peerPlayerId
              ? friendPresence[battleNet.peerPlayerId]?.trophies ??
                loadFriends().find((f) => f.playerId === battleNet.peerPlayerId)?.trophies ??
                loadProfile().trophies
              : undefined
          }
          allyLevels={levels}
          allyEvolutions={evolutions}
          botLevel={botLevelForTrophies(trophies)}
          mode={battleMode}
          deckIds={
            battleMode === 'touchdown'
              ? touchdownDeck ?? undefined
              : isPartyMode(battleMode)
                ? partyDeck ?? undefined
                : undefined
          }
          net={battleNet}
          spectating={spectating}
          onPeerLinkFailed={handlePeerLinkFailed}
          onPeerLinked={handlePeerLinked}
          onExit={() => {
            const wasSpec = spectating
            setBattle(false)
            setOpponent(null)
            setBattleNet(null)
            setTouchdownDeck(null)
            setPartyDeck(null)
            setBattleMode('classic')
            setSpectating(false)
            setTab(wasSpec ? 'social' : 'home')
          }}
        />
        {/* Intentionally no socialOverlays — battle is popup-free except LagBadge. */}
      </div>
    )
  }

  const roadBadge = countUnclaimedRoadRewards()

  if (showRoad) {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <TopStatusBar onShop={() => setTab('shop')} />
        <div className="min-h-0 flex-1">
          <TrophyRoadScreen
            onBack={() => {
              setShowRoad(false)
              setTab('home')
            }}
            onPlayBot={() => startMatch(null)}
            friendPresence={friendPresence}
            onRequestBattle={requestBattle}
            onInviteClub={inviteToClub}
            onSpectate={startSpectate}
          />
        </div>
        <nav
          className="shrink-0 border-t border-[#c9a227]/30 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1a100c)' }}
          aria-label="Main"
        >
          <ul className="mx-auto flex max-w-md gap-0.5">
            {TABS.map((t) => {
              const active = t.id === 'home'
              return (
                <li key={t.id} className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoad(false)
                      setShowEvents(false)
                      setTab(t.id)
                    }}
                    className="flex w-full flex-col items-center rounded-lg py-1.5 text-[0.65rem] font-extrabold uppercase tracking-wide"
                    style={{
                      background: active
                        ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
                        : 'transparent',
                      color: active ? '#1a1410' : '#f5d76e',
                      boxShadow: active ? '0 3px 0 #8a6a12' : 'none',
                    }}
                  >
                    {t.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        {socialOverlays}
      </div>
    )
  }

  if (showEvents) {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <TopStatusBar onShop={() => setTab('shop')} />
        <div className="min-h-0 flex-1">
          <EventsScreen
            onPlay={(name, mode) => {
              setShowEvents(false)
              startMatch(name, mode ?? 'classic')
            }}
          />
        </div>
        <nav
          className="shrink-0 border-t border-[#c9a227]/30 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1a100c)' }}
          aria-label="Main"
        >
          <ul className="mx-auto flex max-w-md gap-0.5">
            {TABS.map((t) => (
              <li key={t.id} className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowEvents(false)
                    setTab(t.id)
                  }}
                  className="flex w-full flex-col items-center rounded-lg py-1.5 text-[0.65rem] font-extrabold uppercase tracking-wide"
                  style={{
                    background: 'transparent',
                    color: '#f5d76e',
                  }}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {socialOverlays}
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <TopStatusBar onShop={() => setTab('shop')} />
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="h-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'home' ? (
              <HomeScreen
                onPlay={(name) => startMatch(name, 'classic')}
                onRequestBattle={requestBattle}
                onOpenRoad={() => setShowRoad(true)}
                onOpenEvents={() => setShowEvents(true)}
                onOpenClub={() => setTab('social')}
                onOpenCards={() => setTab('cards')}
                friendPresence={friendPresence}
              />
            ) : null}
            {tab === 'cards' ? <CharactersScreen /> : null}
            {tab === 'shop' ? <ShopScreen /> : null}
            {tab === 'social' ? (
              <FriendsScreen
                onBattle={(name, mode) => startMatch(name, mode ?? 'classic')}
                onRequestBattle={requestBattle}
                onInviteClub={inviteToClub}
                waitingForFriend={outgoingChallenge?.toName ?? null}
                friendPresence={friendPresence}
                onAddByCode={addFriendByCode}
                onSpectate={startSpectate}
              />
            ) : null}
            {tab === 'profile' ? (
              <ProfileScreen onOpenSocial={() => setTab('social')} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav
        className="shrink-0 border-t border-[#c9a227]/35 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
        style={{ background: 'linear-gradient(180deg,#3a2418,#1a100c)' }}
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-md items-end gap-0.5">
          {TABS.map((t) => {
            const active = tab === t.id
            const battleTab = t.id === 'home'
            return (
              <li key={t.id} className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoad(false)
                    setShowEvents(false)
                    setTab(t.id)
                  }}
                  className={`flex w-full flex-col items-center gap-0.5 rounded-xl font-extrabold uppercase tracking-wide ${
                    battleTab ? '-mt-2.5 py-2 text-[0.7rem]' : 'py-1.5 text-[0.58rem]'
                  }`}
                  style={{
                    background: active
                      ? battleTab
                        ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
                        : 'linear-gradient(180deg,#4a9eff,#2f6fbf)'
                      : 'transparent',
                    color: active ? (battleTab ? '#1a1410' : '#fff') : '#f5d76e',
                    boxShadow: active
                      ? battleTab
                        ? '0 3px 0 #8a6a12'
                        : '0 3px 0 #1d4a86'
                      : 'none',
                  }}
                >
                  <TabGlyph id={t.id} active={active} />
                  {t.label}
                </button>
                {t.id === 'home' && roadBadge > 0 ? (
                  <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff3b3b] px-1 text-[0.55rem] font-black text-white">
                    {roadBadge}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </nav>

      {socialOverlays}
    </div>
  )
}

/** Keep the battle room warm while both players finish Touchdown draft. */
function DraftPeerKeepalive({ net }: { net: BattleNet }) {
  useEffect(() => {
    if (!net.challengeId || net.role === 'spectator') return
    const burst = () => {
      void publishBattle(net.challengeId, {
        type: 'battle_ready',
        challengeId: net.challengeId,
        role: net.role,
        name: loadPlayerName().trim() || net.role,
        at: new Date().toISOString(),
      })
    }
    burst()
    const id = window.setInterval(burst, 1500)
    return () => window.clearInterval(id)
  }, [net.challengeId, net.role])
  return null
}
