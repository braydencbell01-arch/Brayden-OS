import { PHIL } from './characters'
import { BattleCard } from './BattleCard'

export function CharactersScreen() {
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Characters
        </h1>
        <p className="text-sm font-semibold text-white/70">
          Only Phil is in the game right now. Your battle deck is eight Phil cards.
        </p>
      </header>

      <div className="mx-auto w-full max-w-sm px-4 pt-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: 'linear-gradient(180deg,#3a2418,#1f140e)',
            boxShadow: 'inset 0 1px 0 #c9a22744',
          }}
        >
          <div className="mx-auto w-28">
            <BattleCard character={PHIL} />
          </div>
          <h2 className="mt-3 text-center font-[family-name:var(--font-display)] text-2xl text-[#f5d76e]">
            {PHIL.name}
          </h2>
          <p className="mt-1 text-center text-sm font-semibold text-white/80">{PHIL.blurb}</p>
          <ul className="mt-3 space-y-1 text-sm font-bold text-white/70">
            <li>Elixir: {PHIL.elixir}</li>
            <li>Sundae range: {PHIL.sundaeRangeTiles} tiles · 1s cooldown</li>
            <li>Whip: close range · stops while whipping</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
