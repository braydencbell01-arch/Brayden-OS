import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { JURISDICTIONS, rarityLabel, type Jurisdiction } from './jurisdictions'
import { getMainPlate, getPlatesForCode } from './plateDesigns'
import { PlateVisual } from './PlateVisual'

export function StatesTab() {
  const [selected, setSelected] = useState<Jurisdiction | null>(null)
  const sorted = useMemo(
    () => [...JURISDICTIONS].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.code}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-3 self-start text-sm font-medium text-fog underline-offset-2 hover:text-ink hover:underline"
            >
              ← All states
            </button>
            <header className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">{selected.code}</p>
              <h1 className="font-display mt-1 text-3xl text-ink">{selected.name}</h1>
              {selected.slogan && (
                <p className="mt-1 text-sm text-fog">“{selected.slogan}”</p>
              )}
              <p className="mt-2 text-sm text-fog">{rarityLabel(selected.rarity)}</p>
              <p className="mt-1 text-sm text-ink/80">{selected.notes}</p>
            </header>

            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
              License plates
            </h2>
            <ul className="flex flex-col gap-4">
              {getPlatesForCode(selected.code).map((design, i) => (
                <motion.li
                  key={design.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 border-b border-line pb-4"
                >
                  <PlateVisual design={design} stateCode={selected.code} stateName={selected.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{design.name}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-fog">{design.kind}</p>
                    {design.slogan && (
                      <p className="mt-1 text-sm text-fog">“{design.slogan}”</p>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <header className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">States</p>
              <h1 className="font-display mt-1 text-3xl text-ink">Browse plates</h1>
              <p className="mt-1 max-w-md text-sm text-fog">
                Scroll A–Z. Tap an underlined state name to see every plate style we track for it.
              </p>
            </header>

            <ul className="flex flex-col gap-3">
              {sorted.map((j, i) => {
                const main = getMainPlate(j.code)
                if (!main) return null
                return (
                  <motion.li
                    key={j.code}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 20) * 0.015 }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(j)}
                      className="flex w-full items-center gap-3 rounded-sm border border-line bg-paper px-3 py-2.5 text-left transition hover:border-plate/50 hover:bg-asphalt-lift"
                    >
                      <PlateVisual
                        design={main}
                        stateCode={j.code}
                        stateName={j.name}
                        compact
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-ink underline decoration-plate decoration-2 underline-offset-4">
                          {j.name}
                        </span>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-fog">{j.code}</p>
                      </div>
                    </button>
                  </motion.li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
