import { useState } from 'react'
import { SEASON_FREE_TRACK } from './clubMeta'
import {
  claimSeasonReward,
  kingInfo,
  loadProfile,
  loadSeason,
  type SeasonState,
} from './storage'
import type { GameMode } from './storage'

type Props = {
  onPlay: (opponentName?: string | null, mode?: GameMode) => void
}

export function EventsScreen({ onPlay }: Props) {
  const [season, setSeason] = useState<SeasonState>(() => loadSeason())
  const [toast, setToast] = useState<string | null>(null)
  const king = kingInfo()
  const profile = loadProfile()

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  function refresh() {
    setSeason(loadSeason())
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Events
        </h1>
        <p className="text-sm font-semibold text-white/70">
          King Lv {king.level} · {king.into}/{king.need} XP · Season {season.seasonId}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
        >
          <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">Season pass</p>
          <p className="text-sm font-semibold text-white/80">
            {season.points} season points · claim free track rewards
          </p>
          <ul className="mt-2 space-y-1.5">
            {SEASON_FREE_TRACK.slice(0, 6).map((step, i) => {
              const claimed = season.claimed.includes(i)
              const ready = season.points >= step.points && !claimed
              const label = step.chest
                ? `${step.chest} chest`
                : step.gems
                  ? `${step.gems} gems`
                  : step.gold
                    ? `${step.gold} gold`
                    : step.copies
                      ? `${step.copies.amount}× ${step.copies.rarity}`
                      : 'Reward'
              return (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-[#221610] px-2.5 py-2 ring-1 ring-white/10"
                >
                  <span className="text-xs font-bold text-white/80">
                    {step.points} pts · {label}
                  </span>
                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => {
                      const r = claimSeasonReward(i)
                      flash(r.message)
                      refresh()
                    }}
                    className="rounded-md px-2 py-1 text-[0.65rem] font-extrabold disabled:opacity-40"
                    style={{
                      background: claimed
                        ? '#2a1a12'
                        : 'linear-gradient(180deg,#ffe08a,#c9a227)',
                      color: claimed ? '#fff6e8aa' : '#1a1410',
                    }}
                  >
                    {claimed ? 'Claimed' : ready ? 'Claim' : 'Locked'}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
        >
          <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">Game modes</p>
          <p className="text-sm font-semibold text-white/80">
            Only two modes — classic towers or touchdown football.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => onPlay(null, 'classic')}
              className="rounded-lg bg-[#221610] px-3 py-3 text-left ring-1 ring-white/10"
            >
              <p className="text-sm font-extrabold text-white">Normal</p>
              <p className="text-xs font-semibold text-white/55">
                Classic 1v1 · destroy towers · {profile.trophies} trophies
              </p>
            </button>
            <button
              type="button"
              onClick={() => onPlay(null, 'touchdown')}
              className="rounded-lg bg-[#221610] px-3 py-3 text-left ring-1 ring-white/10"
            >
              <p className="text-sm font-extrabold text-white">Touchdown</p>
              <p className="text-xs font-semibold text-white/55">
                Football field · end zones · no towers · first to 3
              </p>
            </button>
          </div>
        </section>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <p className="rounded-lg bg-black/90 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/45">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  )
}
