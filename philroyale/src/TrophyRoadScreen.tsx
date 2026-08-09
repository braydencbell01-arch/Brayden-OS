import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getCharacter } from './characters'
import {
  ARENA_COLORS,
  CHEST_META,
  TROPHY_ROAD,
  type TrophyRoadReward,
} from './progression'
import {
  claimAvailableRoadRewards,
  claimRoadStep,
  loadProfile,
  loadTrophyRoad,
} from './storage'

type Props = {
  onBack: () => void
  onPlayBot: () => void
}

type RoadRow =
  | { kind: 'arena'; arena: string; trophies: number }
  | { kind: 'step'; step: TrophyRoadReward; idx: number; side: 'left' | 'right' }

function buildRows(): RoadRow[] {
  const rows: RoadRow[] = []
  let lastArena = ''
  let side: 'left' | 'right' = 'left'
  // Top of scroll = highest trophies (climb up like CR)
  for (let i = TROPHY_ROAD.length - 1; i >= 0; i--) {
    const step = TROPHY_ROAD[i]!
    if (step.arena !== lastArena) {
      rows.push({ kind: 'arena', arena: step.arena, trophies: step.trophies })
      lastArena = step.arena
    }
    rows.push({ kind: 'step', step, idx: i, side })
    side = side === 'left' ? 'right' : 'left'
  }
  return rows
}

function rewardIcon(step: TrophyRoadReward): { bg: string; glyph: string; sub: string } {
  if (step.chest) {
    const meta = CHEST_META[step.chest]
    return { bg: meta.color, glyph: '▣', sub: meta.label.replace(' Chest', '') }
  }
  if (step.unlockCard) {
    const c = getCharacter(step.unlockCard)
    return { bg: '#4a9eff', glyph: (c?.initial ?? '?').slice(0, 2), sub: c?.name ?? 'Card' }
  }
  if (step.gems) return { bg: '#7dffc8', glyph: '◆', sub: `${step.gems} gems` }
  return { bg: '#f5d76e', glyph: '●', sub: `${step.gold ?? 0}g` }
}

