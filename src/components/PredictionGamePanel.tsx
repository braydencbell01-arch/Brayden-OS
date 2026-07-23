import { useMemo, useState } from 'react'
import { getLeague } from '../lib/leagues'
import { predictMatch } from '../lib/insights'
import type { Match } from '../lib/matches'
import { toDateKey } from '../lib/dates'

const STORAGE_KEY = 'brayden-stats-predictions-v1'

type PickStore = Record<string, { pick: 'H' | 'D' | 'A'; at: number }>

function readPicks(): PickStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as PickStore
  } catch {
    return {}
  }
}

function writePicks(store: PickStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function PredictionGamePanel({ matches }: { matches: Match[] }) {
  const [picks, setPicks] = useState<PickStore>(() => readPicks())
  const todayKey = toDateKey(new Date())

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'scheduled' && m.dateKey >= todayKey)
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
        .slice(0, 10),
    [matches, todayKey],
  )

  const finishedWithPicks = useMemo(() => {
    return matches.filter((m) => m.status === 'finished' && picks[m.id])
  }, [matches, picks])

  let correct = 0
  for (const match of finishedWithPicks) {
    const pick = picks[match.id]?.pick
    if (!pick || match.home.score == null || match.away.score == null) continue
    const actual =
      match.home.score === match.away.score ? 'D' : match.home.score > match.away.score ? 'H' : 'A'
    if (pick === actual) correct += 1
  }

  const setPick = (matchId: string, pick: 'H' | 'D' | 'A') => {
    const next = { ...picks, [matchId]: { pick, at: Date.now() } }
    setPicks(next)
    writePicks(next)
  }

  return (
    <div className="space-y-4">
      <section className="border border-white/10 bg-white/[0.03] px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Prediction board
        </h2>
        <p className="mt-2 text-sm text-mist/70">
          Pick 1X2 on upcoming fixtures. BrayStats also shows a form-based lean for comparison.
        </p>
        <p className="mt-2 text-sm text-cream">
          Record: {correct}/{finishedWithPicks.length} settled picks correct
        </p>
      </section>

      {upcoming.length === 0 ? (
        <p className="text-sm text-mist/70">No upcoming fixtures loaded yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.map((match) => {
            const lean = predictMatch(match, matches)
            const my = picks[match.id]?.pick
            return (
              <li key={match.id} className="border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-mist/55">
                  {getLeague(match.leagueId).short} · {match.dateKey}
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
                      className={`flex-1 rounded-full border py-1.5 text-xs font-bold ${
                        my === code
                          ? 'border-lime bg-lime text-ink'
                          : 'border-white/15 text-mist hover:border-lime/40'
                      }`}
                    >
                      {code === 'H' ? match.home.shortName : code === 'A' ? match.away.shortName : 'Draw'}
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
