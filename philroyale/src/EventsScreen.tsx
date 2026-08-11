import { kingInfo, loadProfile, loadSeason } from './storage'
import type { GameMode } from './storage'

type Props = {
  onPlay: (opponentName?: string | null, mode?: GameMode) => void
}

export function EventsScreen({ onPlay }: Props) {
  const season = loadSeason()
  const king = kingInfo()
  const profile = loadProfile()

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
          <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">Season</p>
          <p className="text-sm font-semibold text-white/80">
            {season.points} season points from battles you play — no free click rewards.
          </p>
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
                Football field · score in the end zone · draft a deck first
              </p>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
