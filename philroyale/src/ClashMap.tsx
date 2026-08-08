/**
 * Clash Royale–style arena: grass, dirt ring, river, bridges,
 * crown towers (stone + cannon + banner), and side bleachers.
 */
export function ClashMap() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 360 640"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="grass" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#4caf50" />
          <rect width="10" height="10" fill="#57b85c" />
          <rect x="10" y="10" width="10" height="10" fill="#57b85c" />
          <rect x="10" width="10" height="10" fill="#449e4a" />
          <rect y="10" width="10" height="10" fill="#449e4a" />
        </pattern>
        <pattern id="brick" width="14" height="10" patternUnits="userSpaceOnUse">
          <rect width="14" height="10" fill="#c8c2b4" />
          <rect width="13" height="9" fill="#d4cfc0" />
          <path d="M0 5 H14 M7 0 V5 M0 10 H14" stroke="#9a9488" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b8fd4" />
          <stop offset="45%" stopColor="#4db2ef" />
          <stop offset="100%" stopColor="#1f6fad" />
        </linearGradient>
        <linearGradient id="dirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a06a" />
          <stop offset="100%" stopColor="#9a7342" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c48a4a" />
          <stop offset="100%" stopColor="#7a4a22" />
        </linearGradient>
        <linearGradient id="baseDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3e" />
          <stop offset="100%" stopColor="#1a1a1e" />
        </linearGradient>
        <linearGradient id="cannonMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a6578" />
          <stop offset="100%" stopColor="#2a3344" />
        </linearGradient>
      </defs>

      {/* Outer rim */}
      <rect width="360" height="640" fill="#4a3220" />

      {/* Wide side bleachers / stands (fill empty side space) */}
      <Bleachers x={0} w={42} />
      <Bleachers x={318} w={42} />

      {/* Trees tucked in stand corners */}
      {[70, 160, 250, 340, 430, 520, 580].map((y, i) => (
        <g key={`t${i}`}>
          <ellipse cx="14" cy={y} rx="9" ry="7" fill="#2d6a2d" />
          <circle cx="14" cy={y - 5} r="6" fill="#3f8f4a" />
          <ellipse cx="346" cy={y + 8} rx="9" ry="7" fill="#2d6a2d" />
          <circle cx="346" cy={y + 3} r="6" fill="#3f8f4a" />
        </g>
      ))}

      {/* Playable grass (narrower to leave stand space) */}
      <rect x="42" y="28" width="276" height="584" rx="6" fill="url(#grass)" stroke="#2f6b3a" strokeWidth="3" />

      {/* Dirt path loop */}
      <path
        d="M95 115 H265 V195 H292 V445 H265 V525 H95 V445 H68 V195 H95 Z"
        fill="none"
        stroke="url(#dirt)"
        strokeWidth="20"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <path
        d="M95 115 H265 V195 H292 V445 H265 V525 H95 V445 H68 V195 H95 Z"
        fill="none"
        stroke="#b88952"
        strokeWidth="9"
        strokeLinejoin="round"
        opacity="0.5"
      />

      <ellipse cx="180" cy="72" rx="48" ry="26" fill="#8a7350" opacity="0.85" />
      <ellipse cx="180" cy="568" rx="48" ry="26" fill="#8a7350" opacity="0.85" />

      {/* River */}
      <rect x="42" y="300" width="276" height="40" fill="url(#river)" />
      <path
        d="M42 308 Q80 318 120 308 T200 308 T280 308 T318 308"
        fill="none"
        stroke="#ffffff55"
        strokeWidth="3"
      />
      <path
        d="M42 328 Q90 318 140 328 T230 328 T318 328"
        fill="none"
        stroke="#ffffff33"
        strokeWidth="2"
      />

      <Bridge x={78} />
      <Bridge x={238} />

      {/* Towers matching reference: stone + crown + banner + cannon */}
      <CrownTower x={180} y={68} king enemy />
      <CrownTower x={95} y={140} king={false} enemy />
      <CrownTower x={265} y={140} king={false} enemy />
      <CrownTower x={180} y={572} king enemy={false} />
      <CrownTower x={95} y={500} king={false} enemy={false} />
      <CrownTower x={265} y={500} king={false} enemy={false} />

      <rect x="41" y="27" width="278" height="586" rx="6" fill="none" stroke="#c9a227" strokeWidth="2" opacity="0.45" />
    </svg>
  )
}

