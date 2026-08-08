import type { PointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ARENA_COLS,
  ARENA_ROWS,
  TOWERS,
  isBridgeTile,
  isRiverTile,
  type TowerSlot,
} from './arena'
import { PHIL, getCharacter } from './characters'
import { useBattle } from './useBattle'

type Props = {
  onExit: () => void
}

function towerLabel(t: TowerSlot): string {
  if (t.kind === 'king') return 'King'
  return t.col < ARENA_COLS / 2 ? 'Left' : 'Right'
}

function ArenaTower({
  tower,
  hp,
  maxHp,
}: {
  tower: TowerSlot
  hp: number
  maxHp: number
}) {
  const isKing = tower.kind === 'king'
  const fill = tower.side === 'ally' ? 'var(--color-tower-ally)' : 'var(--color-tower-enemy)'
  const left = `${(tower.col / ARENA_COLS) * 100}%`
  const top = `${(tower.row / ARENA_ROWS) * 100}%`
  const width = `${(tower.w / ARENA_COLS) * 100}%`
  const height = `${(tower.h / ARENA_ROWS) * 100}%`
  const pct = maxHp > 0 ? Math.max(0, hp / maxHp) : 0
  if (hp <= 0) return null

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18, delay: isKing ? 0.15 : 0.05 }}
      className="absolute flex flex-col items-center justify-end"
      style={{ left, top, width, height }}
      title={`${tower.side} ${towerLabel(tower)} tower`}
    >
      <div
        className="relative flex h-full w-full flex-col items-center justify-end"
        style={{ filter: 'drop-shadow(0 3px 4px #00000066)' }}
      >
        {isKing ? (
          <div
            className="mb-[2%] flex h-[22%] w-[55%] items-center justify-center rounded-sm"
            style={{ background: 'var(--color-gold)' }}
            aria-hidden
          >
            <span className="text-[clamp(0.45rem,1.8vw,0.7rem)] leading-none text-[#122018]">★</span>
          </div>
        ) : null}
        <div
          className="flex h-[70%] w-[88%] flex-col items-center justify-center rounded-sm border-2 border-black/25"
          style={{ background: fill }}
        >
          <span className="px-0.5 text-center font-[family-name:var(--font-display)] text-[clamp(0.4rem,1.6vw,0.65rem)] leading-tight text-white/95">
            {towerLabel(tower)}
          </span>
        </div>
        <div className="mt-0.5 h-1 w-full overflow-hidden rounded-sm bg-black/40" aria-hidden>
          <div className="h-full bg-[#6dce7a]" style={{ width: `${pct * 100}%` }} />
        </div>
        <div
          className="h-[12%] w-full rounded-sm"
          style={{ background: 'var(--color-bridge)' }}
          aria-hidden
        />
      </div>
    </motion.div>
  )
}

function SundaeProjectile({
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
  const arc = Math.sin(p * Math.PI) * 2.2
  const left = `${(col / ARENA_COLS) * 100}%`
  const top = `${((row - arc) / ARENA_ROWS) * 100}%`

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left, top }}
      aria-hidden
    >
      <div className="relative h-5 w-4">
        <div className="absolute bottom-0 left-1/2 h-2.5 w-3 -translate-x-1/2 rounded-b-full bg-[#f3efe4] shadow" />
        <div className="absolute bottom-1.5 left-1/2 h-2.5 w-3.5 -translate-x-1/2 rounded-full bg-[#ff8fab]" />
        <div className="absolute bottom-3 left-1/2 h-2 w-2.5 -translate-x-1/2 rounded-full bg-[#fff6d6]" />
        <div className="absolute left-[55%] top-0 h-1.5 w-1.5 rounded-full bg-[#6b3a2a]" />
      </div>
    </div>
  )
}

