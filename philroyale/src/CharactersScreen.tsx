import { useMemo, useState } from 'react'
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
  loadCardProgress,
  loadDeck,
  loadProfile,
  saveCardProgress,
  saveDeck,
  tryUpgradeCard,
  type CardProgress,
} from './storage'
import { BattleCard } from './BattleCard'

/** Sort keys + rarity/fav filters live in one Sort control. */
type SortMode =
  | 'name'
  | 'rarity'
  | 'elixir'
  | 'level'
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'favorites'

const RARITY_PILL: Record<Rarity, string> = {
  common: '#b8c0cc',
  rare: '#e67e22',
  epic: '#b14fd6',
  legendary: '#f5d76e',
}

const RARITY_FILTERS: Rarity[] = ['common', 'rare', 'epic', 'legendary']

export function CharactersScreen() {
  const [deck, setDeck] = useState<string[]>(() => loadDeck())
  const [progress, setProgress] = useState<CardProgress>(() => loadCardProgress())
  const [gold, setGold] = useState(() => loadProfile().gold)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('rarity')
  const [query, setQuery] = useState('')

  const profile = profileId ? getCharacter(profileId) : null

  const sorted = useMemo(() => {
    let list = [...CHARACTERS]
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q))
    if (RARITY_FILTERS.includes(sortMode as Rarity)) {
      list = list.filter((c) => c.rarity === sortMode)
    } else if (sortMode === 'favorites') {
      list = list.filter((c) => progress.favorites.includes(c.id))
    }
    if (sortMode === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortMode === 'elixir') {
      list.sort((a, b) => a.elixir - b.elixir || a.name.localeCompare(b.name))
    } else if (sortMode === 'level') {
      list.sort(
        (a, b) =>
          (progress.levels[b.id] ?? 1) - (progress.levels[a.id] ?? 1) ||
          a.name.localeCompare(b.name),
      )
    } else {
      list.sort(
        (a, b) =>
          RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.name.localeCompare(b.name),
      )
    }
    return list
  }, [sortMode, query, progress])

  const collectionPct = useMemo(() => {
    const unlocked = progress.unlocked.length
    const maxLevel = CHARACTERS.length * MAX_CARD_LEVEL
    const sum = CHARACTERS.reduce((n, c) => n + (progress.levels[c.id] ?? 1), 0)
    return Math.round(((unlocked / CHARACTERS.length) * 0.4 + (sum / maxLevel) * 0.6) * 100)
  }, [progress])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  function addToDeck(id: string) {
    if (!progress.unlocked.includes(id)) {
      flash('Card locked — unlock on Trophy Road or from chests')
      return
    }
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

  function suggestDeck() {
    const unlocked = CHARACTERS.filter((c) => progress.unlocked.includes(c.id))
    const ranked = [...unlocked].sort((a, b) => {
      const af = progress.favorites.includes(a.id) ? 1 : 0
      const bf = progress.favorites.includes(b.id) ? 1 : 0
      if (af !== bf) return bf - af
      return (
        (progress.levels[b.id] ?? 1) - (progress.levels[a.id] ?? 1) ||
        RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]
      )
    })
    const pick = ranked.slice(0, DECK_SIZE).map((c) => c.id)
    while (pick.length < DECK_SIZE && unlocked.length) {
      pick.push(unlocked[pick.length % unlocked.length]!.id)
    }
    setDeck(pick)
    flash('Suggested deck filled — save to lock it in')
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

  if (profile) {
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
          onAdd={() => addToDeck(profile.id)}
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
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Cards
        </h1>
        <p className="text-sm font-semibold text-white/70">
          +5% HP & DM per level (max {MAX_CARD_LEVEL}) · {collectionPct}% collected
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
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={suggestDeck}
            className="rounded-lg py-2 text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
          >
            Suggest deck
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg py-2 text-sm font-extrabold text-[#1a1410]"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: '0 3px 0 #8a6a12',
            }}
          >
            Save battle deck
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards"
            className="min-w-0 flex-1 rounded-lg bg-[#221610] px-2.5 py-1.5 text-xs font-semibold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
          />
          <label className="flex items-center gap-1 text-[0.65rem] font-bold text-white/70">
            Sort
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded bg-[#221610] px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white outline-none ring-1 ring-white/15"
            >
              <optgroup label="Sort by">
                <option value="rarity">All · Rarity</option>
                <option value="level">All · Level</option>
                <option value="elixir">All · Elixir</option>
                <option value="name">All · Name</option>
              </optgroup>
              <optgroup label="Show">
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="favorites">★ Favorites</option>
              </optgroup>
            </select>
          </label>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sorted.map((c) => {
            const level = progress.levels[c.id] ?? 1
            const fav = progress.favorites.includes(c.id)
            const locked = !progress.unlocked.includes(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setProfileId(c.id)}
                  className="w-full rounded-lg p-1.5 ring-1 ring-white/10"
                  style={{ background: '#221610', opacity: locked ? 0.55 : 1 }}
                >
                  <BattleCard character={c} size="collection" />
                  <p className="mt-1 truncate text-center text-[0.7rem] font-extrabold text-white">
                    {locked ? '· ' : fav ? '★ ' : ''}
                    {c.name}
                  </p>
                  <p
                    className="text-center text-[0.55rem] font-extrabold uppercase tracking-wide"
                    style={{ color: RARITY_PILL[c.rarity] }}
                  >
                    {locked ? 'Locked' : `Lv ${level} · ${RARITY_LABEL[c.rarity]}`}
                  </p>
                </button>
              </li>
            )
          })}
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
  level,
  copies,
  favorite,
  unlocked,
  gold,
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

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Health" value={String(hpNow)} />
            <Stat label="Speed" value={`${character.moveSpeed} blocks/s`} />
            <Stat
              label="Attack cooldown"
              value={character.attacks.length === 0 ? '—' : `${character.attackDelaySec}s`}
            />
            <Stat label="Height" value={character.height} />
          </dl>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
            Attacks
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {character.attacks.length === 0 ? (
              <li className="rounded-lg bg-[#140e0a] px-3 py-2 ring-1 ring-white/10">
                <p className="font-extrabold text-white">None</p>
                <p className="text-xs font-semibold text-white/65">
                  Human shield — no attack
                  {character.dropsRageHeart
                    ? ' · drops a rage heart on death (any troop, 3s)'
                    : ''}
                </p>
              </li>
            ) : null}
            {character.attacks.map((a) => (
              <li
                key={a.id}
                className="rounded-lg bg-[#140e0a] px-3 py-2 ring-1 ring-white/10"
              >
                <p className="font-extrabold text-white">{a.name}</p>
                <p className="text-xs font-semibold text-white/65">
                  {scaledStat(a.damage, level)} DM (base {a.damage}) · {a.range} block range
                  {a.rootWhileAttacking ? ' · stops to attack' : ' · can move while attacking'}
                  {character.targetsBuildingsOnly ? ' · buildings & towers only' : ''}
                  {character.noLock ? ' · never locks (nearest foe)' : ''}
                  {a.pullToRange != null ? ` · pulls units to ${a.pullToRange} block` : ''}
                  {a.knockbackTiles != null
                    ? ` · launches troops ${a.knockbackTiles} blocks (damage on land; not buildings/towers)`
                    : ''}
                  {a.splashRadius != null ? ` · ${a.splashRadius} block splash` : ''}
                  {a.burstShots != null && a.burstShots > 1
                    ? ` · ${a.burstShots} shots ${a.burstGapSec ?? 0}s apart`
                    : ''}
                </p>
              </li>
            ))}
          </ul>

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
                    ? `Upgrade ${cost}g (+5%)`
                    : copies < need
                      ? `Need ${need - copies} more copies`
                      : `Need ${cost}g`}
            </button>
          </div>
          {!maxed ? (
            <p className="mt-1 text-center text-[0.7rem] font-semibold text-white/55">
              {copies}/{need} copies · {gold} gold · +5% HP & DM per level
            </p>
          ) : null}

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
            {unlocked ? 'Add to battle deck' : 'Locked — Trophy Road / chests'}
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
