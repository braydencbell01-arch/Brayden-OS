import { motion } from 'framer-motion'
import {
  ARENA_COLS,
  ARENA_ROWS,
  TOWERS,
  isBridgeTile,
  isRiverTile,
  type TowerSlot,
} from './arena'

type Props = {
  onExit: () => void
}

function towerLabel(t: TowerSlot): string {
  if (t.kind === 'king') return 'King'
  return t.col < ARENA_COLS / 2 ? 'Left' : 'Right'
}

function ArenaTower({ tower }: { tower: TowerSlot }) {
  const isKing = tower.kind === 'king'
  const fill = tower.side === 'ally' ? 'var(--color-tower-ally)' : 'var(--color-tower-enemy)'
  const left = `${(tower.col / ARENA_COLS) * 100}%`
  const top = `${(tower.row / ARENA_ROWS) * 100}%`
  const width = `${(tower.w / ARENA_COLS) * 100}%`
  const height = `${(tower.h / ARENA_ROWS) * 100}%`

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
        <div
          className="h-[12%] w-full rounded-sm"
          style={{ background: 'var(--color-bridge)' }}
          aria-hidden
        />
      </div>
    </motion.div>
  )
}

export function BattleScreen({ onExit }: Props) {
  const tiles = Array.from({ length: ARENA_ROWS * ARENA_COLS }, (_, i) => {
    const row = Math.floor(i / ARENA_COLS)
    const col = i % ARENA_COLS
    return { row, col, i }
  })

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
          Empty arena
        </div>
      </header>

      <div className="relative mx-auto flex min-h-0 w-full max-w-[28rem] flex-1 items-center justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="relative aspect-[18/32] h-auto max-h-full w-full overflow-hidden rounded-lg ring-2 ring-[#e8c547]/35"
          style={{
            background: 'var(--color-grass)',
            boxShadow: '0 0 0 4px #122018, 0 18px 40px #00000088',
          }}
          role="img"
          aria-label="Battle arena with eighteen by thirty-two tiles, a river with two bridges, and three towers on each side"
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

          {TOWERS.map((t) => (
            <ArenaTower key={t.id} tower={t} />
          ))}

          <div className="pointer-events-none absolute inset-x-0 top-[48%] flex justify-center">
            <span className="rounded bg-black/35 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest text-white/80">
              Characters soon
            </span>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto w-full max-w-[28rem] shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-lg border-2 border-dashed border-[#e8c547]/35 bg-[#1a2e24]"
              aria-label={`Empty card slot ${i + 1}`}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-[#8aa894]">
          Card hand placeholder — no characters yet
        </p>
      </div>
    </div>
  )
}
