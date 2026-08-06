import { useEffect, useMemo, useState } from 'react'
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
  getCommonPlates,
  getHistoryPlates,
  getMainPlate,
  getNonPassengerPlates,
  getPassengerBases,
  getPlatesForCode,
  getSpecialtyPlates,
  getStatePlatePage,
  WLP_CREDIT,
  type PlateDesign,
} from './plateDesigns'
import { PlateVisual } from './PlateVisual'
import {
  STATE_LAND_AREA_SQ_MI,
  STATE_POPULATION,
  distanceToJurisdictionMiles,
  formatAreaSqMi,
  formatMilesAway,
  formatPopulation,
} from './geo'

const REGIONS: Region[] = ['us-state', 'canada', 'mexico', 'territory', 'native', 'military', 'federal']

function PlateGrid({ plates, state }: { plates: PlateDesign[]; state: Jurisdiction }) {
  if (!plates.length) {
    return <p className="text-sm text-fog">None in the catalog yet.</p>
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {plates.map((design, i) => (
        <motion.li
          key={design.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 12) * 0.03 }}
          className="min-w-0"
        >
          <PlateVisual design={design} stateCode={state.code} stateName={state.name} />
          <p className="mt-1.5 text-sm font-semibold text-ink">{design.name}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-fog">{design.kind}</p>
        </motion.li>
      ))}
    </ul>
  )
}