export function BattleScreen({ onExit }: Props) {
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

  const tiles = Array.from({ length: ARENA_ROWS * ARENA_COLS }, (_, i) => {
    const row = Math.floor(i / ARENA_COLS)
    const col = i % ARENA_COLS
    return { row, col, i }
  })

  const selected = selectedCharId ? getCharacter(selectedCharId) : null
  const canAfford = selected ? elixir >= selected.elixir : false

  const onArenaPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!selected || !canAfford) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const col = x * ARENA_COLS
    const row = y * ARENA_ROWS
    deploy(selected, col, row, 'ally')
  }

  const hand = [PHIL, null, null, null] as const

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-hud)]">
      <header className="flex shrink-0 items-center justify-between gap-3 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg bg-[#1f3328] px-3 py-2 text-sm font-bold text-[#d8e7dc] ring-1 ring-white/10"
        >
          ← Home
        </button>
        <p className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[var(--color-gold)]">
          Phil Royale
        </p>
        <div className="min-w-[4.5rem] text-right text-xs font-bold uppercase tracking-wide text-[#8aa894]">
          Battle
        </div>
      </header>

      <div className="relative mx-auto flex min-h-0 w-full max-w-[28rem] flex-1 items-center justify-center px-2 pb-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="relative aspect-[18/32] h-auto max-h-full w-full cursor-crosshair overflow-hidden rounded-lg ring-2 ring-[#e8c547]/35"
          style={{
            background: 'var(--color-grass)',
            boxShadow: '0 0 0 4px #122018, 0 18px 40px #00000088',
          }}
          role="application"
          aria-label="Battle arena — tap your half to deploy Phil"
          onPointerDown={onArenaPointer}
        >
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${ARENA_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ARENA_ROWS}, 1fr)`,
            }}
          >
            {tiles.map(({ row, col, i }) => {
              const river = isRiverTile(row, col)
              const bridge = isBridgeTile(row, col)
              const checker = (row + col) % 2 === 0
              let bg = checker ? 'var(--color-grass-lit)' : 'var(--color-lane)'
              if (river) bg = checker ? 'var(--color-river)' : 'var(--color-river-deep)'
              if (bridge) bg = checker ? 'var(--color-bridge-plank)' : 'var(--color-bridge)'
              return (
                <div
                  key={i}
                  className="border-[0.5px] border-black/10"
                  style={{ background: bg }}
                />
              )
            })}
          </div>

          {/* Ally deploy zone hint */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 border-t border-dashed border-white/15 bg-gradient-to-t from-[#3d7ec422] to-transparent"
            aria-hidden
          />

          {TOWERS.map((t) => {
            const th = towers.find((x) => x.id === t.id)
            return (
              <ArenaTower
                key={t.id}
                tower={t}
                hp={th?.hp ?? 0}
                maxHp={th?.maxHp ?? 1}
              />
            )
          })}

          {units.map((u) => {
            const def = getCharacter(u.charId)
            if (!def) return null
            const left = `${((u.col + 0.5) / ARENA_COLS) * 100}%`
            const top = `${((u.row + 0.5) / ARENA_ROWS) * 100}%`
            const hpPct = u.maxHp > 0 ? u.hp / u.maxHp : 0
            return (
              <div
                key={u.id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left, top, width: `${(1.8 / ARENA_COLS) * 100}%` }}
              >
                <motion.div
                  animate={
                    u.vfx === 'whip'
                      ? { rotate: [0, -18, 14, -8, 0], scale: [1, 1.08, 1] }
                      : u.vfx === 'sundae'
                        ? { y: [0, -6, 0], scale: [1, 1.05, 1] }
                        : { y: [0, -1.5, 0] }
                  }
                  transition={
                    u.vfx
                      ? { duration: 0.35 }
                      : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  }
                  className="relative"
                >
                  <img
                    src={def.portrait}
                    alt={def.name}
                    className="aspect-square w-full rounded-full object-cover object-[50%_18%] ring-2 ring-[#e8c547] shadow-lg"
                    draggable={false}
                  />
                  {u.vfx === 'whip' ? (
                    <motion.div
                      initial={{ opacity: 0.9, scale: 0.4 }}
                      animate={{ opacity: 0, scale: 2.4 }}
                      transition={{ duration: 0.35 }}
                      className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#f0d56a]"
                      aria-hidden
                    />
                  ) : null}
                </motion.div>
                <div className="mx-auto mt-0.5 h-1 w-[90%] overflow-hidden rounded-sm bg-black/50">
                  <div className="h-full bg-[#6dce7a]" style={{ width: `${hpPct * 100}%` }} />
                </div>
                <p className="mt-0.5 text-center font-[family-name:var(--font-display)] text-[clamp(0.45rem,2vw,0.65rem)] leading-none text-white drop-shadow">
                  {def.name}
                </p>
              </div>
            )
          })}

          {projectiles.map((p) => (
            <SundaeProjectile key={p.id} {...p} now={now} />
          ))}
        </motion.div>
      </div>

      {/* Elixir */}
      <div className="mx-auto flex w-full max-w-[28rem] shrink-0 items-center gap-2 px-3 pb-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f6fbf] text-sm font-black text-white shadow ring-2 ring-[#e8c547]/50">
          {Math.floor(elixir)}
        </div>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#1a2e24] ring-1 ring-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#1f6fbf] to-[#5eb0ef]"
            animate={{ width: `${(elixir / elixirMax) * 100}%` }}
            transition={{ type: 'tween', duration: 0.12 }}
          />
        </div>
        <span className="text-xs font-bold text-[#8ec4ef]">/{elixirMax}</span>
      </div>

      <div className="mx-auto w-full max-w-[28rem] shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-2">
          {hand.map((card, i) => {
            if (!card) {
              return (
                <div
                  key={`empty-${i}`}
                  className="aspect-[3/4] rounded-lg border-2 border-dashed border-[#e8c547]/25 bg-[#1a2e24]"
                  aria-label={`Empty card slot ${i + 1}`}
                />
              )
            }
            const selectedCard = selectedCharId === card.id
            const affordable = elixir >= card.elixir
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCharId(card.id)}
                className={`relative aspect-[3/4] overflow-hidden rounded-lg border-2 text-left transition ${
                  selectedCard
                    ? 'border-[#e8c547] shadow-[0_0_0_2px_#e8c54755]'
                    : 'border-[#2a4638]'
                } ${affordable ? 'opacity-100' : 'opacity-55'}`}
                aria-pressed={selectedCard}
                aria-label={`${card.name}, ${card.elixir} elixir`}
              >
                <img
                  src={card.portrait}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#1f6fbf] text-xs font-black text-white ring-1 ring-[#e8c547]/45">
                  {card.elixir}
                </span>
                <span className="absolute inset-x-1 bottom-1 font-[family-name:var(--font-display)] text-sm leading-none text-[#e8c547]">
                  {card.name}
                </span>
              </button>
            )
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={selected?.id ?? 'none'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-center text-xs font-semibold text-[#8aa894]"
          >
            {selected
              ? `Tap your half to deploy ${selected.name} · sundae throw ↔ whip crack · 1s`
              : 'Select a character'}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
