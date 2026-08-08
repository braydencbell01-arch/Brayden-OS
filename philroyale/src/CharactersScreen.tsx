import { useMemo, useState } from 'react'
import {
  CHARACTERS,
  DECK_SIZE,
  RARITY_LABEL,
  RARITY_RANK,
  getCharacter,
  type CharacterDef,
  type Rarity,
} from './characters'
import { loadDeck, saveDeck } from './storage'
import { BattleCard } from './BattleCard'

type SortMode = 'name' | 'rarity' | 'elixir'

const RARITY_PILL: Record<Rarity, string> = {
  common: '#b8c0cc',
  rare: '#e67e22',
  epic: '#b14fd6',
  legendary: '#f5d76e',
}

export function CharactersScreen() {
  const [deck, setDeck] = useState<string[]>(() => loadDeck())
  const [profileId, setProfileId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('rarity')

  const profile = profileId ? getCharacter(profileId) : null

  const sorted = useMemo(() => {
    const list = [...CHARACTERS]
    if (sortMode === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortMode === 'elixir') {
      list.sort((a, b) => a.elixir - b.elixir || a.name.localeCompare(b.name))
    } else {
      list.sort(
        (a, b) =>
          RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.name.localeCompare(b.name),
      )
    }
    return list
  }, [sortMode])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1500)
  }

  function addToDeck(id: string) {
    setDeck((prev) => {
      if (prev.length >= DECK_SIZE) {
        flash(`Deck full (${DECK_SIZE}). Remove a card first.`)
        return prev
      }
      return [...prev, id]
    })
  }

  function removeFromDeck(index: number) {
    setDeck((prev) => prev.filter((_, i) => i !== index))
  }

  function save() {
    if (deck.length !== DECK_SIZE) {
      flash(`Need exactly ${DECK_SIZE} cards in the deck`)
      return
    }
    saveDeck(deck)
    flash('Battle deck saved')
  }

  if (profile) {
    return (
      <CardProfile
        character={profile}
        onBack={() => setProfileId(null)}
        onAdd={() => addToDeck(profile.id)}
      />
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Cards
        </h1>
        <p className="text-sm font-semibold text-white/70">
          Tap a card for its profile. Build an 8-card battle deck ({deck.length}/{DECK_SIZE}).
        </p>
      </header>

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
              <button
                key={i}
                type="button"
                className="min-w-0"
                onClick={() => (c ? removeFromDeck(i) : undefined)}
                aria-label={c ? `Remove ${c.name}` : `Empty slot ${i + 1}`}
              >
                <BattleCard character={c} />
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={save}
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
            Collection
          </p>
          <label className="flex items-center gap-1 text-[0.65rem] font-bold text-white/70">
            Sort
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded bg-[#221610] px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white outline-none ring-1 ring-white/15"
            >
              <option value="rarity">Rarity</option>
              <option value="elixir">Elixir</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sorted.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setProfileId(c.id)}
                className="w-full rounded-lg p-1.5 ring-1 ring-white/10"
                style={{ background: '#221610' }}
              >
                <BattleCard character={c} size="collection" />
                <p className="mt-1 truncate text-center text-[0.7rem] font-extrabold text-white">
                  {c.name}
                </p>
                <p
                  className="text-center text-[0.55rem] font-extrabold uppercase tracking-wide"
                  style={{ color: RARITY_PILL[c.rarity] }}
                >
                  {RARITY_LABEL[c.rarity]}
                </p>
              </button>
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

function CardProfile({
  character,
  onBack,
  onAdd,
}: {
  character: CharacterDef
  onBack: () => void
  onAdd: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="flex shrink-0 items-center gap-3 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-[#3a2418] px-3 py-1.5 text-sm font-extrabold text-[#f5d76e] ring-1 ring-[#c9a227]/50"
        >
          ← Back
        </button>
        <h1 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[#f5d76e]">
          Card profile
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <div
          className="mx-auto max-w-sm rounded-xl p-4"
          style={{
            background: 'linear-gradient(180deg,#3a2418,#1f140e)',
            boxShadow: 'inset 0 1px 0 #c9a22744',
          }}
        >
          <div className="mx-auto w-36">
            <BattleCard character={character} size="collection" />
          </div>
          <h2 className="mt-3 text-center font-[family-name:var(--font-display)] text-3xl text-[#f5d76e]">
            {character.name}
          </h2>
          <p
            className="mt-1 text-center text-sm font-extrabold uppercase tracking-wide"
            style={{ color: RARITY_PILL[character.rarity] }}
          >
            {RARITY_LABEL[character.rarity]}
          </p>
          <p className="mt-1 text-center text-sm font-semibold text-white/80">{character.blurb}</p>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Pronoun" value={character.pronoun} />
            <Stat label="Rarity" value={RARITY_LABEL[character.rarity]} />
            <Stat label="Elixir" value={String(character.elixir)} />
            <Stat label="Health" value={String(character.hp)} />
            <Stat label="Speed" value={`${character.moveSpeed} blocks/s`} />
            <Stat label="Attack CD" value={`${character.attackDelaySec}s`} />
            <Stat label="Size" value="1 block" />
            {character.rageAfterSec != null ? (
              <Stat
                label="Rage"
                value={`${character.rageAfterSec}s → ×${character.rageDamageMult ?? 1} dmg / ×${character.rageMoveMult ?? 1} speed`}
              />
            ) : null}
          </dl>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
            Attacks
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {character.attacks.map((a) => (
              <li
                key={a.id}
                className="rounded-lg bg-[#140e0a] px-3 py-2 ring-1 ring-white/10"
              >
                <p className="font-extrabold text-white">{a.name}</p>
                <p className="text-xs font-semibold text-white/65">
                  {a.damage} dmg · {a.range} block range
                  {a.rootWhileAttacking ? ' · stops to attack' : ' · can move while attacking'}
                  {a.pullToRange != null ? ` · pulls units to ${a.pullToRange} block` : ''}
                  {a.burstShots != null && a.burstShots > 1
                    ? ` · ${a.burstShots} shots ${a.burstGapSec ?? 0}s apart`
                    : ''}
                </p>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onAdd}
            className="mt-4 w-full rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: '0 3px 0 #8a6a12',
            }}
          >
            Add to battle deck
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#140e0a] px-2 py-2 ring-1 ring-white/10">
      <dt className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/75">
        {label}
      </dt>
      <dd className="font-extrabold text-white">{value}</dd>
    </div>
  )
}
