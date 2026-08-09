import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BattleCard } from './BattleCard'
import { getCharacter } from './characters'
import {
  ARENA_COLORS,
  CHEST_META,
  botNameForTrophies,
  nextRoadStep,
} from './progression'
import {
  arenaTitle,
  claimCrownChest,
  claimDailyChest,
  claimDailyQuest,
  countUnclaimedRoadRewards,
  friendInviteUrl,
  loadChests,
  loadDaily,
  loadDeck,
  loadFriends,
  loadPlayerName,
  loadProfile,
  openChestNow,
  questLabel,
  savePlayerName,
  shareText,
  startChestUnlock,
  type DailyState,
  type Friend,
  type OwnedChest,
  type PlayerProfile,
} from './storage'

type Props = {
  onPlay: (opponentName?: string | null) => void
  onRequestBattle: (friendName: string) => Promise<void>
  onOpenRoad: () => void
}

function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`
}

export function HomeScreen({ onPlay, onRequestBattle, onOpenRoad }: Props) {
  const friends = useMemo(() => loadFriends(), [])
  const deck = useMemo(() => loadDeck(), [])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const [daily, setDaily] = useState<DailyState>(() => loadDaily())
  const [chests, setChests] = useState<OwnedChest[]>(() => loadChests())
  const [now, setNow] = useState(() => Date.now())
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

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

  async function textInvite() {
    await shareText(
      'Phil Royale',
      'Play Phil Royale with me — open this link to friend me, then we can battle:',
      friendInviteUrl(playerName.trim() || 'friend'),
    )
  }

  async function battleFriend(friend: Friend) {
    setInviteOpen(false)
    await onRequestBattle(friend.name)
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
    const ready = chest.readyAt != null && chest.readyAt <= now
    if (ready) {
      const res = openChestNow(chest.id, false)
      flash(res.message)
      refresh()
      return
    }
    if (chest.unlockingStartedAt == null) {
      const res = startChestUnlock(chest.id)
      flash(res.message)
      refresh()
      return
    }
    const res = openChestNow(chest.id, true)
    flash(res.message)
    refresh()
  }

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
          className="mt-3 w-full max-w-md self-center rounded-xl p-3"
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
            {arenaTitle(profile.trophies)} · {profile.wins}W / {profile.losses}L
          </p>
        </section>

        {/* Big clickable Trophy Road entry — CR style */}
        <motion.button
          type="button"
          onClick={onOpenRoad}
          whileTap={{ scale: 0.98 }}
          className="relative mt-3 w-full max-w-md self-center overflow-hidden rounded-2xl px-3 py-3 text-left"
          style={{
            background: `linear-gradient(135deg, ${arenaColors.sky}, ${arenaColors.ground})`,
            boxShadow: '0 6px 0 #00000055, inset 0 1px 0 #ffffff33',
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
            Tap to scroll the path · claim chests, gold & cards
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/20">
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

        {/* Chest slots */}
        <section className="mt-3 w-full max-w-md self-center">
          <p className="mb-1.5 text-center text-[0.65rem] font-extrabold uppercase tracking-wide text-white/80">
            Chest slots
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {slots.map((chest, i) => {
              if (!chest) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="flex aspect-square flex-col items-center justify-center rounded-xl bg-black/25 text-[0.6rem] font-bold text-white/40 ring-1 ring-white/10"
                  >
                    Empty
                  </div>
                )
              }
              const meta = CHEST_META[chest.rarity]
              const ready = chest.readyAt != null && chest.readyAt <= now
              const unlocking = chest.unlockingStartedAt != null && !ready
              return (
                <button
                  key={chest.id}
                  type="button"
                  onClick={() => onChestTap(chest)}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl px-1 text-center"
                  style={{
                    background: `linear-gradient(180deg, ${meta.color}, #2a1a12)`,
                    boxShadow: '0 3px 0 #00000055',
                  }}
                >
                  <span className="text-[0.55rem] font-extrabold uppercase leading-tight text-[#1a1410]">
                    {chest.rarity}
                  </span>
                  <span className="mt-0.5 text-[0.6rem] font-bold text-white">
                    {ready
                      ? 'Open!'
                      : unlocking
                        ? formatRemain((chest.readyAt ?? 0) - now)
                        : 'Start'}
                  </span>
                  {unlocking ? (
                    <span className="text-[0.5rem] font-bold text-white/80">
                      or {meta.openNowGold}g
                    </span>
                  ) : null}
                </button>
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
          1v1 vs bot · {botName}
        </p>

        <button
          type="button"
          onClick={() => setInviteOpen((v) => !v)}
          className="mt-3 self-center rounded-lg px-5 py-2.5 text-sm font-extrabold text-white"
          style={{
            background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
            boxShadow: '0 4px 0 #1d4a86',
          }}
        >
          Invite friend to match
        </button>

        {inviteOpen ? (
          <div
            className="mt-3 w-full max-w-sm self-center rounded-xl p-3"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: 'inset 0 1px 0 #c9a22744, 0 8px 20px #00000066',
            }}
          >
            <button
              type="button"
              onClick={() => void textInvite()}
              className="mb-2 w-full rounded-lg py-2.5 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
            >
              Text invite link
            </button>
            {friends.length === 0 ? (
              <p className="text-center text-sm font-semibold text-white/60">
                No friends yet — send a text invite first.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {friends.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => void battleFriend(f)}
                      className="flex w-full items-center justify-between rounded-lg bg-[#2a1a12] px-3 py-2 text-left ring-1 ring-white/10"
                    >
                      <span className="font-bold text-white">{f.name}</span>
                      <span className="text-xs font-extrabold text-[#7dff9a]">Battle</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </main>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <p className="rounded-lg bg-black/85 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/40">
            {toast}
          </p>
        </div>
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
