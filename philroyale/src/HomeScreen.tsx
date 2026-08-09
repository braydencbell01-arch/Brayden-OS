import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BattleCard } from './BattleCard'
import { getCharacter } from './characters'
import {
  arenaTitle,
  claimDailyChest,
  claimDailyQuest,
  friendInviteUrl,
  loadDaily,
  loadDeck,
  loadFriends,
  loadPlayerName,
  loadProfile,
  questLabel,
  savePlayerName,
  shareText,
  type DailyState,
  type Friend,
  type PlayerProfile,
} from './storage'

type Props = {
  onPlay: (opponentName?: string | null) => void
  onRequestBattle: (friendName: string) => Promise<void>
}

export function HomeScreen({ onPlay, onRequestBattle }: Props) {
  const friends = useMemo(() => loadFriends(), [])
  const deck = useMemo(() => loadDeck(), [])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const [daily, setDaily] = useState<DailyState>(() => loadDaily())
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
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
    if (res.ok) {
      setDaily(loadDaily())
      setProfile(loadProfile())
    }
  }

  function onClaimQuest() {
    const res = claimDailyQuest()
    flash(res.message)
    if (res.ok) {
      setDaily(loadDaily())
      setProfile(loadProfile())
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 0%, #4caf50 0%, transparent 55%),
            linear-gradient(180deg, #2b8fd4 0%, #1a4a7a 28%, #3f8f4a 58%, #2d5a32 100%)
          `,
        }}
      />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <h1
            className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,10vw,4.2rem)] leading-[0.95] tracking-wide text-[#f5d76e]"
            style={{ textShadow: '0 4px 0 #8a6a12, 0 10px 24px #00000066' }}
          >
            Phil Royale
          </h1>
          <p className="mt-2 max-w-[18rem] text-sm font-bold leading-snug text-white/85">
            Clash-style arena. Build a deck, climb trophies, battle friends.
          </p>
        </motion.div>

        <section
          className="mt-4 w-full max-w-md self-center rounded-xl p-3"
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
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <StatChip label="Trophies" value={String(profile.trophies)} />
            <StatChip label="Gold" value={String(profile.gold)} />
            <StatChip label="Streak" value={`${profile.winStreak}W`} />
          </div>
          <p className="mt-2 text-center text-xs font-extrabold uppercase tracking-wide text-white/70">
            {arenaTitle(profile.trophies)} · {profile.wins}W / {profile.losses}L / {profile.draws}D
          </p>
        </section>

        <section className="mt-3 grid w-full max-w-md grid-cols-2 gap-2 self-center">
          <button
            type="button"
            onClick={onClaimChest}
            disabled={daily.chestClaimed}
            className="rounded-xl px-3 py-3 text-left disabled:opacity-55"
            style={{
              background: daily.chestClaimed
                ? '#2a1a12'
                : 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: daily.chestClaimed ? 'none' : '0 4px 0 #8a6a12',
              color: daily.chestClaimed ? '#fff6e8' : '#1a1410',
            }}
          >
            <p className="text-[0.65rem] font-extrabold uppercase tracking-wide opacity-80">
              Daily chest
            </p>
            <p className="text-sm font-extrabold">
              {daily.chestClaimed ? 'Claimed' : 'Open free chest'}
            </p>
          </button>
          <button
            type="button"
            onClick={onClaimQuest}
            disabled={daily.questClaimed || daily.questProgress < daily.questTarget}
            className="rounded-xl px-3 py-3 text-left disabled:opacity-55"
            style={{
              background:
                daily.questClaimed || daily.questProgress < daily.questTarget
                  ? '#2a1a12'
                  : 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
              boxShadow:
                daily.questClaimed || daily.questProgress < daily.questTarget
                  ? 'none'
                  : '0 4px 0 #1d4a86',
              color: '#fff',
            }}
          >
            <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-white/75">
              Daily quest
            </p>
            <p className="text-sm font-extrabold">{questLabel(daily.questId)}</p>
            <p className="text-[0.7rem] font-bold text-white/80">
              {daily.questClaimed
                ? 'Done'
                : `${daily.questProgress}/${daily.questTarget}`}
            </p>
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
          onClick={() => onPlay(null)}
          whileTap={{ scale: 0.97 }}
          className="mt-5 min-w-[13rem] self-center rounded-xl px-10 py-3.5 text-xl font-extrabold uppercase tracking-wider text-[#1a1410]"
          style={{
            background: 'linear-gradient(180deg,#ffe08a,#f5d76e 40%,#c9a227)',
            boxShadow: '0 6px 0 #8a6a12, 0 14px 28px #00000055',
          }}
        >
          Play
        </motion.button>

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
            <p className="mb-2 text-center text-xs font-semibold text-white/55">
              Or battle someone who already joined:
            </p>
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
    <div className="rounded-lg bg-[#140e0a] px-2 py-2 ring-1 ring-white/10">
      <p className="text-[0.6rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/75">
        {label}
      </p>
      <p className="text-base font-extrabold text-white">{value}</p>
    </div>
  )
}
