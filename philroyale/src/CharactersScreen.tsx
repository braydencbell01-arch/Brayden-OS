import { useState } from 'react'
import { CHARACTERS, DECK_SIZE, getCharacter, type Character } from './characters'
import { loadDeck, saveDeck } from './storage'
import { BattleCard } from './BattleCard'

export function CharactersScreen() {
  const [deck, setDeck] = useState<string[]>(() => loadDeck())
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1600)
  }

  function toggle(id: string) {
    setDeck((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= DECK_SIZE) {
        flash(`Battle deck is full (${DECK_SIZE}). Deselect one first.`)
        return prev
      }
      return [...prev, id]
    })
  }

  function saveIfReady() {
    if (deck.length !== DECK_SIZE) {
      flash(`Pick exactly ${DECK_SIZE} characters`)
      return
    }
    saveDeck(deck)
    flash('Battle deck saved')
  }

  const selected = new Set(deck)

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Characters
        </h1>
        <p className="text-sm font-semibold text-white/70">
          All characters unlocked. Choose {DECK_SIZE} for your battle deck ({deck.length}/{DECK_SIZE}).
        </p>
      </header>

      {/* Current deck strip */}
      <div
        className="mx-3 shrink-0 rounded-xl p-2"
        style={{
          background: 'linear-gradient(180deg,#3a2418,#1f140e)',
          boxShadow: 'inset 0 1px 0 #c9a22744',
        }}
      >
        <p className="mb-1.5 text-center text-[0.65rem] font-extrabold uppercase tracking-wider text-[#f5d76e]/85">
          Battle deck
        </p>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: DECK_SIZE }, (_, i) => {
            const c = deck[i] ? getCharacter(deck[i]) ?? null : null
            return (
              <div key={i} className="min-w-0">
                <BattleCard character={c} />
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={saveIfReady}
          className="mt-2 w-full rounded-lg py-2 text-sm font-extrabold text-[#1a1410]"
          style={{
            background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
            boxShadow: '0 3px 0 #8a6a12',
          }}
        >
          Save battle deck
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {CHARACTERS.map((c) => (
            <li key={c.id}>
              <CharacterPick
                character={c}
                selected={selected.has(c.id)}
                onToggle={() => toggle(c.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
          <p className="rounded-lg bg-black/80 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/40">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function CharacterPick({
  character,
  selected,
  onToggle,
}: {
  character: Character
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-lg p-1.5 text-left transition-transform active:scale-[0.98] ${
        selected ? 'ring-2 ring-[#f5d76e]' : 'ring-1 ring-white/10'
      }`}
      style={{ background: selected ? '#3a2a14' : '#221610' }}
    >
      <BattleCard character={character} />
      <p className="mt-1 truncate text-center text-[0.7rem] font-extrabold text-white">
        {character.name}
      </p>
      <p className="truncate text-center text-[0.6rem] font-semibold text-white/55">
        {character.role} · {character.elixir}
      </p>
    </button>
  )
}
