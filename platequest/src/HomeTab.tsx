import { motion } from 'framer-motion'

type Props = {
  onOpenCamera: () => void
  onOpenGames: () => void
  lastPlate?: string | null
  points: number
}

export function HomeTab({ onOpenCamera, onOpenGames, lastPlate, points }: Props) {
  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex flex-1 flex-col justify-end px-5 pb-8 pt-10">
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          aria-hidden
        >
          <div className="absolute left-[-10%] top-[18%] h-40 w-[120%] rotate-[-2deg] bg-gradient-to-r from-transparent via-lane/80 to-transparent" />
          <div className="absolute left-[8%] top-[42%] h-1.5 w-16 bg-plate/90" />
          <div className="absolute left-[32%] top-[42%] h-1.5 w-16 bg-plate/90" />
          <div className="absolute left-[56%] top-[42%] h-1.5 w-16 bg-plate/90" />
          <div className="absolute left-[80%] top-[42%] h-1.5 w-16 bg-plate/50" />
        </motion.div>

        <motion.p
          className="font-display text-[clamp(3.2rem,14vw,5.5rem)] leading-[0.9] text-plate"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          PlateQuest
        </motion.p>
        <motion.p
          className="mt-4 max-w-sm text-base text-chrome/90"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          Spot plates. Identify them. Chase points on the road.
        </motion.p>
        <motion.div
          className="mt-7 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.45 }}
        >
          <button
            type="button"
            onClick={onOpenCamera}
            className="rounded-sm bg-plate px-5 py-3 font-semibold text-asphalt hover:bg-plate-hot"
          >
            Open camera
          </button>
          <button
            type="button"
            onClick={onOpenGames}
            className="rounded-sm border border-chrome/30 px-5 py-3 font-medium text-chrome hover:border-plate/50 hover:text-plate"
          >
            Play games
          </button>
        </motion.div>

        <motion.div
          className="mt-8 flex gap-6 text-sm text-fog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <p>
            Score <span className="font-semibold text-chrome">{points}</span>
          </p>
          {lastPlate && (
            <p>
              Last read <span className="font-semibold tracking-wider text-plate">{lastPlate}</span>
            </p>
          )}
        </motion.div>
      </div>
    </section>
  )
}
