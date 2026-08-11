import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BattleCard } from './BattleCard'
import {
  ChestArt,
  ChestInspectModal,
  ChestRevealSequence,
  type ChestLoot,
} from './ChestOpen'
import { getCharacter } from './characters'
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
  kingInfo,
  loadAccountCode,
  loadChests,
  loadDaily,
  loadDeck,
  loadFriends,
  loadPlayerName,
  loadProfile,
  loadRichClub,
  loadSeason,
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

type Props = {
  onPlay: (opponentName?: string | null) => void
  onPlayTouchdown: () => void
  onRequestBattle: (
    friendName: string,
    opts?: { mode?: GameMode; playerId?: string },
  ) => Promise<void>
  onOpenRoad: () => void
  onOpenEvents: () => void
  onOpenClub: () => void
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
  friendPresence = {},
}: Props) {
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends())
  const deck = useMemo(() => loadDeck(), [])
  const club = useMemo(() => loadRichClub(), [])
  const season = useMemo(() => loadSeason(), [])
  const king = useMemo(() => kingInfo(), [])
  const myCode = useMemo(() => loadAccountCode(), [])
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
  const arenaColors = ARENA_COLORS[arenaTitle(profile.trophies)] ?? ARENA_COLORS['Goblin Boot']!
  const roadProgress = nextStep
    ? Math.max(
        0,
        Math.min(
          1,
          (profile.trophies - (nextStep.trophies > 0 ? Math.max(0, nextStep.trophies - 100) : 0)) /
            Math.max(1, nextStep.trophies - Math.max(0, nextStep.trophies - 100)),
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
    // CR: tap slot → inspect modal (never instant-open from the dock)
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
      loot: { gold: res.gold, cards: res.cards },
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
            radial-gradient(ellipse 100% 55% at 50% 0%, #4caf50 0%, transparent 55%),
            linear-gradient(180deg, #2b8fd4 0%, #1a4a7a 28%, #3f8f4a 58%, #2d5a32 100%)
          `,
        }}
      />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <h1
            className="font-[family-name:var(--font-display)] text-[clamp(2.2rem,9vw,3.8rem)] leading-[0.95] tracking-wide text-[#f5d76e]"
            style={{ textShadow: '0 4px 0 #8a6a12, 0 10px 24px #00000066' }}
          >
            Phil Royale
          </h1>
        </motion.div>

        {/* King banner */}
        <section
          className="mt-3 w-full max-w-md shrink-0 self-center rounded-xl p-3"
          style={{
            background: 'linear-gradient(180deg,#3a2418,#1a100c)',
            boxShadow: 'inset 0 1px 0 #c9a22744, 0 8px 20px #00000055',
          }}
        >
          <label className="block text-left text-[0.65rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
            King
            <input
              value={playerName}
              onChange={(e) => persistName(e.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-lg bg-[#140e0a] px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
            />
          </label>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            <StatChip label="Trophies" value={String(profile.trophies)} />
            <StatChip label="Gold" value={String(profile.gold)} />
            <StatChip label="Gems" value={String(profile.gems)} />
            <StatChip label="Streak" value={`${profile.winStreak}W`} />
          </div>
          <p className="mt-2 text-center text-xs font-extrabold uppercase tracking-wide text-white/70">
            King Lv {king.level} · {king.into}/{king.need} XP · {arenaTitle(profile.trophies)}
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((king.into / Math.max(1, king.need)) * 100)}%`,
                background: 'linear-gradient(90deg,#7dff9a,#4a9eff)',
              }}
            />
          </div>
        </section>

        <div className="mt-3 grid w-full max-w-md shrink-0 grid-cols-2 gap-2 self-center">
          <motion.button
            type="button"
            onClick={onOpenEvents}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl px-3 py-2.5 text-left"
            style={{ background: 'linear-gradient(180deg,#5a3a9a,#2a1848)' }}
          >
            <p className="font-[family-name:var(--font-display)] text-lg text-[#f5d76e]">
              Events
            </p>
            <p className="text-[0.65rem] font-bold text-white/80">
              Season {season.seasonId} · {season.points} pts
            </p>
          </motion.button>
          <motion.button
            type="button"
            onClick={onOpenClub}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl px-3 py-2.5 text-left"
            style={{ background: 'linear-gradient(180deg,#2f6fbf,#1d4a86)' }}
          >
            <p className="font-[family-name:var(--font-display)] text-lg text-[#f5d76e]">
              Club
            </p>
            <p className="text-[0.65rem] font-bold text-white/80">
              {club ? `${club.name} · ${club.chestCrowns} crowns` : 'Join or create'}
            </p>
          </motion.button>
        </div>

        {/* Big clickable Trophy Road entry — CR style (opens full road; no Road tab) */}
        <motion.button
          type="button"
          onClick={onOpenRoad}
          whileTap={{ scale: 0.98 }}
          className="relative mt-3 w-full max-w-md shrink-0 self-center overflow-hidden rounded-2xl px-3 py-3.5 text-left"
          style={{
            background: `linear-gradient(135deg, ${arenaColors.sky}, ${arenaColors.ground})`,
            boxShadow: '0 6px 0 #00000055, inset 0 1px 0 #ffffff33',
            minHeight: '5.5rem',
          }}
        >
          {unclaimed > 0 ? (
            <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ff3b3b] px-1.5 text-xs font-black text-white shadow">
              {unclaimed}
            </span>
          ) : null}
          <p className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[#f5d76e]">
            Trophy Road
          </p>
          <p className="text-xs font-bold text-white/90">
            Tap to open · claim chests, gold & cards
          </p>
          <div className="mt-2 h-2.5 shrink-0 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/20">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(roadProgress * 100)}%`,
                background: 'linear-gradient(90deg,#ffe08a,#f5d76e)',
              }}
            />
          </div>
          <p className="mt-1 text-[0.7rem] font-extrabold text-white">
            {profile.trophies} trophies
            {nextStep
              ? ` · next reward at ${nextStep.trophies} (${nextStep.label})`
              : ' · road complete!'}
          </p>
        </motion.button>

        {/* Chest slots — CR dock */}
        <section className="mt-3 w-full max-w-md self-center">
          <p className="mb-1.5 text-center text-[0.65rem] font-extrabold uppercase tracking-wide text-white/80">
            Chest slots · tap a chest
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
            <p className="text-[0.6rem] font-bold opacity-80">Claim rare</p>
          </button>
        </section>

        <section
          className="mt-3 w-full max-w-md self-center rounded-xl p-2"
          style={{
            background: 'linear-gradient(180deg,#3a2418,#1f140e)',
            boxShadow: 'inset 0 1px 0 #c9a22744',
          }}
        >
          <p className="mb-1.5 text-center text-[0.65rem] font-extrabold uppercase tracking-wider text-[#f5d76e]/85">
            Battle deck
          </p>
          <div className="grid grid-cols-8 gap-1">
            {deck.map((id) => (
              <BattleCard key={id} character={getCharacter(id) ?? null} />
            ))}
          </div>
        </section>

        <motion.button
          type="button"
          onClick={() => onPlay(botName)}
          whileTap={{ scale: 0.97 }}
          className="mt-4 min-w-[14rem] self-center rounded-xl px-10 py-3.5 text-xl font-extrabold uppercase tracking-wider text-[#1a1410]"
          style={{
            background: 'linear-gradient(180deg,#ffe08a,#f5d76e 40%,#c9a227)',
            boxShadow: '0 6px 0 #8a6a12, 0 14px 28px #00000055',
          }}
        >
          Battle
        </motion.button>
        <p className="mt-1 text-center text-xs font-bold text-white/75">
          Classic 1v1 vs bot · {botName}
        </p>

        <button
          type="button"
          onClick={onPlayTouchdown}
          className="mt-2 self-center rounded-lg px-6 py-2.5 text-sm font-extrabold text-white"
          style={{
            background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
            boxShadow: '0 4px 0 #1d4a86',
          }}
        >
          Touchdown mode
        </button>

        <button
          type="button"
          onClick={() => setInviteOpen((v) => !v)}
          className="mt-3 self-center rounded-lg px-5 py-2.5 text-sm font-extrabold text-[#1a1410]"
          style={{
            background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)',
            boxShadow: '0 4px 0 #1a7a3a',
          }}
        >
          Invite a friend
        </button>

        {inviteOpen ? (
          <div
            className="mt-3 w-full max-w-sm self-center rounded-xl p-3"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: 'inset 0 1px 0 #c9a22744, 0 8px 20px #00000066',
            }}
          >
            <p className="mb-2 text-center text-xs font-semibold text-white/55">
              Your code{' '}
              <span className="font-extrabold text-[#f5d76e]">
                {formatAccountCode(myCode)}
              </span>
              {' · '}
              they need Phil Royale open to Accept (share sheet also sends a battle link).
            </p>
            {friends.length === 0 ? (
              <p className="text-center text-sm font-semibold text-white/60">
                No friends yet — add someone by account code on Social.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {friends.map((f) => {
                  const online = friendOnline(f)
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        disabled={!online}
                        onClick={() => setInviteFriend(f)}
                        className="flex w-full items-center justify-between rounded-lg bg-[#2a1a12] px-3 py-2 text-left ring-1 ring-white/10 disabled:opacity-45"
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
        ) : null}
      </main>

      {inviteFriend ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088',
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              Invite {inviteFriend.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/80">Pick a mode:</p>
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

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#140e0a] px-1.5 py-1.5 ring-1 ring-white/10">
      <p className="text-[0.55rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/75">
        {label}
      </p>
      <p className="text-sm font-extrabold text-white">{value}</p>
    </div>
  )
}
