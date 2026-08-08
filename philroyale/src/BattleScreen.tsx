import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ARENA_ROWS, isWalkableTile } from './arena'
import { Arena, clientToArenaTile, oneTileWidthPct, unitStyle } from './Arena'
import { BattleCard } from './BattleCard'
import { ShootDot, SlobberDot, SundaeDot, UnitToken } from './UnitToken'
import { getCharacter } from './characters'
import { loadDeck, loadPlayerName } from './storage'
import { useBattle } from './useBattle'

type Props = {
  onExit: () => void
  opponentName?: string | null
}

type DragState = {
  charId: string
  pointerId: number
  col: number
  row: number
  overArena: boolean
  valid: boolean
}

const EMOTES = ['👍', '😂', '😤', '😱', '🎉', '👋']

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
  kind: 'sundae' | 'slobber' | 'shoot'
}) {
  const dur = Math.max(1, arriveAt - bornAt)
  const p = Math.min(1, Math.max(0, (now - bornAt) / dur))
  const col = fromCol + (toCol - fromCol) * p
  const row = fromRow + (toRow - fromRow) * p
  const arc = Math.sin(p * Math.PI) * (kind === 'shoot' ? 2 : 4)
  const style = unitStyle(col - 0.5, row - 0.5 - arc)

  return (
    <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={style} aria-hidden>
      {kind === 'sundae' ? <SundaeDot /> : null}
      {kind === 'slobber' ? <SlobberDot /> : null}
      {kind === 'shoot' ? <ShootDot /> : null}
    </div>
  )
}

