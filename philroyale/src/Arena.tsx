import { forwardRef, useMemo, type ReactNode } from 'react'
import {
  ARENA_COLS,
  ARENA_ROWS,
  DEPLOY_PAST_RIVER,
  RIVER_MAX,
  RIVER_MIN,
  TOWERS,
} from './arena'
import { ARENA_PERSPECTIVE_PX, ARENA_TILT_DEG, screenYToPlaneY } from './camera'
import { ClashMap } from './ClashMap'

export type TowerHpView = { id: string; hp: number; maxHp: number }

/** ClashMap playable field — full board (viewBox 360×640), no side stands. */
export const PAD_X = 0
export const PAD_Y = 0
export const FIELD_W = 1
export const FIELD_H = 1

type Props = {
  towers?: TowerHpView[]
  children?: ReactNode
  onArenaPointerDown?: (col: number, row: number) => void
  showBlockedOverlay?: boolean
  /** Spell drag — place-anywhere hint (no troop red zone). */
  spellDeployOverlay?: boolean
  overlaySide?: 'ally' | 'enemy'
}

/**
 * Map client coordinates onto the tilted arena plane → tile space.
 * `arenaEl` must be the transformed plane element (the one with rotateX).
 */
export function clientToArenaTile(
  arenaEl: HTMLElement,
  clientX: number,
  clientY: number,
): { col: number; row: number } | null {
  const rect = arenaEl.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  const nx = (clientX - rect.left) / rect.width
  const nyScreen = (clientY - rect.top) / rect.height
  const ny = screenYToPlaneY(nyScreen)
  const fx = (nx - PAD_X) / FIELD_W
  const fy = (ny - PAD_Y) / FIELD_H
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

function rowPct(row: number) {
  return (PAD_Y + (row / ARENA_ROWS) * FIELD_H) * 100
}

function colPct(col: number) {
  return (PAD_X + (col / ARENA_COLS) * FIELD_W) * 100
}

function DeployBlockOverlay({
  towers,
  side,
}: {
  towers: TowerHpView[]
  side: 'ally' | 'enemy'
}) {
  const leftId = side === 'ally' ? 'enemy-left' : 'ally-left'
  const rightId = side === 'ally' ? 'enemy-right' : 'ally-right'
  const leftAlive = (towers.find((t) => t.id === leftId)?.hp ?? 0) > 0
  const rightAlive = (towers.find((t) => t.id === rightId)?.hp ?? 0) > 0

  const ownTop = side === 'ally' ? RIVER_MAX + 1 : 0
  const ownBottom = side === 'ally' ? ARENA_ROWS : RIVER_MIN
  const pastTop = side === 'ally' ? RIVER_MIN - DEPLOY_PAST_RIVER : RIVER_MAX + 1
  const pastBottom = side === 'ally' ? RIVER_MIN : RIVER_MAX + DEPLOY_PAST_RIVER

  const holes: { x: number; y: number; w: number; h: number }[] = []

  holes.push({
    x: colPct(0),
    y: rowPct(ownTop),
    w: FIELD_W * 100,
    h: rowPct(ownBottom) - rowPct(ownTop),
  })

  if (!leftAlive && !rightAlive) {
    holes.push({
      x: colPct(0),
      y: rowPct(Math.min(pastTop, pastBottom)),
      w: FIELD_W * 100,
      h: Math.abs(rowPct(pastBottom) - rowPct(pastTop)),
    })
  } else {
    if (!leftAlive) {
      holes.push({
        x: colPct(0),
        y: rowPct(Math.min(pastTop, pastBottom)),
        w: (FIELD_W * 100) / 2,
        h: Math.abs(rowPct(pastBottom) - rowPct(pastTop)),
      })
    }
    if (!rightAlive) {
      holes.push({
        x: colPct(ARENA_COLS / 2),
        y: rowPct(Math.min(pastTop, pastBottom)),
        w: (FIELD_W * 100) / 2,
        h: Math.abs(rowPct(pastBottom) - rowPct(pastTop)),
      })
    }
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[6] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <mask id="deploy-mask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          {holes.map((h, i) => (
            <rect key={i} x={h.x} y={h.y} width={h.w} height={Math.max(0, h.h)} fill="black" />
          ))}
        </mask>
      </defs>
      <rect
        x={PAD_X * 100}
        y={PAD_Y * 100}
        width={FIELD_W * 100}
        height={FIELD_H * 100}
        fill="#c62828"
        opacity="0.32"
        mask="url(#deploy-mask)"
      />
    </svg>
  )
}

