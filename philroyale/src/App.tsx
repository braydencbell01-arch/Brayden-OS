import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BattleScreen } from './BattleScreen'
import { CharactersScreen } from './CharactersScreen'
import { FriendsScreen } from './FriendsScreen'
import { HomeScreen } from './HomeScreen'
import { ShopScreen } from './ShopScreen'
import { TrophyRoadScreen } from './TrophyRoadScreen'
import {
  botLevelForTrophies,
  botNameForTrophies,
} from './progression'
import {
  BATTLE_CHANNEL_NAME,
  battleInviteUrl,
  clearBattleAccepted,
  clearIncomingChallenge,
  clearOutgoingChallenge,
  countUnclaimedRoadRewards,
  createBattleChallenge,
  isChallengeForMe,
  loadBattleAccepted,
  loadCardProgress,
  loadIncomingChallenge,
  loadOutgoingChallenge,
  loadPlayerName,
  loadProfile,
  parseBattleChallengeFromUrl,
  postBattleMessage,
  saveBattleAccepted,
  saveIncomingChallenge,
  shareText,
  type BattleChallenge,
  type BattleChannelMessage,
} from './storage'

type TabId = 'home' | 'road' | 'characters' | 'shop' | 'friends'

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Battle' },
  { id: 'road', label: 'Road' },
  { id: 'characters', label: 'Cards' },
  { id: 'shop', label: 'Shop' },
  { id: 'friends', label: 'Social' },
]

function clearBattleUrlParams(): void {
  const url = new URL(window.location.href)
  if (
    !url.searchParams.has('battleFrom') &&
    !url.searchParams.has('battleTo') &&
    !url.searchParams.has('challenge')
  ) {
    return
  }
  url.searchParams.delete('battleFrom')
  url.searchParams.delete('battleTo')
  url.searchParams.delete('challenge')
  window.history.replaceState({}, '', url.toString())
}

export default function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [battle, setBattle] = useState(false)
  const [opponent, setOpponent] = useState<string | null>(null)
  const [showRoad, setShowRoad] = useState(false)
  const [incomingChallenge, setIncomingChallenge] = useState<BattleChallenge | null>(null)
  const [outgoingChallenge, setOutgoingChallenge] = useState<BattleChallenge | null>(() =>
    loadOutgoingChallenge(),
  )

  const startMatch = useCallback((name?: string | null) => {
    const trophies = loadProfile().trophies
    setOpponent(name ?? botNameForTrophies(trophies))
    setShowRoad(false)
    setBattle(true)
  }, [])

  const showIncoming = useCallback((challenge: BattleChallenge) => {
    if (!isChallengeForMe(challenge)) return
    const outgoing = loadOutgoingChallenge()
    if (outgoing && outgoing.challengeId === challenge.challengeId) return
    saveIncomingChallenge(challenge)
    setIncomingChallenge(challenge)
  }, [])

  const handleAcceptChallenge = useCallback(() => {
    if (!incomingChallenge) return
    const { challengeId, fromName } = incomingChallenge
    const acceptedBy = loadPlayerName().trim() || incomingChallenge.toName
    saveBattleAccepted({
      challengeId,
      acceptedBy,
      acceptedAt: new Date().toISOString(),
    })
    postBattleMessage({ type: 'accept', challengeId, acceptedBy })
    clearIncomingChallenge()
    setIncomingChallenge(null)
    clearBattleUrlParams()
    startMatch(fromName)
  }, [incomingChallenge, startMatch])

  const handleDeclineChallenge = useCallback(() => {
    if (!incomingChallenge) return
    postBattleMessage({ type: 'decline', challengeId: incomingChallenge.challengeId })
    clearIncomingChallenge()
    setIncomingChallenge(null)
    clearBattleUrlParams()
  }, [incomingChallenge])

  const cancelOutgoingChallenge = useCallback(() => {
    clearOutgoingChallenge()
    setOutgoingChallenge(null)
  }, [])

  const requestBattle = useCallback(async (friendName: string) => {
    const challenge = createBattleChallenge(friendName)
    setOutgoingChallenge(challenge)
    postBattleMessage({ type: 'challenge', challenge })
    await shareText(
      'Phil Royale battle',
      `${challenge.fromName} challenges you to a Phil Royale battle — tap to accept:`,
      battleInviteUrl(challenge.fromName, challenge.toName, challenge.challengeId),
    )
  }, [])

  useEffect(() => {
    const fromUrl = parseBattleChallengeFromUrl()
    if (fromUrl) {
      showIncoming(fromUrl)
      clearBattleUrlParams()
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
          clearOutgoingChallenge()
          clearBattleAccepted()
          setOutgoingChallenge(null)
          startMatch(opponentName)
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
            clearOutgoingChallenge()
            clearBattleAccepted()
            setOutgoingChallenge(null)
            startMatch(opponentName)
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
        clearOutgoingChallenge()
        clearBattleAccepted()
        setOutgoingChallenge(null)
        startMatch(opponentName)
      }
    }, 800)

    return () => window.clearInterval(interval)
  }, [outgoingChallenge, startMatch])

  if (battle) {
    const trophies = loadProfile().trophies
    const levels = loadCardProgress().levels
    return (
      <BattleScreen
        opponentName={opponent}
        allyLevels={levels}
        botLevel={botLevelForTrophies(trophies)}
        onExit={() => {
          setBattle(false)
          setOpponent(null)
          setTab('home')
        }}
      />
    )
  }

  const openRoad = showRoad || tab === 'road'
  const roadBadge = countUnclaimedRoadRewards()

  if (openRoad) {
    return (
      <div className="flex h-full min-h-0 flex-col">
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
              const active = t.id === 'road'
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
                  {t.id === 'road' && roadBadge > 0 ? (
                    <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff3b3b] px-1 text-[0.55rem] font-black text-white">
                      {roadBadge}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
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
                onPlay={startMatch}
                onRequestBattle={requestBattle}
                onOpenRoad={() => {
                  setShowRoad(true)
                  setTab('road')
                }}
              />
            ) : null}
            {tab === 'characters' ? <CharactersScreen /> : null}
            {tab === 'shop' ? <ShopScreen /> : null}
            {tab === 'friends' ? (
              <FriendsScreen
                onBattle={startMatch}
                onRequestBattle={requestBattle}
                waitingForFriend={outgoingChallenge?.toName ?? null}
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
                {t.id === 'road' && roadBadge > 0 ? (
                  <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff3b3b] px-1 text-[0.55rem] font-black text-white">
                    {roadBadge}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </nav>

      {incomingChallenge ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
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
              Battle challenge
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/85">
              <span className="font-extrabold text-white">{incomingChallenge.fromName}</span>{' '}
              challenges you to a battle.
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

      {outgoingChallenge ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
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
              <span className="font-extrabold text-white">{outgoingChallenge.toName}</span>…
            </p>
            <p className="mt-1 text-xs font-semibold text-white/50">
              Share the battle link by text, or keep this tab open on the same device.
            </p>
            <button
              type="button"
              onClick={() =>
                void shareText(
                  'Phil Royale battle',
                  `${outgoingChallenge.fromName} challenges you to a Phil Royale battle:`,
                  battleInviteUrl(
                    outgoingChallenge.fromName,
                    outgoingChallenge.toName,
                    outgoingChallenge.challengeId,
                  ),
                )
              }
              className="mt-3 w-full rounded-lg py-2.5 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
            >
              Share battle link again
            </button>
            <button
              type="button"
              onClick={cancelOutgoingChallenge}
              className="mt-2 w-full rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-[#ff8a7a] ring-1 ring-white/15"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
