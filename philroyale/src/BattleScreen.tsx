import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ARENA_ROWS, isWalkableTile } from './arena'
import { Arena, clientToArenaTile, oneTileWidthPct, unitStyle } from './Arena'
import { BattleCard } from './BattleCard'
import { SundaeDot, UnitToken } from './UnitToken'
import { getCharacter } from './characters'
import { loadDeck } from './storage'
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

function FlyingSundae({
  fromCol,
  fromRow,
  toCol,
  toRow,
  bornAt,
  arriveAt,
  now,
}: {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  bornAt: number
  arriveAt: number
  now: number
}) {
  const dur = Math.max(1, arriveAt - bornAt)
  const p = Math.min(1, Math.max(0, (now - bornAt) / dur))
  const col = fromCol + (toCol - fromCol) * p
  const row = fromRow + (toRow - fromRow) * p
  const arc = Math.sin(p * Math.PI) * 4
  const style = unitStyle(col - 0.5, row - 0.5 - arc)

  return (
    <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={style} aria-hidden>
      <SundaeDot />
    </div>
  )
}

export function BattleScreen({ onExit, opponentName }: Props) {
  const deckIds = useMemo(() => loadDeck(), [])
  const [drawPile, setDrawPile] = useState<string[]>([])
  const [hand, setHand] = useState<string[]>([])
  const [nextId, setNextId] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(180)
  const [drag, setDrag] = useState<DragState | null>(null)
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

    // Tap without drag → select only (place with second tap on map).
    if (!movedRef.current || !dropped.overArena) {
      setSelectedCharId(dropped.charId)
      return
    }

    const card = getCharacter(dropped.charId)
    if (!card || elixir < card.elixir || !dropped.valid) return
    const ok = deploy(card, dropped.col, dropped.row, 'ally')
    if (ok) cycleAfterDeploy(card.id)
  }

  const mm = String(Math.floor(seconds / 60))
  const ss = String(seconds % 60).padStart(2, '0')
  const elixirDisplay = Math.floor(elixir)
  const dragChar = drag ? getCharacter(drag.charId) : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-1.5 pb-0.5 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onExit}
          className="rounded-md bg-[#3a2418] px-2 py-1 text-[0.7rem] font-extrabold text-[#f5d76e] ring-1 ring-[#c9a227]/50"
        >
          Exit
        </button>
        <div className="flex flex-col items-center">
          <div
            className="rounded-md px-2.5 py-0.5 font-[family-name:var(--font-display)] text-base tracking-wide text-[#f5d76e]"
            style={{
              background: 'linear-gradient(180deg,#5a3a22,#2a1810)',
              boxShadow: 'inset 0 1px 0 #c9a22766, 0 2px 4px #00000066',
            }}
          >
            {mm}:{ss}
          </div>
          <p className="text-[0.6rem] font-bold text-white/70">
            vs {opponentName ?? 'Trainer'}
          </p>
        </div>
        <div className="min-w-[2.8rem] text-right text-[0.6rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/80">
          100×150
        </div>
      </header>

      <div className="relative mx-auto flex min-h-0 w-full max-w-[32rem] flex-1 items-center justify-center px-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-full max-h-full w-auto max-w-full overflow-hidden rounded-[10px]"
          style={{
            aspectRatio: '100 / 150',
            boxShadow: '0 10px 28px #00000099',
          }}
        >
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
                    hpPct={u.maxHp > 0 ? u.hp / u.maxHp : 0}
                    vfx={u.vfx}
                  />
                </div>
              ))}
            </AnimatePresence>
            {projectiles.map((p) =>
              p.kind === 'sundae' ? <FlyingSundae key={p.id} {...p} now={now} /> : null,
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
                <UnitToken charId={dragChar.id} side="ally" hpPct={1} vfx={null} />
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    boxShadow: drag.valid
                      ? '0 0 0 2px #7CFF9A'
                      : '0 0 0 2px #FF6B6B',
                  }}
                />
              </div>
            ) : null}
          </Arena>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[32rem] shrink-0 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-0.5">
        <div
          className="rounded-t-md px-1.5 pb-1.5 pt-1"
          style={{
            background: 'linear-gradient(180deg,#5a3a22 0%,#2e1a10 55%,#1a100c 100%)',
            boxShadow: 'inset 0 2px 0 #c9a22755, 0 -4px 16px #00000066',
          }}
        >
          <div className="flex items-end gap-1">
            <div className="flex w-9 shrink-0 flex-col items-center gap-0.5">
              <span className="text-[0.45rem] font-extrabold uppercase tracking-wider text-[#f5d76e]/85">
                Next
              </span>
              <div className="scale-90 origin-bottom">
                <BattleCard character={nextId ? getCharacter(nextId) ?? null : null} size="next" />
              </div>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
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
          <div className="mt-1 flex items-center gap-1.5">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-extrabold text-white"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
                boxShadow: '0 0 0 2px #5a1848',
              }}
            >
              {elixirDisplay}
            </div>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-[#1a100c] ring-1 ring-[#5a1848]">
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
          </div>
        </div>
      </div>
    </div>
  )
}
