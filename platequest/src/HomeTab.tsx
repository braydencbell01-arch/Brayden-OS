import { motion } from 'framer-motion'
import type { Region } from './jurisdictions'
import { JURISDICTIONS, REGION_LABEL } from './jurisdictions'

type Props = {
  onOpenCamera: () => void
  onOpenGames: () => void
  onOpenStates: () => void
  lastPlate?: string | null
  points: number
}

const REAR_ONLY = JURISDICTIONS.filter((j) => j.plateMount === 'rear').length
const BOTH = JURISDICTIONS.filter((j) => j.plateMount === 'both').length

const REGION_COUNTS: { region: Region; count: number }[] = (
  ['us-state', 'canada', 'mexico', 'territory', 'native', 'military', 'federal'] as Region[]
).map((region) => ({
  region,
  count: JURISDICTIONS.filter((j) => j.region === region).length,
}))

export function HomeTab({ onOpenCamera, onOpenGames, onOpenStates, lastPlate, points }: Props) {
  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="relative flex flex-col px-5 pb-8 pt-10">
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          aria-hidden
        >
          <div className="absolute left-[-10%] top-[12%] h-32 w-[120%] rotate-[-2deg] bg-gradient-to-r from-transparent via-lane/90 to-transparent" />
          <div className="absolute left-[8%] top-[28%] h-1.5 w-16 bg-plate/90" />
          <div className="absolute left-[32%] top-[28%] h-1.5 w-16 bg-plate/90" />
          <div className="absolute left-[56%] top-[28%] h-1.5 w-16 bg-plate/90" />
          <div className="absolute left-[80%] top-[28%] h-1.5 w-16 bg-plate/50" />
        </motion.div>

        <motion.p
          className="font-display text-[clamp(3.2rem,14vw,5.5rem)] leading-[0.9] text-plate-hot"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          PlateQuest
        </motion.p>
        <motion.p
          className="mt-4 max-w-sm text-base text-ink/85"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          Spot US, Canadian, Mexican, tribal, military, and territory plates — with real photos from World License Plates.
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
            onClick={onOpenStates}
            className="rounded-sm border border-line px-5 py-3 font-medium text-ink hover:border-plate/50 hover:text-plate-hot"
          >
            Browse plates
          </button>
          <button
            type="button"
            onClick={onOpenGames}
            className="rounded-sm border border-line px-5 py-3 font-medium text-ink hover:border-plate/50 hover:text-plate-hot"
          >
            Play games
          </button>
        </motion.div>

        <motion.div
          className="mt-8 flex gap-6 text-sm text-fog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p>
            Score <span className="font-semibold text-ink">{points}</span>
          </p>
          {lastPlate && (
            <p>
              Last read <span className="font-semibold tracking-wider text-plate-hot">{lastPlate}</span>
            </p>
          )}
        </motion.div>

        <motion.div
          className="mt-10 border-t border-line pt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">What you can spot</p>
          <h2 className="font-display mt-1 text-2xl text-ink">Plate library</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REGION_COUNTS.map(({ region, count }) => (
              <li key={region}>
                <button
                  type="button"
                  onClick={onOpenStates}
                  className="w-full rounded-sm border border-line bg-paper px-3 py-3 text-left transition hover:border-plate/50"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-fog">{REGION_LABEL[region]}</p>
                  <p className="mt-1 font-display text-xl text-plate-hot">{count}</p>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="mt-8 border-t border-line pt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">In the USA</p>
          <h2 className="font-display mt-1 text-2xl text-ink">Front & rear rules</h2>
          <p className="mt-2 max-w-md text-sm text-fog">
            From World License Plates’ US requirements map — which states need one plate vs two.
          </p>
          <div className="mt-4 overflow-hidden rounded-sm border border-line bg-paper">
            <img
              src="./plates/US_front_rear_requirements.gif"
              alt="US map of front and rear license plate requirements"
              className="w-full"
              loading="lazy"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-sm border border-line bg-asphalt-lift px-3 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-fog">One plate (rear)</p>
              <p className="mt-1 font-display text-2xl text-plate-hot">{REAR_ONLY}</p>
              <p className="mt-1 text-xs text-fog">states / DC on the map</p>
            </div>
            <div className="rounded-sm border border-line bg-asphalt-lift px-3 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-fog">Two plates</p>
              <p className="mt-1 font-display text-2xl text-plate-hot">{BOTH}</p>
              <p className="mt-1 text-xs text-fog">front and rear required</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-fog">
            Map credit:{' '}
            <a
              href="http://www.worldlicenseplates.com/usa/US_USAX.html#RQ"
              target="_blank"
              rel="noreferrer"
              className="text-plate-hot underline-offset-2 hover:underline"
            >
              World License Plates
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
