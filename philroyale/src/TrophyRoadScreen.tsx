import { useMemo, useState } from 'react'
import { getCharacter } from './characters'
import { CHEST_META, TROPHY_ROAD } from './progression'
import {
  claimAvailableRoadRewards,
  loadProfile,
  loadTrophyRoad,
} from './storage'

type Props = {
  onBack: () => void
  onPlayBot: () => void
}

export function TrophyRoadScreen({ onBack, onPlayBot }: Props) {
  const [profile, setProfile] = useState(() => loadProfile())
  const [claimed, setClaimed] = useState(() => new Set(loadTrophyRoad().claimed))
  const [toast, setToast] = useState<string | null>(null)

  const steps = useMemo(() => [...TROPHY_ROAD].reverse(), [])

  function claim() {
    const msgs = claimAvailableRoadRewards()
    setProfile(loadProfile())
    setClaimed(new Set(loadTrophyRoad().claimed))
    setToast(msgs.length ? msgs.join(' · ') : 'Nothing new to claim')
    window.setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-[#3a2418] px-3 py-1.5 text-sm font-extrabold text-[#f5d76e] ring-1 ring-[#c9a227]/50"
          >
            ← Back
          </button>
          <h1 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[#f5d76e]">
            Trophy Road
          </h1>
        </div>
        <p className="mt-1 text-sm font-semibold text-white/70">
          {profile.trophies} trophies · battle bots to climb and unlock rewards
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onPlayBot}
            className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: '0 3px 0 #8a6a12',
            }}
          >
            Battle bot
          </button>
          <button
            type="button"
            onClick={claim}
            className="flex-1 rounded-lg py-2.5 text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
          >
            Claim rewards
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 rounded-full"
          style={{ background: 'linear-gradient(180deg,#f5d76e,#8a6a12)' }}
        />
        <ul className="relative flex flex-col gap-3">
          {steps.map((step) => {
            const idx = TROPHY_ROAD.indexOf(step)
            const reached = profile.trophies >= step.trophies
            const done = claimed.has(idx)
            const unlock = step.unlockCard ? getCharacter(step.unlockCard) : null
            const chest = step.chest ? CHEST_META[step.chest] : null
            return (
              <li
                key={`${step.trophies}-${step.label}`}
                className="relative ml-auto mr-auto w-full max-w-sm rounded-xl px-3 py-3"
                style={{
                  background: reached
                    ? 'linear-gradient(180deg,#3a2418,#1f140e)'
                    : '#1a120e',
                  opacity: reached ? 1 : 0.55,
                  boxShadow: reached ? 'inset 0 1px 0 #c9a22744' : 'none',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
                      {step.arena} · {step.trophies} trophies
                    </p>
                    <p className="font-extrabold text-white">{step.label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-white/65">
                      {[
                        step.gold ? `${step.gold} gold` : null,
                        chest?.label,
                        unlock ? `Unlock ${unlock.name}` : null,
                        step.gems ? `${step.gems} gems` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-md px-2 py-1 text-[0.65rem] font-extrabold uppercase"
                    style={{
                      background: done ? '#1b7a34' : reached ? '#c9a227' : '#2a1a12',
                      color: done || reached ? '#fff' : '#fff6e8',
                    }}
                  >
                    {done ? 'Claimed' : reached ? 'Ready' : 'Locked'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <p className="rounded-lg bg-black/85 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/40">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  )
}