function Bleachers({ x, w }: { x: number; w: number }) {
  const rows = 22
  return (
    <g>
      <rect x={x} y={20} width={w} height={600} fill="#3d2818" />
      {Array.from({ length: rows }, (_, i) => {
        const y = 28 + i * 26
        const topHalf = i < rows / 2
        return (
          <g key={i}>
            {/* seat tier */}
            <rect
              x={x + 3}
              y={y}
              width={w - 6}
              height={20}
              rx="2"
              fill={topHalf ? '#6a3030' : '#2a4a6e'}
              opacity="0.85"
            />
            <rect
              x={x + 5}
              y={y + 3}
              width={w - 10}
              height={6}
              rx="1"
              fill={topHalf ? '#8a4040' : '#3a6a9a'}
              opacity="0.7"
            />
            {/* crowd dots */}
            {[0, 1, 2, 3].map((c) => (
              <circle
                key={c}
                cx={x + 10 + c * ((w - 16) / 3.2)}
                cy={y + 13}
                r="2.2"
                fill={topHalf ? '#c45c4a' : '#6a9acc'}
                opacity="0.9"
              />
            ))}
          </g>
        )
      })}
      {/* aisle rail */}
      <rect x={x + w / 2 - 1.5} y={24} width="3" height={592} fill="#2a1810" opacity="0.55" />
    </g>
  )
}

function Bridge({ x }: { x: number }) {
  return (
    <g>
      <ellipse cx={x + 22} cy={328} rx="28" ry="6" fill="#0a3a5c" opacity="0.45" />
      <rect x={x} y={304} width="44" height="32" rx="3" fill="url(#wood)" stroke="#4a3014" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={x + 8 + i * 10}
          x2={x + 8 + i * 10}
          y1={306}
          y2={334}
          stroke="#5a3818"
          strokeWidth="1.5"
          opacity="0.5"
        />
      ))}
      <rect x={x - 2} y={302} width="48" height="5" rx="1" fill="#7a5230" />
      <rect x={x - 2} y={333} width="48" height="5" rx="1" fill="#7a5230" />
    </g>
  )
}

/** Reference-style crown tower: flared base, brick body, crown emblem, banner, cannon. */
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
  const s = king ? 1.15 : 0.92
  const banner = enemy ? '#e53935' : '#1e88e5'
  const bannerDark = enemy ? '#b71c1c' : '#0d47a1'

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Shadow */}
      <ellipse cx="0" cy="34" rx="28" ry="7" fill="#00000055" />

      {/* Flared dark base with pyramid studs */}
      <path
        d="M-26 28 L-20 12 L20 12 L26 28 Z"
        fill="url(#baseDark)"
        stroke="#0a0a0c"
        strokeWidth="1.2"
      />
      {[-16, -5, 6].map((sx) => (
        <polygon
          key={sx}
          points={`${sx},26 ${sx + 5},26 ${sx + 2.5},18`}
          fill="#2a2a30"
          stroke="#111"
          strokeWidth="0.6"
        />
      ))}

      {/* Stone brick body */}
      <rect x="-18" y="-18" width="36" height="32" fill="url(#brick)" stroke="#7a7468" strokeWidth="1.5" />
      {/* brick seams overlay */}
      <path
        d="M-18 -2 H18 M-18 14 H18 M0 -18 V14 M-9 -2 V14 M9 -2 V14"
        stroke="#8a8478"
        strokeWidth="0.7"
        opacity="0.7"
      />

      {/* Gold crown emblem */}
      <g transform="translate(0 2)">
        <circle cx="0" cy="0" r="9" fill="#f0d060" stroke="#b8860b" strokeWidth="1.2" />
        <path
          d="M-6 3 L-6 -2 L-3 1 L0 -4 L3 1 L6 -2 L6 3 Z"
          fill="#fff3a0"
          stroke="#a07410"
          strokeWidth="0.7"
        />
      </g>

      {/* Banner (left side, jagged bottom) */}
      <path
        d="M-18 -14 H-8 V18 L-10.5 14 L-13 18 L-15.5 14 L-18 18 Z"
        fill={banner}
        stroke={bannerDark}
        strokeWidth="0.8"
      />
      <line x1="-18" y1="-10" x2="-8" y2="-10" stroke="#ffffff44" strokeWidth="1" />

      {/* Battlements */}
      {[-16, -6, 4, 14].map((bx) => (
        <rect key={bx} x={bx} y="-26" width="8" height="10" fill="#c8c2b4" stroke="#7a7468" strokeWidth="1" />
      ))}
      <rect x="-18" y="-20" width="36" height="6" fill="#b8b2a4" stroke="#7a7468" strokeWidth="0.8" />

      {/* Cannon on roof */}
      <rect x="-8" y="-32" width="16" height="8" rx="2" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="0" cy="-34" rx="7" ry="5" fill="#3a4558" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="0" cy="-34" rx="3.2" ry="2.4" fill="#121820" />
      <rect x="-3" y="-40" width="6" height="8" rx="1.5" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="0.8" />
    </g>
  )
}
