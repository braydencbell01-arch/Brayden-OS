import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BattleScreen } from './BattleScreen'
import { CharactersScreen } from './CharactersScreen'
import { FriendsScreen } from './FriendsScreen'
import { HomeScreen } from './HomeScreen'

type TabId = 'home' | 'characters' | 'friends'

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'characters', label: 'Cards' },
  { id: 'friends', label: 'Friends' },
]

export default function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [battle, setBattle] = useState(false)
  const [opponent, setOpponent] = useState<string | null>(null)

  function startMatch(name?: string | null) {
    setOpponent(name ?? null)
    setBattle(true)
  }

  if (battle) {
    return (
      <BattleScreen
        opponentName={opponent}
        onExit={() => {
          setBattle(false)
          setOpponent(null)
          setTab('home')
        }}
      />
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
            {tab === 'home' ? <HomeScreen onPlay={startMatch} /> : null}
            {tab === 'characters' ? <CharactersScreen /> : null}
            {tab === 'friends' ? <FriendsScreen /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav
        className="shrink-0 border-t border-[#c9a227]/30 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5"
        style={{ background: 'linear-gradient(180deg,#3a2418,#1a100c)' }}
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-md gap-1">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <li key={t.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="flex w-full flex-col items-center rounded-lg py-2 text-xs font-extrabold uppercase tracking-wide"
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
    </div>
  )
}
