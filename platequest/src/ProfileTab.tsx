import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { getJurisdiction, JURISDICTIONS, REGION_LABEL, type Region } from './jurisdictions'
import { collectionStats, listAchievements } from './achievements'
import { loadDailyHunt } from './dailyHunt'
import { TownPicker } from './TownPicker'
import type { Place } from './geo'

const NAME_KEY = 'platequest.profileName'

type Props = {
  points: number
  foundCodes: string[]
  lastPlate: string | null
  homeLocation: Place | null
  onHomeLocationChange: (p: Place | null) => void
  onOpenState?: (code: string) => void
}

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

const REGION_ORDER: Region[] = [
  'us-state',
  'canada',
  'mexico',
  'territory',
  'native',
  'military',
  'federal',
]

export function ProfileTab({
  points,
  foundCodes,
  lastPlate,
  homeLocation,
  onHomeLocationChange,
  onOpenState,
}: Props) {
  const [name, setName] = useState(loadName)
  const [draft, setDraft] = useState(name)
  const stats = collectionStats(foundCodes)
  const achievements = listAchievements(foundCodes)
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const hunt = loadDailyHunt()
  const usPct = Math.round((stats.usFound / Math.max(1, stats.usTotal)) * 100)

  useEffect(() => {
    try {
      if (name) localStorage.setItem(NAME_KEY, name)
      else localStorage.removeItem(NAME_KEY)
    } catch {
      /* ignore quota */
    }
  }, [name])

  function saveName(e: FormEvent) {
    e.preventDefault()
    setName(draft.trim())
  }

  const foundSorted = [...foundCodes].sort((a, b) => a.localeCompare(b))

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-8">
      <motion.p
        className="text-xs font-semibold uppercase tracking-[0.2em] text-plate"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Profile
      </motion.p>
      <motion.h1
        className="font-display mt-2 text-4xl text-ink"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {name || 'Traveler'}
      </motion.h1>
      <motion.p
        className="mt-2 max-w-sm text-sm text-fog"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Your spotting score, home base, collection progress, and badges on this device.
      </motion.p>

      <motion.form
        onSubmit={saveName}
        className="mt-6 flex flex-wrap items-end gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">
            Display name
          </span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={32}
            placeholder="Your name"
            className="rounded-sm border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none placeholder:text-fog/60 focus:border-plate"
          />
        </label>
        <button
          type="submit"
          className="rounded-sm bg-plate px-4 py-2.5 text-sm font-semibold text-asphalt hover:bg-plate-hot"
        >
          Save
        </button>
      </motion.form>

      <motion.div
        className="mt-8 border-t border-line pt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">Your location</p>
        <h2 className="font-display mt-1 text-2xl text-ink">Home base</h2>
        <p className="mt-2 max-w-md text-sm text-fog">
          Used for distance on state profiles and to rank Browse by how common plates are near you.
        </p>
        <div className="mt-4">
          <TownPicker
            label="Home town"
            value={homeLocation}
            onPick={onHomeLocationChange}
            placeholder="Search your city or town…"
          />
        </div>
      </motion.div>

      <motion.div
        className="mt-8 grid grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <div className="border-t border-line pt-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">Score</p>
          <p className="mt-1 font-display text-3xl text-plate-hot">{points}</p>
        </div>
        <div className="border-t border-line pt-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">Plates found</p>
          <p className="mt-1 font-display text-3xl text-ink">{foundCodes.length}</p>
        </div>
        <div className="border-t border-line pt-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">US collection</p>
          <p className="mt-1 font-display text-3xl text-ink">
            {stats.usFound}
            <span className="text-lg text-fog">/{stats.usTotal}</span>
          </p>
        </div>
        <div className="border-t border-line pt-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">Hunt streak</p>
          <p className="mt-1 font-display text-3xl text-plate-hot">{hunt.streak}</p>
        </div>
      </motion.div>

      <motion.div
        className="mt-6 border-t border-line pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        <div className="mb-2 flex items-end justify-between gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">
            Collection map
          </p>
          <p className="text-xs text-fog">{usPct}% of US states</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-lane">
          <div className="h-full bg-plate transition-all" style={{ width: `${usPct}%` }} />
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {REGION_ORDER.map((region) => {
            const found = stats.byRegion[region] ?? 0
            const total = JURISDICTIONS.filter((j) => j.region === region).length
            if (!total) return null
            return (
              <li key={region} className="flex items-center justify-between text-sm">
                <span className="text-fog">{REGION_LABEL[region]}</span>
                <span className="font-semibold tabular-nums text-ink">
                  {found}/{total}
                </span>
              </li>
            )
          })}
        </ul>
      </motion.div>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">
          Achievements ({unlockedCount}/{achievements.length})
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {achievements.map((a) => (
            <li
              key={a.id}
              className={`rounded-sm border px-3 py-2.5 ${
                a.unlocked ? 'border-plate/40 bg-plate/5' : 'border-line opacity-55'
              }`}
            >
              <p className="text-sm font-semibold text-ink">{a.title}</p>
              <p className="text-xs text-fog">{a.detail}</p>
            </li>
          ))}
        </ul>
      </motion.div>

      {lastPlate && (
        <p className="mt-8 text-sm text-fog">
          Last spotted: <span className="font-semibold text-ink">{lastPlate}</span>
        </p>
      )}

      {foundSorted.length > 0 && (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.36 }}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">
            Found jurisdictions
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {foundSorted.map((code) => {
              const j = getJurisdiction(code)
              const label = j?.name ?? code
              return (
                <li key={code}>
                  {onOpenState ? (
                    <button
                      type="button"
                      onClick={() => onOpenState(code)}
                      className="rounded-sm border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink underline decoration-plate decoration-2 underline-offset-2 hover:border-plate/50"
                    >
                      {label}
                    </button>
                  ) : (
                    <span className="rounded-sm border border-line px-2.5 py-1 text-xs font-semibold text-ink">
                      {label}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </motion.div>
      )}
    </section>
  )
}
