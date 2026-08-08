import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { loadFriends, type Friend } from './storage'

type Props = {
  onPlay: (opponentName?: string | null) => void
}

export function HomeScreen({ onPlay }: Props) {
  const friends = useMemo(() => loadFriends(), [])
  const [inviteOpen, setInviteOpen] = useState(false)
  const online = friends.filter((f) => f.online)

  function invite(friend: Friend) {
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
            radial-gradient(ellipse 100% 60% at 50% 0%, #4a9a68 0%, transparent 55%),
            linear-gradient(180deg, #2a6fbf 0%, #1a4a7a 28%, #2f6b49 58%, #1a3d2e 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[8%] top-[12%] bottom-[38%] rounded-[1.25rem] opacity-40"
        style={{
          background:
            'linear-gradient(180deg,#5bb86a,#3f8f4a), repeating-linear-gradient(90deg,transparent 0 16px,#00000018 16px 32px)',
          boxShadow: '0 0 0 6px #5a3a22',
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            aria-hidden
            animate={{ y: [0, -5, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-4 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(180deg,#f5d76e,#c9a227)',
              boxShadow: '0 6px 0 #8a6a12, 0 12px 24px #00000055',
            }}
          >
            <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden>
              <path d="M32 8l7 12h14l-11 9 4 14-14-9-14 9 4-14-11-9h14z" fill="#1a1410" />
            </svg>
          </motion.div>

          <h1
            className="font-[family-name:var(--font-display)] text-[clamp(2.8rem,11vw,4.8rem)] leading-[0.95] tracking-wide text-[#f5d76e]"
            style={{ textShadow: '0 4px 0 #8a6a12, 0 10px 24px #00000066' }}
          >
            Phil Royale
          </h1>
          <p className="mt-3 max-w-[17rem] text-sm font-bold leading-snug text-white/85">
            Classic arena. Build your deck, invite friends, join a club — deploy Phil.
          </p>
        </motion.div>

        <motion.button
          type="button"
          onClick={() => onPlay(null)}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          className="mt-8 min-w-[13rem] rounded-xl px-10 py-3.5 text-xl font-extrabold uppercase tracking-wider text-[#1a1410]"
          style={{
            background: 'linear-gradient(180deg,#ffe08a,#f5d76e 40%,#c9a227)',
            boxShadow: '0 6px 0 #8a6a12, 0 14px 28px #00000055',
          }}
        >
          Play
        </motion.button>

        <motion.button
          type="button"
          onClick={() => setInviteOpen((v) => !v)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 rounded-lg px-5 py-2.5 text-sm font-extrabold text-white"
          style={{
            background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
            boxShadow: '0 4px 0 #1d4a86',
          }}
        >
          Invite friend to match
        </motion.button>

        {inviteOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 w-full max-w-sm rounded-xl p-3"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: 'inset 0 1px 0 #c9a22744, 0 8px 20px #00000066',
            }}
          >
            <p className="mb-2 text-center text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/90">
              Online friends
            </p>
            {online.length === 0 ? (
              <p className="text-center text-sm font-semibold text-white/60">No friends online.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {online.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => invite(f)}
                      className="flex w-full items-center justify-between rounded-lg bg-[#2a1a12] px-3 py-2 text-left ring-1 ring-white/10"
                    >
                      <span className="font-bold text-white">{f.name}</span>
                      <span className="text-xs font-extrabold text-[#7dff9a]">Battle</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : null}
      </main>
    </div>
  )
}
