import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { friendInviteUrl, loadFriends, shareText, type Friend } from './storage'

type Props = {
  onPlay: (opponentName?: string | null) => void
}

export function HomeScreen({ onPlay }: Props) {
  const friends = useMemo(() => loadFriends(), [])
  const [inviteOpen, setInviteOpen] = useState(false)

  async function textInvite() {
    await shareText(
      'Phil Royale',
      'Play Phil Royale with me — open this link to friend me, then we can battle:',
      friendInviteUrl('friend'),
    )
  }

  function battleFriend(friend: Friend) {
    setInviteOpen(false)
    onPlay(friend.name)
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

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <h1
            className="font-[family-name:var(--font-display)] text-[clamp(2.8rem,11vw,4.8rem)] leading-[0.95] tracking-wide text-[#f5d76e]"
            style={{ textShadow: '0 4px 0 #8a6a12, 0 10px 24px #00000066' }}
          >
            Phil Royale
          </h1>
          <p className="mt-3 max-w-[17rem] text-sm font-bold leading-snug text-white/85">
            Clash-style arena. Phil, Pete, Finley, Jeremy, and more.
          </p>
        </motion.div>

        <motion.button
          type="button"
          onClick={() => onPlay(null)}
          whileTap={{ scale: 0.97 }}
          className="mt-8 min-w-[13rem] rounded-xl px-10 py-3.5 text-xl font-extrabold uppercase tracking-wider text-[#1a1410]"
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
          className="mt-3 rounded-lg px-5 py-2.5 text-sm font-extrabold text-white"
          style={{
            background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
            boxShadow: '0 4px 0 #1d4a86',
          }}
        >
          Invite friend to match
        </button>

        {inviteOpen ? (
          <div
            className="mt-3 w-full max-w-sm rounded-xl p-3"
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
                      onClick={() => battleFriend(f)}
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
    </div>
  )
}
