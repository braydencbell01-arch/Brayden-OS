import { useEffect, useMemo, useState } from 'react'
import {
  CHARACTERS,
  DECK_SIZE,
  RARITY_LABEL,
  RARITY_RANK,
  cardKindLabel,
  getCharacter,
  type CharacterDef,
  type Rarity,
} from './characters'
import { MAX_CARD_LEVEL, scaledStat } from './progression'
import {
  copiesToUpgrade,
  goldToUpgrade,
  loadActiveDeckIndex,
  loadCardProgress,
  loadDecks,
  loadProfile,
  saveCardProgress,
  saveDecks,
  setActiveDeckIndex,
  tryUpgradeCard,
  type CardProgress,
} from './storage'
import { BattleCard } from './BattleCard'

type Pane = 'decks' | 'collection'
type SortDir = 'asc' | 'desc'
type RarityFilter = 'all' | Rarity

const RARITY_PILL: Record<Rarity, string> = {
  common: '#b8c0cc',
  rare: '#e67e22',
  epic: '#b14fd6',
  legendary: '#f5d76e',
}

const DECK_SLOTS = 5

export function CharactersScreen() {
  const [pane, setPane] = useState<Pane>('decks')
  const [decks, setDecks] = useState<string[][]>(() => loadDecks())
  const [activeIdx, setActiveIdx] = useState(() => loadActiveDeckIndex())
  const [progress, setProgress] = useState<CardProgress>(() => loadCardProgress())
  const [gold, setGold] = useState(() => loadProfile().gold)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [pickSlot, setPickSlot] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const deck = decks[activeIdx] ?? []

  useEffect(() => {
    saveDecks(decks)
  }, [decks])

  useEffect(() => {
    setActiveDeckIndex(activeIdx)
    saveDecks(decks)
  }, [activeIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const avgElixir = useMemo(() => {
    if (deck.length === 0) return 0
    const sum = deck.reduce((n, id) => n + (getCharacter(id)?.elixir ?? 0), 0)
    return Math.round((sum / deck.length) * 10) / 10
  }, [deck])

  const collection = useMemo(() => {
    let list = [...CHARACTERS]
    if (rarityFilter !== 'all') list = list.filter((c) => c.rarity === rarityFilter)
    const unlocked = list.filter((c) => progress.unlocked.includes(c.id))
    const locked = list.filter((c) => !progress.unlocked.includes(c.id))
    const sortFn = (a: CharacterDef, b: CharacterDef) => {
      const byRarity = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]
      const byName = a.name.localeCompare(b.name)
      const byLevel =
        (progress.levels[b.id] ?? 1) - (progress.levels[a.id] ?? 1) || byName
      const primary = rarityFilter === 'all' ? byRarity || byLevel : byLevel
      return sortDir === 'desc' ? primary : -primary
    }
    unlocked.sort(sortFn)
    locked.sort(sortFn)
    return { unlocked, locked, found: progress.unlocked.length, total: CHARACTERS.length }
  }, [progress, rarityFilter, sortDir])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  function selectDeck(i: number) {
    setActiveIdx(i)
    setPickSlot(null)
  }

  function removeFromDeck(index: number) {
    setDecks((prev) => {
      const next = prev.map((d) => [...d])
      const cur = next[activeIdx] ?? []
      cur.splice(index, 1)
      next[activeIdx] = cur
      return next
    })
  }

  function addToDeck(id: string) {
    if (!progress.unlocked.includes(id)) {
      flash('Card locked')
      return
    }
    setDecks((prev) => {
      const next = prev.map((d) => [...d])
      const cur = [...(next[activeIdx] ?? [])]
      if (cur.includes(id)) {
        flash('Already in this deck')
        return prev
      }
      if (pickSlot != null && pickSlot < DECK_SIZE) {
        if (cur.length < DECK_SIZE) {
          while (cur.length < pickSlot) cur.push('')
          if (cur[pickSlot]) {
            cur[pickSlot] = id
          } else if (cur.length < DECK_SIZE) {
            cur.splice(pickSlot, 0, id)
          }
        } else {
          cur[pickSlot] = id
        }
        next[activeIdx] = cur.filter(Boolean).slice(0, DECK_SIZE)
        return next
      }
      if (cur.length >= DECK_SIZE) {
        flash('Deck full — tap a card to remove')
        return prev
      }
      cur.push(id)
      next[activeIdx] = cur
      return next
    })
    setPickSlot(null)
  }

  function toggleFavorite(id: string) {
    setProgress((prev) => {
      const has = prev.favorites.includes(id)
      const favorites = has ? prev.favorites.filter((x) => x !== id) : [...prev.favorites, id]
      const next = { ...prev, favorites }
      saveCardProgress(next)
      return next
    })
  }

  function upgrade(id: string) {
    const res = tryUpgradeCard(id)
    flash(res.message)
    if (res.ok) {
      setProgress(res.progress)
      setGold(loadProfile().gold)
    }
  }

  if (profileId) {
    const profile = getCharacter(profileId)
    if (!profile) {
      return (
        <div className="flex h-full items-center justify-center">
          <button type="button" onClick={() => setProfileId(null)} className="text-[#f5d76e]">
            Back
          </button>
        </div>
      )
    }
    const level = progress.levels[profile.id] ?? 1
    const copies = progress.copies[profile.id] ?? 0
    const need = copiesToUpgrade(level, profile.rarity)
    const cost = goldToUpgrade(level)
    const canUpgrade =
      progress.unlocked.includes(profile.id) &&
      level < MAX_CARD_LEVEL &&
      copies >= need &&
      gold >= cost

    return (
      <div className="relative h-full min-h-0">
        <CardProfile
          character={profile}
          level={level}
          copies={copies}
          favorite={progress.favorites.includes(profile.id)}
          unlocked={progress.unlocked.includes(profile.id)}
          gold={gold}
          canUpgrade={canUpgrade}
          needCopies={need}
          upgradeCost={cost}
          onBack={() => setProfileId(null)}
          onAdd={() => {
            addToDeck(profile.id)
            setProfileId(null)
            setPane('decks')
          }}
          onFavorite={() => toggleFavorite(profile.id)}
          onUpgrade={() => upgrade(profile.id)}
        />
        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
            <p className="rounded-lg bg-black/90 px-3 py-2.5 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/50">
              {toast}
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-3 pb-2 pt-[max(3.1rem,calc(env(safe-area-inset-top)+2.5rem))]">
        <div className="mx-auto flex max-w-md gap-1 rounded-xl bg-[#1a100c] p-1 ring-1 ring-white/10">
          {([
            ['decks', 'Decks'],
            ['collection', 'Collection'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPane(id)
                setPickSlot(null)
              }}
              className="flex-1 rounded-lg py-2 text-sm font-extrabold uppercase tracking-wide"
              style={{
                background:
                  pane === id ? 'linear-gradient(180deg,#ffe08a,#c9a227)' : 'transparent',
                color: pane === id ? '#1a1410' : '#f5d76e',
                boxShadow: pane === id ? '0 2px 0 #8a6a12' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {pane === 'decks' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24">
          <div className="mx-auto flex max-w-md gap-1.5">
            {Array.from({ length: DECK_SLOTS }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectDeck(i)}
                className="flex-1 rounded-lg py-2 text-sm font-black"
                style={{
                  background:
                    activeIdx === i
                      ? 'linear-gradient(180deg,#4a9eff,#2f6fbf)'
                      : '#2a1a12',
                  color: '#fff',
                  boxShadow: activeIdx === i ? '0 3px 0 #1d4a86' : 'none',
                  outline: activeIdx === i ? '2px solid #ffe08a' : undefined,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div
            className="mx-auto mt-3 max-w-md rounded-xl p-2.5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1f140e)',
              boxShadow: 'inset 0 1px 0 #c9a22744',
            }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
                Deck {activeIdx + 1}
              </p>
              <p className="flex items-center gap-1 text-sm font-black text-[#d8a0ff]">
                <ElixirDrop />
                {avgElixir}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: DECK_SIZE }, (_, i) => {
                const id = deck[i]
                const c = id ? getCharacter(id) ?? null : null
                const picking = pickSlot === i
                return (
                  <button
                    key={i}
                    type="button"
                    className="min-w-0"
                    onClick={() => {
                      if (c) removeFromDeck(i)
                      else setPickSlot(picking ? null : i)
                    }}
                    aria-label={c ? `Remove ${c.name}` : `Add to slot ${i + 1}`}
                    style={{
                      outline: picking ? '2px solid #4a9eff' : undefined,
                      borderRadius: 8,
                    }}
                  >
                    <BattleCard character={c} size="collection" />
                  </button>
                )
              })}
            </div>
            {pickSlot != null ? (
              <p className="mt-2 text-center text-xs font-bold text-[#8ec8ff]">
                Tap an unlocked card below to fill the slot
              </p>
            ) : (
              <p className="mt-2 text-center text-[0.65rem] font-semibold text-white/55">
                Tap a card to remove · tap empty to add · auto-saves
              </p>
            )}
          </div>

          {(pickSlot != null || deck.length < DECK_SIZE) && (
            <ul className="mx-auto mt-3 grid max-w-md grid-cols-4 gap-2">
              {CHARACTERS.filter((c) => progress.unlocked.includes(c.id)).map((c) => (
                <li key={c.id}>
                  <button type="button" className="w-full" onClick={() => addToDeck(c.id)}>
                    <BattleCard character={c} size="collection" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24">
          <div className="mx-auto max-w-md">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              Card Collection
            </h2>
            <p className="text-sm font-bold text-white/70">
              Found {collection.found}/{collection.total}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-[0.65rem] font-bold text-white/70">
                Rarity
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value as RarityFilter)}
                  className="rounded bg-[#221610] px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white outline-none ring-1 ring-white/15"
                >
                  <option value="all">All</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                className="rounded bg-[#221610] px-2 py-0.5 text-[0.65rem] font-extrabold text-white ring-1 ring-white/15"
              >
                Sort {sortDir === 'desc' ? '↓' : '↑'}
              </button>
            </div>

            <ul className="mt-3 grid grid-cols-4 gap-2">
              {collection.unlocked.map((c) => (
                <CollectionTile
                  key={c.id}
                  character={c}
                  level={progress.levels[c.id] ?? 1}
                  copies={progress.copies[c.id] ?? 0}
                  locked={false}
                  onClick={() => setProfileId(c.id)}
                />
              ))}
            </ul>

            {collection.locked.length > 0 ? (
              <>
                <p className="mb-2 mt-4 text-center text-[0.7rem] font-extrabold uppercase tracking-wide text-white/50">
                  Not found
                </p>
                <ul className="grid grid-cols-4 gap-2">
                  {collection.locked.map((c) => (
                    <CollectionTile
                      key={c.id}
                      character={c}
                      level={1}
                      copies={0}
                      locked
                      onClick={() => setProfileId(c.id)}
                    />
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      )}

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

function ElixirDrop() {
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-3.5 items-center justify-center text-[0.55rem] font-black text-white"
      style={{
        background: 'radial-gradient(circle at 35% 28%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
        clipPath: 'ellipse(46% 52% at 50% 48%)',
      }}
    />
  )
}

function CollectionTile({
  character,
  level,
  copies,
  locked,
  onClick,
}: {
  character: CharacterDef
  level: number
  copies: number
  locked: boolean
  onClick: () => void
}) {
  const need = copiesToUpgrade(level, character.rarity)
  const pct = locked ? 0 : Math.min(100, Math.round((copies / Math.max(1, need)) * 100))
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="relative w-full overflow-hidden rounded-lg"
        style={{ opacity: locked ? 0.45 : 1, filter: locked ? 'grayscale(1)' : undefined }}
      >
        <BattleCard character={character} size="collection" />
        <span
          className="absolute bottom-5 left-1/2 z-[2] -translate-x-1/2 rounded px-1 text-[0.5rem] font-black text-[#1a1410]"
          style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
        >
          {locked ? '?' : `Lv ${level}`}
        </span>
        <div className="absolute inset-x-1 bottom-1 z-[2] h-1 overflow-hidden rounded-full bg-black/60">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg,#7dff9a,#4a9eff)',
            }}
          />
        </div>
        <span
          className="pointer-events-none absolute right-1 top-1 z-[2] h-2 w-2 rounded-full"
          style={{ background: RARITY_PILL[character.rarity] }}
          aria-hidden
        />
      </button>
    </li>
  )
}

function CardProfile({
  character,
  level,
  copies,
  favorite,
  unlocked,
  canUpgrade,
  needCopies,
  upgradeCost,
  onBack,
  onAdd,
  onFavorite,
  onUpgrade,
}: {
  character: CharacterDef
  level: number
  copies: number
  favorite: boolean
  unlocked: boolean
  gold: number
  canUpgrade: boolean
  needCopies: number
  upgradeCost: number
  onBack: () => void
  onAdd: () => void
  onFavorite: () => void
  onUpgrade: () => void
}) {
  const need = needCopies
  const cost = upgradeCost
  const maxed = level >= MAX_CARD_LEVEL
  const hpNow = scaledStat(character.hp, level)
  const kindTag = cardKindLabel(character)

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="flex shrink-0 items-center gap-3 px-3 pb-2 pt-[max(3.1rem,calc(env(safe-area-inset-top)+2.5rem))]">
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
            {character.name}{' '}
            <span className="text-xl font-semibold text-[#f5d76e]/85">{kindTag}</span>
          </h2>
          <p
            className="mt-1 text-center text-sm font-extrabold uppercase tracking-wide"
            style={{ color: RARITY_PILL[character.rarity] }}
          >
            {RARITY_LABEL[character.rarity]}
          </p>
          <p className="mt-1 text-center text-sm font-extrabold text-white/45">Level {level}</p>
          <p className="mt-2 text-center text-sm font-semibold text-white/80">{character.blurb}</p>
          <p className="mt-1 text-center text-[0.7rem] font-semibold text-white/55">
            {copies}/{need} copies
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Health" value={String(hpNow)} />
            <Stat label="Speed" value={`${character.moveSpeed} blocks/s`} />
            <Stat
              label="Attack cooldown"
              value={character.attacks.length === 0 ? '—' : `${character.attackDelaySec}s`}
            />
            <Stat label="Height" value={character.height} />
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onFavorite}
              className="rounded-lg py-2.5 text-sm font-extrabold text-white"
              style={{ background: favorite ? '#8a6a12' : '#2a1a12' }}
            >
              {favorite ? '★ Favorited' : '☆ Favorite'}
            </button>
            <button
              type="button"
              onClick={onUpgrade}
              disabled={maxed || !unlocked}
              className="rounded-lg py-2.5 text-sm font-extrabold disabled:opacity-50"
              style={{
                background: canUpgrade
                  ? 'linear-gradient(180deg,#4a9eff,#2f6fbf)'
                  : maxed
                    ? '#2a1a12'
                    : 'linear-gradient(180deg,#4a9eff88,#2f6fbf88)',
                color: '#fff',
                boxShadow: canUpgrade ? '0 3px 0 #1d4a86' : 'none',
              }}
            >
              {maxed
                ? 'Max level 10'
                : !unlocked
                  ? 'Locked'
                  : canUpgrade
                    ? `Upgrade ${cost}g`
                    : copies < need
                      ? `Need ${need - copies} copies`
                      : `Need ${cost}g`}
            </button>
          </div>

          <button
            type="button"
            onClick={onAdd}
            disabled={!unlocked}
            className="mt-3 w-full rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410] disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: '0 3px 0 #8a6a12',
            }}
          >
            {unlocked ? 'Add to battle deck' : 'Locked'}
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
