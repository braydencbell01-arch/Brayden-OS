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
  getCommonPlates,
  getHistoryTimeline,
  getMainPlate,
  getNonPassengerPlates,
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
  type Place,
} from './geo'

const REGIONS: Region[] = ['us-state', 'canada', 'mexico', 'territory', 'native', 'military', 'federal']

function PlateGrid({
  plates,
  state,
  periodBeside,
}: {
  plates: PlateDesign[]
  state: Jurisdiction
  /** Optional label shown beside each plate (e.g. specialty subtype). */
  periodBeside?: (d: PlateDesign, i: number) => string | null
}) {
  if (!plates.length) {
    return <p className="text-sm text-fog">None in the catalog yet.</p>
  }
  return (
    <ul className="flex flex-col gap-4">
      {plates.map((design, i) => {
        const beside = periodBeside?.(design, i)
        return (
          <motion.li
            key={design.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.03 }}
            className="flex items-start gap-3"
          >
            <div className="min-w-0 flex-1">
              <PlateVisual design={design} stateCode={state.code} stateName={state.name} />
              <p className="mt-1.5 text-sm font-semibold text-ink">{design.name}</p>
            </div>
            {beside && (
              <p className="w-24 shrink-0 pt-2 text-right text-xs font-semibold uppercase tracking-[0.1em] text-plate-hot sm:w-28">
                {beside}
              </p>
            )}
          </motion.li>
        )
      })}
    </ul>
  )
}

function StateProfile({
  selected,
  onBack,
  platePoints,
  homeLocation,
}: {
  selected: Jurisdiction
  onBack: () => void
  platePoints?: Record<string, number> | null
  homeLocation?: Place | null
}) {
  const plates = useMemo(() => getPlatesForCode(selected.code), [selected.code])
  const common = useMemo(() => getCommonPlates(selected.code, 10), [selected.code])
  const history = useMemo(() => getHistoryTimeline(selected.code), [selected.code])
  const specialty = useMemo(() => getSpecialtyPlates(selected.code), [selected.code])
  const other = useMemo(() => getNonPassengerPlates(selected.code), [selected.code])

  const pop = STATE_POPULATION[selected.code]
  const area = STATE_LAND_AREA_SQ_MI[selected.code]
  const miles = homeLocation
    ? distanceToJurisdictionMiles(selected.code, homeLocation)
    : null
  const homeShort = homeLocation?.label?.split(',')[0] ?? null

  const stats: { label: string; value: string }[] = [
    { label: 'Different plates', value: String(plates.length) },
    pop != null ? { label: 'Population', value: formatPopulation(pop) } : null,
    area != null ? { label: 'Land area', value: formatAreaSqMi(area) } : null,
    {
      label: homeShort ? `Distance from ${homeShort}` : 'Distance from you',
      value: miles != null ? formatMilesAway(miles) : 'Set location on Home or Profile',
    },
    platePoints?.[selected.code] != null
      ? {
          label: homeShort ? `Rarity near ${homeShort}` : 'Rarity points',
          value: `${platePoints[selected.code]} pts`,
        }
      : null,
    selected.plateMount
      ? { label: 'Plate mount', value: plateMountLabel(selected.plateMount) }
      : null,
    { label: 'Rarity class', value: rarityLabel(selected.rarity) },
    { label: 'Region', value: REGION_LABEL[selected.region] },
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
        ← Back to Browse
      </button>

      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate">
          State profile · {selected.code}
        </p>
        <h1 className="font-display mt-1 text-3xl text-ink">{selected.name}</h1>
        {selected.slogan && <p className="mt-1 text-sm text-fog">“{selected.slogan}”</p>}
        <p className="mt-2 text-sm text-ink/80">{selected.notes}</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          State facts
        </h2>
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

      <section className="mb-8">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          Top 10 most popular plates
        </h2>
        <p className="mb-3 text-xs text-fog">
          Estimated share of all plates in {selected.name} (sums to ~100%).
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
                <span className="shrink-0 text-right">
                  <span className="font-display text-xl tabular-nums text-plate-hot">
                    {row.percent}%
                  </span>
                  <span className="mt-0.5 block text-[9px] uppercase tracking-[0.1em] text-fog">
                    of state
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          License plate history
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-fog">No history entries yet for this jurisdiction.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {history.map((row, i) => (
              <motion.li
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                className="flex items-start gap-3 border-b border-line pb-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  {row.design ? (
                    <PlateVisual
                      design={row.design}
                      stateCode={selected.code}
                      stateName={selected.name}
                    />
                  ) : (
                    <div className="flex h-24 w-full max-w-md items-center justify-center rounded-sm bg-lane text-sm text-fog ring-1 ring-line">
                      {selected.code}
                    </div>
                  )}
                  <p className="mt-1.5 text-sm font-semibold text-ink">{row.label}</p>
                  {row.detail && <p className="text-xs text-fog">{row.detail}</p>}
                </div>
                <p className="w-24 shrink-0 pt-1 text-right font-display text-lg leading-tight text-plate-hot sm:w-28">
                  {row.period}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
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

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          Specialty plates
        </h2>
        <PlateGrid
          plates={specialty}
          state={selected}
          periodBeside={(_d, i) => `Specialty ${i + 1}`}
        />
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          Non-passenger / other
        </h2>
        <PlateGrid
          plates={other}
          state={selected}
          periodBeside={(d) =>
            d.kind === 'military' ? 'Military' : d.kind === 'gallery' ? 'Gallery' : 'Other'
          }
        />
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
  homeLocation = null,
  initialCode = null,
}: {
  platePoints?: Record<string, number> | null
  homeLocation?: Place | null
  /** Open this jurisdiction’s profile immediately (e.g. deep link from Home). */
  initialCode?: string | null
}) {
  const [region, setRegion] = useState<Region>('us-state')
  const [selected, setSelected] = useState<Jurisdiction | null>(() =>
    initialCode ? (JURISDICTIONS.find((j) => j.code === initialCode.toUpperCase()) ?? null) : null,
  )
  const homeLabel = homeLocation?.label ?? null
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
            homeLocation={homeLocation}
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
                Tap any place for its full profile — facts, top plates, history, specialty, and other
                types.
                {rankByRarity
                  ? ` US states ranked by how common they are near you${homeLabel ? ` (${homeLabel})` : ''}.`
                  : ''}
              </p>
              {region === 'us-state' && !platePoints && (
                <p className="mt-2 text-sm text-plate-hot">
                  Set your location on Home or Profile to rank states by rarity.
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
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-fog">
                          {j.code} · Open profile
                        </p>
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
