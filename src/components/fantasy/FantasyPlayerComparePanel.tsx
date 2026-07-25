import { useMemo, useState } from 'react'
import type { FplCatalog } from '../../lib/fantasy/fplData'
import type { FantasyPlayer } from '../../lib/fantasy/types'
import { matchesInclusive } from '../../lib/inclusiveSearch'
import { computePayPerStat, formatMillions, formatPounds } from '../../lib/payPerStat'
import type { PlayerNavRef } from '../PlayerProfileScreen'
import type { LeagueId } from '../../lib/leagues'

function PlayerPick({
  label,
  catalog,
  value,
  onChange,
}: {
  label: string
  catalog: FplCatalog | null
  value: FantasyPlayer | null
  onChange: (player: FantasyPlayer | null) => void
}) {
  const [query, setQuery] = useState('')
  const hits = useMemo(() => {
    if (!catalog || query.trim().length < 2) return []
    return catalog.players
      .filter((p) =>
        matchesInclusive(
          [p.webName, p.secondName, p.firstName, p.teamShort, p.teamName, p.pos],
          query,
        ),
      )
      .slice(0, 8)
  }, [catalog, query])

  return (
    <div className="border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-mist/65">{label}</p>
      {value ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-cream">
            {value.webName}{' '}
            <span className="text-mist/55">
              {value.teamShort} · {value.pos}
            </span>
          </span>
          <button type="button" className="text-xs text-lime" onClick={() => onChange(null)}>
            Clear
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FPL name…"
            className="mt-2 w-full rounded-lg border border-white/15 bg-pitch px-3 py-2 text-sm text-cream outline-none focus:border-lime/45"
          />
          <ul className="mt-1">
            {hits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p)
                    setQuery('')
                  }}
                  className="w-full px-1 py-1.5 text-left text-sm text-cream hover:text-lime"
                >
                  {p.webName} · {p.teamShort}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function StatRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-white/10 py-2 text-sm">
      <span className="text-right tabular-nums text-cream">{a}</span>
      <span className="text-center text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
        {label}
      </span>
      <span className="tabular-nums text-cream">{b}</span>
    </div>
  )
}

/** FPL cost / form / points compare — lives on Fantasy, not Stats. */
export function FantasyPlayerComparePanel({
  catalog,
  onOpenPlayer,
}: {
  catalog: FplCatalog | null
  onOpenPlayer?: (player: PlayerNavRef) => void
}) {
  const [a, setA] = useState<FantasyPlayer | null>(null)
  const [b, setB] = useState<FantasyPlayer | null>(null)

  const aPay = a
    ? computePayPerStat({
        cost: a.cost,
        totalPoints: a.totalPoints,
        goals: Math.max(1, Math.round(a.totalPoints / 12)),
        name: a.webName,
      })
    : null
  const bPay = b
    ? computePayPerStat({
        cost: b.cost,
        totalPoints: b.totalPoints,
        goals: Math.max(1, Math.round(b.totalPoints / 12)),
        name: b.webName,
      })
    : null

  return (
    <div className="space-y-3">
      <p className="text-sm text-mist/70">
        Compare Premier League players on FPL cost, form, and projected points.
      </p>
      <PlayerPick label="Player A" catalog={catalog} value={a} onChange={setA} />
      <PlayerPick label="Player B" catalog={catalog} value={b} onChange={setB} />

      {a && b ? (
        <div className="border border-white/10 bg-white/[0.03] px-3 py-3">
          <div className="mb-2 grid grid-cols-3 gap-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-mist/55">
            <span>{a.webName}</span>
            <span>vs</span>
            <span>{b.webName}</span>
          </div>
          <StatRow label="Cost" a={formatMillions(a.cost)} b={formatMillions(b.cost)} />
          <StatRow label="Form" a={String(a.form)} b={String(b.form)} />
          <StatRow label="PPG" a={String(a.ppg)} b={String(b.ppg)} />
          <StatRow label="Total pts" a={String(a.totalPoints)} b={String(b.totalPoints)} />
          <StatRow
            label="£ / pt"
            a={aPay?.perPoint != null ? formatPounds(aPay.perPoint) : '—'}
            b={bPay?.perPoint != null ? formatPounds(bPay.perPoint) : '—'}
          />
          <StatRow
            label="Week proj"
            a={String(a.weekProjection)}
            b={String(b.weekProjection)}
          />
          {onOpenPlayer ? (
            <button
              type="button"
              className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-lime"
              onClick={() =>
                onOpenPlayer({
                  id: String(a.code || a.id),
                  leagueId: 'premier-league' as LeagueId,
                  name: `${a.firstName} ${a.secondName}`,
                  shortName: a.webName,
                  teamName: a.teamName,
                  position: a.pos,
                })
              }
            >
              Open {a.webName} in BrayStats →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
