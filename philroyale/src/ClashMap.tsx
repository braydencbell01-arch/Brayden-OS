/**
 * Clash-style arena art. Grass is solid (grid is gameplay-only / invisible).
 * Bridges align with dirt lanes; river animates as flowing water.
 */
export function ClashMap() {
  // Lane centers in viewBox (field x=42..318, mapped from cols)
  // left bridge mid col 23 → ~105.5 ; right bridge mid col 77 → ~254.5
  const leftLane = 105.5
  const rightLane = 254.5

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 360 640"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d9a4a" />
          <stop offset="45%" stopColor="#3a9246" />
          <stop offset="100%" stopColor="#348540" />
        </linearGradient>
        <linearGradient id="dirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d2a86a" />
          <stop offset="50%" stopColor="#b8894a" />
          <stop offset="100%" stopColor="#8f6635" />
        </linearGradient>
        <linearGradient id="riverBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a6fb5" />
          <stop offset="40%" stopColor="#2f9ad8" />
          <stop offset="100%" stopColor="#155a96" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c99555" />
          <stop offset="40%" stopColor="#9a6a32" />
          <stop offset="100%" stopColor="#5c3a18" />
        </linearGradient>
        <linearGradient id="woodRail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a07038" />
          <stop offset="100%" stopColor="#4a2c10" />
        </linearGradient>
        <pattern id="brick" width="14" height="10" patternUnits="userSpaceOnUse">
          <rect width="14" height="10" fill="#c8c2b4" />
          <rect width="13" height="9" fill="#d4cfc0" />
          <path d="M0 5 H14 M7 0 V5 M0 10 H14" stroke="#9a9488" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="baseDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3a3e" />
          <stop offset="100%" stopColor="#1a1a1e" />
        </linearGradient>
        <linearGradient id="cannonMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a6578" />
          <stop offset="100%" stopColor="#2a3344" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width="360" height="640" fill="#4a3220" />

      <Bleachers x={0} w={42} />
      <Bleachers x={318} w={42} />

      {/* Solid grass — no visible checker (grid stays for gameplay only) */}
      <rect x="42" y="28" width="276" height="584" rx="6" fill="url(#grassGrad)" />
      {/* subtle mow / depth without a grid */}
      <rect
        x="42"
        y="28"
        width="276"
        height="584"
        rx="6"
        fill="url(#grassGrad)"
        opacity="0.25"
        style={{ mixBlendMode: 'multiply' }}
      />
      <ellipse cx="180" cy="180" rx="120" ry="80" fill="#2f7a3a" opacity="0.12" />
      <ellipse cx="180" cy="460" rx="120" ry="80" fill="#2f7a3a" opacity="0.12" />

      {/* Dirt lanes aligned through princess pads → bridges → far pads */}
      <path
        d={`
          M${leftLane} 120
          V300
          M${rightLane} 120
          V300
          M${leftLane} 340
          V520
          M${rightLane} 340
          V520
          M${leftLane} 120 H${rightLane}
          M${leftLane} 520 H${rightLane}
          M${leftLane} 195 H160
          M200 195 H${rightLane}
          M${leftLane} 445 H160
          M200 445 H${rightLane}
        `}
        fill="none"
        stroke="url(#dirt)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <path
        d={`
          M${leftLane} 120 V300
          M${rightLane} 120 V300
          M${leftLane} 340 V520
          M${rightLane} 340 V520
        `}
        fill="none"
        stroke="#e8c48a"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.25"
      />

      <ellipse cx="180" cy="72" rx="48" ry="26" fill="#8a7350" opacity="0.9" />
      <ellipse cx="180" cy="568" rx="48" ry="26" fill="#8a7350" opacity="0.9" />
      <ellipse cx={leftLane} cy={140} rx="22" ry="14" fill="#8a7350" opacity="0.75" />
      <ellipse cx={rightLane} cy={140} rx="22" ry="14" fill="#8a7350" opacity="0.75" />
      <ellipse cx={leftLane} cy={500} rx="22" ry="14" fill="#8a7350" opacity="0.75" />
      <ellipse cx={rightLane} cy={500} rx="22" ry="14" fill="#8a7350" opacity="0.75" />

      {/* Flowing river */}
      <g>
        <rect x="42" y="300" width="276" height="40" fill="url(#riverBase)" />
        <rect x="42" y="300" width="276" height="8" fill="#ffffff33" />
        <rect x="42" y="332" width="276" height="8" fill="#0a3a5c55" />
        {/* animated ripples */}
        <g opacity="0.55">
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M42 ${308 + i * 7} Q80 ${302 + i * 7} 120 ${308 + i * 7} T200 ${308 + i * 7} T280 ${308 + i * 7} T318 ${308 + i * 7}`}
              fill="none"
              stroke="#e8f6ff"
              strokeWidth="1.6"
            >
              <animate
                attributeName="d"
                dur={`${2.2 + i * 0.35}s`}
                repeatCount="indefinite"
                values={`
                  M42 ${308 + i * 7} Q80 ${302 + i * 7} 120 ${308 + i * 7} T200 ${308 + i * 7} T280 ${308 + i * 7} T318 ${308 + i * 7};
                  M42 ${308 + i * 7} Q80 ${314 + i * 7} 120 ${308 + i * 7} T200 ${308 + i * 7} T280 ${308 + i * 7} T318 ${308 + i * 7};
                  M42 ${308 + i * 7} Q80 ${302 + i * 7} 120 ${308 + i * 7} T200 ${308 + i * 7} T280 ${308 + i * 7} T318 ${308 + i * 7}
                `}
              />
            </path>
          ))}
        </g>
        <g opacity="0.35">
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={70 + i * 90} cy={318} r="3" fill="#ffffff">
              <animate attributeName="cx" dur={`${3 + i}s`} repeatCount="indefinite" values={`${60 + i * 40};${300};${60 + i * 40}`} />
              <animate attributeName="opacity" dur={`${3 + i}s`} repeatCount="indefinite" values="0.1;0.5;0.1" />
            </circle>
          ))}
        </g>
      </g>

      {/* Bridges centered on lanes / dirt paths */}
      <RealisticBridge cx={leftLane} />
      <RealisticBridge cx={rightLane} />

      <CrownTower x={180} y={68} king enemy />
      <CrownTower x={leftLane} y={140} king={false} enemy />
      <CrownTower x={rightLane} y={140} king={false} enemy />
      <CrownTower x={180} y={572} king enemy={false} />
      <CrownTower x={leftLane} y={500} king={false} enemy={false} />
      <CrownTower x={rightLane} y={500} king={false} enemy={false} />

      <rect x="41" y="27" width="278" height="586" rx="6" fill="none" stroke="#c9a227" strokeWidth="2" opacity="0.4" />
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
      <rect x={x + w / 2 - 1.5} y={24} width="3" height={592} fill="#2a1810" opacity="0.55" />
    </g>
  )
}

function RealisticBridge({ cx }: { cx: number }) {
  const w = 34
  const x = cx - w / 2
  return (
    <g filter="url(#softShadow)">
      {/* water shadow under arch */}
      <ellipse cx={cx} cy={328} rx={w * 0.55} ry="7" fill="#0a2a44" opacity="0.55" />
      {/* stone abutments */}
      <rect x={x - 4} y={298} width="7" height="44" rx="1" fill="#8a8478" stroke="#5a5448" strokeWidth="1" />
      <rect x={x + w - 3} y={298} width="7" height="44" rx="1" fill="#8a8478" stroke="#5a5448" strokeWidth="1" />
      {/* deck */}
      <rect x={x} y={304} width={w} height="32" rx="2" fill="url(#wood)" stroke="#3d2410" strokeWidth="1.5" />
      {/* planks */}
      {Array.from({ length: 7 }, (_, i) => (
        <line
          key={i}
          x1={x + 4 + i * 4.2}
          x2={x + 4 + i * 4.2}
          y1={306}
          y2={334}
          stroke="#4a2c10"
          strokeWidth="1.2"
          opacity="0.55"
        />
      ))}
      {/* center wear */}
      <rect x={x + 6} y={316} width={w - 12} height="6" rx="2" fill="#e8c48a" opacity="0.18" />
      {/* rails */}
      <rect x={x - 1} y={301} width={w + 2} height="5" rx="1" fill="url(#woodRail)" stroke="#2a1808" strokeWidth="0.8" />
      <rect x={x - 1} y={334} width={w + 2} height="5" rx="1" fill="url(#woodRail)" stroke="#2a1808" strokeWidth="0.8" />
      {/* posts */}
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <rect
          key={i}
          x={x + t * (w - 4)}
          y={298}
          width="4"
          height="42"
          rx="1"
          fill="#6a4220"
          stroke="#2a1808"
          strokeWidth="0.7"
        />
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
  const s = king ? 1.15 : 0.92
  const banner = enemy ? '#e53935' : '#1e88e5'
  const bannerDark = enemy ? '#b71c1c' : '#0d47a1'

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="34" rx="28" ry="7" fill="#00000055" />
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
      <rect x="-18" y="-18" width="36" height="32" fill="url(#brick)" stroke="#7a7468" strokeWidth="1.5" />
      <path
        d="M-18 -2 H18 M-18 14 H18 M0 -18 V14 M-9 -2 V14 M9 -2 V14"
        stroke="#8a8478"
        strokeWidth="0.7"
        opacity="0.7"
      />
      <g transform="translate(0 2)">
        <circle cx="0" cy="0" r="9" fill="#f0d060" stroke="#b8860b" strokeWidth="1.2" />
        <path
          d="M-6 3 L-6 -2 L-3 1 L0 -4 L3 1 L6 -2 L6 3 Z"
          fill="#fff3a0"
          stroke="#a07410"
          strokeWidth="0.7"
        />
      </g>
      <path
        d="M-18 -14 H-8 V18 L-10.5 14 L-13 18 L-15.5 14 L-18 18 Z"
        fill={banner}
        stroke={bannerDark}
        strokeWidth="0.8"
      />
      <line x1="-18" y1="-10" x2="-8" y2="-10" stroke="#ffffff44" strokeWidth="1" />
      {[-16, -6, 4, 14].map((bx) => (
        <rect key={bx} x={bx} y="-26" width="8" height="10" fill="#c8c2b4" stroke="#7a7468" strokeWidth="1" />
      ))}
      <rect x="-18" y="-20" width="36" height="6" fill="#b8b2a4" stroke="#7a7468" strokeWidth="0.8" />
      <rect x="-8" y="-32" width="16" height="8" rx="2" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="0" cy="-34" rx="7" ry="5" fill="#3a4558" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="0" cy="-34" rx="3.2" ry="2.4" fill="#121820" />
      <rect x="-3" y="-40" width="6" height="8" rx="1.5" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="0.8" />
    </g>
  )
}
