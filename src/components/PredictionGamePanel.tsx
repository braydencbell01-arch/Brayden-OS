import { useEffect, useMemo, useState } from 'react'
import { getLeague } from '../lib/leagues'
import { predictMatch } from '../lib/insights'
import type { Match } from '../lib/matches'

const STORAGE_KEY = 'brayden-stats-predictions-v2'
const LEGACY_KEY = 'brayden-stats-predictions-v1'
const HORIZON_MS = 48 * 60 * 60 * 1000

type PickCode = 'H' | 'D' | 'A'
type PickStore = Record<string, { pick: PickCode; at: number }>
type SettledEntry = {
  pick: PickCode
  actual: PickCode
  correct: boolean
  settledAt: number
}
type SettledStore = Record<string, SettledEntry>
type PredictionStore = {
  picks: PickStore
  settled: SettledStore
}

function resultCode(match: Match): PickCode | null {
  if (match.home.score == null || match.away.score == null) return null
  if (match.home.score === match.away.score) return 'D'
  return match.home.score > match.away.score ? 'H' : 'A'
}

function readStore(): PredictionStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PredictionStore>
      return {
        picks: parsed.picks && typeof parsed.picks === 'object' ? parsed.picks : {},
        settled: parsed.settled && typeof parsed.settled === 'object' ? parsed.settled : {},
      }
    }
  } catch {
    /* fall through to legacy */
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}') as PickStore
    return { picks: legacy && typeof legacy === 'object' ? legacy : {}, settled: {} }
  } catch {
    return { picks: {}, settled: {} }
  }
}

function writeStore(store: PredictionStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function formatKickoff(iso: string, timeKnown: boolean): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Kickoff TBA'
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  if (!timeKnown) return `${day} · time TBA`
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${day} · ${time}`
}

export function PredictionGamePanel({ matches }: { matches: Match[] }) {
  const [store, setStore] = useState<PredictionStore>(() => readStore())
  const { picks, settled } = store

  // Lock in finished results permanently so all-time accuracy survives match cache rotation.
  useEffect(() => {
    setStore((prev) => {
      let changed = false
      const nextSettled: SettledStore = { ...prev.settled }
      for (const match of matches) {
        if (match.status !== 'finished' || nextSettled[match.id]) continue
        const pick = prev.picks[match.id]?.pick
        if (!pick) continue
        const actual = resultCode(match)
        if (!actual) continue
        nextSettled[match.id] = {
          pick,
          actual,
          correct: pick === actual,
          settledAt: Date.now(),
        }
        changed = true
      }
      if (!changed) return prev
      const next = { picks: prev.picks, settled: nextSettled }
      writeStore(next)
      return next
    })
  }, [matches])

  const upcoming = useMemo(() => {
    const now = Date.now()
    const until = now + HORIZON_MS
    return matches
      .filter((match) => {
        if (match.status !== 'scheduled') return false
        const kickoff = new Date(match.kickoff).getTime()
        if (Number.isNaN(kickoff)) return false
        return kickoff >= now && kickoff <= until
      })
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  }, [matches])

  const settledRows = Object.values(settled)
  const correct = settledRows.filter((row) => row.correct).length
  const totalSettled = settledRows.length
  const accuracyPct = totalSettled > 0 ? Math.round((correct / totalSettled) * 100) : null

  const setPick = (matchId: string, pick: PickCode) => {
    const next = {
      picks: { ...picks, [matchId]: { pick, at: Date.now() } },
      settled,
    }
    setStore(next)
    writeStore(next)
  }

  return (
    <div className="space-y-4">
      <section className="border border-white/10 bg-white/[0.03] px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Prediction board
        </h2>
        <p className="mt-2 text-sm text-mist/70">
          All games kicking off in the next 48 hours. Pick 1X2 on each — BrayStats also shows a
          form-based lean for comparison.
        </p>
        <p className="mt-3 text-sm text-cream">
          {totalSettled === 0 ? (
            <>All-time record: no settled picks yet</>
          ) : (
            <>
              All-time record:{' '}
              <span className="font-semibold tabular-nums">
                {correct}/{totalSettled}
              </span>{' '}
              correct ·{' '}
              <span className="font-semibold tabular-nums text-lime">{accuracyPct}%</span>
            </>
          )}
        </p>
        <p className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-mist/55">
          {upcoming.length === 0
            ? '0 fixtures in the next 48 hours'
            : `${upcoming.length} fixture${upcoming.length === 1 ? '' : 's'} in the next 48 hours`}
        </p>
      </section>

      {upcoming.length === 0 ? (
        <p className="text-sm text-mist/70">
          No scheduled games in the next 48 hours right now. Check back as fixtures approach.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.map((match) => {
            const lean = predictMatch(match, matches)
            const my = picks[match.id]?.pick
            return (
              <li key={match.id} className="border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
                  {getLeague(match.leagueId).short} ·{' '}
                  {formatKickoff(match.kickoff, match.kickoffTimeKnown)}
                </p>
                <p className="mt-1 text-sm font-semibold text-cream">
                  {match.home.shortName} vs {match.away.shortName}
                </p>
                <div className="mt-2 flex gap-2">
                  {(['H', 'D', 'A'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setPick(match.id, code)}
                      className={`flex-1 border py-1.5 text-xs font-bold transition ${
                        my === code
                          ? 'border-lime bg-lime text-ink'
                          : 'border-white/15 text-mist hover:border-lime/40'
                      }`}
                    >
                      {code === 'H'
                        ? match.home.shortName
                        : code === 'A'
                          ? match.away.shortName
                          : 'Draw'}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[0.65rem] text-mist/55">
                  BrayStats lean {lean.predictedScore} ({lean.homeWinPct}/{lean.drawPct}/
                  {lean.awayWinPct}%) · {lean.confidence}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