function StateProfile({
  selected,
  onBack,
  platePoints,
  homeLabel,
}: {
  selected: Jurisdiction
  onBack: () => void
  platePoints?: Record<string, number> | null
  homeLabel?: string | null
}) {
  const [here, setHere] = useState<{ lat: number; lon: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<'pending' | 'ok' | 'denied'>('pending')

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGeoStatus('ok')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 12_000 },
    )
  }, [selected.code])

  const plates = useMemo(() => getPlatesForCode(selected.code), [selected.code])
  const common = useMemo(() => getCommonPlates(selected.code, 10), [selected.code])
  const historyPlates = useMemo(() => getHistoryPlates(selected.code), [selected.code])
  const specialty = useMemo(() => getSpecialtyPlates(selected.code), [selected.code])
  const other = useMemo(() => getNonPassengerPlates(selected.code), [selected.code])
  const bases = useMemo(() => getPassengerBases(selected.code), [selected.code])

  const pop = STATE_POPULATION[selected.code]
  const area = STATE_LAND_AREA_SQ_MI[selected.code]
  const miles =
    here && geoStatus === 'ok' ? distanceToJurisdictionMiles(selected.code, here) : null

  const stats: { label: string; value: string }[] = [
    pop != null ? { label: 'Population', value: formatPopulation(pop) } : null,
    area != null ? { label: 'Land area', value: formatAreaSqMi(area) } : null,
    {
      label: 'Distance',
      value:
        miles != null
          ? formatMilesAway(miles)
          : geoStatus === 'pending'
            ? 'Locating…'
            : 'Location off',
    },
    { label: 'Plates in catalog', value: String(plates.length) },
    platePoints?.[selected.code] != null
      ? {
          label: homeLabel ? `Points near ${homeLabel}` : 'Rarity points',
          value: String(platePoints[selected.code]),
        }
      : null,
    selected.plateMount
      ? { label: 'Mount', value: plateMountLabel(selected.plateMount) }
      : null,
    { label: 'Rarity', value: rarityLabel(selected.rarity) },
  ].filter((s): s is { label: string; value: string } => s != null)

  return (
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
        onClick={onBack}
        className="mb-3 self-start text-sm font-medium text-fog underline-offset-2 hover:text-ink hover:underline"
      >
        ← Back
      </button>

      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">
          {REGION_LABEL[selected.region]} · {selected.code}
        </p>
        <h1 className="font-display mt-1 text-3xl text-ink">{selected.name}</h1>
        {selected.slogan && <p className="mt-1 text-sm text-fog">“{selected.slogan}”</p>}
        <p className="mt-2 text-sm text-ink/80">{selected.notes}</p>
      </header>

      {/* 1. Stats */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">Stats</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fog">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-base font-semibold text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 2. Top 10 most common */}
      <section className="mb-8">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          Most common plates
        </h2>
        <p className="mb-3 text-xs text-fog">
          Estimated share of plates you’d spot from this place (top {common.length}).
        </p>
        {common.length === 0 ? (
          <p className="text-sm text-fog">No plate designs in the catalog yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {common.map((row, i) => (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-line pb-3 last:border-0"
              >
                <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-fog">
                  {i + 1}
                </span>
                {row.design ? (
                  <PlateVisual
                    design={row.design}
                    stateCode={selected.code}
                    stateName={selected.name}
                    compact
                  />
                ) : (
                  <div className="flex h-14 w-28 shrink-0 items-center justify-center rounded-[3px] bg-lane text-[10px] font-semibold uppercase tracking-wider text-fog ring-1 ring-line">
                    {selected.code}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{row.label}</p>
                  {row.detail && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-fog">{row.detail}</p>
                  )}
                </div>
                <span className="shrink-0 font-display text-xl tabular-nums text-plate-hot">
                  {row.percent}%
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 3. History */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">History</h2>
        {bases.length > 0 && (
          <ul className="mb-4 flex flex-col gap-3">
            {bases.map((row) => (
              <li key={`${row.example}-${row.introduced}`} className="text-sm text-ink/90">
                <p className="font-semibold tracking-wide">
                  {row.introduced}
                  {row.example ? ` · ${row.example}` : ''}
                </p>
                <p className="text-fog">
                  {row.colors}
                  {row.notes ? ` · ${row.notes}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
        {historyPlates.length > 0 ? (
          <PlateGrid plates={historyPlates} state={selected} />
        ) : !bases.length ? (
          <p className="text-sm text-fog">No history entries yet for this jurisdiction.</p>
        ) : null}
        {getStatePlatePage(selected.code) && (
          <a
            href={getStatePlatePage(selected.code)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-plate-hot underline-offset-2 hover:underline"
          >
            View on World License Plates
          </a>
        )}
      </section>

      {/* 4. Specialty */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          Specialty plates
        </h2>
        <PlateGrid plates={specialty} state={selected} />
      </section>

      {/* 5. Non-passenger / other */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          Non-passenger / other
        </h2>
        <PlateGrid plates={other} state={selected} />
      </section>

      <p className="text-xs text-fog">
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
  )
}

export function StatesTab({
  platePoints = null,
  homeLabel = null,
}: {
  platePoints?: Record<string, number> | null
  homeLabel?: string | null
}) {
  const [region, setRegion] = useState<Region>('us-state')
  const [selected, setSelected] = useState<Jurisdiction | null>(null)
  const rankByRarity = region === 'us-state' && !!platePoints
  const list = useMemo(() => {
    const rows = JURISDICTIONS.filter((j) => j.region === region)
    if (rankByRarity && platePoints) {
      return [...rows].sort((a, b) => {
        const pa = platePoints[a.code] ?? 999
        const pb = platePoints[b.code] ?? 999
        if (pa !== pb) return pa - pb
        return a.name.localeCompare(b.name)
      })
    }
    return [...rows].sort((a, b) => a.name.localeCompare(b.name))
  }, [region, rankByRarity, platePoints])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {selected ? (
          <StateProfile
            selected={selected}
            onBack={() => setSelected(null)}
            platePoints={platePoints}
            homeLabel={homeLabel}
          />
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
                {rankByRarity
                  ? `US states ranked by how common they are near you${homeLabel ? ` (${homeLabel})` : ''} — most common first.`
                  : 'US, Canada, Mexico, territories, Native American, military, and federal — photos from World License Plates.'}
              </p>
              {region === 'us-state' && !platePoints && (
                <p className="mt-2 text-sm text-plate-hot">
                  Set your location on Home to rank states by rarity and see points.
                </p>
              )}
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
                const pts = platePoints?.[j.code]
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
                      {pts != null && region === 'us-state' && (
                        <span className="shrink-0 text-right">
                          <span className="block font-display text-xl text-plate-hot">{pts}</span>
                          <span className="text-[10px] uppercase tracking-[0.12em] text-fog">pts</span>
                        </span>
                      )}
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
