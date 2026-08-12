import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getCharacter } from './characters'
import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { BattleCard } from './BattleCard'
import { ChestArt } from './ChestOpen'
import { FriendProfileModal } from './FriendsScreen'
import { arenaThemeBackground } from './arenaThemes'
import {
  ARENA_COLORS,
  CHEST_META,
  TROPHY_ROAD,
  type TrophyRoadReward,
} from './progression'
import { type FriendPresenceInfo } from './socialHub'
import {
  claimAvailableRoadRewards,
  claimRoadStep,
  loadAvatarId,
  loadFriendMeta,
  loadFriends,
  loadPeakTrophies,
  loadProfile,
  loadTrophyRoad,
  markFriendBattled,
  saveFriendMeta,
  saveFriends,
  type Friend,
  type FriendMeta,
  type GameMode,
} from './storage'

type Props = {
  onBack: () => void
  onPlayBot: () => void
  friendPresence?: Record<string, FriendPresenceInfo>
  loadFriendsFn?: () => Friend[]
  onRequestBattle?: (
    name: string,
    opts?: { mode?: GameMode; playerId?: string },
  ) => Promise<void>
  onInviteClub?: (name: string, playerId?: string) => void | Promise<void>
  onSpectate?: (friendName: string, info: FriendPresenceInfo) => void
}

function rewardCopies(step: TrophyRoadReward): number | null {
  if (step.cardCopies) return step.cardCopies.copies
  if (step.unlockCard) return 1
  return null
}

