import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BattleScreen } from './BattleScreen'
import { CharactersScreen } from './CharactersScreen'
import { CurrencyBar } from './CurrencyBar'
import { EventsScreen } from './EventsScreen'
import { FriendsScreen } from './FriendsScreen'
import { HomeScreen } from './HomeScreen'
import { ShopScreen } from './ShopScreen'
import { TouchdownDraft } from './TouchdownDraft'
import { TrophyRoadScreen } from './TrophyRoadScreen'
import type { BattleNet } from './battleSync'
import { joinClubVerified, startClubSync } from './clubSync'
import {
  DIRECTORY_HEARTBEAT_MS,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_ONLINE_MS,
  lookupDirectory,
  pollDirectory,
  publishDirectory,
  publishSocial,
  subscribeDirectory,
  subscribeSocial,
  waitForSocial,
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
  removeFriendByPlayerId,
  repairBrokenLocalClub,
  saveBattleAccepted,
  saveIncomingChallenge,
  saveIncomingClubInvite,
  savePendingFriendLink,
  savePlayerName,
  shareText,
  upsertFriend,
  type BattleChallenge,
  type BattleChannelMessage,
  type ClubInviteIncoming,
  type GameMode,
} from './storage'

type TabId = 'home' | 'characters' | 'shop' | 'events' | 'friends'

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Battle' },
  { id: 'characters', label: 'Cards' },
  { id: 'shop', label: 'Shop' },
  { id: 'events', label: 'Events' },
  { id: 'friends', label: 'Social' },
]

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
  const [tab, setTab] = useState<TabId>('home')
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [nameDraft, setNameDraft] = useState(() => loadPlayerName())
  const [friendToast, setFriendToast] = useState<string | null>(null)
  const [battle, setBattle] = useState(false)
  const [battleMode, setBattleMode] = useState<GameMode>('classic')
  const [battleNet, setBattleNet] = useState<BattleNet | null>(null)
  const [draftingTouchdown, setDraftingTouchdown] = useState(false)
  const [touchdownDeck, setTouchdownDeck] = useState<string[] | null>(null)
  const [opponent, setOpponent] = useState<string | null>(null)
  const [showRoad, setShowRoad] = useState(false)
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
  const needsName = !playerName.trim()

  const flashFriend = useCallback((msg: string) => {
    setFriendToast(msg)
    window.setTimeout(() => setFriendToast(null), 2800)
  }, [])

  const startMatch = useCallback(
    (name?: string | null, mode: GameMode = 'classic', net: BattleNet | null = null) => {
      const trophies = loadProfile().trophies
      setOpponent(name ?? botNameForTrophies(trophies))
      setBattleMode(mode)
      // Always host a spectate room so friends can watch bot + friend battles.
      const room: BattleNet =
        net ??
        ({
          challengeId: `s-${loadPlayerId().slice(0, 8)}-${Date.now().toString(36)}`,
          role: 'host',
        } satisfies BattleNet)
      setBattleNet(room)
      setSpectating(false)
      setShowRoad(false)
      if (mode === 'touchdown') {
        setDraftingTouchdown(true)
        setTouchdownDeck(null)
        setBattle(false)
        return
      }
      setDraftingTouchdown(false)
      setTouchdownDeck(null)
      setBattle(true)
    },
    [],
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
      setTouchdownDeck(null)
      setShowRoad(false)
      setBattle(true)
      flashFriend(`Spectating ${friendName}…`)
    },
    [flashFriend],
  )

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
      upsertFriend({ name: link.name, playerId: realId })
      window.dispatchEvent(new Event('philroyale-friends-changed'))
      if (realId) {
        await publishSocial(realId, {
          type: 'friend_hello',
          fromPlayerId: myId,
          fromName: me,
          at: new Date().toISOString(),
        })
      }
      savePendingFriendLink(null)
      flashFriend(`You're now friends with ${link.name}!`)
      setTab('friends')
    },
    [flashFriend],
  )

  const showIncoming = useCallback((challenge: BattleChallenge) => {
    if (!isChallengeForMe(challenge)) return
    const outgoing = loadOutgoingChallenge()
    if (outgoing && outgoing.challengeId === challenge.challengeId) return
    if (challenge.fromPlayerId || challenge.fromName) {
      upsertFriend({
        name: challenge.fromName,
        playerId: challenge.fromPlayerId,
      })
    }
    saveIncomingChallenge(challenge)
    setIncomingChallenge(challenge)
  }, [])

  const handleAcceptChallenge = useCallback(() => {
    if (!incomingChallenge) return
    const { challengeId, fromName, mode, fromPlayerId } = incomingChallenge
    const acceptedBy = loadPlayerName().trim() || incomingChallenge.toName
    saveBattleAccepted({
      challengeId,
      acceptedBy,
      acceptedAt: new Date().toISOString(),
    })
    postBattleMessage({ type: 'accept', challengeId, acceptedBy, mode })
    if (fromPlayerId) {
      void publishSocial(fromPlayerId, {
        type: 'battle_accept',
        challengeId,
        fromPlayerId: loadPlayerId(),
        fromName: acceptedBy,
        mode: mode ?? 'classic',
        at: new Date().toISOString(),
      })
    }
    clearIncomingChallenge()
    setIncomingChallenge(null)
    clearUrlParams(['battleFrom', 'battleTo', 'challenge', 'mode', 'fromId', 'toId'])
    // Drop any current match/draft so Accept works from every screen.
    setBattle(false)
    setDraftingTouchdown(false)
    setTouchdownDeck(null)
    setShowRoad(false)
    // Accepter is guest; challenger (fromPlayerId) hosts the shared sim.
    startMatch(fromName, mode ?? 'classic', {
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
      if (!toPlayerId) {
        flashFriend('Add this friend with their account code first.')
        return
      }
      if (friendPresence[toPlayerId]?.inBattle) {
        flashFriend(`${friendName} is already in a battle — spectate from their profile.`)
        return
      }
      const lastSeen = friendPresence[toPlayerId]?.at
      const looksOnline = !!lastSeen && Date.now() - lastSeen < PRESENCE_ONLINE_MS
      const challenge = createBattleChallenge(friendName, {
        mode,
        toPlayerId,
      })
      setOutgoingChallenge(challenge)
      postBattleMessage({ type: 'challenge', challenge })
      const ok = await publishSocial(toPlayerId, {
        type: 'battle_invite',
        challengeId: challenge.challengeId,
        fromPlayerId: loadPlayerId(),
        fromName: challenge.fromName,
        toPlayerId,
        toName: friendName,
        mode,
        at: challenge.createdAt,
      })
      if (!ok) {
        clearOutgoingChallenge()
        setOutgoingChallenge(null)
        flashFriend('Invite failed — check your connection.')
        return
      }
      flashFriend(
        looksOnline
          ? `Invite sent to ${friendName}. Waiting for Accept / Decline…`
          : `Invite sent to ${friendName}. They need Phil Royale open to see Accept / Decline.`,
      )
    },
    [flashFriend, friendPresence],
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
            alnum.length === 6
              ? 'That looks like a club code — use Club → Join instead.'
              : 'Friend codes are exactly 3 digits (example 247). Hard-refresh both phones first.',
        }
      }
      if (code === myId) return { ok: false, message: "That's your own code." }

      upsertFriend({ name: 'Adding…', playerId: code })
      window.dispatchEvent(new Event('philroyale-friends-changed'))

      // Announce ourselves + scan the live directory for their 3-digit code.
      void publishDirectory(myId, me)
      await pollDirectory()
      let foundName = lookupDirectory(code)

      const published = await publishSocial(code, {
        type: 'friend_request',
        fromPlayerId: myId,
        fromName: me,
        toPlayerId: code,
        at: new Date().toISOString(),
      })
      void publishSocial(code, {
        type: 'friend_hello',
        fromPlayerId: myId,
        fromName: me,
        at: new Date().toISOString(),
      })

      if (!published && !foundName) {
        removeFriendByPlayerId(code)
        window.dispatchEvent(new Event('philroyale-friends-changed'))
        return { ok: false, message: 'Could not reach the network. Try again.' }
      }

      if (!foundName) {
        const reply = await waitForSocial(
          (msg) =>
            (msg.type === 'dir_ping' ||
              msg.type === 'friend_hello' ||
              msg.type === 'friend_request') &&
            msg.fromPlayerId === code,
          20_000,
        )
        if (reply && 'fromName' in reply && reply.fromName) {
          foundName = reply.fromName
        } else {
          await pollDirectory()
          foundName = lookupDirectory(code)
        }
      }

      if (!foundName) {
        removeFriendByPlayerId(code)
        window.dispatchEvent(new Event('philroyale-friends-changed'))
        return {
          ok: false,
          message:
            'Nobody online with that 3-digit code. Both of you: hard-refresh Phil Royale, open Social → Friends, copy the new 3-digit code, and try again while both apps stay open.',
        }
      }

      upsertFriend({ name: foundName, playerId: code })
      window.dispatchEvent(new Event('philroyale-friends-changed'))
      return {
        ok: true,
        message: `Added ${foundName}. Open their profile → Invite — they get Accept / Decline.`,
      }
    },
    [],
  )

  const inviteToClub = useCallback(async (friendName: string, playerId?: string) => {
    const club = loadRichClub()
    if (!club) {
      flashFriend('Join or create a club first.')
      setTab('friends')
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
    flashFriend(`Your friend code is ${id} — 3 digits. Share that under Social → Friends.`)
    repairBrokenLocalClub()
    const friendLink = parseFriendInviteFromUrl()
    if (friendLink) {
      clearUrlParams(['addFriend', 'friendName', 'friend'])
      void completeFriendLink(friendLink)
    }
    const clubCode = new URLSearchParams(window.location.search).get('club')
    if (clubCode) {
      clearUrlParams(['club'])
      setTab('friends')
      void joinClubVerified(clubCode).then((res) => {
        flashFriend(res.message)
        window.dispatchEvent(new Event('philroyale-club-changed'))
      })
    }
  }, [completeFriendLink, flashFriend])

  // Club roster sync on every screen so joins work even if Social isn't open.
  const [clubSyncKey, setClubSyncKey] = useState(0)
  useEffect(() => {
    const bump = () => setClubSyncKey((k) => k + 1)
    window.addEventListener('philroyale-club-changed', bump)
    return () => window.removeEventListener('philroyale-club-changed', bump)
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

    const interval = window.setInterval(() => {
      const accepted = loadBattleAccepted()
      if (accepted && accepted.challengeId === outgoingChallenge.challengeId) {
        const opponentName = outgoingChallenge.toName
        const challengeId = outgoingChallenge.challengeId
        const mode = outgoingChallenge.mode ?? 'classic'
        const peerPlayerId = outgoingChallenge.toPlayerId
        clearOutgoingChallenge()
        clearBattleAccepted()
        setOutgoingChallenge(null)
        startMatch(opponentName, mode, {
          challengeId,
          role: 'host',
          peerPlayerId,
        })
      }
    }, 800)

    return () => window.clearInterval(interval)
  }, [outgoingChallenge, startMatch])

  useEffect(() => {
    const myId = loadPlayerId()
    const inboxIds = [myId, ...loadLegacyPlayerIds()]

    const onSocial = (msg: SocialMessage) => {
      if (msg.type === 'presence') {
        if (msg.fromPlayerId === myId) return
        const at = Date.parse(msg.at) || Date.now()
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
        upsertFriend({ name: msg.fromName, playerId: msg.fromPlayerId })
        window.dispatchEvent(new Event('philroyale-friends-changed'))
        const me = loadPlayerName().trim() || 'Player'
        void publishSocial(msg.fromPlayerId, {
          type: 'friend_hello',
          fromPlayerId: myId,
          fromName: me,
          at: new Date().toISOString(),
        })
        flashFriend(`${msg.fromName} added you as a friend!`)
        return
      }
      if (msg.type === 'friend_hello') {
        if (msg.fromPlayerId === myId) return
        upsertFriend({ name: msg.fromName, playerId: msg.fromPlayerId })
        window.dispatchEvent(new Event('philroyale-friends-changed'))
        flashFriend(`${msg.fromName} is now your friend!`)
        return
      }
      if (msg.type === 'battle_invite') {
        showIncoming({
          challengeId: msg.challengeId,
          fromName: msg.fromName,
          toName: msg.toName,
          fromPlayerId: msg.fromPlayerId,
          toPlayerId: msg.toPlayerId,
          mode: msg.mode,
          createdAt: msg.at,
        })
        return
      }
      if (msg.type === 'battle_accept') {
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
        const outgoingNow = loadOutgoingChallenge()
        if (outgoingNow && outgoingNow.challengeId === msg.challengeId) {
          clearOutgoingChallenge()
          setOutgoingChallenge(null)
          flashFriend(`${msg.fromName} declined.`)
        }
        return
      }
      if (msg.type === 'club_invite') {
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

    const unsubs = inboxIds.map((id) => subscribeSocial(id, onSocial))
    return () => {
      for (const u of unsubs) u()
    }
  }, [flashFriend, showIncoming, startMatch])

  // Friend-code directory — both phones must stay open so 3-digit lookup works.
  useEffect(() => {
    if (needsName) return
    return subscribeDirectory()
  }, [needsName])

  // Heartbeat: directory ping + presence to friends.
  useEffect(() => {
    if (needsName) return
    const beat = () => {
      const me = loadPlayerName().trim() || 'Player'
      const myId = loadPlayerId()
      const at = new Date().toISOString()
      void publishDirectory(myId, me)
      const inMatch = battle && !!battleNet && !spectating
      const role =
        battleNet?.role === 'guest' ? 'guest' : battleNet?.role === 'host' ? 'host' : undefined
      for (const f of loadFriends()) {
        if (!f.playerId || f.playerId === myId) continue
        void publishSocial(f.playerId, {
          type: 'presence',
          fromPlayerId: myId,
          fromName: me,
          at,
          trophies: loadProfile().trophies,
          inBattle: inMatch,
          challengeId: inMatch ? battleNet?.challengeId : undefined,
          mode: inMatch ? battleMode : undefined,
          opponentName: inMatch ? opponent ?? undefined : undefined,
          battleRole: inMatch ? role : undefined,
        })
      }
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
              {incomingChallenge.mode === 'touchdown' ? 'Touchdown invite' : 'Battle invite'}
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/85">
              <span className="font-extrabold text-white">{incomingChallenge.fromName}</span>{' '}
              invited you to{' '}
              {incomingChallenge.mode === 'touchdown' ? 'Touchdown' : 'Classic battle'}.
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
                  setTab('friends')
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
              {outgoingChallenge.mode === 'touchdown' ? 'Touchdown' : 'Classic'}…
            </p>
            <p className="mt-1 text-xs font-semibold text-white/50">
              No link — they must have Phil Royale open. They&apos;ll see Accept / Decline on any
              screen.
            </p>
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
            Pick a name friends will see. You&apos;ll get a 3-digit friend code — battle
            invites only work when they&apos;re online.
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
        <CurrencyBar />
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
        {socialOverlays}
      </div>
    )
  }

  if (battle) {
    const trophies = loadProfile().trophies
    const levels = loadCardProgress().levels
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <BattleScreen
          opponentName={opponent}
          allyLevels={levels}
          botLevel={botLevelForTrophies(trophies)}
          mode={battleMode}
          deckIds={battleMode === 'touchdown' ? touchdownDeck ?? undefined : undefined}
          net={battleNet}
          spectating={spectating}
          onExit={() => {
            const wasSpec = spectating
            setBattle(false)
            setOpponent(null)
            setBattleNet(null)
            setTouchdownDeck(null)
            setBattleMode('classic')
            setSpectating(false)
            setTab(wasSpec ? 'friends' : 'home')
          }}
        />
        {socialOverlays}
      </div>
    )
  }

  const roadBadge = countUnclaimedRoadRewards()

  if (showRoad) {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <CurrencyBar />
        <div className="min-h-0 flex-1">
          <TrophyRoadScreen
            onBack={() => {
              setShowRoad(false)
              setTab('home')
            }}
            onPlayBot={() => startMatch(null)}
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

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <CurrencyBar />
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
                onPlayTouchdown={() => startMatch(null, 'touchdown')}
                onRequestBattle={requestBattle}
                onOpenRoad={() => setShowRoad(true)}
                onOpenEvents={() => setTab('events')}
                onOpenClub={() => setTab('friends')}
                friendPresence={friendPresence}
              />
            ) : null}
            {tab === 'characters' ? <CharactersScreen /> : null}
            {tab === 'shop' ? <ShopScreen /> : null}
            {tab === 'events' ? (
              <EventsScreen onPlay={(name) => startMatch(name, 'classic')} />
            ) : null}
            {tab === 'friends' ? (
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
          </motion.div>
        </AnimatePresence>
      </div>

      <nav
        className="shrink-0 border-t border-[#c9a227]/30 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
        style={{ background: 'linear-gradient(180deg,#3a2418,#1a100c)' }}
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-md gap-0.5">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <li key={t.id} className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
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
