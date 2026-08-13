import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChestArt,
  ChestInspectModal,
  ChestRevealSequence,
  type ChestLoot,
} from './ChestOpen'
import { arenaThemeBackground } from './arenaThemes'
import {
  ARENA_COLORS,
  CHEST_META,
  botNameForTrophies,
  nextRoadStep,
  type ChestRarity,
} from './progression'
import { PRESENCE_ONLINE_MS, type FriendPresenceInfo } from './socialHub'
import {
  arenaTitle,
  claimCrownChest,
  claimDailyChest,
  claimDailyQuest,
  countUnclaimedRoadRewards,
  formatAccountCode,
  loadAccountCode,
  loadAvatarId,
  loadChests,
  loadDaily,
  loadFriends,
  loadPlayerName,
  loadProfile,
  openChestNow,
  questLabel,
  savePlayerName,
  startChestUnlock,
  type DailyState,
  type Friend,
  type GameMode,
  type OwnedChest,
  type PlayerProfile,
} from './storage'
import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'

type Props = {
  onPlay: (opponentName?: string | null) => void
  onPlayTouchdown: () => void
  onRequestBattle: (
    friendName: string,
    opts?: { mode?: GameMode; playerId?: string },
  ) => Promise<void>
  onOpenRoad: () => void
  onOpenEvents?: () => void
  onOpenClub?: () => void
  onOpenCards?: () => void
  /** playerId → latest presence snapshot */
  friendPresence?: Record<string, FriendPresenceInfo>
}

