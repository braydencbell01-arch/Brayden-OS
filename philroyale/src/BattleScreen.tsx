import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Arena, oneTileWidthPct, unitStyle } from './Arena'
import { BattleCard } from './BattleCard'
import { SundaeDot, UnitToken } from './UnitToken'
import { getCharacter } from './characters'
import { loadDeck } from './storage'
import { useBattle } from './useBattle'

type Props = {
  onExit: () => void
  opponentName?: string | null
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

  function onArenaPointer(col: number, row: number) {
    if (!selectedCharId) return
    const card = getCharacter(selectedCharId)
    if (!card || elixir < card.elixir) return
    const ok = deploy(card, col, row, 'ally')
    if (ok) cycleAfterDeploy(card.id)
  }

  const mm = String(Math.floor(seconds / 60))
  const ss = String(seconds % 60).padStart(2, '0')
  const elixirDisplay = Math.floor(elixir)

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

      {/* Map takes most of the screen; aspect 100:150 keeps tiles square */}
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
          <Arena towers={towers} onArenaPointerDown={onArenaPointer}>
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
          </Arena>
        </motion.div>
      </div>

      {/* Compact card bar — smaller so the map can grow */}
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
                return (
                  <button
                    key={`${id}-${i}`}
                    type="button"
                    onClick={() => setSelectedCharId(id)}
                    className="min-w-0 transition-transform active:scale-95"
                    aria-label={c ? `Select ${c.name}` : `Card ${i + 1}`}
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
