import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { canDeployAllyAt } from './arena'
import { Arena, clientToArenaTile, unitStyle, unitVisualWidthPct } from './Arena'
import { BattleCard } from './BattleCard'
import { ShootDot, SlobberDot, SundaeDot, SundaeSplat, UnitToken } from './UnitToken'
import { ARENA_TILT_DEG } from './camera'
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

type MatchResult = 'victory' | 'defeat' | 'draw'

type EmoteOption =
  | { id: string; kind: 'phil' }
  | { id: string; kind: 'emoji'; emoji: string }

const PHIL_EMOTE_SRC = `${import.meta.env.BASE_URL}characters/phil.png`

const EMOTE_OPTIONS: EmoteOption[] = [
  { id: 'phil', kind: 'phil' },
  { id: 'thumbs', kind: 'emoji', emoji: '👍' },
  { id: 'laugh', kind: 'emoji', emoji: '😂' },
  { id: 'mad', kind: 'emoji', emoji: '😤' },
  { id: 'wow', kind: 'emoji', emoji: '😱' },
  { id: 'party', kind: 'emoji', emoji: '🎉' },
  { id: 'wave', kind: 'emoji', emoji: '👋' },
  { id: 'cry', kind: 'emoji', emoji: '😢' },
  { id: 'fire', kind: 'emoji', emoji: '🔥' },
]