function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`
}

export function HomeScreen({
  onPlay,
  onPlayTouchdown,
  onRequestBattle,
  onOpenRoad,
  onOpenEvents,
  onOpenClub,
  onOpenCards,
  friendPresence = {},
}: Props) {
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends())
  const myCode = useMemo(() => loadAccountCode(), [])
  const avatarId = useMemo(() => loadAvatarId(), [])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteFriend, setInviteFriend] = useState<Friend | null>(null)
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const [daily, setDaily] = useState<DailyState>(() => loadDaily())
  const [chests, setChests] = useState<OwnedChest[]>(() => loadChests())
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState<string | null>(null)
  const [inspectId, setInspectId] = useState<string | null>(null)
  const [reveal, setReveal] = useState<{ rarity: ChestRarity; loot: ChestLoot } | null>(
    null,
  )

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    const onFriends = () => setFriends(loadFriends())
    window.addEventListener('philroyale-friends-changed', onFriends)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('philroyale-friends-changed', onFriends)
    }
  }, [])

  function friendOnline(f: Friend): boolean {
    if (!f.playerId) return false
    const at = friendPresence[f.playerId]?.at
    return typeof at === 'number' && now - at < PRESENCE_ONLINE_MS
  }

  const nextStep = nextRoadStep(profile.trophies)
  const botName = botNameForTrophies(profile.trophies)
  const unclaimed = countUnclaimedRoadRewards()
  const arena = arenaTitle(profile.trophies)
  const arenaColors = ARENA_COLORS[arena] ?? ARENA_COLORS['Training Camp']!
  const prevTrophies = nextStep
    ? TROPHY_PREV(profile.trophies, nextStep.trophies)
    : 0
  const roadProgress = nextStep
    ? Math.max(
        0,
        Math.min(
          1,
          (profile.trophies - prevTrophies) / Math.max(1, nextStep.trophies - prevTrophies),
        ),
      )
    : 1

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  function refresh() {
    setProfile(loadProfile())
    setChests(loadChests())
    setDaily(loadDaily())
  }

  async function battleFriend(friend: Friend, mode: GameMode) {
    if (!friend.playerId) {
      flash('Add them with their account code on Social first.')
      setInviteFriend(null)
      return
    }
    if (!friendOnline(friend)) {
      flash(`${friend.name} is offline — they need the app open.`)
      setInviteFriend(null)
      return
    }
    setInviteFriend(null)
    setInviteOpen(false)
    await onRequestBattle(friend.name, { mode, playerId: friend.playerId })
  }

  function persistName(name: string) {
    setPlayerName(name)
    savePlayerName(name)
  }

  function onClaimChest() {
    const res = claimDailyChest()
    flash(res.message)
    if (res.ok) refresh()
  }

  function onClaimQuest() {
    const res = claimDailyQuest()
    flash(res.message)
    if (res.ok) refresh()
  }

  function onCrown() {
    const res = claimCrownChest()
    flash(res.message)
    if (res.ok) refresh()
  }

  function onChestTap(chest: OwnedChest) {
    setInspectId(chest.id)
  }

  function runOpen(chestId: string, payGold: boolean) {
    const res = openChestNow(chestId, payGold)
    if (!res.ok || res.rarity == null || res.gold == null || !res.cards) {
      flash(res.message)
      return
    }
    setInspectId(null)
    setReveal({
      rarity: res.rarity,
      loot: {
        gold: res.gold,
        gems: res.gems ?? 0,
        cards: res.cards,
        evoShards: res.evoShards ?? [],
      },
    })
    refresh()
  }

  const inspectChest = inspectId ? chests.find((c) => c.id === inspectId) ?? null : null
  const slots = Array.from({ length: 4 }, (_, i) => chests[i] ?? null)

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 50% at 50% 20%, ${arenaColors.sky}cc 0%, transparent 55%),
            linear-gradient(180deg, ${arenaColors.sky} 0%, ${arenaColors.ground} 42%, #1a100c 100%)
          `,
        }}
      />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-[max(3.1rem,calc(env(safe-area-inset-top)+2.5rem))]">
        {/* Profile strip */}
        <div
          className="flex w-full max-w-md items-center gap-2 self-center rounded-xl px-2.5 py-1.5"
          style={{
            background: 'linear-gradient(180deg,#3a2418cc,#1a100cee)',
            boxShadow: 'inset 0 1px 0 #c9a22744',
          }}
        >
          <div
            className="h-9 w-9 shrink-0 overflow-hidden rounded-lg"
            style={{ background: CARD_PORTRAIT_BG }}
          >
            <CharacterModel charId={avatarId} anim="idle" facing={-Math.PI / 2} portrait />
          </div>
          <input
            value={playerName}
            onChange={(e) => persistName(e.target.value)}
            placeholder="Name"
            className="min-w-0 flex-1 bg-transparent text-sm font-extrabold text-white outline-none placeholder:text-white/35"
          />
          <span className="shrink-0 text-sm font-black tabular-nums text-[#f5d76e]">
            {profile.trophies} ★
          </span>
        </div>

        {/* Arena island */}
        <motion.button
          type="button"
          onClick={onOpenRoad}
          whileTap={{ scale: 0.98 }}
          className="relative mt-3 w-full max-w-md shrink-0 self-center overflow-hidden rounded-[2rem] px-3 pb-4 pt-5 text-center"
          style={{
            background: arenaThemeBackground(arena),
            boxShadow: `0 10px 0 ${arenaColors.ground}99, 0 16px 28px #00000066, inset 0 2px 0 #ffffff33`,
            minHeight: '9.5rem',
          }}
        >
          {unclaimed > 0 ? (
            <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff3b3b] px-1.5 text-xs font-black text-white shadow">
              {unclaimed}
            </span>
          ) : null}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `
                radial-gradient(ellipse 80% 55% at 50% 40%, ${arenaColors.accent}66 0%, transparent 65%)
              `,
            }}
          />
          <p className="relative font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e] drop-shadow-[0_2px_4px_#000]">
            {arena}
          </p>
          <p className="relative text-xs font-bold text-white/90 drop-shadow-[0_1px_2px_#000]">
            Tap for Trophy Road
          </p>
        </motion.button>

        {/* Thin road progress */}
        <button
          type="button"
          onClick={onOpenRoad}
          className="mt-2 w-full max-w-md self-center rounded-full px-3 py-1.5 text-left"
          style={{
            background: 'linear-gradient(180deg,#1a100ccc,#0e0a08ee)',
            boxShadow: 'inset 0 1px 0 #ffffff22',
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-2 text-[0.65rem] font-extrabold text-white/85">
            <span>{profile.trophies} trophies</span>
            <span className="truncate text-[#f5d76e]">
              {nextStep ? `Next: ${nextStep.label}` : 'Road complete'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/45 ring-1 ring-[#2f6fbf66]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(roadProgress * 100)}%`,
                background: 'linear-gradient(90deg,#6ec8ff,#2f6fbf)',
              }}
            />
          </div>
        </button>

        {/* Battle cluster — moved up (where catch-up would be) */}
        <div className="mt-4 flex w-full max-w-md items-stretch justify-center gap-2 self-center">
          <motion.button
            type="button"
            onClick={() => onOpenCards?.()}
            whileTap={{ scale: 0.96 }}
            className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2"
            style={{
              background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
              boxShadow: '0 4px 0 #1d4a86',
            }}
            aria-label="Deck"
          >
            <span className="text-lg font-black text-white">▣</span>
            <span className="text-[0.55rem] font-extrabold uppercase text-white/90">Deck</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => onPlay(botName)}
            whileTap={{ scale: 0.97 }}
            className="min-w-0 flex-1 rounded-xl px-4 py-3.5 text-xl font-extrabold uppercase tracking-wider text-[#1a1410]"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#f5d76e 40%,#c9a227)',
              boxShadow: '0 6px 0 #8a6a12, 0 12px 24px #00000055',
            }}
          >
            Battle
          </motion.button>

          <motion.button
            type="button"
            onClick={onOpenRoad}
            whileTap={{ scale: 0.96 }}
            className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl px-1 py-2"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: '0 4px 0 #8a6a12',
            }}
            aria-label="Trophy Road"
          >
            <span className="text-lg font-black text-[#1a1410]">★</span>
            <span className="text-[0.55rem] font-extrabold uppercase text-[#1a1410]/90">
              Road
            </span>
          </motion.button>
        </div>
        <p className="mt-1 text-center text-[0.7rem] font-bold text-white/70">
          vs {botName}
        </p>

        <motion.button
          type="button"
          onClick={onPlayTouchdown}
          whileTap={{ scale: 0.97 }}
          className="mt-2 w-full max-w-md self-center rounded-xl px-4 py-3.5 text-lg font-extrabold uppercase tracking-wider text-white"
          style={{
            background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
            boxShadow: '0 6px 0 #1d4a86, 0 12px 24px #00000044',
          }}
        >
          Touchdown
        </motion.button>

        {/* Chest slots */}
        <section className="mt-4 w-full max-w-md self-center">
          <p className="mb-1.5 text-center text-[0.65rem] font-extrabold uppercase tracking-wide text-white/80">
            Chest slots
          </p>
          <div
            className="grid grid-cols-4 gap-1.5 rounded-2xl p-2"
            style={{
              background: 'linear-gradient(180deg,#2a1a12,#140e0a)',
              boxShadow: 'inset 0 1px 0 #c9a22733, 0 4px 12px #00000055',
            }}
          >
            {slots.map((chest, i) => {
              if (!chest) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="flex aspect-[3/4] flex-col items-center justify-center rounded-xl bg-black/30 text-[0.6rem] font-bold text-white/35 ring-1 ring-dashed ring-white/15"
                  >
                    Empty
                  </div>
                )
              }
              const meta = CHEST_META[chest.rarity]
              const ready = chest.readyAt != null && chest.readyAt <= now
              const unlocking = chest.unlockingStartedAt != null && !ready
              return (
                <motion.button
                  key={chest.id}
                  type="button"
                  onClick={() => onChestTap(chest)}
                  whileTap={{ scale: 0.94 }}
                  animate={ready ? { y: [0, -3, 0] } : undefined}
                  transition={ready ? { duration: 0.7, repeat: Infinity } : undefined}
                  className="relative flex aspect-[3/4] flex-col items-center justify-end rounded-xl px-1 pb-1.5 pt-1 ring-1 ring-white/10"
                  style={{
                    background: ready
                      ? `linear-gradient(180deg, ${meta.color}88, #1a100c)`
                      : '#1a120e',
                    boxShadow: ready
                      ? `0 0 14px ${meta.color}99, 0 3px 0 #00000066`
                      : '0 3px 0 #00000055',
                    outline: unlocking ? `2px solid ${meta.color}` : undefined,
                  }}
                >
                  <ChestArt rarity={chest.rarity} size="sm" bounce={ready} />
                  <span
                    className="mt-0.5 text-[0.55rem] font-extrabold uppercase leading-tight"
                    style={{ color: meta.color }}
                  >
                    {chest.rarity}
                  </span>
                  <span className="text-[0.58rem] font-bold text-white">
                    {ready
                      ? 'Open!'
                      : unlocking
                        ? formatRemain((chest.readyAt ?? 0) - now)
                        : 'Locked'}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </section>

        <section className="mt-3 grid w-full max-w-md grid-cols-3 gap-2 self-center">
          <button
            type="button"
            onClick={onClaimChest}
            disabled={daily.chestClaimed}
            className="rounded-xl px-2 py-2.5 text-left disabled:opacity-55"
            style={{
              background: daily.chestClaimed
                ? '#2a1a12'
                : 'linear-gradient(180deg,#ffe08a,#c9a227)',
              color: daily.chestClaimed ? '#fff6e8' : '#1a1410',
            }}
          >
            <p className="text-[0.6rem] font-extrabold uppercase opacity-80">Daily</p>
            <p className="text-xs font-extrabold">
              {daily.chestClaimed ? 'Claimed' : 'Free chest'}
            </p>
          </button>
          <button
            type="button"
            onClick={onClaimQuest}
            disabled={daily.questClaimed || daily.questProgress < daily.questTarget}
            className="rounded-xl px-2 py-2.5 text-left disabled:opacity-55"
            style={{
              background:
                daily.questClaimed || daily.questProgress < daily.questTarget
                  ? '#2a1a12'
                  : 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
              color: '#fff',
            }}
          >
            <p className="text-[0.6rem] font-extrabold uppercase text-white/75">Quest</p>
            <p className="text-xs font-extrabold leading-tight">{questLabel(daily.questId)}</p>
            <p className="text-[0.65rem] font-bold text-white/80">
              {daily.questClaimed
                ? 'Done'
                : `${daily.questProgress}/${daily.questTarget}`}
            </p>
          </button>
          <button
            type="button"
            onClick={onCrown}
            disabled={profile.crownChest < 10}
            className="rounded-xl px-2 py-2.5 text-left disabled:opacity-55"
            style={{
              background:
                profile.crownChest >= 10
                  ? 'linear-gradient(180deg,#f5d76e,#c9a227)'
                  : '#2a1a12',
              color: profile.crownChest >= 10 ? '#1a1410' : '#fff6e8',
            }}
          >
            <p className="text-[0.6rem] font-extrabold uppercase opacity-80">Crowns</p>
            <p className="text-xs font-extrabold">{profile.crownChest}/10</p>
          </button>
        </section>

        <div className="mt-3 flex w-full max-w-md gap-2 self-center">
          {onOpenEvents ? (
            <button
              type="button"
              onClick={onOpenEvents}
              className="flex-1 rounded-lg py-2 text-xs font-extrabold text-[#f5d76e] ring-1 ring-[#c9a227]/40"
              style={{ background: '#2a1a12' }}
            >
              Events
            </button>
          ) : null}
          {onOpenClub ? (
            <button
              type="button"
              onClick={onOpenClub}
              className="flex-1 rounded-lg py-2 text-xs font-extrabold text-white ring-1 ring-white/15"
              style={{ background: '#2a1a12' }}
            >
              Club
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="flex-1 rounded-lg py-2 text-xs font-extrabold text-[#1a1410]"
            style={{
              background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)',
              boxShadow: '0 3px 0 #1a7a3a',
            }}
          >
            Invite
          </button>
        </div>
      </main>

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Invite friends"
        >
          <div
            className="relative w-full max-w-sm rounded-xl p-4"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: 'inset 0 1px 0 #c9a22744, 0 12px 40px #00000088',
            }}
          >
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#2a1a12] text-lg font-black text-white/80 ring-1 ring-white/20"
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="pr-10 font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              Invite a friend
            </h2>
            <p className="mt-1 text-center text-xs font-semibold text-white/55">
              Your code{' '}
              <span className="font-extrabold text-[#f5d76e]">
                {formatAccountCode(myCode)}
              </span>
            </p>
            {friends.length === 0 ? (
              <p className="mt-4 text-center text-sm font-semibold text-white/60">
                No friends yet — add someone by account code on Social.
              </p>
            ) : (
              <ul className="mt-3 max-h-[50vh] flex flex-col gap-1.5 overflow-y-auto">
                {friends.map((f) => {
                  const online = friendOnline(f)
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        disabled={!online}
                        onClick={() => {
                          setInviteOpen(false)
                          setInviteFriend(f)
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-[#2a1a12] px-3 py-2.5 text-left ring-1 ring-white/10 disabled:opacity-45"
                      >
                        <span className="flex items-center gap-2 font-bold text-white">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              online ? 'bg-[#7dff9a]' : 'bg-white/25'
                            }`}
                            aria-hidden
                          />
                          {f.name}
                        </span>
                        <span
                          className={`text-xs font-extrabold ${
                            online ? 'text-[#7dff9a]' : 'text-white/40'
                          }`}
                        >
                          {online ? 'Invite' : 'Offline'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {inviteFriend ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088',
            }}
          >
            <h2 className="pr-10 font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              Invite {inviteFriend.name}
            </h2>
            <button
              type="button"
              onClick={() => setInviteFriend(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#2a1a12] text-lg font-black text-white/80 ring-1 ring-white/20"
              aria-label="Close"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => void battleFriend(inviteFriend, 'classic')}
              className="mt-3 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
            >
              Classic battle
            </button>
            <button
              type="button"
              onClick={() => void battleFriend(inviteFriend, 'touchdown')}
              className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
            >
              Touchdown
            </button>
            <button
              type="button"
              onClick={() => void battleFriend(inviteFriend, 'draft')}
              className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#9b6bff,#5a2fbf)' }}
            >
              Draft · party
            </button>
            <button
              type="button"
              onClick={() => void battleFriend(inviteFriend, 'undraft')}
              className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#ff7a4a,#bf3f2f)' }}
            >
              Undraft · party
            </button>
            <button
              type="button"
              onClick={() => void battleFriend(inviteFriend, 'infiniteElixir')}
              className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)' }}
            >
              Infinite Elixir · party
            </button>
            <button
              type="button"
              onClick={() => setInviteFriend(null)}
              className="mt-2 w-full rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-white/70 ring-1 ring-white/15"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <p className="rounded-lg bg-black/85 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/40">
            {toast}
          </p>
        </div>
      ) : null}

      <AnimatePresence>
        {inspectChest ? (
          <ChestInspectModal
            chest={inspectChest}
            now={now}
            gold={profile.gold}
            onClose={() => setInspectId(null)}
            onStartUnlock={() => {
              const res = startChestUnlock(inspectChest.id)
              flash(res.message)
              refresh()
              if (res.ok) setInspectId(null)
            }}
            onOpenNow={() => runOpen(inspectChest.id, true)}
            onOpenReady={() => runOpen(inspectChest.id, false)}
          />
        ) : null}
      </AnimatePresence>

      {reveal ? (
        <ChestRevealSequence
          rarity={reveal.rarity}
          loot={reveal.loot}
          onDone={() => {
            setReveal(null)
            refresh()
          }}
        />
      ) : null}
    </div>
  )
}

function TROPHY_PREV(current: number, next: number): number {
  // Approximate previous milestone ~100 below next, clamped
  void current
  return Math.max(0, next - 100)
}
