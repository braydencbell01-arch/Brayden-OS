import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  JURISDICTIONS,
  REGION_LABEL,
  rarityLabel,
  plateMountLabel,
  type Jurisdiction,
  type Region,
} from './jurisdictions'
import {
  getMainPlate,
  getPassengerBases,
  getPlatesForCode,
  getStatePlatePage,
  WLP_CREDIT,
} from './plateDesigns'
import { PlateVisual } from './PlateVisual'

const REGIONS: Region[] = ['us-state', 'canada', 'mexico', 'territory', 'native', 'military', 'federal']

export function StatesTab() {
  const [region, setRegion] = useState<Region>('us-state')
  const [selected, setSelected] = useState<Jurisdiction | null>(null)
  const list = useMemo(
    () =>
      JURISDICTIONS.filter((j) => j.region === region).sort((a, b) => a.name.localeCompare(b.name)),
    [region],
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
              ← Back
            </button>
            <header className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">
                {REGION_LABEL[selected.region]} · {selected.code}
              </p>
              <h1 className="font-display mt-1 text-3xl text-ink">{selected.name}</h1>
              {selected.slogan && <p className="mt-1 text-sm text-fog">“{selected.slogan}”</p>}
              {selected.plateMount && (
                <p className="mt-2 text-sm font-medium text-plate-hot">
                  {plateMountLabel(selected.plateMount)}
                </p>
              )}
              <p className="mt-2 text-sm text-fog">{rarityLabel(selected.rarity)}</p>
              <p className="mt-1 text-sm text-ink/80">{selected.notes}</p>
            </header>

            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
              Real plate photos
            </h2>
            <ul className="flex flex-col gap-5">
              {getPlatesForCode(selected.code).map((design, i) => (
                <motion.li
                  key={design.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-line pb-5"
                >
                  <PlateVisual design={design} stateCode={selected.code} stateName={selected.name} />
                  <div className="mt-2 min-w-0">
                    <p className="font-semibold text-ink">{design.name}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-fog">{design.kind}</p>
                    {design.pageUrl && (
                      <a
                        href={design.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-plate-hot underline-offset-2 hover:underline"
                      >
                        View on World License Plates
                      </a>
                    )}
                  </div>
                </motion.li>
              ))}
              {getPlatesForCode(selected.code).length === 0 && (
                <li className="text-sm text-fog">Photos still loading for this jurisdiction — check the source page.</li>
              )}
            </ul>

            {getPassengerBases(selected.code).length > 0 && (
              <div className="mt-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
                  Passenger base history
                </h2>
                <ul className="flex flex-col gap-3">
                  {getPassengerBases(selected.code).map((row) => (
                    <li key={`${row.example}-${row.introduced}`} className="text-sm text-ink/90">
                      <p className="font-semibold tracking-wide">{row.example}</p>
                      <p className="text-fog">
                        {row.introduced}
                        {row.colors ? ` · ${row.colors}` : ''}
                      </p>
                      {row.notes && <p className="mt-0.5 text-ink/80">{row.notes}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-6 text-xs text-fog">
              {WLP_CREDIT}{' '}
              {getStatePlatePage(selected.code) && (
                <a
                  href={getStatePlatePage(selected.code)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-plate-hot underline-offset-2 hover:underline"
                >
                  Source page
                </a>
              )}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-3"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <header className="mb-3 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">Browse</p>
              <h1 className="font-display mt-1 text-3xl text-ink">Plates</h1>
              <p className="mt-1 max-w-md text-sm text-fog">
                US, Canada, Mexico, territories, Native American, military, and federal — photos from World License Plates.
              </p>
            </header>

            <div className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`shrink-0 rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                    region === r
                      ? 'bg-plate text-asphalt'
                      : 'border border-line text-fog hover:border-plate/50 hover:text-plate-hot'
                  }`}
                >
                  {REGION_LABEL[r]}
                </button>
              ))}
            </div>

            <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
              {list.map((j, i) => {
                const main = getMainPlate(j.code)
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
                      {main ? (
                        <PlateVisual design={main} stateCode={j.code} stateName={j.name} compact />
                      ) : (
                        <div className="flex h-14 w-28 shrink-0 items-center justify-center rounded-[3px] bg-lane text-xs font-semibold text-fog ring-1 ring-line">
                          {j.code}
                        </div>
                      )}
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
            <p className="mt-3 shrink-0 text-xs text-fog">{WLP_CREDIT}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
