import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { JURISDICTIONS, getJurisdiction } from './jurisdictions'
import { getMainPlate } from './plateDesigns'
import { PlateVisual } from './PlateVisual'
import { loadQuizBestStreak, saveQuizBestStreak } from './achievements'

type Props = {
  onBack: () => void
}

type Round = {
  code: string
  choices: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function buildRound(exclude?: string): Round | null {
  const pool = JURISDICTIONS.filter(
    (j) => (j.region === 'us-state' || j.code === 'DC') && Boolean(getMainPlate(j.code)),
  )
  if (pool.length < 4) return null
  let candidates = pool
  if (exclude) candidates = pool.filter((j) => j.code !== exclude)
  if (!candidates.length) candidates = pool
  const answer = candidates[Math.floor(Math.random() * candidates.length)]!
  const distractors = shuffle(pool.filter((j) => j.code !== answer.code))
    .slice(0, 3)
    .map((j) => j.code)
  const choices = shuffle([answer.code, ...distractors])
  return { code: answer.code, choices }
}

export function PlateQuiz({ onBack }: Props) {
  const [round, setRound] = useState<Round | null>(() => buildRound())
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(() => loadQuizBestStreak())
  const [picked, setPicked] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const design = useMemo(
    () => (round ? getMainPlate(round.code) : undefined),
    [round],
  )
  const answerName = round ? getJurisdiction(round.code)?.name ?? round.code : ''

  function nextRound(afterCode?: string) {
    setPicked(null)
    setFeedback(null)
    setRound(buildRound(afterCode))
  }

  function choose(code: string) {
    if (!round || picked) return
    setPicked(code)
    const ok = code === round.code
    setFeedback(ok ? 'correct' : 'wrong')
    if (ok) {
      const next = streak + 1
      setStreak(next)
      saveQuizBestStreak(next)
      setBest((b) => Math.max(b, next))
    } else {
      setStreak(0)
    }
  }

  if (!round || !design) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm text-fog underline-offset-2 hover:text-ink hover:underline"
        >
          ← Back
        </button>
        <p className="text-sm text-fog">Quiz plates are unavailable offline.</p>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-fog underline-offset-2 hover:text-ink hover:underline"
      >
        ← Back
      </button>

      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plate-hot">Plate ID</p>
          <h1 className="font-display mt-1 text-3xl text-ink">Which state?</h1>
          <p className="mt-1 text-sm text-fog">Name the jurisdiction from the photo.</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-fog">Streak</p>
          <p className="font-display text-2xl text-plate-hot">{streak}</p>
          <p className="text-xs text-fog">Best {best}</p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={round.code + (picked ?? '')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="flex flex-col items-center"
        >
          <PlateVisual
            design={design}
            stateCode={picked ? round.code : '??'}
            stateName={picked ? answerName : 'Mystery plate'}
            className="w-full max-w-sm"
          />
        </motion.div>
      </AnimatePresence>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {round.choices.map((code) => {
          const name = getJurisdiction(code)?.name ?? code
          const isAnswer = code === round.code
          const show = Boolean(picked)
          let style = 'border-line bg-paper hover:border-plate/50'
          if (show && isAnswer) style = 'border-plate bg-plate/15 text-ink'
          else if (show && picked === code && !isAnswer) style = 'border-signal/50 bg-signal/5 text-fog'
          else if (show) style = 'border-line bg-paper text-fog'
          return (
            <li key={code}>
              <button
                type="button"
                disabled={Boolean(picked)}
                onClick={() => choose(code)}
                className={`w-full rounded-sm border px-4 py-3 text-left text-sm font-semibold transition ${style}`}
              >
                {name}
              </button>
            </li>
          )
        })}
      </ul>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3"
            role="status"
          >
            <p className="text-sm font-medium text-ink">
              {feedback === 'correct' ? `Correct — ${answerName}` : `It was ${answerName}`}
            </p>
            <button
              type="button"
              onClick={() => nextRound(round.code)}
              className="rounded-sm bg-plate px-4 py-2.5 text-sm font-semibold text-asphalt hover:bg-plate-hot"
            >
              Next plate
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
