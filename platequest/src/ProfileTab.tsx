import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { getJurisdiction } from './jurisdictions'

const NAME_KEY = 'platequest.profileName'

type Props = {
  points: number
  foundCodes: string[]
  lastPlate: string | null
}

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function ProfileTab({ points, foundCodes, lastPlate }: Props) {
  const [name, setName] = useState(loadName)
  const [draft, setDraft] = useState(name)

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
        Your spotting score and plates logged on this device.
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
      </motion.div>

      {lastPlate && (
        <motion.div
          className="mt-6 border-t border-line pt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">
            Last plate read
          </p>
          <p className="mt-1 font-semibold text-plate-hot">{lastPlate}</p>
        </motion.div>
      )}

      <motion.div
        className="mt-8 border-t border-line pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.32 }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-fog">Found list</h2>
        {foundSorted.length === 0 ? (
          <p className="mt-3 text-sm text-fog">No plates logged yet — open Camera on the road.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {foundSorted.map((code) => {
              const j = getJurisdiction(code)
              return (
                <li
                  key={code}
                  className="rounded-sm border border-line px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink"
                  title={j?.name ?? code}
                >
                  {code}
                </li>
              )
            })}
          </ul>
        )}
      </motion.div>
    </section>
  )
}
