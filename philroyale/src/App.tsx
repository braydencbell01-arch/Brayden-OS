import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BattleScreen } from './BattleScreen'
import { HomeScreen } from './HomeScreen'

type Screen = 'home' | 'battle'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  return (
    <div className="h-full min-h-0">
      <AnimatePresence mode="wait">
        {screen === 'home' ? (
          <motion.div
            key="home"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            <HomeScreen onPlay={() => setScreen('battle')} />
          </motion.div>
        ) : (
          <motion.div
            key="battle"
            className="h-full"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.22 }}
          >
            <BattleScreen onExit={() => setScreen('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
