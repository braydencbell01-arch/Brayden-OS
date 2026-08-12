import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getCharacter } from './characters'
import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { BattleCard } from './BattleCard'
import { ChestArt } from './ChestOpen'
import {
  ARENA_COLORS,
  CHEST_META,
  TROPHY_ROAD,
  trophyRoadProgress,
  type TrophyRoadReward,
} from './progression'
import { type FriendPresenceInfo } from './socialHub'
import {
  claimAvailableRoadRewards,
  claimRoadStep,
  loadAvatarId,
  loadFriends,
  loadPeakTrophies,
  loadProfile,
  loadTrophyRoad,
  type Friend,
} from './storage'

type Props = {
  onBack: () => void
  onPlayBot: () => void
  friendPresence?: Record<string, FriendPresenceInfo>
  loadFriendsFn?: () => Friend[]
}

function RoadRewardIcon({ step }: { step: TrophyRoadReward }) {
  if (step.chest) {
    return (
      <div className="relative h-12 w-12 shrink-0">
        <ChestArt rarity={step.chest} size="sm" />
      </div>
    )
  }
  if (step.unlockCard) {
    const c = getCharacter(step.unlockCard)
    if (!c) return null
    return (
      <div className="relative h-12 w-12 shrink-0">
        <BattleCard character={c} size="collection" />
        <span className="absolute -bottom-0.5 -right-0.5 z-[3] rounded bg-[#1a1410]/90 px-1 text-[0.5rem] font-black text-[#f5d76e] ring-1 ring-[#c9a227]/60">
          x1
        </span>
      </div>
    )
  }
  if (step.cardCopies) {
    const c = getCharacter(step.cardCopies.charId)
    if (!c) return null
    return (
      <div className="relative h-12 w-12 shrink-0">
        <BattleCard character={c} size="collection" />
        <span className="absolute -bottom-0.5 -right-0.5 z-[3] rounded bg-[#1a1410]/90 px-1 text-[0.5rem] font-black text-[#f5d76e] ring-1 ring-[#c9a227]/60">
          x{step.cardCopies.copies}
        </span>
      </div>
    )
  }
  if (step.gems) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-sm font-black"
        style={{ background: '#7dffc8', color: '#1a1410' }}
      >
        <span>◆</span>
        <span className="text-[0.45rem] font-extrabold uppercase">{step.gems}</span>
      </div>
    )
  }
  return (
    <div
      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-sm font-black"
      style={{ background: '#f5d76e', color: '#1a1410' }}
    >
      <span>●</span>
      <span className="text-[0.45rem] font-extrabold uppercase">{step.gold ?? 0}g</span>
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

export function TrophyRoadScreen({
  onBack,
  onPlayBot,
  friendPresence = {},
  loadFriendsFn = loadFriends,
}: Props) {
  const [profile, setProfile] = useState(() => loadProfile())
  const [claimed, setClaimed] = useState(() => new Set(loadTrophyRoad().claimed))
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [friends] = useState(() => loadFriendsFn())
  const youRef = useRef<HTMLLIElement>(null)
  const avatarId = useMemo(() => loadAvatarId(), [])
  const peak = Math.max(loadPeakTrophies(), profile.trophies, profile.peakTrophies ?? 0)

  const colors = ARENA_COLORS[arenaFor(profile.trophies)] ?? ARENA_COLORS['Goblin Boot']!
  const maxTrophies = TROPHY_ROAD[TROPHY_ROAD.length - 1]?.trophies ?? 5000
  const curPct = trophyRoadProgress(profile.trophies) * 100
  const peakPct = trophyRoadProgress(peak) * 100

  const stepsDesc = useMemo(
    () =>
      [...TROPHY_ROAD]
        .map((step, idx) => ({ step, idx }))
        .reverse(),
    [],
  )

  const readyCount = useMemo(() => {
    let n = 0
    for (let i = 0; i < TROPHY_ROAD.length; i++) {
      if (profile.trophies >= TROPHY_ROAD[i]!.trophies && !claimed.has(i)) n++
    }
    return n
  }, [profile.trophies, claimed])

  const friendMarkers = useMemo(() => {
    return friends.map((f) => {
      const t =
        f.playerId && typeof friendPresence[f.playerId]?.trophies === 'number'
          ? friendPresence[f.playerId]!.trophies!
          : 0
      return { id: f.id, name: f.name, trophies: t }
    })
  }, [friends, friendPresence])

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

      <header className="relative z-20 shrink-0 px-3 pb-2 pt-[max(3.1rem,calc(env(safe-area-inset-top)+2.5rem))]">
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
              {profile.trophies} now · peak {peak}
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

      <div
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-28"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="relative mx-auto max-w-md py-4 pl-10">
          {/* Left blue progress rail */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-4 left-3 top-4 w-3 overflow-hidden rounded-full"
            style={{
              background: 'linear-gradient(180deg,#0a2040,#061428)',
              boxShadow: 'inset 0 0 0 2px #1a4a8a88',
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: `${peakPct}%`,
                background: 'linear-gradient(180deg,#4a7aaa88,#2a4a6a66)',
              }}
            />
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: `${curPct}%`,
                background: 'linear-gradient(180deg,#6ec8ff,#2f6fbf)',
                boxShadow: 'inset 0 1px 0 #ffffff44',
              }}
            />
          </div>

          {friendMarkers.map((f) => {
            const pct = trophyRoadProgress(f.trophies) * 100
            return (
              <div
                key={f.id}
                className="pointer-events-none absolute left-0.5 z-20 -translate-y-1/2"
                style={{ bottom: `calc(1rem + (100% - 2rem) * ${pct / 100})` }}
                title={`${f.name}: ${f.trophies}`}
              >
                <div
                  className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full ring-2 ring-white"
                  style={{ background: CARD_PORTRAIT_BG }}
                >
                  <span className="text-[0.55rem] font-black text-[#f5d76e]">
                    {f.name.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              </div>
            )
          })}

          <ul className="relative flex flex-col gap-6">
            {stepsDesc.map(({ step, idx }, rowI) => {
              const reached = profile.trophies >= step.trophies
              const done = claimed.has(idx)
              const isYou =
                profile.trophies >= step.trophies &&
                (idx === TROPHY_ROAD.length - 1 ||
                  profile.trophies < (TROPHY_ROAD[idx + 1]?.trophies ?? Infinity))
              const ready = reached && !done
              const showArena =
                rowI === 0 || stepsDesc[rowI - 1]?.step.arena !== step.arena

              return (
                <li key={`step-${idx}`} ref={isYou ? youRef : undefined} className="relative">
                  {showArena ? (
                    <div
                      className="mb-3 ml-2 max-w-[14rem] rounded-xl px-3 py-2"
                      style={{
                        background: `linear-gradient(180deg, ${(ARENA_COLORS[step.arena] ?? colors).sky}, ${(ARENA_COLORS[step.arena] ?? colors).ground})`,
                        boxShadow: '0 4px 0 #00000055, inset 0 1px 0 #ffffff33',
                      }}
                    >
                      <p className="font-[family-name:var(--font-display)] text-base tracking-wide text-[#f5d76e]">
                        {step.arena}
                      </p>
                    </div>
                  ) : null}

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onNodeClick(idx)}
                    className="relative ml-2 w-[90%] max-w-[17rem] overflow-hidden rounded-xl p-2 text-left"
                    style={{
                      background: 'linear-gradient(180deg,#6a6e78,#3a3e48 55%,#2a2e36)',
                      boxShadow: ready
                        ? '0 5px 0 #1a1e24, 0 0 14px #6ec8ff66'
                        : '0 5px 0 #1a1e24',
                      opacity: reached || done ? 1 : 0.6,
                    }}
                  >
                    {isYou ? (
                      <span className="absolute -left-1 -top-3 z-10 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#ff3b3b]">
                        <span
                          className="flex h-full w-full items-end justify-center"
                          style={{ background: CARD_PORTRAIT_BG }}
                        >
                          <CharacterModel
                            charId={avatarId}
                            anim="idle"
                            facing={-Math.PI / 2}
                            portrait
                          />
                        </span>
                      </span>
                    ) : null}
                    {done ? (
                      <span className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#7dff9a] text-[0.7rem] font-black text-[#1a1410] ring-1 ring-white/80">
                        ✓
                      </span>
                    ) : null}
                    <div className="relative z-[1] flex items-center justify-between gap-2 px-1">
                      <RoadRewardIcon step={step} />
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate text-[0.7rem] font-black text-white drop-shadow">
                          {step.label}
                        </p>
                        <p className="text-[0.65rem] font-extrabold text-[#f5d76e]">
                          {step.trophies}
                        </p>
                        <p
                          className={`text-[0.55rem] font-bold uppercase ${ready ? 'text-[#7dff9a]' : done ? 'text-white/70' : 'text-white/45'}`}
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
          <p className="mt-4 text-center text-[0.6rem] font-bold text-white/40">
            Max {maxTrophies} trophies
          </p>
        </div>
      </div>

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
                ? ` · x1 ${getCharacter(selectedStep.unlockCard)?.name}`
                : ''}
              {selectedStep.cardCopies
                ? ` · x${selectedStep.cardCopies.copies} ${getCharacter(selectedStep.cardCopies.charId)?.name}`
                : ''}
            </p>
          ) : (
            <p className="text-center text-xs font-bold text-white/70">
              Single rewards · claim when you reach each marker
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
