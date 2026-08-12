import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { canDeployAllyAt, canDeployTouchdownAt } from './arena'
import { Arena, clientToArenaTile, unitStyle, unitVisualWidthPct, FIELD_W, FIELD_H } from './Arena'
import type { GameMode } from './storage'
import {
  OVERTIME_SECONDS,
  earnsTrophies,
  elixirMultiplier,
  formatElixirMult,
  regulationSeconds,
} from './gameModes'
import { BattleCard } from './BattleCard'
import {
  BulletBoom,
  CannonBall,
  DumbbellDot,
  DumbbellSplat,
  IceCreamSplat,
  MeleeHitFx,
  LoveDot,
  LoveSplat,
  WitchcraftDot,
  WitchcraftSplat,
  RageHeartPickup,
  ShootDot,
  SlobberDot,
  SlobberSplat,
  CashDot,
  CashSplat,
  FootballDot,
  FootballSplat,
  BaseballDot,
  BaseballSplat,
  PancakeDot,
  PancakeSplat,
  RocketDot,
  RocketSplat,
  SundaeDot,
  SundaeSplat,
  TowerArrow,
  UnitToken,
} from './UnitToken'
import { ARENA_TILT_DEG } from './camera'
import {
  battlefieldScaleForHeight,
  getCharacter,
  isSpellCard,
  randomBotDeck,
} from './characters'
import { ARENA_COLS, ARENA_ROWS } from './arena'
import {
  grantBattleChest,
  loadActiveEmotes,
  loadDeck,
  loadProfile,
  noteCardDeployed,
  recordMatchResult,
} from './storage'
import { getEmoteById, PHIL_EMOTE_SRC, type EmoteDef } from './emoteCatalog'
import { CharacterModel } from './characters/CharacterModel'
import type { BattleNet } from './battleSync'
import { useBattle } from './useBattle'
import { sfx } from './audio'

type Props = {
  onExit: () => void
  opponentName?: string | null
  opponentClanName?: string | null
  opponentTrophies?: number
  allyLevels?: Record<string, number>
  botLevel?: number
  mode?: GameMode
  /** Override battle deck (touchdown draft). */
  deckIds?: string[]
  /** Shared friend-battle room (host authoritative). */
  net?: BattleNet | null
  /** Watching a friend's match — no deploys / trophy changes. */
  spectating?: boolean
  /** Friend never linked — App should drop net so local bot AI can run. */
  onPeerLinkFailed?: () => void
  /** Friend linked — App should stop invite spam / clear invite UI. */
  onPeerLinked?: () => void
}

type DragState = {
  charId: string
  pointerId: number
  col: number
  row: number
  overArena: boolean
  valid: boolean
}

type MatchResult = 'victory' | 'defeat' | 'draw'

type ActiveEmote = { key: number; option: EmoteDef }

function emoteOptionsFromActive(): EmoteDef[] {
  return loadActiveEmotes()
    .map((id) => getEmoteById(id))
    .filter((e): e is EmoteDef => !!e)
}

function FlyingShot({
  fromCol,
  fromRow,
  toCol,
  toRow,
  bornAt,
  arriveAt,
  now,
  kind,
}: {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  bornAt: number
  arriveAt: number
  now: number
  kind:
    | 'sundae'
    | 'slobber'
    | 'shoot'
    | 'dumbbell'
    | 'love'
    | 'witchcraft'
    | 'arrow'
    | 'cannon'
    | 'iceCream'
    | 'football'
    | 'baseball'
    | 'cash'
    | 'rocket'
    | 'pancake'
}) {
  const dur = Math.max(1, arriveAt - bornAt)
  const p = Math.min(1, Math.max(0, (now - bornAt) / dur))
  const col = fromCol + (toCol - fromCol) * p
  const row = fromRow + (toRow - fromRow) * p
  const arc =
    kind === 'arrow'
      ? Math.sin(p * Math.PI) * 2.2
      : kind === 'cannon'
        ? Math.sin(p * Math.PI) * 1.6
        : Math.sin(p * Math.PI) *
          (kind === 'shoot'
            ? 0.6
            : kind === 'cash'
              ? 3.2
              : kind === 'rocket'
                ? 11
              : kind === 'dumbbell'
                ? 7.5
                : kind === 'slobber'
                  ? 5.5
                  : kind === 'love'
                    ? 2.4
                    : kind === 'witchcraft'
                      ? 1.8
                    : kind === 'iceCream'
                      ? 9
                      : kind === 'football'
                        ? 14
                        : kind === 'baseball'
                          ? 12
                        : kind === 'pancake'
                          ? 8
                        : 4)
  const style = unitStyle(col, row - arc)
  const travelAngle =
    (Math.atan2(toRow - fromRow, toCol - fromCol) * 180) / Math.PI
  const spin =
    kind === 'football' || kind === 'baseball'
      ? p * 720
      : kind === 'cash'
        ? p * 540
        : kind === 'dumbbell'
          ? p * 480
          : kind === 'pancake'
            ? p * 360
          : 0
  const aimKinds =
    kind === 'rocket' ||
    kind === 'shoot' ||
    kind === 'witchcraft' ||
    kind === 'arrow' ||
    kind === 'football' ||
    kind === 'baseball' ||
    kind === 'cash' ||
    kind === 'dumbbell' ||
    kind === 'pancake'
  const transform = aimKinds
    ? `translate(-50%, -50%) rotate(${travelAngle + (kind === 'football' || kind === 'baseball' || kind === 'cash' || kind === 'dumbbell' || kind === 'pancake' ? spin : 0)}deg)`
    : undefined

  return (
    <div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{
        ...style,
        transform,
      }}
      aria-hidden
    >
      {kind === 'sundae' || kind === 'iceCream' ? <SundaeDot /> : null}
      {kind === 'pancake' ? <PancakeDot /> : null}
      {kind === 'football' ? <FootballDot /> : null}
      {kind === 'baseball' ? <BaseballDot /> : null}
      {kind === 'cash' ? <CashDot /> : null}
      {kind === 'rocket' ? <RocketDot /> : null}
      {kind === 'slobber' ? <SlobberDot /> : null}
      {kind === 'shoot' ? <ShootDot /> : null}
      {kind === 'dumbbell' ? <DumbbellDot /> : null}
      {kind === 'love' ? <LoveDot /> : null}
      {kind === 'witchcraft' ? <WitchcraftDot /> : null}
      {kind === 'arrow' ? <TowerArrow angleDeg={0} /> : null}
      {kind === 'cannon' ? <CannonBall /> : null}
    </div>
  )
}