function RoadRewardIcon({ step }: { step: TrophyRoadReward }) {
  if (step.chest) {
    return (
      <div className="relative h-[4.35rem] w-[3.05rem] shrink-0">
        <ChestArt rarity={step.chest} size="sm" />
      </div>
    )
  }
  const charId = step.unlockCard ?? step.cardCopies?.charId
  const copies = rewardCopies(step)
  if (charId && copies != null) {
    const c = getCharacter(charId)
    if (!c) return null
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="w-[3.05rem] shrink-0">
          <BattleCard character={c} size="hand" />
        </div>
        <span className="rounded-md bg-[#1a1410]/95 px-1.5 py-0.5 text-[0.7rem] font-black text-[#f5d76e] ring-1 ring-[#c9a227]/70">
          ×{copies}
        </span>
      </div>
    )
  }
  if (step.gems) {
    return (
      <div
        className="flex h-[4.35rem] w-[3.05rem] shrink-0 flex-col items-center justify-center rounded-[0.4rem] text-sm font-black"
        style={{ background: '#7dffc8', color: '#1a1410' }}
      >
        <span>◆</span>
        <span className="text-[0.5rem] font-extrabold uppercase">{step.gems}</span>
      </div>
    )
  }
  return (
    <div
      className="flex h-[4.35rem] w-[3.05rem] shrink-0 flex-col items-center justify-center rounded-[0.4rem] text-sm font-black"
      style={{ background: '#f5d76e', color: '#1a1410' }}
    >
      <span>●</span>
      <span className="text-[0.5rem] font-extrabold uppercase">{step.gold ?? 0}g</span>
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

function arenaBackdrop(arena: string): string {
  return arenaThemeBackground(arena)
}

export function TrophyRoadScreen({
  onBack,
  onPlayBot,
  friendPresence = {},
  loadFriendsFn = loadFriends,
  onRequestBattle,
  onInviteClub,
  onSpectate,
}: Props) {
  const [profile, setProfile] = useState(() => loadProfile())
  const [claimed, setClaimed] = useState(() => new Set(loadTrophyRoad().claimed))
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [friends, setFriends] = useState(() => loadFriendsFn())
  const [meta, setMeta] = useState<FriendMeta>(() => loadFriendMeta())
  const [profileFriend, setProfileFriend] = useState<Friend | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [viewArena, setViewArena] = useState(() => arenaFor(loadProfile().trophies))
  useEffect(() => {
    const sync = () => setFriends(loadFriendsFn())
    window.addEventListener('philroyale-friends-changed', sync)
    const id = window.setInterval(() => {
      sync()
      setNow(Date.now())
    }, 4000)
    return () => {
      window.removeEventListener('philroyale-friends-changed', sync)
      window.clearInterval(id)
    }
  }, [loadFriendsFn])
  const youRef = useRef<HTMLLIElement>(null)
  const peakRef = useRef<HTMLLIElement>(null)
  const railTrackRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewArenaRef = useRef(viewArena)
  const arenaRafRef = useRef(0)
  const avatarId = useMemo(() => loadAvatarId(), [])
  const peak = Math.max(loadPeakTrophies(), profile.trophies, profile.peakTrophies ?? 0)

  const colors = ARENA_COLORS[viewArena] ?? ARENA_COLORS['Training Camp']!
  const maxTrophies = TROPHY_ROAD[TROPHY_ROAD.length - 1]?.trophies ?? 5000
  const [railFill, setRailFill] = useState({ cur: 0, peak: 0, h: 0 })

  const stepsDesc = useMemo(
    () =>
      [...TROPHY_ROAD]
        .map((step, idx) => ({ step, idx }))
        .reverse(),
    [],
  )

  /** High→low sections; each arena fills from its bottom label up to the next arena. */
  const arenaSections = useMemo(() => {
    const sections: { arena: string; items: { step: (typeof TROPHY_ROAD)[number]; idx: number }[] }[] =
      []
    for (const item of stepsDesc) {
      const last = sections[sections.length - 1]
      if (!last || last.arena !== item.step.arena) {
        sections.push({ arena: item.step.arena, items: [item] })
      } else {
        last.items.push(item)
      }
    }
    return sections
  }, [stepsDesc])

  const readyCount = useMemo(() => {
    let n = 0
    for (let i = 0; i < TROPHY_ROAD.length; i++) {
      if (profile.trophies >= TROPHY_ROAD[i]!.trophies && !claimed.has(i)) n++
    }
    return n
  }, [profile.trophies, claimed])

  const friendMarkers = useMemo(() => {
    return friends.map((f) => {
      const live =
        f.playerId && typeof friendPresence[f.playerId]?.trophies === 'number'
          ? friendPresence[f.playerId]!.trophies!
          : undefined
      const t = typeof live === 'number' ? live : typeof f.trophies === 'number' ? f.trophies : 0
      return { friend: f, trophies: t }
    })
  }, [friends, friendPresence])

  /** Attach each friend to the nearest road step index (still show at 0). */
  const friendsByStep = useMemo(() => {
    const map = new Map<number, { friend: Friend; trophies: number }[]>()
    for (const f of friendMarkers) {
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < TROPHY_ROAD.length; i++) {
        const d = Math.abs(TROPHY_ROAD[i]!.trophies - f.trophies)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      const list = map.get(best) ?? []
      list.push(f)
      map.set(best, list)
    }
    return map
  }, [friendMarkers])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      youRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [])

  /**
   * Arena for the reward row closest to the probe — labels sit at the *bottom*
   * of each arena, so “banners past probe” wrongly picks the arena above.
   */
  function computeViewArena(): string {
    const scroller = scrollRef.current
    const list = listRef.current
    const fallback = arenaFor(profile.trophies)
    if (!scroller || !list) return viewArenaRef.current || fallback
    const scrollerTop = scroller.getBoundingClientRect().top
    const probe = scrollerTop + Math.min(120, scroller.clientHeight * 0.28)
    const rows = list.querySelectorAll<HTMLElement>('[data-arena-row]')
    let best = ''
    let bestDist = Infinity
    rows.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.bottom < scrollerTop - 40 || rect.top > scrollerTop + scroller.clientHeight + 40) {
        return
      }
      const mid = rect.top + rect.height / 2
      const dist = Math.abs(mid - probe)
      if (dist < bestDist) {
        bestDist = dist
        best = el.dataset.arenaRow || best
      }
    })
    if (!best) {
      const sections = list.querySelectorAll<HTMLElement>('[data-arena-section]')
      sections.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top <= probe && rect.bottom >= probe) {
          best = el.dataset.arenaSection || best
        }
      })
    }
    return best || viewArenaRef.current || fallback
  }

  function scheduleViewArena() {
    if (arenaRafRef.current) return
    arenaRafRef.current = window.requestAnimationFrame(() => {
      arenaRafRef.current = 0
      const next = computeViewArena()
      if (next === viewArenaRef.current) return
      viewArenaRef.current = next
      setViewArena(next)
    })
  }

  useLayoutEffect(() => {
    function measureRail() {
      const list = listRef.current
      const track = railTrackRef.current
      const you = youRef.current
      const peakEl = peakRef.current
      if (!list || !track) return
      const trackH = track.clientHeight
      const trackBottom = track.getBoundingClientRect().bottom
      const fromBottom = (el: HTMLElement | null) => {
        if (!el) return 0
        const mid = el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2
        return Math.max(0, Math.min(trackH, trackBottom - mid))
      }
      setRailFill({
        cur: fromBottom(you),
        peak: Math.max(fromBottom(peakEl), fromBottom(you)),
        h: trackH,
      })
    }
    function onScrollOrResize() {
      measureRail()
      scheduleViewArena()
    }
    onScrollOrResize()
    const ro = new ResizeObserver(onScrollOrResize)
    if (listRef.current) ro.observe(listRef.current)
    if (scrollRef.current) ro.observe(scrollRef.current)
    return () => {
      ro.disconnect()
      if (arenaRafRef.current) window.cancelAnimationFrame(arenaRafRef.current)
    }
  }, [profile.trophies, peak, stepsDesc, friendsByStep])

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

  function togglePin(id: string) {
    setMeta((prev) => {
      const next = {
        ...prev,
        pinned: { ...prev.pinned, [id]: !prev.pinned[id] },
      }
      saveFriendMeta(next)
      return next
    })
  }

  function removeFriend(id: string) {
    const next = friends.filter((f) => f.id !== id)
    setFriends(next)
    saveFriends(next)
    setProfileFriend(null)
  }

  const selectedStep = selected != null ? TROPHY_ROAD[selected] : null

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-500 ease-out"
        style={{ background: arenaBackdrop(viewArena) }}
      />
      <header className="relative z-20 shrink-0 px-3 pb-2 pt-[max(3.4rem,calc(env(safe-area-inset-top)+2.85rem))]">
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
        <div
          className="mt-2 rounded-lg px-3 py-1.5 text-center"
          style={{
            background: `linear-gradient(180deg, ${colors.sky}cc, ${colors.ground}ee)`,
            boxShadow: '0 3px 0 #00000044, inset 0 1px 0 #ffffff33',
          }}
        >
          <p className="text-[0.55rem] font-extrabold uppercase tracking-wide text-white/75">
            Arena section
          </p>
          <p className="font-[family-name:var(--font-display)] text-base tracking-wide text-[#f5d76e]">
            {viewArena}
          </p>
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
        ref={scrollRef}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-28"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={scheduleViewArena}
      >
        <div className="relative mx-auto max-w-md py-4 pl-12 pr-1">
          <ul ref={listRef} className="relative flex flex-col gap-6">
            <div
              ref={railTrackRef}
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 top-0 w-3 overflow-hidden rounded-full"
              style={{
                background: 'linear-gradient(180deg,#0a2040,#061428)',
                boxShadow: 'inset 0 0 0 2px #1a4a8a88',
              }}
            >
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{
                  height: railFill.peak,
                  background: 'linear-gradient(180deg,#4a7aaa88,#2a4a6a66)',
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{
                  height: railFill.cur,
                  background: 'linear-gradient(180deg,#6ec8ff,#2f6fbf)',
                  boxShadow: 'inset 0 1px 0 #ffffff44',
                }}
              />
            </div>

            {arenaSections.map((section) => {
              const arenaTone = ARENA_COLORS[section.arena] ?? colors
              return (
                <li
                  key={`arena-${section.arena}`}
                  className="relative list-none rounded-2xl px-1.5 pb-3 pt-2"
                  data-arena-section={section.arena}
                  style={{
                    background: arenaBackdrop(section.arena),
                    boxShadow: 'inset 0 1px 0 #ffffff22, 0 6px 0 #00000033',
                  }}
                >
                  <ul className="relative flex flex-col gap-6">
                    {section.items.map(({ step, idx }) => {
                      const reached = profile.trophies >= step.trophies
                      const done = claimed.has(idx)
                      const isYou =
                        profile.trophies >= step.trophies &&
                        (idx === TROPHY_ROAD.length - 1 ||
                          profile.trophies < (TROPHY_ROAD[idx + 1]?.trophies ?? Infinity))
                      const isPeakStep =
                        peak >= step.trophies &&
                        (idx === TROPHY_ROAD.length - 1 ||
                          peak < (TROPHY_ROAD[idx + 1]?.trophies ?? Infinity))
                      const ready = reached && !done
                      const friendsHere = friendsByStep.get(idx) ?? []

                      return (
                        <li
                          key={`step-${idx}`}
                          ref={(el) => {
                            if (isYou) youRef.current = el
                            if (isPeakStep) peakRef.current = el
                          }}
                          className="relative"
                          data-arena-row={step.arena}
                        >
                          {friendsHere.map((f, fi) => (
                            <button
                              key={f.friend.id}
                              type="button"
                              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                              style={{
                                left: `${0.375 - fi * 0.05}rem`,
                                top: `${18 + fi * 18}%`,
                              }}
                              title={`${f.friend.name}: ${f.trophies}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setProfileFriend(f.friend)
                              }}
                            >
                              <div
                                className="flex h-7 w-7 flex-col items-center justify-center overflow-hidden rounded-md ring-2 ring-white"
                                style={{ background: CARD_PORTRAIT_BG }}
                              >
                                <span className="text-[0.55rem] font-black leading-none text-[#f5d76e]">
                                  {f.friend.name.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="text-[0.4rem] font-extrabold leading-none text-white/80">
                                  {f.trophies}
                                </span>
                              </div>
                            </button>
                          ))}

                          {isYou ? (
                            <div
                              className="pointer-events-none absolute left-[0.375rem] top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
                              aria-hidden
                            >
                              <span
                                className="rounded px-1 py-0.5 text-[0.5rem] font-black text-[#1a1410]"
                                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
                              >
                                {profile.trophies}
                              </span>
                            </div>
                          ) : null}

                          <div className="relative ml-2 flex items-center gap-2">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              onClick={() => onNodeClick(idx)}
                              className="relative min-w-0 flex-1 overflow-visible rounded-xl p-2 text-left"
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
                              <div className="relative z-[1] flex items-center gap-2 px-0.5">
                                <RoadRewardIcon step={step} />
                                <div className="min-w-0 flex-1 text-right">
                                  <p className="truncate text-[0.75rem] font-black text-white drop-shadow">
                                    {step.label}
                                  </p>
                                  <p className="text-[0.7rem] font-extrabold text-[#f5d76e]">
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
                            {done ? (
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7dff9a] text-sm font-black text-[#1a1410] ring-2 ring-white/80"
                                aria-label="Claimed"
                              >
                                ✓
                              </span>
                            ) : (
                              <span className="h-7 w-7 shrink-0" aria-hidden />
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <div
                    data-arena-banner={section.arena}
                    className="mt-3 ml-2 max-w-[14rem] rounded-xl px-3 py-2"
                    style={{
                      background: `linear-gradient(180deg, ${arenaTone.sky}, ${arenaTone.ground})`,
                      boxShadow: '0 4px 0 #00000055, inset 0 1px 0 #ffffff33',
                    }}
                  >
                    <p className="font-[family-name:var(--font-display)] text-base tracking-wide text-[#f5d76e]">
                      {section.arena}
                    </p>
                  </div>
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

      {profileFriend ? (
        <FriendProfileModal
          friend={profileFriend}
          presence={
            profileFriend.playerId ? friendPresence[profileFriend.playerId] : undefined
          }
          now={now}
          note={meta.notes[profileFriend.id] ?? ''}
          pinned={!!meta.pinned[profileFriend.id]}
          onClose={() => setProfileFriend(null)}
          onInvite={() => {
            const pid = profileFriend.playerId
            if (!pid || !onRequestBattle) {
              flash('Open Social to invite this friend')
              setProfileFriend(null)
              return
            }
            const f = profileFriend
            setProfileFriend(null)
            markFriendBattled(f.id)
            setMeta(loadFriendMeta())
            void onRequestBattle(f.name, { mode: 'classic', playerId: pid })
          }}
          onSpectate={
            onSpectate
              ? () => {
                  const p = profileFriend.playerId
                    ? friendPresence[profileFriend.playerId]
                    : undefined
                  if (p) {
                    onSpectate(profileFriend.name, p)
                    setProfileFriend(null)
                  }
                }
              : undefined
          }
          onTogglePin={() => togglePin(profileFriend.id)}
          onRemove={() => removeFriend(profileFriend.id)}
          onInviteClub={() => {
            void onInviteClub?.(profileFriend.name, profileFriend.playerId)
            setProfileFriend(null)
          }}
        />
      ) : null}
    </div>
  )
}
