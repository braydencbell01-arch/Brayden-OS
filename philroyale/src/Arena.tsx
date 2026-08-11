import { forwardRef, useMemo, type ReactNode } from 'react'
import {
  ARENA_COLS,
  ARENA_ROWS,
  DEPLOY_PAST_RIVER,
  RIVER_MAX,
  RIVER_MIN,
  TOUCHDOWN_ALLY_MIN_ROW,
  TOUCHDOWN_ZONE_ROWS,
  TOWERS,
} from './arena'
import { ARENA_PERSPECTIVE_PX, ARENA_TILT_DEG, screenYToPlaneY } from './camera'
import { ClashMap } from './ClashMap'
import type { GameMode } from './storage'

export type TowerHpView = {
  id: string
  hp: number
  maxHp: number
  /** King tower wake state — drives cannon reveal on the map. */
  activated?: boolean
  kind?: 'king' | 'princess'
}

/** ClashMap playable field — full board (viewBox 360×640), no side stands. */
export const PAD_X = 0
export const PAD_Y = 0
export const FIELD_W = 1
export const FIELD_H = 1

/** Football field SVG for touchdown mode (viewBox 0 0 100 150). */
function FootballField() {
  const EZ = TOUCHDOWN_ZONE_ROWS // 12 — endzone depth in tile units
  const C = ARENA_COLS           // 100
  const R = ARENA_ROWS           // 150
  // Yard lines every 12.6 rows across the midfield (10-yard marks on a 126-row field)
  const playable = R - EZ * 2
  const YARD_STEP = playable / 10
  const yardLines: number[] = []
  for (let i = 0; i <= 10; i++) yardLines.push(EZ + i * YARD_STEP)

  function pylon(x: number, y: number, key: string) {
    return (
      <g key={key}>
        <polygon
          points={`${x},${y - 3.2} ${x - 1.4},${y + 1.2} ${x + 1.4},${y + 1.2}`}
          fill="#ffdd00"
          stroke="#c9a000"
          strokeWidth="0.25"
          opacity="0.98"
        />
        <rect x={x - 0.55} y={y + 1.1} width="1.1" height="1.6" fill="#e6c200" rx="0.2" />
      </g>
    )
  }

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${C} ${R}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="td-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a5c1a" />
          <stop offset="50%" stopColor="#226622" />
          <stop offset="100%" stopColor="#1a5c1a" />
        </linearGradient>
        <linearGradient id="td-ez-enemy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b1a9a" />
          <stop offset="100%" stopColor="#8e2fd0" />
        </linearGradient>
        <linearGradient id="td-ez-ally" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a4a9a" />
          <stop offset="100%" stopColor="#2a6ad4" />
        </linearGradient>
        <pattern id="td-mow" width="100" height={YARD_STEP} patternUnits="userSpaceOnUse">
          <rect width="100" height={YARD_STEP / 2} fill="#00000014" />
        </pattern>
      </defs>

      {/* Main grass */}
      <rect x="0" y="0" width={C} height={R} fill="url(#td-grass)" />
      <rect x="0" y={EZ} width={C} height={playable} fill="url(#td-mow)" />

      {/* Enemy endzone (top) */}
      <rect x="0" y="0" width={C} height={EZ} fill="url(#td-ez-enemy)" opacity="0.92" />
      <text
        x={C / 2}
        y={EZ / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="6"
        fontWeight="bold"
        fill="white"
        opacity="0.5"
        style={{ fontFamily: 'Impact, Haettenschweiler, sans-serif', letterSpacing: '2px' }}
      >
        END ZONE
      </text>

      {/* Ally endzone (bottom — YOUR end zone) */}
      <rect x="0" y={R - EZ} width={C} height={EZ} fill="url(#td-ez-ally)" opacity="0.95" />
      <text
        x={C / 2}
        y={R - EZ / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="5.5"
        fontWeight="bold"
        fill="white"
        opacity="0.7"
        style={{ fontFamily: 'Impact, Haettenschweiler, sans-serif', letterSpacing: '1.5px' }}
      >
        YOUR END ZONE
      </text>

      {/* Yard lines + numbers + hashes */}
      {yardLines.map((row, i) => {
        const yard = i <= 5 ? i * 10 : (10 - i) * 10
        return (
          <g key={`yl-${i}`}>
            <line
              x1="2"
              y1={row}
              x2={C - 2}
              y2={row}
              stroke="white"
              strokeWidth={i === 5 ? 1.2 : 0.65}
              opacity={i === 5 ? 0.9 : 0.72}
            />
            {i > 0 && i < 10 ? (
              <>
                <text
                  x="5"
                  y={row - 1.2}
                  fontSize="4"
                  fill="white"
                  opacity="0.78"
                  fontWeight="bold"
                  style={{ fontFamily: 'Impact, Haettenschweiler, sans-serif' }}
                >
                  {yard}
                </text>
                <text
                  x={C - 5}
                  y={row - 1.2}
                  fontSize="4"
                  fill="white"
                  opacity="0.78"
                  fontWeight="bold"
                  textAnchor="end"
                  style={{ fontFamily: 'Impact, Haettenschweiler, sans-serif' }}
                >
                  {yard}
                </text>
                {/* Hash marks */}
                {[0.28, 0.72].map((fx) => (
                  <g key={`${i}-${fx}`}>
                    <line
                      x1={C * fx - 1.8}
                      y1={row}
                      x2={C * fx + 1.8}
                      y2={row}
                      stroke="white"
                      strokeWidth="0.45"
                      opacity="0.55"
                    />
                    <line
                      x1={C * fx}
                      y1={row - 1.4}
                      x2={C * fx}
                      y2={row + 1.4}
                      stroke="white"
                      strokeWidth="0.45"
                      opacity="0.55"
                    />
                  </g>
                ))}
              </>
            ) : null}
          </g>
        )
      })}

      {/* Endzone goal lines */}
      <line x1="0" y1={EZ} x2={C} y2={EZ} stroke="white" strokeWidth="1.4" opacity="0.95" />
      <line
        x1="0"
        y1={R - EZ}
        x2={C}
        y2={R - EZ}
        stroke="white"
        strokeWidth="1.4"
        opacity="0.95"
      />

      {/* Sidelines */}
      <line x1="2" y1="0" x2="2" y2={R} stroke="white" strokeWidth="1" opacity="0.7" />
      <line x1={C - 2} y1="0" x2={C - 2} y2={R} stroke="white" strokeWidth="1" opacity="0.7" />

      {/* Goal posts — enemy (top) */}
      <g opacity="0.9">
        <rect x={C / 2 - 10} y="1.5" width="20" height="1.1" fill="#f0f0f0" />
        <rect x={C / 2 - 10} y="1.5" width="1.1" height="7" fill="#f0f0f0" />
        <rect x={C / 2 + 8.9} y="1.5" width="1.1" height="7" fill="#f0f0f0" />
        <rect x={C / 2 - 0.45} y="8" width="0.9" height="3.5" fill="#f0f0f0" />
      </g>
      {/* Goal posts — ally (bottom) */}
      <g opacity="0.9">
        <rect x={C / 2 - 10} y={R - 2.6} width="20" height="1.1" fill="#f0f0f0" />
        <rect x={C / 2 - 10} y={R - 8.5} width="1.1" height="7" fill="#f0f0f0" />
        <rect x={C / 2 + 8.9} y={R - 8.5} width="1.1" height="7" fill="#f0f0f0" />
        <rect x={C / 2 - 0.45} y={R - 11.5} width="0.9" height="3.5" fill="#f0f0f0" />
      </g>

      {/* Pylons at endzone corners */}
      {pylon(3.5, EZ, 'pe-l')}
      {pylon(C - 3.5, EZ, 'pe-r')}
      {pylon(3.5, R - EZ, 'pa-l')}
      {pylon(C - 3.5, R - EZ, 'pa-r')}
      {pylon(3.5, 2.5, 'pe-bl')}
      {pylon(C - 3.5, 2.5, 'pe-br')}
      {pylon(3.5, R - 2.5, 'pa-bl')}
      {pylon(C - 3.5, R - 2.5, 'pa-br')}

      {/* Midfield logo ring */}
      <circle
        cx={C / 2}
        cy={R / 2}
        r="5.5"
        fill="none"
        stroke="white"
        strokeWidth="0.7"
        opacity="0.55"
      />
      <text
        x={C / 2}
        y={R / 2 + 1.2}
        textAnchor="middle"
        fontSize="3.2"
        fill="white"
        opacity="0.45"
        fontWeight="bold"
        style={{ fontFamily: 'Impact, Haettenschweiler, sans-serif' }}
      >
        50
      </text>
    </svg>
  )
}


type Props = {
  towers?: TowerHpView[]
  children?: ReactNode
  onArenaPointerDown?: (col: number, row: number) => void
  showBlockedOverlay?: boolean
  /** Spell drag — place-anywhere hint (no troop red zone). */
  spellDeployOverlay?: boolean
  overlaySide?: 'ally' | 'enemy'
  /** Battle mode — changes background and tower visibility. */
  mode?: GameMode
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
  mode = 'classic',
}: {
  towers: TowerHpView[]
  side: 'ally' | 'enemy'
  mode?: GameMode
}) {
  // Touchdown: shade the 2/3 of the field where you cannot place (everything above your third).
  if (mode === 'touchdown') {
    const blockedBottom =
      side === 'ally'
        ? (TOUCHDOWN_ALLY_MIN_ROW / ARENA_ROWS) * 100
        : ((ARENA_ROWS - TOUCHDOWN_ALLY_MIN_ROW) / ARENA_ROWS) * 100
    return (
      <svg
        className="pointer-events-none absolute inset-0 z-[6] h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect
          x="0"
          y={side === 'ally' ? 0 : 100 - blockedBottom}
          width="100"
          height={blockedBottom}
          fill="#c62828"
          opacity="0.38"
        />
      </svg>
    )
  }

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
    mode = 'classic',
  },
  ref,
) {
  const isTouchdown = mode === 'touchdown'
  const hpMap = new Map(towers.map((t) => [t.id, t]))
  const destroyedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of towers) {
      if (t.hp <= 0) ids.add(t.id)
    }
    return ids
  }, [towers])
  const activatedKingIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of towers) {
      if (t.hp <= 0) continue
      if (t.kind === 'king' && t.activated) ids.add(t.id)
      // Fallback if kind isn't passed: king ids with activated flag.
      else if (t.activated && (t.id === 'ally-king' || t.id === 'enemy-king')) ids.add(t.id)
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
        aria-label={isTouchdown ? 'Football touchdown arena' : 'Clash Royale style arena'}
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
        {isTouchdown ? (
          <FootballField />
        ) : (
          <ClashMap destroyedIds={destroyedIds} activatedKingIds={activatedKingIds} />
        )}

        {/* Lighting / AO wash — visual only; does not change hitboxes or layout */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background: isTouchdown
              ? 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.18) 100%)'
              : `
              linear-gradient(180deg, rgba(8,24,12,0.32) 0%, transparent 20%, transparent 70%, rgba(255,248,200,0.14) 100%),
              linear-gradient(90deg, rgba(0,0,0,0.22) 0%, transparent 16%, transparent 84%, rgba(0,0,0,0.2) 100%),
              radial-gradient(ellipse 75% 40% at 50% 8%, rgba(255,250,200,0.16), transparent 55%),
              radial-gradient(ellipse 90% 55% at 50% 100%, rgba(20,40,16,0.25), transparent 60%)
            `,
            mixBlendMode: 'soft-light',
          }}
          aria-hidden
        />
        {/* Subtle film grain for outdoor grit */}
        {!isTouchdown ? (
          <div
            className="pointer-events-none absolute inset-0 z-[2] opacity-[0.07]"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              mixBlendMode: 'overlay',
            }}
            aria-hidden
          />
        ) : null}

        {/* Towers — hidden in touchdown mode (no towers on a football field) */}
        {!isTouchdown && TOWERS.map((t) => {
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

        {showBlockedOverlay ? (
          <DeployBlockOverlay towers={towers} side={overlaySide} mode={mode} />
        ) : null}
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

        {/* Classic mid-line — hidden in touchdown mode (field has own markings) */}
        {!isTouchdown && (
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
        )}

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

/** Visual character width — CR-readable troop size; hitbox stays 1 tile. */
export function unitVisualWidthPct(scale = 1): string {
  return `${(FIELD_W / ARENA_COLS) * 9.5 * scale * 100}%`
}