export const Arena = forwardRef<HTMLDivElement, Props>(function Arena(
  {
    towers = [],
    children,
    onArenaPointerDown,
    showBlockedOverlay,
    spellDeployOverlay,
    overlaySide = 'ally',
  },
  ref,
) {
  const hpMap = new Map(towers.map((t) => [t.id, t]))
  const destroyedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of towers) {
      if (t.hp <= 0) ids.add(t.id)
    }
    return ids
  }, [towers])

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ perspective: `${ARENA_PERSPECTIVE_PX}px`, perspectiveOrigin: '50% 100%' }}
    >
      <div
        ref={ref}
        className={`relative h-full w-full origin-bottom ${onArenaPointerDown ? 'cursor-crosshair' : ''}`}
        style={{
          // No zoom — entire board (both kings + all princess towers) stays visible.
          transform: `rotateX(${ARENA_TILT_DEG}deg) scale(1, 1)`,
          transformStyle: 'preserve-3d',
        }}
        role={onArenaPointerDown ? 'application' : 'img'}
        aria-label="Clash Royale style arena"
        onPointerDown={
          onArenaPointerDown
            ? (e) => {
                if ((e.target as HTMLElement).closest('[data-card-drag]')) return
                const tile = clientToArenaTile(e.currentTarget, e.clientX, e.clientY)
                if (!tile) return
                onArenaPointerDown(tile.col, tile.row)
              }
            : undefined
        }
      >
        <ClashMap destroyedIds={destroyedIds} />
        {/* Lighting / AO wash — visual only; does not change hitboxes or layout */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background: `
              linear-gradient(180deg, rgba(8,24,12,0.28) 0%, transparent 22%, transparent 72%, rgba(255,248,200,0.1) 100%),
              linear-gradient(90deg, rgba(0,0,0,0.18) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.16) 100%),
              radial-gradient(ellipse 70% 45% at 30% 18%, rgba(255,246,168,0.12), transparent 60%)
            `,
            mixBlendMode: 'soft-light',
          }}
          aria-hidden
        />

        {TOWERS.map((t) => {
          const th = hpMap.get(t.id)
          if (!th || th.hp <= 0) return null
          const style = towerStyle(t.col, t.row, t.w, t.h)
          const z = Math.round(t.row + t.h)
          const pct = th.maxHp > 0 ? th.hp / th.maxHp : 0
          const enemy = t.side === 'enemy'
          return (
            <div
              key={t.id}
              className="pointer-events-none absolute"
              style={{ ...style, zIndex: 5 + z }}
            >
              <div
                className="absolute left-1/2 w-[320%] max-w-[6.25rem] -translate-x-1/2"
                style={{
                  // Thin HP bar at tower feet — CR style, not above crown.
                  bottom: '-2%',
                  transform: `rotateX(${-ARENA_TILT_DEG}deg)`,
                  transformOrigin: '50% 100%',
                }}
              >
                <div
                  className="relative h-[0.34rem] overflow-hidden rounded-[1px]"
                  style={{
                    background: '#0a0a0c',
                    boxShadow: '0 0 0 1px #000, 0 1px 2px #0006',
                  }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${pct * 100}%`,
                      background: enemy ? '#e53935' : '#1e88e5',
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[0.28rem] font-bold leading-none text-white/80">
                    {Math.round(th.hp)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {showBlockedOverlay ? <DeployBlockOverlay towers={towers} side={overlaySide} /> : null}
        {spellDeployOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 z-[6]"
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 50% 50%, #2a9ad844 0%, #0d5a9a22 55%, transparent 75%)',
              boxShadow: 'inset 0 0 0 2px #4a9eff66',
            }}
            aria-hidden
          />
        ) : null}

        <div
          className="pointer-events-none absolute z-[2] border-t border-dashed border-white/15 bg-gradient-to-t from-[#2f6fbf18] to-transparent"
          style={{
            left: `${PAD_X * 100}%`,
            width: `${FIELD_W * 100}%`,
            top: '50%',
            bottom: `${PAD_Y * 100}%`,
          }}
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {children}
        </div>
      </div>
    </div>
  )
})

export function unitStyle(col: number, row: number) {
  return {
    left: `${(PAD_X + ((col + 0.5) / ARENA_COLS) * FIELD_W) * 100}%`,
    top: `${(PAD_Y + ((row + 0.5) / ARENA_ROWS) * FIELD_H) * 100}%`,
  }
}

/** Logical 1-tile width (% of arena). Visual models use a multiple of this. */
export function oneTileWidthPct(): string {
  return `${(FIELD_W / ARENA_COLS) * 100}%`
}

/** Visual character width — ~9× tile (3× prior) so units read CR-scale; hitbox stays 1 tile. */
export function unitVisualWidthPct(scale = 1): string {
  return `${(FIELD_W / ARENA_COLS) * 9.3 * scale * 100}%`
}
