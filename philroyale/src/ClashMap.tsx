/**
 * Clash-style outdoor arena: grass, dirt lanes, 3D river/bridges/towers.
 * Bleachers are slim so the playable field fills most of the screen like CR.
 */
export function ClashMap() {
  // Field x=22..338 (316 wide). Lane centers ≈ bridge mids (cols 23, 77).
  const leftLane = 22 + (23 / 100) * 316
  const rightLane = 22 + (77 / 100) * 316
  const riverY = 308
  const riverH = 44

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 360 640"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4aad55" />
          <stop offset="40%" stopColor="#3d9a48" />
          <stop offset="100%" stopColor="#2f7f3a" />
        </linearGradient>
        <linearGradient id="dirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0b878" />
          <stop offset="45%" stopColor="#c4924e" />
          <stop offset="100%" stopColor="#8a5c2e" />
        </linearGradient>
        <linearGradient id="dirtSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6a4220" />
          <stop offset="50%" stopColor="#c4924e" />
          <stop offset="100%" stopColor="#6a4220" />
        </linearGradient>
        <linearGradient id="riverBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a6fb5" />
          <stop offset="35%" stopColor="#3ab0e8" />
          <stop offset="70%" stopColor="#1e7fc4" />
          <stop offset="100%" stopColor="#0d4a7a" />
        </linearGradient>
        <linearGradient id="bank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b9e3e" />
          <stop offset="100%" stopColor="#3d6a22" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a66a" />
          <stop offset="40%" stopColor="#9a6a32" />
          <stop offset="100%" stopColor="#4a2c10" />
        </linearGradient>
        <linearGradient id="woodRail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b08048" />
          <stop offset="100%" stopColor="#3a2010" />
        </linearGradient>
        <linearGradient id="stoneFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ece6d8" />
          <stop offset="45%" stopColor="#c8c0b0" />
          <stop offset="100%" stopColor="#8a8478" />
        </linearGradient>
        <linearGradient id="stoneSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6a655c" />
          <stop offset="100%" stopColor="#a8a090" />
        </linearGradient>
        <linearGradient id="baseDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a4a52" />
          <stop offset="100%" stopColor="#151518" />
        </linearGradient>
        <linearGradient id="cannonMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6a7588" />
          <stop offset="100%" stopColor="#1a2030" />
        </linearGradient>
        <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a6578" />
          <stop offset="100%" stopColor="#1e2838" />
        </linearGradient>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodOpacity="0.4" />
        </filter>
        <filter id="towerShade" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="1" dy="4" stdDeviation="3" floodOpacity="0.45" />
        </filter>
      </defs>

      <rect width="360" height="640" fill="#3a2818" />

      <Bleachers x={0} w={22} />
      <Bleachers x={338} w={22} />

      {/* Playable grass */}
      <rect x="22" y="16" width="316" height="608" rx="4" fill="url(#grassGrad)" />
      <ellipse cx="180" cy="170" rx="130" ry="90" fill="#2f7a3a" opacity="0.14" />
      <ellipse cx="180" cy="470" rx="130" ry="90" fill="#2f7a3a" opacity="0.14" />
      {/* subtle mow stripes */}
      {Array.from({ length: 14 }, (_, i) => (
        <rect
          key={i}
          x="22"
          y={20 + i * 44}
          width="316"
          height="18"
          fill="#ffffff"
          opacity={i % 2 === 0 ? 0.03 : 0.015}
        />
      ))}

      {/* Twin dirt lanes + cross connectors (CR two-path layout) */}
      <LanePath cx={leftLane} />
      <LanePath cx={rightLane} />
      <path
        d={`M${leftLane} 120 H${rightLane} M${leftLane} 520 H${rightLane}
            M${leftLane} 195 H155 M205 195 H${rightLane}
            M${leftLane} 445 H155 M205 445 H${rightLane}`}
        fill="none"
        stroke="url(#dirt)"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.92"
      />

      {/* Tower pads */}
      <ellipse cx="180" cy="62" rx="42" ry="22" fill="#8a7350" opacity="0.95" />
      <ellipse cx="180" cy="578" rx="42" ry="22" fill="#8a7350" opacity="0.95" />
      <ellipse cx={leftLane} cy={132} rx="20" ry="12" fill="#8a7350" opacity="0.85" />
      <ellipse cx={rightLane} cy={132} rx="20" ry="12" fill="#8a7350" opacity="0.85" />
      <ellipse cx={leftLane} cy={508} rx="20" ry="12" fill="#8a7350" opacity="0.85" />
      <ellipse cx={rightLane} cy={508} rx="20" ry="12" fill="#8a7350" opacity="0.85" />

      {/* 3D river channel */}
      <g>
        {/* far bank lip */}
        <rect x="22" y={riverY - 6} width="316" height="8" fill="url(#bank)" />
        <rect x="22" y={riverY - 6} width="316" height="3" fill="#8fce5a" opacity="0.35" />
        {/* water body with depth */}
        <rect x="22" y={riverY} width="316" height={riverH} fill="url(#riverBase)" />
        {/* near bank lip (thicker = closer) */}
        <rect x="22" y={riverY + riverH - 2} width="316" height="10" fill="#2a5a18" />
        <rect x="22" y={riverY + riverH - 2} width="316" height="4" fill="#5a9a30" opacity="0.5" />
        {/* water surface highlight */}
        <rect x="22" y={riverY} width="316" height="10" fill="#ffffff22" />
        <rect x="22" y={riverY + riverH - 12} width="316" height="8" fill="#06182855" />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M22 ${riverY + 10 + i * 8} Q70 ${riverY + 4 + i * 8} 120 ${riverY + 10 + i * 8} T220 ${riverY + 10 + i * 8} T338 ${riverY + 10 + i * 8}`}
            fill="none"
            stroke="#e8f6ff"
            strokeWidth="1.5"
            opacity="0.45"
          >
            <animate
              attributeName="d"
              dur={`${2 + i * 0.4}s`}
              repeatCount="indefinite"
              values={`
                M22 ${riverY + 10 + i * 8} Q70 ${riverY + 4 + i * 8} 120 ${riverY + 10 + i * 8} T220 ${riverY + 10 + i * 8} T338 ${riverY + 10 + i * 8};
                M22 ${riverY + 10 + i * 8} Q70 ${riverY + 16 + i * 8} 120 ${riverY + 10 + i * 8} T220 ${riverY + 10 + i * 8} T338 ${riverY + 10 + i * 8};
                M22 ${riverY + 10 + i * 8} Q70 ${riverY + 4 + i * 8} 120 ${riverY + 10 + i * 8} T220 ${riverY + 10 + i * 8} T338 ${riverY + 10 + i * 8}
              `}
            />
          </path>
        ))}
      </g>

      <Bridge3D cx={leftLane} riverY={riverY} riverH={riverH} />
      <Bridge3D cx={rightLane} riverY={riverY} riverH={riverH} />

      <CrownTower x={180} y={58} king enemy />
      <CrownTower x={leftLane} y={128} king={false} enemy />
      <CrownTower x={rightLane} y={128} king={false} enemy />
      <CrownTower x={180} y={578} king enemy={false} />
      <CrownTower x={leftLane} y={508} king={false} enemy={false} />
      <CrownTower x={rightLane} y={508} king={false} enemy={false} />

      <rect x="21" y="15" width="318" height="610" rx="4" fill="none" stroke="#c9a227" strokeWidth="2" opacity="0.35" />
    </svg>
  )
}

function LanePath({ cx }: { cx: number }) {
  return (
    <g>
      <path
        d={`M${cx} 105 V300 M${cx} 352 V535`}
        fill="none"
        stroke="url(#dirtSide)"
        strokeWidth="22"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d={`M${cx} 105 V300 M${cx} 352 V535`}
        fill="none"
        stroke="#f0d49a"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.28"
      />
    </g>
  )
}

function Bleachers({ x, w }: { x: number; w: number }) {
  const rows = 24
  return (
    <g>
      <rect x={x} y="12" width={w} height="616" fill="#2e1c12" />
      {Array.from({ length: rows }, (_, i) => {
        const y = 18 + i * 25
        const topHalf = i < rows / 2
        return (
          <g key={i}>
            <rect
              x={x + 2}
              y={y}
              width={w - 4}
              height="18"
              rx="1.5"
              fill={topHalf ? '#6a3030' : '#2a4a6e'}
              opacity="0.9"
            />
            {[0, 1].map((c) => (
              <circle
                key={c}
                cx={x + 6 + c * ((w - 10) / 1.4)}
                cy={y + 11}
                r="1.8"
                fill={topHalf ? '#c45c4a' : '#6a9acc'}
              />
            ))}
          </g>
        )
      })}
    </g>
  )
}

function Bridge3D({ cx, riverY, riverH }: { cx: number; riverY: number; riverH: number }) {
  const w = 38
  const x = cx - w / 2
  const top = riverY - 4
  const h = riverH + 10
  return (
    <g filter="url(#softShadow)">
      <ellipse cx={cx} cy={riverY + riverH * 0.55} rx={w * 0.6} ry="8" fill="#061828" opacity="0.55" />
      {/* abutments with 3D face */}
      <path
        d={`M${x - 5} ${top} h8 v${h} l-5 4 h-3 z`}
        fill="#7a7468"
        stroke="#4a4438"
        strokeWidth="1"
      />
      <path
        d={`M${x + w - 3} ${top} h8 v${h} l-5 4 h-3 z`}
        fill="#9a9488"
        stroke="#4a4438"
        strokeWidth="1"
      />
      {/* deck top */}
      <rect x={x} y={top + 6} width={w} height={h - 14} rx="2" fill="url(#wood)" stroke="#3d2410" strokeWidth="1.4" />
      {/* deck side thickness */}
      <path
        d={`M${x} ${top + h - 8} h${w} l3 5 h-${w + 6} z`}
        fill="#4a2c10"
        opacity="0.9"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1={x + 3 + i * 4.2}
          x2={x + 3 + i * 4.2}
          y1={top + 8}
          y2={top + h - 10}
          stroke="#3a2010"
          strokeWidth="1.1"
          opacity="0.5"
        />
      ))}
      <rect x={x - 1} y={top + 4} width={w + 2} height="5" rx="1" fill="url(#woodRail)" />
      <rect x={x - 1} y={top + h - 12} width={w + 2} height="5" rx="1" fill="url(#woodRail)" />
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <g key={i}>
          <rect x={x + t * (w - 5)} y={top + 2} width="5" height={h - 6} rx="1" fill="#6a4220" stroke="#2a1808" strokeWidth="0.7" />
          <rect x={x + t * (w - 5) + 1} y={top + 2} width="2" height={h - 6} fill="#c9a06a" opacity="0.25" />
        </g>
      ))}
    </g>
  )
}

function CrownTower({
  x,
  y,
  king,
  enemy,
}: {
  x: number
  y: number
  king: boolean
  enemy: boolean
}) {
  // Larger 3D presence while footprints stay 5×5 / 3×3 in gameplay.
  const s = king ? 0.72 : 0.48
  const banner = enemy ? '#e53935' : '#1e88e5'
  const bannerDark = enemy ? '#8e1a1a' : '#0d47a1'

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#towerShade)">
      {/* ground shadow */}
      <ellipse cx="0" cy="38" rx="32" ry="9" fill="#00000055" />
      {/* spiked circular base — isometric-ish */}
      <ellipse cx="0" cy="30" rx="30" ry="10" fill="#1a1a1e" stroke="#0a0a0c" strokeWidth="1.2" />
      <path
        d="M-28 28 L-22 10 L22 10 L28 28 Z"
        fill="url(#baseDark)"
        stroke="#0a0a0c"
        strokeWidth="1.2"
      />
      {[-20, -10, 0, 10].map((sx) => (
        <polygon
          key={sx}
          points={`${sx},26 ${sx + 6},26 ${sx + 3},16`}
          fill="#2e2e36"
          stroke="#111"
          strokeWidth="0.6"
        />
      ))}
      {/* 3D body: side + face */}
      <path d="M18 -20 L28 -14 L28 16 L18 10 Z" fill="url(#stoneSide)" stroke="#5a5448" strokeWidth="0.8" />
      <rect x="-20" y="-22" width="38" height="34" fill="url(#stoneFace)" stroke="#7a7468" strokeWidth="1.4" />
      <path
        d="M-20 -4 H18 M-20 12 H18 M-1 -22 V12 M-10 -4 V12 M8 -4 V12"
        stroke="#8a8478"
        strokeWidth="0.75"
        opacity="0.65"
      />
      {/* crown emblem */}
      <g transform="translate(-1 0)">
        <circle cx="0" cy="0" r="10" fill="#f0d060" stroke="#b8860b" strokeWidth="1.3" />
        <path
          d="M-6.5 3.5 L-6.5 -2.5 L-3.5 1 L0 -5 L3.5 1 L6.5 -2.5 L6.5 3.5 Z"
          fill="#fff3a0"
          stroke="#a07410"
          strokeWidth="0.7"
        />
      </g>
      {/* banner hanging left */}
      <path
        d="M-20 -16 H-9 V22 L-11.5 17.5 L-14.5 22 L-17.5 17.5 L-20 22 Z"
        fill={banner}
        stroke={bannerDark}
        strokeWidth="0.85"
      />
      <line x1="-20" y1="-12" x2="-9" y2="-12" stroke="#ffffff44" strokeWidth="1.1" />
      {/* battlements */}
      {[-18, -7, 4, 15].map((bx) => (
        <g key={bx}>
          <rect x={bx} y="-32" width="9" height="12" fill="#d4cfc0" stroke="#7a7468" strokeWidth="1" />
          <rect x={bx + 1} y="-32" width="3" height="12" fill="#ffffff33" />
        </g>
      ))}
      <rect x="-20" y="-24" width="38" height="6" fill="#b8b2a4" stroke="#7a7468" strokeWidth="0.8" />
      {/* turret / cannon dome */}
      <rect x="-10" y="-40" width="18" height="10" rx="2" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="-1" cy="-42" rx="9" ry="6" fill="url(#roof)" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="-1" cy="-42" rx="4" ry="3" fill="#0c1018" />
      <rect x="-4" y="-50" width="6" height="10" rx="1.5" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="0.8" />
      {/* tiny king silhouette on king towers */}
      {king ? (
        <g transform="translate(-1 -54)">
          <circle cx="0" cy="-2" r="3.2" fill="#f5d0a0" />
          <path d="M-4 2 Q0 8 4 2" fill="#2a3344" />
          <path d="M-3.5 -5 L-1.5 -8 L0 -5 L1.5 -8 L3.5 -5 Z" fill="#f5d76e" />
        </g>
      ) : null}
    </g>
  )
}