export function TrophyRoadScreen({ onBack, onPlayBot }: Props) {
  const [profile, setProfile] = useState(() => loadProfile())
  const [claimed, setClaimed] = useState(() => new Set(loadTrophyRoad().claimed))
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const youRef = useRef<HTMLLIElement>(null)

  const rows = useMemo(() => buildRows(), [])
  const colors = ARENA_COLORS[arenaFor(profile.trophies)] ?? ARENA_COLORS['Goblin Boot']!

  const readyCount = useMemo(() => {
    let n = 0
    for (let i = 0; i < TROPHY_ROAD.length; i++) {
      if (profile.trophies >= TROPHY_ROAD[i]!.trophies && !claimed.has(i)) n++
    }
    return n
  }, [profile.trophies, claimed])

  // Land on current trophy position when opening
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      youRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }

  function refresh() {
    setProfile(loadProfile())
    setClaimed(new Set(loadTrophyRoad().claimed))
  }

  function onClaimAll() {
    const msgs = claimAvailableRoadRewards()
    refresh()
    flash(msgs.length ? msgs.join(' · ') : 'Nothing new to claim')
  }

  function onNodeClick(idx: number) {
    setSelected(idx)
    const step = TROPHY_ROAD[idx]!
    const reached = profile.trophies >= step.trophies
    const done = claimed.has(idx)
    if (!reached) {
      flash(`Need ${step.trophies} trophies`)
      return
    }
    if (done) {
      flash('Already claimed')
      return
    }
    const res = claimRoadStep(idx)
    flash(res.message)
    if (res.ok) refresh()
  }

  const selectedStep = selected != null ? TROPHY_ROAD[selected] : null

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Arena-tinted sky */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 50% at 50% 0%, ${colors.accent}55 0%, transparent 55%),
            linear-gradient(180deg, ${colors.sky} 0%, ${colors.ground} 55%, #140e0a 100%)
          `,
        }}
      />

      <header className="relative z-20 shrink-0 px-3 pb-2 pt-[max(0.55rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-[#1a100c]/85 px-3 py-1.5 text-sm font-extrabold text-[#f5d76e] ring-1 ring-[#c9a227]/50"
          >
            ← Back
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[#f5d76e]">
              Trophy Road
            </h1>
            <p className="truncate text-xs font-bold text-white/80">
              Scroll the path · tap rewards to claim
            </p>
          </div>
          <div
            className="rounded-lg px-2.5 py-1.5 text-center"
            style={{
              background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
              boxShadow: '0 3px 0 #8a6a12',
            }}
          >
            <p className="text-[0.55rem] font-extrabold uppercase text-[#1a1410]/80">Trophies</p>
            <p className="text-sm font-black text-[#1a1410]">{profile.trophies}</p>
          </div>
        </div>
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
            Battle
          </button>
          <button
            type="button"
            onClick={onClaimAll}
            className="relative flex-1 rounded-lg py-2.5 text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
          >
            Claim all
            {readyCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3b3b] px-1 text-[0.65rem] font-black">
                {readyCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Scrollable zigzag path */}
      <div
        ref={scrollRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-28"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="relative mx-auto max-w-md py-4">
          {/* Center path rail */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-6 left-1/2 top-6 w-[10px] -translate-x-1/2 rounded-full"
            style={{
              background:
                'linear-gradient(180deg, #f5d76e 0%, #c9a227 40%, #8a6a12 100%)',
              boxShadow: 'inset 0 0 0 2px #ffe08a66, 0 0 12px #00000044',
            }}
          />

          <ul className="relative flex flex-col gap-5">
            {rows.map((row) => {
              if (row.kind === 'arena') {
                const ac = ARENA_COLORS[row.arena] ?? ARENA_COLORS['Goblin Boot']!
                return (
                  <li key={`arena-${row.arena}-${row.trophies}`} className="relative z-10">
                    <div
                      className="mx-auto max-w-[16rem] rounded-xl px-3 py-2.5 text-center"
                      style={{
                        background: `linear-gradient(180deg, ${ac.sky}, ${ac.ground})`,
                        boxShadow: '0 4px 0 #00000055, inset 0 1px 0 #ffffff33',
                      }}
                    >
                      <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[#f5d76e]">
                        {row.arena}
                      </p>
                      <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-white/80">
                        Arena · from {row.trophies} trophies
                      </p>
                    </div>
                  </li>
                )
              }

              const { step, idx, side } = row
              const reached = profile.trophies >= step.trophies
              const done = claimed.has(idx)
              const isYou =
                profile.trophies >= step.trophies &&
                (idx === TROPHY_ROAD.length - 1 ||
                  profile.trophies < (TROPHY_ROAD[idx + 1]?.trophies ?? Infinity))
              const icon = rewardIcon(step)
              const ready = reached && !done

              return (
                <li
                  key={`step-${idx}`}
                  ref={isYou ? youRef : undefined}
                  className={`relative z-10 flex ${side === 'left' ? 'justify-start pl-2' : 'justify-end pr-2'}`}
                >
                  {/* Branch from center rail */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 h-[3px] w-[22%] -translate-y-1/2"
                    style={{
                      left: side === 'left' ? '28%' : 'auto',
                      right: side === 'right' ? '28%' : 'auto',
                      background: reached
                        ? 'linear-gradient(90deg,#f5d76e,#c9a227)'
                        : '#5a4a30',
                    }}
                  />

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onNodeClick(idx)}
                    className="relative w-[42%] max-w-[10.5rem] rounded-2xl p-2 text-left"
                    style={{
                      background: ready
                        ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
                        : done
                          ? 'linear-gradient(180deg,#2d6a3a,#1a4024)'
                          : 'linear-gradient(180deg,#3a2418,#1a100c)',
                      boxShadow: ready
                        ? '0 5px 0 #8a6a12, 0 0 16px #f5d76e66'
                        : '0 4px 0 #00000055',
                      opacity: reached || done ? 1 : 0.55,
                    }}
                  >
                    {isYou ? (
                      <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#ff3b3b] px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-wide text-white shadow">
                        You
                      </span>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-sm font-black"
                        style={{
                          background: icon.bg,
                          color: '#1a1410',
                          boxShadow: 'inset 0 1px 0 #ffffff55',
                        }}
                      >
                        <span>{icon.glyph}</span>
                        <span className="text-[0.45rem] font-extrabold uppercase leading-none">
                          {icon.sub.slice(0, 8)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`truncate text-[0.7rem] font-black ${ready || done ? 'text-[#1a1410]' : 'text-white'}`}
                        >
                          {step.label}
                        </p>
                        <p
                          className={`text-[0.6rem] font-extrabold ${ready || done ? 'text-[#1a1410]/75' : 'text-[#f5d76e]'}`}
                        >
                          {step.trophies} trophies
                        </p>
                        <p
                          className={`text-[0.55rem] font-bold uppercase ${ready ? 'text-[#1b7a34]' : done ? 'text-white/80' : 'text-white/50'}`}
                        >
                          {done ? 'Claimed' : ready ? 'Tap to claim' : 'Locked'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Bottom detail / battle dock */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
        style={{
          background: 'linear-gradient(180deg, transparent, #140e0acc 18%, #140e0a)',
        }}
      >
        <div
          className="mx-auto max-w-md rounded-xl px-3 py-2.5"
          style={{
            background: 'linear-gradient(180deg,#3a2418,#1a100c)',
            boxShadow: 'inset 0 1px 0 #c9a22744, 0 -4px 20px #00000066',
          }}
        >
          {selectedStep ? (
            <p className="text-center text-xs font-bold text-white/85">
              <span className="text-[#f5d76e]">{selectedStep.trophies}</span>
              {' · '}
              {selectedStep.arena}
              {' · '}
              {selectedStep.label}
              {selectedStep.gold ? ` · ${selectedStep.gold}g` : ''}
              {selectedStep.chest ? ` · ${CHEST_META[selectedStep.chest].label}` : ''}
              {selectedStep.unlockCard
                ? ` · Unlock ${getCharacter(selectedStep.unlockCard)?.name}`
                : ''}
            </p>
          ) : (
            <p className="text-center text-xs font-bold text-white/70">
              Swipe up for higher arenas · swipe down toward Goblin Boot
            </p>
          )}
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <p className="rounded-lg bg-black/90 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/45">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function arenaFor(trophies: number): string {
  let arena = TROPHY_ROAD[0]!.arena
  for (const step of TROPHY_ROAD) {
    if (trophies >= step.trophies) arena = step.arena
  }
  return arena
}