type ActiveEmote = { key: number; option: EmoteOption }

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
  kind: 'sundae' | 'slobber' | 'shoot' | 'arrow' | 'cannon'
}) {
  const dur = Math.max(1, arriveAt - bornAt)
  const p = Math.min(1, Math.max(0, (now - bornAt) / dur))
  const col = fromCol + (toCol - fromCol) * p
  const row = fromRow + (toRow - fromRow) * p
  const arc =
    kind === 'arrow' || kind === 'cannon' ? Math.sin(p * Math.PI) * 1.2 : Math.sin(p * Math.PI) * (kind === 'shoot' ? 2 : 4)
  const style = unitStyle(col - 0.5, row - 0.5 - arc)

  return (
    <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={style} aria-hidden>
      {kind === 'sundae' ? <SundaeDot /> : null}
      {kind === 'slobber' ? <SlobberDot /> : null}
      {kind === 'shoot' ? <ShootDot /> : null}
      {kind === 'arrow' ? (
        <div className="h-0.5 w-2.5 rounded-full bg-[#5a3a18]" style={{ boxShadow: '0 0 2px #0008' }} />
      ) : null}
      {kind === 'cannon' ? (
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 30%, #888,#222)' }}
        />
      ) : null}
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
  const [draggingActive, setDraggingActive] = useState(false)
  const [emotePickerOpen, setEmotePickerOpen] = useState(false)
  const [activeEmote, setActiveEmote] = useState<ActiveEmote | null>(null)
  const [emoteKey, setEmoteKey] = useState(0)
  const [result, setResult] = useState<MatchResult | null>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const movedRef = useRef(false)
  const ended = result != null
  const {
    elixir,
    elixirMax,
    units,
    projectiles,
    splats,
    towers,
    selectedCharId,
    setSelectedCharId,
    deploy,
    now,
  } = useBattle({ paused: ended })

  useEffect(() => {
    const pile = [...deckIds].sort(() => Math.random() - 0.5)
    const h = pile.slice(0, 4)
    setHand(h)
    setNextId(pile[4] ?? null)
    setDrawPile(pile.slice(5))
    setSelectedCharId(h[0] ?? 'phil')
  }, [deckIds, setSelectedCharId])

  useEffect(() => {
    if (ended) return
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [ended])

  useEffect(() => {
    if (result) return
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
    if (seconds > 0) return
    const allyLeft = towers.filter((t) => t.side === 'ally' && t.hp > 0).length
    const enemyLeft = towers.filter((t) => t.side === 'enemy' && t.hp > 0).length
    setResult(allyLeft > enemyLeft ? 'victory' : enemyLeft > allyLeft ? 'defeat' : 'draw')
    setEmotePickerOpen(false)
  }, [towers, seconds, result])

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
    return canDeployAllyAt(col, row, towers, liveTowerIds())
  }

  function onArenaPointer(col: number, row: number) {
    if (ended) return
    if (dragRef.current) return
    setEmotePickerOpen(false)
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
    if (ended) return
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
    const ok = deploy(card, dropped.col, dropped.row, 'ally')
    if (ok) cycleAfterDeploy(card.id)
  }

  function pickEmote(option: EmoteOption) {
    const key = emoteKey + 1
    setEmoteKey(key)
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
  const resultCopy =
    result === 'victory' ? 'Victory!' : result === 'defeat' ? 'Defeat' : result === 'draw' ? 'Draw' : null

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#2a6e34]">
      {/* Full-bleed map — HUD / cards overlay on top of the grass. */}
      <div className="absolute inset-0">
        <Arena
          ref={arenaRef}
          towers={towers}
          onArenaPointerDown={ended ? undefined : onArenaPointer}
          showBlockedOverlay={draggingActive && !ended}
          overlaySide="ally"
        >
          <AnimatePresence>
            {[...units]
              .sort((a, b) => a.row - b.row)
              .map((u) => (
                <div
                  key={u.id}
                  className="absolute -translate-x-1/2 -translate-y-[92%]"
                  style={{
                    ...unitStyle(u.col, u.row),
                    width: unitVisualWidthPct(),
                    zIndex: 10 + Math.round(u.row),
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
                    moving={now < u.movingUntil}
                  />
                </div>
              ))}
          </AnimatePresence>
          {projectiles.map((p) =>
            p.kind === 'sundae' ||
            p.kind === 'slobber' ||
            p.kind === 'shoot' ||
            p.kind === 'arrow' ||
            p.kind === 'cannon' ? (
              <FlyingShot key={p.id} {...p} kind={p.kind} now={now} />
            ) : null,
          )}
          {splats.map((s) => (
            <div
              key={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                ...unitStyle(s.col - 0.5, s.row - 0.5),
                zIndex: 25 + Math.round(s.row),
                transform: `translate(-50%, -50%) rotateX(${-ARENA_TILT_DEG}deg)`,
              }}
            >
              <SundaeSplat ageMs={now - s.bornAt} />
            </div>
          ))}
          {drag && drag.overArena && dragChar ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-[92%]"
              style={{
                ...unitStyle(drag.col, drag.row),
                width: unitVisualWidthPct(),
                zIndex: 40,
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

      {/* Profile + timer float on the map (no opaque bar / no map crop). */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-1.5 pt-[max(0.2rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start gap-1">
          <button
            type="button"
            onClick={onExit}
            className="mt-0.5 rounded bg-black/45 px-1 py-px text-[0.55rem] font-extrabold text-white/80 drop-shadow-[0_1px_2px_#000]"
          >
            ✕
          </button>
          <div
            className="flex items-center gap-1 rounded-sm py-0.5 pl-0.5 pr-1.5"
            style={{
              background: 'linear-gradient(180deg,#4a3424cc,#241810cc)',
              boxShadow: '0 2px 6px #00000077, inset 0 1px 0 #c9a22733',
            }}
          >
            <div className="relative">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] font-extrabold text-white"
                style={{
                  background: 'linear-gradient(160deg,#ff9a7a,#c63c2e)',
                  boxShadow: '0 0 0 2px #f5d76e, 0 0 0 3px #8a2018',
                }}
              >
                {foeName.slice(0, 1).toUpperCase()}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                style={{
                  background: 'linear-gradient(180deg,#7ec8ff,#2f6fbf)',
                  boxShadow: '0 0 0 1px #1a3a6a',
                }}
                title="League"
              />
            </div>
            <div className="min-w-0 leading-none">
              <p className="max-w-[6rem] truncate text-[0.65rem] font-extrabold text-white drop-shadow-[0_1px_1px_#000]">
                {foeName}
              </p>
              <p className="mt-0.5 text-[0.45rem] font-bold text-[#f5d76e]/90">
                <span className="inline-block h-1.5 w-1.5 rounded-sm bg-[#f5d76e] align-middle" />{' '}
                —
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-sm bg-black/35 px-1.5 py-0.5 text-right leading-none backdrop-blur-[2px]">
          <p className="text-[0.45rem] font-extrabold uppercase tracking-wide text-white/80 drop-shadow-[0_1px_1px_#000]">
            Time left
          </p>
          <p className="font-[family-name:var(--font-display)] text-[1.05rem] tracking-wide text-white drop-shadow-[0_1px_2px_#000]">
            {mm}:{ss}
          </p>
        </div>
      </header>

      <AnimatePresence>
        {activeEmote ? (
          <motion.div
            key={activeEmote.key}
            initial={{ opacity: 0, y: 16, scale: 0.75 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute bottom-[5.6rem] left-3 z-40"
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
              {result === 'victory'
                ? 'Enemy king tower destroyed — or more towers left.'
                : result === 'defeat'
                  ? 'Your king tower fell — or fewer towers left.'
                  : 'Same towers left when time ran out.'}
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

      <div className="absolute inset-x-0 bottom-0 z-20 pb-[max(0.1rem,env(safe-area-inset-bottom))]">
        <div
          className="px-1 pb-0.5 pt-1"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #1a100c99 55%, #1a100cee 100%)',
          }}
        >
          <div className="mx-auto flex max-w-[22rem] items-end justify-center gap-1">
            <div className="relative flex w-9 shrink-0 flex-col items-center gap-px">
              <AnimatePresence>
                {emotePickerOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute bottom-[calc(100%+0.3rem)] left-0 z-40 w-[10.5rem] rounded-2xl bg-white p-1.5 shadow-[0_6px_20px_#00000055]"
                    style={{ border: '2px solid #e8e4dc' }}
                  >
                    <div className="grid grid-cols-3 gap-1">
                      {EMOTE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => pickEmote(opt)}
                          className="flex h-9 w-full items-center justify-center rounded-xl bg-[#f4f1ea] transition active:scale-95"
                          aria-label={opt.kind === 'phil' ? 'Phil emote' : opt.emoji}
                        >
                          {opt.kind === 'phil' ? (
                            <img
                              src={PHIL_EMOTE_SRC}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
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
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(180deg,#5a8fd6,#2a4a8a)',
                  boxShadow: '0 1px 0 #1a3060, inset 0 1px 0 #ffffff44',
                }}
                aria-label="Emote"
                aria-expanded={emotePickerOpen}
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white" aria-hidden>
                  <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 7 9zm5 0a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 12 9zm5 0a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 17 9z" />
                </svg>
              </button>
              <span className="text-[0.4rem] font-extrabold uppercase tracking-wider text-[#f5d76e]/85">
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

          <div className="mx-auto mt-1 flex max-w-[22rem] items-center gap-1 px-0.5">
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-extrabold text-white"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #ff9ae8, #e85ad0 45%, #9b2d8a)',
                boxShadow: '0 0 0 1.5px #5a1848',
              }}
            >
              {elixirDisplay}
            </div>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-[#1a100c]/90 ring-1 ring-[#5a1848]">
              <div
                className="elixir-bar-fill absolute inset-y-0 left-0"
                style={{ width: `${(elixir / elixirMax) * 100}%` }}
              />
              <div className="absolute inset-0 flex">
                {Array.from({ length: elixirMax }, (_, i) => (
                  <div key={i} className="h-full flex-1 border-r border-black/35 last:border-0" />
                ))}
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-[0.45rem] font-extrabold text-white/90 drop-shadow-[0_1px_0_#000]">
                {elixirDisplay} / {elixirMax}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
