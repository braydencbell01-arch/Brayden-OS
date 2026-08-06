import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { JURISDICTIONS, rarityLabel, type Jurisdiction } from './jurisdictions'

type Props = {
  points: number
  onScore: (delta: number, code: string) => void
  foundCodes: string[]
}

function pickTargets(count: number): Jurisdiction[] {
  const shuffled = [...JURISDICTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const POINTS: Record<Jurisdiction['rarity'], number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  'very-rare': 100,
}

export function GamesTab({ points, onScore, foundCodes }: Props) {
  const [targets] = useState(() => pickTargets(6))
  const foundSet = useMemo(() => new Set(foundCodes), [foundCodes])

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">Games</p>
        <h1 className="font-display mt-1 text-3xl text-chrome">Plate hunt</h1>
        <p className="mt-1 max-w-md text-sm text-fog">
          Spot these plates in the wild (or scan them in Camera). Rarer plates are worth more points.
        </p>
      </header>

      <div className="plate-face flex items-center justify-between rounded-sm px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Your score</p>
          <p className="font-display text-3xl">{points}</p>
        </div>
        <p className="max-w-[12rem] text-right text-xs opacity-80">
          Found {foundCodes.length} unique jurisdiction{foundCodes.length === 1 ? '' : 's'}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {targets.map((j, i) => {
          const found = foundSet.has(j.code)
          const pts = POINTS[j.rarity]
          return (
            <motion.li
              key={j.code}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-sm border px-4 py-3 ${
                found
                  ? 'border-plate/50 bg-plate/10'
                  : 'border-white/10 bg-asphalt-lift'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl text-chrome">
                    {j.code} · {j.name}
                  </p>
                  <p className="mt-1 text-sm text-fog">{rarityLabel(j.rarity)}</p>
                  <p className="mt-1 text-sm text-chrome/80">{j.notes}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-plate">+{pts}</p>
                  {found ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-plate">Found</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onScore(pts, j.code)}
                      className="mt-2 rounded-sm border border-chrome/25 px-2 py-1 text-xs text-chrome hover:border-plate/60 hover:text-plate"
                    >
                      Log spot
                    </button>
                  )}
                </div>
              </div>
            </motion.li>
          )
        })}
      </ul>

      <p className="text-xs text-fog">
        More games coming — regional rarity maps, streak challenges, and multiplayer hunts.
      </p>
    </section>
  )
}