export function BattleScreen({ onExit, opponentName }: Props) {
  const deckIds = useMemo(() => loadDeck(), [])
  const myName = useMemo(() => loadPlayerName().trim() || 'You', [])
  const [drawPile, setDrawPile] = useState<string[]>([])
  const [hand, setHand] = useState<string[]>([])
  const [nextId, setNextId] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(180)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [emote, setEmote] = useState<string | null>(null)
  const [emoteIdx, setEmoteIdx] = useState(0)
  const arenaRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const {
    elixir,
    elixirMax,
    units,
    projectiles,
    towers,
    selectedCharId,
    setSelectedCharId,
    deploy,
    now,
  } = useBattle()

  useEffect(() => {
    const pile = [...deckIds].sort(() => Math.random() - 0.5)
    const h = pile.slice(0, 4)
    setHand(h)
    setNextId(pile[4] ?? null)
    setDrawPile(pile.slice(5))
    setSelectedCharId(h[0] ?? 'phil')
  }, [deckIds, setSelectedCharId])

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])

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

  function canPlace(col: number, row: number): boolean {
    if (row < ARENA_ROWS / 2) return false
    const c = Math.floor(col)
    const r = Math.floor(row)
    return isWalkableTile(c, r, liveTowerIds())
  }

  function onArenaPointer(col: number, row: number) {
    if (dragRef.current) return
    if (!selectedCharId) return
    const card = getCharacter(selectedCharId)
    if (!card || elixir < card.elixir) return
    const ok = deploy(card, col, row, 'ally')
    if (ok) cycleAfterDeploy(card.id)
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
    const valid = canPlace(tile.col, tile.row)
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
    const card = getCharacter(charId)
    if (!card || elixir < card.elixir) {
      setSelectedCharId(charId)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    movedRef.current = false
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
      if (dx * dx + dy * dy > 100) movedRef.current = true
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
    dragRef.current = null
    dragOriginRef.current = null
    setDrag(null)

    if (!movedRef.current || !dropped.overArena) {
      setSelectedCharId(dropped.charId)
      return
    }

    const card = getCharacter(dropped.charId)
    if (!card || elixir < card.elixir || !dropped.valid) return
    const ok = deploy(card, dropped.col, dropped.row, 'ally')
    if (ok) cycleAfterDeploy(card.id)
  }

  function sendEmote() {
    const e = EMOTES[emoteIdx % EMOTES.length]!
    setEmoteIdx((i) => i + 1)
    setEmote(e)
    window.setTimeout(() => setEmote(null), 1600)
  }

  const mm = String(Math.floor(seconds / 60))
  const ss = String(seconds % 60).padStart(2, '0')
  const elixirDisplay = Math.floor(elixir)
  const dragChar = drag ? getCharacter(drag.charId) : null
  const foeName = opponentName?.trim() || 'Trainer'

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#1a100c]">
      {/* Full-bleed arena — CR-sized map */}
      <div className="absolute inset-0 bottom-[7.25rem]">
        <Arena ref={arenaRef} towers={towers} onArenaPointerDown={onArenaPointer}>
          <AnimatePresence>
            {units.map((u) => (
              <div
                key={u.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-[85%]"
                style={{ ...unitStyle(u.col, u.row), width: oneTileWidthPct() }}
              >
                <UnitToken
                  charId={u.charId}
                  side={u.side}
                  hp={u.hp}
                  maxHp={u.maxHp}
                  vfx={u.vfx}
                  enraged={u.enraged}
                />
              </div>
            ))}
          </AnimatePresence>
          {projectiles.map((p) =>
            p.kind === 'sundae' || p.kind === 'slobber' || p.kind === 'shoot' ? (
              <FlyingShot key={p.id} {...p} kind={p.kind} now={now} />
            ) : null,
          )}
          {drag && drag.overArena && dragChar ? (
            <div
              className="absolute z-30 -translate-x-1/2 -translate-y-[85%]"
              style={{
                ...unitStyle(drag.col, drag.row),
                width: oneTileWidthPct(),
                opacity: drag.valid ? 0.9 : 0.45,
                filter: drag.valid ? undefined : 'grayscale(1)',
              }}
              aria-hidden
            >
              <UnitToken
                charId={dragChar.id}
                side="ally"
                hp={dragChar.hp}
                maxHp={dragChar.hp}
                vfx={null}
              />
              <div
                className="absolute inset-0 rounded-sm"
                style={{
                  boxShadow: drag.valid ? '0 0 0 2px #7CFF9A' : '0 0 0 2px #FF6B6B',
                }}
              />
            </div>
          ) : null}
        </Arena>
      </div>

      {/* Top HUD — opponent left, time right (CR layout) */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-2 pt-[max(0.35rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start gap-1.5">
          <button
            type="button"
            onClick={onExit}
            className="rounded bg-black/45 px-1.5 py-0.5 text-[0.6rem] font-extrabold text-white/80 ring-1 ring-white/20"
          >
            ✕
          </button>
          <div
            className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1"
            style={{
              background: 'linear-gradient(180deg,#3a2a1cdd,#1a120cdd)',
              boxShadow: '0 2px 6px #00000066, inset 0 1px 0 #c9a22744',
            }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
              style={{
                background: 'linear-gradient(160deg,#ff8a7a,#c63c2e)',
                boxShadow: '0 0 0 2px #8a2018',
              }}
            >
              {foeName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.75rem] font-extrabold leading-tight text-white">
                {foeName}
              </p>
              <p className="truncate text-[0.55rem] font-bold text-white/55">Opponent</p>
              <p className="text-[0.6rem] font-extrabold text-[#f5d76e]">Trophies —</p>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none rounded-md px-2 py-1 text-right"
          style={{
            background: 'linear-gradient(180deg,#3a2a1cdd,#1a120cdd)',
            boxShadow: '0 2px 6px #00000066, inset 0 1px 0 #c9a22744',
          }}
        >
          <p className="text-[0.55rem] font-extrabold uppercase tracking-wide text-white/65">
            Time left:
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg leading-none tracking-wide text-[#f5d76e]">
            {mm}:{ss}
          </p>
        </div>
      </header>

      {/* Ally emote float */}
      <AnimatePresence>
        {emote ? (
          <motion.div
            key={emote + emoteIdx}
            initial={{ opacity: 0, y: 12, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute bottom-36 left-4 z-30 text-4xl"
          >
            {emote}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Bottom card dock — CR layout */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-[max(0.2rem,env(safe-area-inset-bottom))]">
        <div
          className="px-1.5 pb-1.5 pt-1"
          style={{
            background:
              'linear-gradient(180deg,#6b4424 0%,#4a2e18 28%,#2e1a10 70%,#1a100c 100%)',
            boxShadow: 'inset 0 2px 0 #c9a22755, 0 -8px 20px #00000088',
          }}
        >
          <div className="mx-auto flex max-w-[34rem] items-end gap-1.5">
            <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={sendEmote}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                style={{
                  background: 'linear-gradient(180deg,#5a8fd6,#2a4a8a)',
                  boxShadow: '0 2px 0 #1a3060, inset 0 1px 0 #ffffff44',
                }}
                aria-label="Emote"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden>
                  <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 7 9zm5 0a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 12 9zm5 0a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 17 9z" />
                </svg>
              </button>
              <span className="text-[0.45rem] font-extrabold uppercase tracking-wider text-[#f5d76e]/85">
                Next
              </span>
              <BattleCard character={nextId ? getCharacter(nextId) ?? null : null} size="next" />
              <p className="max-w-full truncate text-[0.45rem] font-bold text-white/45">{myName}</p>
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5">
              {hand.map((id, i) => {
                const c = getCharacter(id) ?? null
                const cantAfford = c != null && elixir < c.elixir
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
                    className={`min-w-0 touch-none transition-transform active:scale-95 ${dragging ? 'opacity-40' : ''}`}
                    aria-label={c ? `Select or drag ${c.name}` : `Card ${i + 1}`}
                    aria-pressed={selected}
                  >
                    <BattleCard character={c} dimmed={cantAfford} selected={selected} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mx-auto mt-1.5 flex max-w-[34rem] items-center gap-1.5 px-0.5">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-extrabold text-white"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
                boxShadow: '0 0 0 2px #5a1848',
              }}
            >
              {elixirDisplay}
            </div>
            <div className="relative h-3.5 flex-1 overflow-hidden rounded-sm bg-[#1a100c] ring-1 ring-[#5a1848]">
              <div
                className="elixir-bar-fill absolute inset-y-0 left-0"
                style={{ width: `${(elixir / elixirMax) * 100}%` }}
              />
              <div className="absolute inset-0 flex">
                {Array.from({ length: elixirMax }, (_, i) => (
                  <div key={i} className="h-full flex-1 border-r border-black/35 last:border-0" />
                ))}
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[0.55rem] font-extrabold text-white/90 drop-shadow-[0_1px_0_#000]">
                Max: {elixirMax}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
