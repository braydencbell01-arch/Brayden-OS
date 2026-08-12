import { useMemo, useState } from 'react'
import { CHARACTERS, getCharacter } from './characters'
import { BattleCard } from './BattleCard'
import { loadCardProgress } from './storage'

const DRAFT_SIZE = 8

type Props = {
  onReady: (deckIds: string[]) => void
  onCancel: () => void
}

export function TouchdownDraft({ onReady, onCancel }: Props) {
  const unlocked = useMemo(() => new Set(loadCardProgress().unlocked), [])
  const pool = useMemo(
    () => CHARACTERS.filter((c) => unlocked.has(c.id)),
    [unlocked],
  )
  const [picks, setPicks] = useState<string[]>([])

  function toggle(id: string) {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= DRAFT_SIZE) return prev
      return [...prev, id]
    })
  }

  const canStart = picks.length === DRAFT_SIZE && pool.length >= DRAFT_SIZE

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a] px-3 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
        Touchdown draft
      </h1>
      <p className="mt-1 text-sm font-semibold text-white/75">
        Pick {DRAFT_SIZE} from your unlocked cards only. Place them in your third — first to score
        3 touchdowns wins.
      </p>
      {pool.length < DRAFT_SIZE ? (
        <p className="mt-2 text-sm font-bold text-[#ff8a7a]">
          Need {DRAFT_SIZE} unlocked cards to play Touchdown (you have {pool.length}).
        </p>
      ) : null}
      <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
        Selected {picks.length}/{DRAFT_SIZE} · Unlocked {pool.length}
      </p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {pool.map((c) => {
            const selected = picks.includes(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="w-full text-left"
                  style={{
                    outline: selected ? '3px solid #f5d76e' : 'none',
                    borderRadius: '0.45rem',
                  }}
                >
                  <BattleCard character={c} size="collection" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-[#2a1a12] py-3 text-sm font-extrabold text-[#ff8a7a] ring-1 ring-white/15"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canStart}
          onClick={() => onReady(picks)}
          className="flex-[2] rounded-lg py-3 text-sm font-extrabold text-[#1a1410] disabled:opacity-45"
          style={{
            background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)',
            boxShadow: '0 3px 0 #1a7a3a',
          }}
        >
          Start Touchdown
        </button>
      </div>
      {picks.length > 0 ? (
        <p className="mt-2 truncate text-center text-xs font-semibold text-white/55">
          {picks.map((id) => getCharacter(id)?.name ?? id).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