/** Full-screen friend-match lag pause — both clients freeze until clear. */
function LagPauseOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[70] flex flex-col items-center justify-center"
      style={{ background: 'rgba(8,6,4,0.72)' }}
      role="status"
      aria-label="Lag — match paused"
    >
      <div
        className="flex flex-col items-center gap-3 rounded-2xl px-8 py-7"
        style={{
          background: 'linear-gradient(180deg,#3a2418ee,#1a100cee)',
          boxShadow: '0 12px 40px #00000099, inset 0 0 0 2px #ff6b4a88',
        }}
      >
        <svg width="92" height="72" viewBox="0 0 22 18" aria-hidden>
          <rect x="2" y="12" width="3" height="4" rx="0.5" fill="#ff8a70" />
          <rect x="7" y="9" width="3" height="7" rx="0.5" fill="#ff8a70" />
          <rect x="12" y="5" width="3" height="11" rx="0.5" fill="#ff8a7044" />
          <rect x="17" y="2" width="3" height="14" rx="0.5" fill="#ff8a7022" />
          <line x1="1" y1="2" x2="21" y2="16" stroke="#ff3b30" strokeWidth="2.2" />
        </svg>
        <p className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[#ffb4a4]">
          LAG
        </p>
        <p className="max-w-[14rem] text-center text-sm font-bold text-white/75">
          Match paused — waiting for both players to reconnect
        </p>
      </div>
    </div>
  )
}

/** Clash-style lag / high ping indicator (solo / corner). */
function LagBadge() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        background: 'linear-gradient(180deg,#2a2018ee,#120e0acc)',
        boxShadow: '0 2px 8px #0008, inset 0 0 0 1px #ff6b4a88',
      }}
      role="status"
      aria-label="Lagging"
    >
      <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden>
        <rect x="2" y="12" width="3" height="4" rx="0.5" fill="#ff8a70" />
        <rect x="7" y="9" width="3" height="7" rx="0.5" fill="#ff8a70" />
        <rect x="12" y="5" width="3" height="11" rx="0.5" fill="#ff8a7044" />
        <rect x="17" y="2" width="3" height="14" rx="0.5" fill="#ff8a7022" />
        <line x1="1" y1="2" x2="21" y2="16" stroke="#ff3b30" strokeWidth="2.2" />
      </svg>
      <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[#ffb4a4]">
        Lag
      </span>
    </div>
  )
}

