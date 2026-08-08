import type { ReactNode } from 'react'
import { ARENA_COLS, ARENA_ROWS, TOWERS } from './arena'
import { ClashMap } from './ClashMap'

export type TowerHpView = { id: string; hp: number; maxHp: number }

type Props = {
  towers?: TowerHpView[]
  children?: ReactNode
  onArenaPointerDown?: (col: number, row: number) => void
}

/** Map tower positions into the ClashMap viewBox (360×640), field inset ~36px. */
function towerStyle(col: number, row: number, w: number, h: number) {
  const padX = 36 / 360
  const padY = 36 / 640
  const fieldW = 288 / 360
  const fieldH = 568 / 640
  return {
    left: `${(padX + (col / ARENA_COLS) * fieldW) * 100}%`,
    top: `${(padY + (row / ARENA_ROWS) * fieldH) * 100}%`,
    width: `${(w / ARENA_COLS) * fieldW * 100}%`,
    height: `${(h / ARENA_ROWS) * fieldH * 100}%`,
  }
}

export function Arena({ towers = [], children, onArenaPointerDown }: Props) {
  const hpMap = new Map(towers.map((t) => [t.id, t]))

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[10px] ${onArenaPointerDown ? 'cursor-crosshair' : ''}`}
      role={onArenaPointerDown ? 'application' : 'img'}
      aria-label="Clash Royale style arena"
      onPointerDown={
        onArenaPointerDown
          ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = (e.clientX - rect.left) / rect.width
              const y = (e.clientY - rect.top) / rect.height
              const padX = 36 / 360
              const padY = 36 / 640
              const fieldW = 288 / 360
              const fieldH = 568 / 640
              const fx = (x - padX) / fieldW
              const fy = (y - padY) / fieldH
              if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return
              onArenaPointerDown(fx * ARENA_COLS, fy * ARENA_ROWS)
            }
          : undefined
      }
    >
      <ClashMap />

      {/* HP bars over towers drawn in SVG */}
      {TOWERS.map((t) => {
        const th = hpMap.get(t.id)
        if (!th || th.hp <= 0) return null
        const style = towerStyle(t.col, t.row, t.w, t.h)
        const pct = th.maxHp > 0 ? th.hp / th.maxHp : 0
        return (
          <div key={t.id} className="pointer-events-none absolute z-[5]" style={style}>
            <div className="mx-auto mt-0 h-1.5 w-[70%] overflow-hidden rounded-sm bg-black/50">
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

      {/* Deploy half hint */}
      <div
        className="pointer-events-none absolute inset-x-[10%] bottom-[6%] z-[2] h-[44%] border-t border-dashed border-white/25 bg-gradient-to-t from-[#2f6fbf22] to-transparent"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 z-[8]">{children}</div>
    </div>
  )
}

/** Convert unit tile coords → % inside field (same inset as Arena). */
export function unitStyle(col: number, row: number) {
  const padX = 36 / 360
  const padY = 36 / 640
  const fieldW = 288 / 360
  const fieldH = 568 / 640
  return {
    left: `${(padX + ((col + 0.5) / ARENA_COLS) * fieldW) * 100}%`,
    top: `${(padY + ((row + 0.5) / ARENA_ROWS) * fieldH) * 100}%`,
  }
}
