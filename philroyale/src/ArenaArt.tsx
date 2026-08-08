import type { Side, TowerKind } from './arena'

type TowerProps = {
  side: Side
  kind: TowerKind
  hpPct?: number
}

/** Clash-style crown / princess towers (stone + colored roof). */
export function CrownTower({ side, kind, hpPct = 1 }: TowerProps) {
  const isKing = kind === 'king'
  const enemy = side === 'enemy'
  const roof = enemy ? '#c63c2e' : '#2f6fbf'
  const roofDark = enemy ? '#8f2418' : '#1d4a86'
  const banner = enemy ? '#e85a3c' : '#4a9eff'
  const w = isKing ? 86 : 64
  const h = isKing ? 110 : 86

  return (
    <div className="relative flex flex-col items-center" style={{ width: w, height: h + 18 }}>
      <div className="mb-0.5 h-2 w-[88%] overflow-hidden rounded-sm bg-black/50 ring-1 ring-black/40">
        <div
          className="h-full rounded-sm"
          style={{
            width: `${Math.max(0, Math.min(1, hpPct)) * 100}%`,
            background: enemy
              ? 'linear-gradient(180deg,#ff7a6a,#c63c2e)'
              : 'linear-gradient(180deg,#7ec8ff,#2f6fbf)',
          }}
        />
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="drop-shadow-[0_4px_6px_rgba(0,0,0,0.55)]">
        {/* base pad */}
        <ellipse cx={w / 2} cy={h - 6} rx={w * 0.42} ry={8} fill="#5a4030" opacity="0.85" />
        {/* stone body */}
        <rect
          x={w * 0.18}
          y={isKing ? 34 : 28}
          width={w * 0.64}
          height={isKing ? 62 : 48}
          rx="3"
          fill="#c4b39a"
          stroke="#6e5c45"
          strokeWidth="2"
        />
        {/* brick lines */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={w * 0.2}
            x2={w * 0.8}
            y1={(isKing ? 48 : 40) + i * 12}
            y2={(isKing ? 48 : 40) + i * 12}
            stroke="#8f7d64"
            strokeWidth="1"
            opacity="0.7"
          />
        ))}
        {/* window */}
        <rect
          x={w * 0.42}
          y={isKing ? 52 : 42}
          width={w * 0.16}
          height={isKing ? 18 : 14}
          rx="1"
          fill="#1a1410"
        />
        {/* battlements */}
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`b${i}`}
            x={w * 0.18 + i * (w * 0.16)}
            y={isKing ? 26 : 20}
            width={w * 0.12}
            height={10}
            fill="#b5a48c"
            stroke="#6e5c45"
            strokeWidth="1"
          />
        ))}
        {/* roof / crown house */}
        <polygon
          points={
            isKing
              ? `${w * 0.12},${34} ${w / 2},${10} ${w * 0.88},${34}`
              : `${w * 0.16},${28} ${w / 2},${8} ${w * 0.84},${28}`
          }
          fill={roof}
          stroke={roofDark}
          strokeWidth="2"
        />
        <rect
          x={w * 0.28}
          y={isKing ? 28 : 22}
          width={w * 0.44}
          height={isKing ? 10 : 8}
          fill={roofDark}
        />
        {/* crown gem / flag */}
        {isKing ? (
          <>
            <circle cx={w / 2} cy={18} r="5" fill="#f5d76e" stroke="#8a6a12" strokeWidth="1.5" />
            <path
              d={`M${w / 2 - 8} 22 L${w / 2 - 4} 14 L${w / 2} 20 L${w / 2 + 4} 14 L${w / 2 + 8} 22 Z`}
              fill="#f5d76e"
              stroke="#8a6a12"
              strokeWidth="1"
            />
          </>
        ) : (
          <path
            d={`M${w / 2} 8 L${w / 2} 22 L${w / 2 + 14} 16 Z`}
            fill={banner}
            stroke={roofDark}
            strokeWidth="1"
          />
        )}
        {/* colored trim */}
        <rect
          x={w * 0.18}
          y={h - 22}
          width={w * 0.64}
          height={8}
          fill={banner}
          opacity="0.9"
        />
      </svg>
    </div>
  )
}

export function StoneBridge({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 120 56"
      className="h-full w-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`plank-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c49a5c" />
          <stop offset="50%" stopColor="#9a6f3a" />
          <stop offset="100%" stopColor="#6e4a24" />
        </linearGradient>
      </defs>
      {/* arch shadow in water */}
      <ellipse cx="60" cy="48" rx="48" ry="6" fill="#0a3a5c" opacity="0.55" />
      {/* deck */}
      <rect x="10" y="14" width="100" height="28" rx="3" fill={`url(#plank-${side})`} stroke="#4a3014" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1={18 + i * 16}
          x2={18 + i * 16}
          y1="16"
          y2="40"
          stroke="#5a3818"
          strokeWidth="1.5"
          opacity="0.55"
        />
      ))}
      {/* railings */}
      <rect x="8" y="10" width="104" height="5" rx="1" fill="#7a5230" stroke="#3d2410" strokeWidth="1" />
      <rect x="8" y="40" width="104" height="5" rx="1" fill="#7a5230" stroke="#3d2410" strokeWidth="1" />
      {/* posts */}
      {[12, 40, 68, 96].map((x) => (
        <rect key={x} x={x} y="6" width="6" height="40" rx="1" fill="#5c3a1c" stroke="#2a180c" strokeWidth="1" />
      ))}
    </svg>
  )
}

export function KingTowerHouse({ side }: { side: Side }) {
  return (
    <div className="pointer-events-none absolute inset-x-[18%] top-[2%] bottom-[78%] z-[2]">
      <div
        className="mx-auto h-full max-w-[58%] rounded-t-md border-2 border-[#4a3018]"
        style={{
          background:
            side === 'enemy'
              ? 'linear-gradient(180deg,#8a3a2a 0%,#5a2418 100%)'
              : 'linear-gradient(180deg,#3a5a8a 0%,#243a5a 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), 0 6px 12px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex h-full items-end justify-center gap-1 pb-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[55%] w-[18%] rounded-t-sm bg-black/45" />
          ))}
        </div>
      </div>
    </div>
  )
}