export function BattleScreen({
  onExit,
  opponentName,
  opponentClanName = null,
  opponentTrophies = 3200,
  allyLevels,
  botLevel = 1,
  mode = 'classic',
  deckIds: deckOverride,
  net = null,
  spectating = false,
  onPeerLinkFailed,
  onPeerLinked,
}: Props) {
  const isSpectating = spectating || net?.role === 'spectator'
  const deckIds = useMemo(() => deckOverride ?? loadDeck(), [deckOverride])
  // Solo: BattleScreen may pass a pre-rolled deck; useBattle also locks one if missing.
  const botDeckIds = useMemo(() => randomBotDeck(), [])
  const trophies = useMemo(() => loadProfile().trophies, [])
  const [drawPile, setDrawPile] = useState<string[]>([])
  const [hand, setHand] = useState<string[]>([])
  const [nextId, setNextId] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(() => regulationSeconds(mode))
  const [overtime, setOvertime] = useState(false)
  const overtimeUsedRef = useRef(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [draggingActive, setDraggingActive] = useState(false)
  const [emotePickerOpen, setEmotePickerOpen] = useState(false)
  const [activeEmote, setActiveEmote] = useState<ActiveEmote | null>(null)
  const emoteKeyRef = useRef(0)
  const emoteOptions = useMemo(() => emoteOptionsFromActive(), [emotePickerOpen])
  const [result, setResult] = useState<MatchResult | null>(null)
  /** Once the friend link succeeds once, never show Connecting overlay again. */
  const [linkLocked, setLinkLocked] = useState(() => !net)
  const arenaRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const rewardsAppliedRef = useRef(false)
  const ended = result != null

  function applyForfeitIfNeeded() {
    if (isSpectating || result || rewardsAppliedRef.current) return
    rewardsAppliedRef.current = true
    const isPvp = !!net && net.role !== 'spectator'
    recordMatchResult('defeat', {
      crowns: 0,
      pvp: isPvp,
      opponentTrophies: isPvp ? opponentTrophies : undefined,
      awardsTrophies: earnsTrophies(mode),
    })
  }

  function leaveBattle() {
    applyForfeitIfNeeded()
    onExit()
  }

  useEffect(() => {
    if (isSpectating || result) return
    const onUnload = () => applyForfeitIfNeeded()
    window.addEventListener('pagehide', onUnload)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('pagehide', onUnload)
      window.removeEventListener('beforeunload', onUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpectating, result, mode, net, opponentTrophies])
  const {
    elixir,
    elixirMax,
    remoteOvertime,
    units,
    projectiles,
    splats,
    hearts,
    towers,
    selectedCharId,
    setSelectedCharId,
    deploy,
    now,
    allyScore,
    enemyScore,
    touchdownWinScore,
    syncReady: _syncReady,
    peerJoined: _peerJoined,
    linkReady,
    clockSec,
    setClockSec,
    netRole,
    lagging,
    enemyDeckIds: cpuDeckIds,
  } = useBattle({
    paused: ended,
    allyLevels,
    botLevel,
    trophies,
    mode,
    overtime,
    // Solo bot: always pass a fresh 8-from-23 deck. Friend net → AI off, deck unused.
    enemyDeckIds: net ? undefined : botDeckIds,
    net,
    onPeerLinkFailed,
  })

  const overtimeActive = overtime || remoteOvertime
  const displayElixirMult = elixirMultiplier(mode, overtimeActive)

  useEffect(() => {
    if (!net) return
    if (net.role === 'guest' || net.role === 'spectator') {
      setSeconds(clockSec)
    }
  }, [net, clockSec])

  useEffect(() => {
    if (remoteOvertime) {
      setOvertime(true)
      overtimeUsedRef.current = true
    }
  }, [remoteOvertime])

  useEffect(() => {
    if (!linkReady) return
    setLinkLocked(true)
  }, [linkReady])

  useEffect(() => {
    if (!linkLocked || !net) return
    onPeerLinked?.()
    // Intentionally only when we first lock the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per successful link
  }, [linkLocked])

  useEffect(() => {
    if (!net || net.role !== 'host' || !linkReady) return
    setClockSec(seconds)
  }, [net, linkReady, seconds, setClockSec])

  useEffect(() => {
    const pile = [...deckIds].sort(() => Math.random() - 0.5)
    const h = pile.slice(0, 4)
    setHand(h)
    setNextId(pile[4] ?? null)
    setDrawPile(pile.slice(5))
    setSelectedCharId(h[0] ?? 'phil')
  }, [deckIds, setSelectedCharId])

  // Also gate deploy/clock on linkLocked so a brief sync blip can't soft-lock input.
  // Friend lag pause freezes the match clock until both players recover.
  useEffect(() => {
    if (ended || isSpectating || (net && !linkLocked) || (net && lagging)) return
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [ended, isSpectating, net, linkLocked, lagging])

  useEffect(() => {
    if (!result) return
    if (result === 'victory') sfx.victory()
    else if (result === 'defeat') sfx.defeat()
  }, [result])

  const prevScores = useRef({ ally: 0, enemy: 0 })
  useEffect(() => {
    if (mode !== 'touchdown') return
    if (allyScore > prevScores.current.ally || enemyScore > prevScores.current.enemy) {
      sfx.touchdown()
    }
    prevScores.current = { ally: allyScore, enemy: enemyScore }
  }, [allyScore, enemyScore, mode])

  useEffect(() => {
    if (result) return
    if (mode === 'touchdown') {
      if (allyScore >= touchdownWinScore) {
        setResult('victory')
        setEmotePickerOpen(false)
        return
      }
      if (enemyScore >= touchdownWinScore) {
        setResult('defeat')
        setEmotePickerOpen(false)
        return
      }
      if (isSpectating || seconds > 0) return
      if (allyScore === enemyScore && !overtimeUsedRef.current) {
        overtimeUsedRef.current = true
        setOvertime(true)
        setSeconds(OVERTIME_SECONDS)
        return
      }
      setResult(
        allyScore > enemyScore ? 'victory' : enemyScore > allyScore ? 'defeat' : 'draw',
      )
      setEmotePickerOpen(false)
      return
    }
    const allyKing = towers.find((t) => t.id === 'ally-king')
    const enemyKing = towers.find((t) => t.id === 'enemy-king')
    if (enemyKing && enemyKing.hp <= 0) {
      setResult('victory')
      setEmotePickerOpen(false)
      return
    }
    if (allyKing && allyKing.hp <= 0) {
      setResult('defeat')
      setEmotePickerOpen(false)
      return
    }
    if (isSpectating || seconds > 0) return
    const allyLeft = towers.filter((t) => t.side === 'ally' && t.hp > 0).length
    const enemyLeft = towers.filter((t) => t.side === 'enemy' && t.hp > 0).length
    if (allyLeft === enemyLeft && !overtimeUsedRef.current) {
      overtimeUsedRef.current = true
      setOvertime(true)
      setSeconds(OVERTIME_SECONDS)
      return
    }
    setResult(allyLeft > enemyLeft ? 'victory' : enemyLeft > allyLeft ? 'defeat' : 'draw')
    setEmotePickerOpen(false)
  }, [towers, seconds, result, mode, allyScore, enemyScore, touchdownWinScore, isSpectating])

  useEffect(() => {
    if (!result || isSpectating || rewardsAppliedRef.current) return
    rewardsAppliedRef.current = true
    const enemyDead = towers.filter((t) => t.side === 'enemy' && t.hp <= 0).length
    const crowns = result === 'victory' ? Math.max(1, Math.min(3, enemyDead)) : result === 'draw' ? 1 : 0
    const isPvp = !!net && net.role !== 'spectator'
    recordMatchResult(result, {
      crowns,
      pvp: isPvp,
      opponentTrophies: isPvp ? opponentTrophies : undefined,
      awardsTrophies: earnsTrophies(mode),
    })
    grantBattleChest(result)
  }, [result, isSpectating, net, opponentTrophies, towers, mode])

  function cycleAfterDeploy(playedId: string) {
    const incoming = nextId
    const pile = [...drawPile]
    const newNext = pile.shift() ?? null
    pile.push(playedId)
    setHand((h) => {
      const idx = h.indexOf(playedId)
      if (idx < 0) return h
      const copy = [...h]
      copy[idx] = incoming ?? playedId
      if (selectedCharId === playedId) setSelectedCharId(copy[idx])
      return copy
    })
    setNextId(newNext)
    setDrawPile(pile)
  }

  function liveTowerIds() {
    return new Set(towers.filter((t) => t.hp > 0).map((t) => t.id))
  }

  function canPlace(col: number, row: number, charId?: string | null): boolean {
    const c = Math.floor(col)
    const r = Math.floor(row)
    if (c < 0 || c >= ARENA_COLS || r < 0 || r >= ARENA_ROWS) return false
    const def = charId
      ? getCharacter(charId)
      : selectedCharId
        ? getCharacter(selectedCharId)
        : undefined
    if (isSpellCard(def)) return true
    if (mode === 'touchdown') {
      return canDeployTouchdownAt(c, r, 'ally', liveTowerIds())
    }
    return canDeployAllyAt(c, r, towers, liveTowerIds())
  }

  function onArenaPointer(col: number, row: number) {
    if (ended || (net && !linkLocked)) return
    if (dragRef.current) return
    setEmotePickerOpen(false)
    if (!selectedCharId) return
    const card = getCharacter(selectedCharId)
    if (!card || elixir < card.elixir) return
    const ok = deploy(card, col, row)
    if (ok) {
      noteCardDeployed(1)
      cycleAfterDeploy(card.id)
    }
  }

  function updateDragFromPointer(clientX: number, clientY: number, base: DragState) {
    const arena = arenaRef.current
    if (!arena) {
      const next = { ...base, overArena: false, valid: false }
      dragRef.current = next
      setDrag(next)
      return
    }
    const tile = clientToArenaTile(arena, clientX, clientY)
    if (!tile) {
      const next = { ...base, overArena: false, valid: false, col: base.col, row: base.row }
      dragRef.current = next
      setDrag(next)
      return
    }
    const valid = canPlace(tile.col, tile.row, base.charId)
    const next = {
      ...base,
      overArena: true,
      valid,
      col: Math.floor(tile.col),
      row: Math.floor(tile.row),
    }
    dragRef.current = next
    setDrag(next)
  }

  function onCardPointerDown(e: React.PointerEvent, charId: string) {
    if (ended || (net && !linkLocked)) return
    setEmotePickerOpen(false)
    const card = getCharacter(charId)
    if (!card || elixir < card.elixir) {
      setSelectedCharId(charId)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    movedRef.current = false
    setDraggingActive(false)
    dragOriginRef.current = { x: e.clientX, y: e.clientY }
    const start: DragState = {
      charId,
      pointerId: e.pointerId,
      col: 50,
      row: 120,
      overArena: false,
      valid: false,
    }
    dragRef.current = start
    setDrag(start)
    setSelectedCharId(charId)
    updateDragFromPointer(e.clientX, e.clientY, start)
  }

  function onCardPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const origin = dragOriginRef.current
    if (origin) {
      const dx = e.clientX - origin.x
      const dy = e.clientY - origin.y
      if (dx * dx + dy * dy > 100) {
        movedRef.current = true
        setDraggingActive(true)
      }
    }
    updateDragFromPointer(e.clientX, e.clientY, d)
  }

  function onCardPointerUp(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    const dropped = d
    const didDrag = movedRef.current
    dragRef.current = null
    dragOriginRef.current = null
    setDrag(null)
    setDraggingActive(false)

    if (!didDrag || !dropped.overArena) {
      setSelectedCharId(dropped.charId)
      return
    }

    const card = getCharacter(dropped.charId)
    if (!card || elixir < card.elixir || !dropped.valid) return
    const ok = deploy(card, dropped.col, dropped.row)
    if (ok) {
      sfx.deploy()
      noteCardDeployed(1)
      cycleAfterDeploy(card.id)
    }
  }

  function pickEmote(option: EmoteDef) {
    const key = ++emoteKeyRef.current
    setActiveEmote({ key, option })
    setEmotePickerOpen(false)
    window.setTimeout(() => {
      setActiveEmote((cur) => (cur?.key === key ? null : cur))
    }, 2200)
  }

  const mm = String(Math.floor(seconds / 60))
  const ss = String(seconds % 60).padStart(2, '0')
  const elixirDisplay = Math.floor(elixir)
  const dragChar = drag ? getCharacter(drag.charId) : null
  const foeName = opponentName?.trim() || 'Trainer'
  const clanLine = opponentClanName?.trim() || null
  const resultCopy =
    result === 'victory' ? 'Victory!' : result === 'defeat' ? 'Defeat' : result === 'draw' ? 'Draw' : null
  const dragIsSpell = !!(dragChar && isSpellCard(dragChar))
  const selectedIsSpell = !!(selectedCharId && isSpellCard(getCharacter(selectedCharId)))
  const showSpellZone =
    !ended &&
    !isSpectating &&
    ((draggingActive && dragIsSpell) || (!draggingActive && selectedIsSpell))
  const showTroopBlock =
    draggingActive && !ended && !isSpectating && !dragIsSpell

  return (
    <div className="relative h-[100dvh] min-h-0 overflow-hidden bg-[#3a9a45]">
      {net && !linkLocked ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl text-white">
            {isSpectating
              ? 'Joining spectate…'
              : netRole === 'guest'
                ? 'Connecting to friend…'
                : 'Waiting for friend to join…'}
          </p>
          <p className="max-w-xs text-sm font-semibold text-white/75">
            Keep Phil Royale open on both phones. Accept the invite on the other phone — the match
            starts when both are connected.
          </p>
        </div>
      ) : null}
      {lagging ? (net ? <LagPauseOverlay /> : <LagBadge />) : null}
      {/* Map sits above the solid CR blue dock so all six towers stay visible. */}
      <div
        className={`absolute inset-x-0 top-0 ${isSpectating ? 'bottom-[4.25rem]' : 'bottom-[6.85rem]'}`}
      >
        <Arena
          ref={arenaRef}
          towers={towers}
          mode={mode}
          onArenaPointerDown={ended || isSpectating ? undefined : onArenaPointer}
          showBlockedOverlay={showTroopBlock}
          spellDeployOverlay={showSpellZone}
          overlaySide="ally"
        >
          {[...units]
            .sort((a, b) => a.row - b.row)
            .map((u) => {
              const uDef = getCharacter(u.charId)
              let sizeScale = battlefieldScaleForHeight(uDef?.height ?? "5'7\"")
              if (uDef?.cardKind === 'building') sizeScale *= 1.28
              if (u.charId === 'bigMable') sizeScale *= 1.35
              const flight = u.launch
              let drawCol = u.col
              let drawRow = u.row
              let launchArc = 0
              if (flight && now < flight.arriveAt) {
                const dur = Math.max(1, flight.arriveAt - flight.bornAt)
                const p = Math.min(1, Math.max(0, (now - flight.bornAt) / dur))
                drawCol = flight.fromCol + (flight.toCol - flight.fromCol) * p
                drawRow = flight.fromRow + (flight.toRow - flight.fromRow) * p
                // Spirits leap onto foes with a clear hop arc.
                const arcH = flight.leapHit ? 5.2 : 7.5
                launchArc = Math.sin(p * Math.PI) * arcH
              }
              const deployMs = (uDef?.deployDelaySec ?? 0) * 1000
              const deployLeft =
                deployMs > 0 ? Math.max(0, u.spawnedAt + deployMs - now) : 0
              const deployWarming = deployLeft > 0
              return (
              <div
                key={u.id}
                className="absolute -translate-x-1/2 -translate-y-[92%]"
                style={{
                  ...unitStyle(drawCol, drawRow - launchArc),
                  width: unitVisualWidthPct(sizeScale),
                  zIndex: 10 + Math.round(drawRow) + (launchArc > 0.2 ? 8 : 0),
                }}
              >
                <UnitToken
                  charId={u.charId}
                  side={u.side}
                  hp={u.hp}
                  maxHp={u.maxHp}
                  vfx={u.vfx}
                  enraged={u.enraged}
                  facing={u.facing}
                  moving={now < u.movingUntil || !!flight}
                />
                {deployWarming ? (
                  <div
                    className="pointer-events-none absolute left-1/2 bottom-full z-20 mb-1 -translate-x-1/2"
                    aria-hidden
                  >
                    <div
                      className="relative flex h-3 w-3 items-center justify-center rounded-full font-extrabold text-[#1a1410]"
                      style={{
                        background:
                          'conic-gradient(#c9a227 ' +
                          `${((1 - deployLeft / deployMs) * 100).toFixed(1)}%` +
                          ', #2a1a12 0)',
                        boxShadow: '0 0 0 1px #8a6a12',
                      }}
                    >
                      <span
                        className="flex h-2 w-2 items-center justify-center rounded-full text-[0.32rem] leading-none"
                        style={{ background: '#f5d76e' }}
                      >
                        {Math.ceil(deployLeft / 1000)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              )
            })}
          {projectiles.map((p) =>
            p.kind === 'sundae' ||
            p.kind === 'slobber' ||
            p.kind === 'shoot' ||
            p.kind === 'dumbbell' ||
            p.kind === 'love' ||
            p.kind === 'witchcraft' ||
            p.kind === 'arrow' ||
            p.kind === 'cannon' ||
            p.kind === 'iceCream' ||
            p.kind === 'football' ||
            p.kind === 'baseball' ||
            p.kind === 'cash' ||
            p.kind === 'rocket' ||
            p.kind === 'pancake' ? (
              <FlyingShot key={p.id} {...p} kind={p.kind} now={now} />
            ) : null,
          )}
          {splats.map((s) => (
            <div key={s.id}>
              {s.radius != null && s.radius > 0 ? (
                <div
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    ...unitStyle(s.col, s.row),
                    width: `${((s.radius * 2) / ARENA_COLS) * FIELD_W * 100}%`,
                    height: `${((s.radius * 2) / ARENA_ROWS) * FIELD_H * 100}%`,
                    zIndex: 24 + Math.round(s.row),
                    // On the tilted plane; center = impact. No counter-rotateX (that shifted the middle).
                    transform: 'translate(-50%, -50%)',
                    background:
                      s.kind === 'football'
                        ? 'radial-gradient(circle, #e8c09055 0%, #8a5a2844 45%, transparent 70%)'
                        : s.kind === 'baseball'
                          ? 'radial-gradient(circle, #f5f5f055 0%, #c8b09044 45%, transparent 70%)'
                        : s.kind === 'iceCream' || s.kind === 'sundae'
                          ? 'radial-gradient(circle, #fff8f066 0%, #ffd1e044 45%, transparent 70%)'
                          : s.kind === 'pancake'
                            ? 'radial-gradient(circle, #f5d09066 0%, #c48a3a44 45%, transparent 70%)'
                          : s.kind === 'rocket'
                            ? 'radial-gradient(circle, #fff2a055 0%, #ff8a3044 45%, transparent 70%)'
                            : s.kind === 'cash'
                              ? 'radial-gradient(circle, #b8ffc855 0%, #3ecf6a44 45%, transparent 70%)'
                              : 'radial-gradient(circle, #ffe08a44 0%, #ff980033 45%, transparent 70%)',
                    boxShadow: 'inset 0 0 0 2px #ffffff55',
                    opacity: Math.max(0, 1 - (now - s.bornAt) / 900),
                  }}
                  aria-hidden
                />
              ) : null}
              <div
                className="absolute"
                style={{
                  ...unitStyle(s.col, s.row),
                  zIndex: 25 + Math.round(s.row),
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {s.kind === 'boom' ? (
                  <BulletBoom ageMs={now - s.bornAt} />
                ) : s.kind === 'dumbbell' ? (
                  <DumbbellSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'slobber' ? (
                  <SlobberSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'love' ? (
                  <LoveSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'witchcraft' ? (
                  <WitchcraftSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'iceCream' ? (
                  <IceCreamSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'football' ? (
                  <FootballSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'baseball' ? (
                  <BaseballSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'cash' ? (
                  <CashSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'rocket' ? (
                  <RocketSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'pancake' ? (
                  <PancakeSplat ageMs={now - s.bornAt} />
                ) : s.kind === 'melee' ||
                  s.kind === 'whip' ||
                  s.kind === 'bite' ||
                  s.kind === 'kick' ||
                  s.kind === 'hug' ||
                  s.kind === 'uppercut' ||
                  s.kind === 'jump' ? (
                  <MeleeHitFx
                    ageMs={now - s.bornAt}
                    kind={s.kind === 'jump' ? 'kick' : s.kind}
                  />
                ) : (
                  <SundaeSplat ageMs={now - s.bornAt} />
                )}
              </div>
            </div>
          ))}
          {hearts.map((h) => (
            <div
              key={h.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                ...unitStyle(h.col, h.row),
                zIndex: 28 + Math.round(h.row),
                transform: `translate(-50%, -50%) rotateX(${-ARENA_TILT_DEG}deg)`,
              }}
              aria-hidden
            >
              <RageHeartPickup ageMs={now - h.bornAt} />
            </div>
          ))}
          {drag && drag.overArena && dragChar && isSpellCard(dragChar) ? (
            <div
              className="absolute rounded-full"
              style={{
                ...unitStyle(drag.col, drag.row),
                width: `${(((dragChar.spellRadius ?? 10) * 2) / ARENA_COLS) * FIELD_W * 100}%`,
                height: `${(((dragChar.spellRadius ?? 10) * 2) / ARENA_ROWS) * FIELD_H * 100}%`,
                zIndex: 39,
                background: drag.valid
                  ? 'radial-gradient(circle, #7ec8ff55 0%, #3a9fd844 55%, transparent 72%)'
                  : 'radial-gradient(circle, #ff6b4a44 0%, transparent 70%)',
                boxShadow: drag.valid
                  ? 'inset 0 0 0 2px #9ad8ffaa'
                  : 'inset 0 0 0 2px #ff8a70aa',
                // Ground-plane ring: center stays on the aim tile.
                transform: 'translate(-50%, -50%)',
              }}
              aria-hidden
            />
          ) : null}
          {drag && drag.overArena && dragChar ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-[92%]"
              style={{
                ...unitStyle(drag.col, drag.row),
                width: unitVisualWidthPct(
                  battlefieldScaleForHeight(dragChar.height) *
                    (dragChar.cardKind === 'building' ? 1.28 : 1),
                ),
                zIndex: 40,
                opacity: drag.valid ? 0.9 : 0.45,
                filter: drag.valid ? undefined : 'grayscale(1)',
              }}
              aria-hidden
            >
              <UnitToken
                charId={dragChar.id}
                side="ally"
                hp={Math.max(1, dragChar.hp)}
                maxHp={Math.max(1, dragChar.hp)}
                vfx={null}
                facing={-Math.PI / 2}
              />
              <div
                className="pointer-events-none absolute bottom-0 left-1/2 h-2 w-2/3 -translate-x-1/2 rounded-full"
                style={{
                  boxShadow: drag.valid ? '0 0 0 2px #7CFF9A' : '0 0 0 2px #FF6B6B',
                }}
              />
            </div>
          ) : null}
        </Arena>
      </div>

      {/* HUD — CR-style: compact opponent (no panel), timer pill top-right. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-1.5 pt-[max(0.2rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-1.5 pl-0.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-extrabold text-white"
            style={{
              background: 'linear-gradient(160deg,#ff9a7a,#c63c2e)',
              boxShadow: '0 0 0 2px #f5d76e, 0 1px 4px #00000088',
            }}
          >
            {foeName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 leading-tight">
            <p
              className="max-w-[5.5rem] truncate text-[0.62rem] font-extrabold drop-shadow-[0_1px_1px_#000]"
              style={{ color: '#f06ad8' }}
            >
              {foeName}
            </p>
            {clanLine ? (
              <p className="max-w-[5.5rem] truncate text-[0.48rem] font-bold text-white drop-shadow-[0_1px_1px_#000]">
                {clanLine}
              </p>
            ) : null}
            {!net && cpuDeckIds.length > 0 ? (
              <p className="mt-0.5 max-w-[7.5rem] truncate text-[0.42rem] font-bold leading-tight text-white/70 drop-shadow-[0_1px_1px_#000]">
                {cpuDeckIds
                  .map((id) => getCharacter(id)?.initial ?? '?')
                  .join(' · ')}
              </p>
            ) : null}
            <p className="mt-0.5 flex items-center gap-0.5 text-[0.5rem] font-extrabold leading-none text-[#f5d76e] drop-shadow-[0_1px_1px_#000]">
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 shrink-0" aria-hidden>
                <path
                  fill="#f5d76e"
                  d="M3 2h10v2c0 2.2-1.4 4-3.5 4.7V10h2v1.5H4.5V10h2V8.7C4.4 8 3 6.2 3 4V2zm1.2 1.2V4c0 1.5.9 2.8 2.3 3.3h.6c1.4-.5 2.3-1.8 2.3-3.3V3.2H4.2zM6 13h4v1.2H6V13z"
                />
              </svg>
              {opponentTrophies.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-start gap-1">
          {mode === 'touchdown' ? (
            <div
              className="rounded-md px-2 py-0.5 text-center leading-none"
              style={{ background: 'rgba(12,12,18,0.72)', boxShadow: '0 2px 6px #00000066' }}
            >
              <p className="text-[0.38rem] font-extrabold uppercase tracking-[0.12em] text-[#f5d76e]">
                TD
              </p>
              <p className="font-[family-name:var(--font-display)] text-[1.05rem] tracking-wide text-white">
                {allyScore}-{enemyScore}
              </p>
            </div>
          ) : null}
          <div
            className="rounded-md px-2 py-0.5 text-right leading-none"
            style={{ background: 'rgba(12,12,18,0.72)', boxShadow: '0 2px 6px #00000066' }}
          >
            <p className="text-[0.38rem] font-extrabold uppercase tracking-[0.12em] text-white/80">
              {overtimeActive ? 'OVERTIME' : 'TIME LEFT'}
            </p>
            <p className="font-[family-name:var(--font-display)] text-[1.15rem] tracking-wide text-white drop-shadow-[0_1px_2px_#000]">
              {mm}:{ss}
            </p>
          </div>
          <button
            type="button"
            onClick={leaveBattle}
            className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] font-extrabold text-white/90 drop-shadow-[0_1px_2px_#000]"
            style={{ background: 'rgba(12,12,18,0.55)' }}
            aria-label="Leave battle"
          >
            ✕
          </button>
        </div>
      </header>

      <AnimatePresence>
        {activeEmote ? (
          <motion.div
            key={activeEmote.key}
            initial={{ opacity: 0, y: 16, scale: 0.75 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute bottom-[6.4rem] left-3 z-40"
          >
            <div
              className="relative rounded-2xl bg-white px-2.5 py-2 shadow-[0_4px_14px_#00000055]"
              style={{ border: '2px solid #e8e4dc' }}
            >
              {activeEmote.option.kind === 'phil' ? (
                <img
                  src={PHIL_EMOTE_SRC}
                  alt="Phil"
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : activeEmote.option.kind === 'photo' && activeEmote.option.src ? (
                <img
                  src={activeEmote.option.src}
                  alt={activeEmote.option.label}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : activeEmote.option.kind === 'character' && activeEmote.option.charId ? (
                <div className="h-14 w-14 overflow-hidden rounded-full">
                  <CharacterModel
                    charId={activeEmote.option.charId}
                    anim="idle"
                    facing={1}
                    portrait
                  />
                </div>
              ) : (
                <span className="block text-4xl leading-none">{activeEmote.option.emoji}</span>
              )}
              <div
                className="absolute -bottom-2 left-5 h-3 w-3 rotate-45 bg-white"
                style={{ borderRight: '2px solid #e8e4dc', borderBottom: '2px solid #e8e4dc' }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {resultCopy ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div
            className="w-full max-w-[16rem] rounded-xl px-5 py-5 text-center"
            style={{
              background: 'linear-gradient(180deg,#fff8e8,#e8d0a0)',
              boxShadow: '0 8px 28px #00000088, inset 0 1px 0 #ffffffaa',
              border: '3px solid #c9a227',
            }}
          >
            <p
              className="font-[family-name:var(--font-display)] text-3xl tracking-wide"
              style={{
                color:
                  result === 'victory' ? '#1b7a34' : result === 'defeat' ? '#b71c1c' : '#5a4a20',
              }}
            >
              {resultCopy}
            </p>
            <p className="mt-1 text-xs font-bold text-[#5a4a20]/85">
              {isSpectating
                ? 'Spectating — no trophies for you'
                : !earnsTrophies(mode)
                  ? 'Party mode — gold only, no trophies'
                  : result === 'victory'
                    ? '+25–30 trophies · +50 gold · chest chance'
                    : result === 'defeat'
                      ? '−15–20 trophies · +15 gold'
                      : '+3–8 trophies · +25 gold'}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-extrabold uppercase tracking-wide text-[#1a1410]"
              style={{
                background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
                boxShadow: '0 3px 0 #8a6a12',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {/* CR-style solid blue card dock (or spectate bar) */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 pb-[max(0.15rem,env(safe-area-inset-bottom))]"
        style={{
          background: '#2a5db0',
          boxShadow: '0 -3px 12px #00000055, inset 0 1px 0 #4a7dd055',
        }}
      >
        {isSpectating ? (
          <div className="mx-auto flex max-w-[24rem] items-center justify-between gap-2 px-3 py-2.5">
            <div>
              <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[#f5d76e]">
                Spectating
              </p>
              <p className="text-sm font-bold text-white">
                {foeName}
                {clanLine ? ` · ${clanLine}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg bg-[#1a3060] px-3 py-2 text-xs font-extrabold text-white ring-1 ring-white/25"
            >
              Leave
            </button>
          </div>
        ) : (
        <div className="mx-auto max-w-[24rem] px-1.5 pb-1 pt-1.5">
          <div className="flex items-end justify-center gap-1.5">
            <div className="relative flex w-10 shrink-0 flex-col items-center gap-0.5">
              <AnimatePresence>
                {emotePickerOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute bottom-[calc(100%+0.35rem)] left-0 z-40 w-[10.5rem] rounded-2xl bg-white p-1.5 shadow-[0_6px_20px_#00000055]"
                    style={{ border: '2px solid #e8e4dc' }}
                  >
                    <div className="grid max-h-40 grid-cols-3 gap-1 overflow-y-auto">
                      {emoteOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => pickEmote(opt)}
                          className="flex h-9 w-full items-center justify-center rounded-xl bg-[#f4f1ea] transition active:scale-95"
                          aria-label={opt.label}
                        >
                          {opt.kind === 'phil' ? (
                            <img
                              src={PHIL_EMOTE_SRC}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : opt.kind === 'photo' && opt.src ? (
                            <img
                              src={opt.src}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : opt.kind === 'character' && opt.charId ? (
                            <div className="h-7 w-7 overflow-hidden rounded-full">
                              <CharacterModel charId={opt.charId} anim="idle" facing={1} portrait />
                            </div>
                          ) : (
                            <span className="text-xl leading-none">{opt.emoji}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div
                      className="absolute -bottom-1.5 left-3 h-3 w-3 rotate-45 bg-white"
                      style={{ borderRight: '2px solid #e8e4dc', borderBottom: '2px solid #e8e4dc' }}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => {
                  if (ended) return
                  setEmotePickerOpen((o) => !o)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(180deg,#5a8fd6,#2a4a8a)',
                  boxShadow: '0 1px 0 #1a3060, inset 0 1px 0 #ffffff44',
                }}
                aria-label="Emote"
                aria-expanded={emotePickerOpen}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white" aria-hidden>
                  <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 7 9zm5 0a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 12 9zm5 0a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 17 9z" />
                </svg>
              </button>
              <span className="text-[0.38rem] font-extrabold uppercase tracking-wider text-white/90">
                Next
              </span>
              <BattleCard
                character={nextId ? getCharacter(nextId) ?? null : null}
                size="next"
                elixir={elixir}
              />
            </div>

            <div className="flex items-end gap-1">
              {hand.map((id, i) => {
                const c = getCharacter(id) ?? null
                const selected = id === selectedCharId
                const dragging = drag?.charId === id
                return (
                  <button
                    key={`${id}-${i}`}
                    type="button"
                    data-card-drag
                    onPointerDown={(e) => onCardPointerDown(e, id)}
                    onPointerMove={onCardPointerMove}
                    onPointerUp={onCardPointerUp}
                    onPointerCancel={onCardPointerUp}
                    className={`shrink-0 touch-none transition-transform active:scale-95 ${dragging ? 'opacity-40' : ''}`}
                    aria-label={c ? `Select or drag ${c.name}` : `Card ${i + 1}`}
                    aria-pressed={selected}
                  >
                    <BattleCard character={c} elixir={elixir} selected={selected} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-1 px-0.5">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-extrabold text-white"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
                boxShadow: '0 0 0 2px #5a1848, 0 1px 3px #00000066',
              }}
            >
              {elixirDisplay}
            </div>
            <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-[#1a0a28]/85 ring-1 ring-[#5a1848]">
              <div
                className="elixir-bar-fill absolute inset-y-0 left-0"
                style={{ width: `${(elixir / elixirMax) * 100}%` }}
              />
              <div className="absolute inset-0 flex">
                {Array.from({ length: elixirMax }, (_, i) => (
                  <div key={i} className="h-full flex-1 border-r border-black/35 last:border-0" />
                ))}
              </div>
            </div>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-extrabold tabular-nums"
              style={{
                background: overtimeActive || displayElixirMult > 1 ? '#f5d76e' : '#2a1a12',
                color: overtimeActive || displayElixirMult > 1 ? '#1a1410' : '#f5d76e',
              }}
              title="Elixir rate"
            >
              {formatElixirMult(displayElixirMult)}
            </span>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
