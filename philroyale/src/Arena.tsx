import { forwardRef, type ReactNode } from 'react'
import { ARENA_COLS, ARENA_ROWS, TOWERS } from './arena'
import { ClashMap } from './ClashMap'

export type TowerHpView = { id: string; hp: number; maxHp: number }

/** ClashMap playable field inset (viewBox 360×640). */
const PAD_X = 42 / 360
const PAD_Y = 28 / 640
const FIELD_W = 276 / 360
const FIELD_H = 584 / 640

type Props = {
  towers?: TowerHpView[]
  children?: ReactNode
  onArenaPointerDown?: (col: number, row: number) => void
}

/** Map client coordinates to arena tile space (null if outside the playable field). */
export function clientToArenaTile(
  arenaEl: HTMLElement,
  clientX: number,
  clientY: number,
): { col: number; row: number } | null {
  const rect = arenaEl.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  const fx = (x - PAD_X) / FIELD_W
  const fy = (y - PAD_Y) / FIELD_H
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null
  return { col: fx * ARENA_COLS, row: fy * ARENA_ROWS }
}

function towerStyle(col: number, row: number, w: number, h: number) {
  return {
    left: `${(PAD_X + (col / ARENA_COLS) * FIELD_W) * 100}%`,
    top: `${(PAD_Y + (row / ARENA_ROWS) * FIELD_H) * 100}%`,
    width: `${(w / ARENA_COLS) * FIELD_W * 100}%`,
    height: `${(h / ARENA_ROWS) * FIELD_H * 100}%`,
  }
}

export const Arena = forwardRef<HTMLDivElement, Props>(function Arena(
  { towers = [], children, onArenaPointerDown },
  ref,
) {
  const hpMap = new Map(towers.map((t) => [t.id, t]))

  return (
    <div
      ref={ref}
      className={`relative h-full w-full overflow-hidden rounded-[10px] ${onArenaPointerDown ? 'cursor-crosshair' : ''}`}
      role={onArenaPointerDown ? 'application' : 'img'}
      aria-label="Clash Royale style arena"
      onPointerDown={
        onArenaPointerDown
          ? (e) => {
              // Ignore while dragging a card onto the map (handled by BattleScreen).
              if ((e.target as HTMLElement).closest('[data-card-drag]')) return
              const tile = clientToArenaTile(e.currentTarget, e.clientX, e.clientY)
              if (!tile) return
              onArenaPointerDown(tile.col, tile.row)
            }
          : undefined
      }
    >
      <ClashMap />

      {TOWERS.map((t) => {
        const th = hpMap.get(t.id)
        if (!th || th.hp <= 0) return null
        const style = towerStyle(t.col, t.row, t.w, t.h)
        const pct = th.maxHp > 0 ? th.hp / th.maxHp : 0
        return (
          <div key={t.id} className="pointer-events-none absolute z-[5]" style={style}>
            <div className="mx-auto mt-0 h-1 w-[55%] overflow-hidden rounded-sm bg-black/50">
              <div
                className="h-full"
                style={{
                  width: `${pct * 100}%`,
                  background:
                    t.side === 'enemy'
                      ? 'linear-gradient(180deg,#ff7a6a,#c63c2e)'
                      : 'linear-gradient(180deg,#7ec8ff,#2f6fbf)',
                }}
              />
            </div>
          </div>
        )
      })}

      <div
        className="pointer-events-none absolute z-[2] border-t border-dashed border-white/20 bg-gradient-to-t from-[#2f6fbf22] to-transparent"
        style={{
          left: `${PAD_X * 100}%`,
          width: `${FIELD_W * 100}%`,
          top: '50%',
          bottom: `${PAD_Y * 100}%`,
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 z-[8]">{children}</div>
    </div>
  )
})

/** Center of a tile → % position in the arena. */
export function unitStyle(col: number, row: number) {
  return {
    left: `${(PAD_X + ((col + 0.5) / ARENA_COLS) * FIELD_W) * 100}%`,
    top: `${(PAD_Y + ((row + 0.5) / ARENA_ROWS) * FIELD_H) * 100}%`,
  }
}

/** One tile width as % of the full arena element. */
export function oneTileWidthPct(): string {
  return `${(FIELD_W / ARENA_COLS) * 100}%`
}
