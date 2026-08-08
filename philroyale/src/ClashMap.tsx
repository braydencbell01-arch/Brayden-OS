/**
 * Clash Royale–style arena art (grass grid, dirt ring, river, bridges,
 * king/princess towers, stands/trees). Layout matches classic CR arena.
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
        <linearGradient id="redRoof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e85a3c" />
          <stop offset="100%" stopColor="#9a2418" />
        </linearGradient>
        <linearGradient id="blueRoof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5aa8ff" />
          <stop offset="100%" stopColor="#1d4a86" />
        </linearGradient>
        <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8cbb4" />
          <stop offset="100%" stopColor="#9a8b72" />
        </linearGradient>
      </defs>

      {/* Outer dirt / stadium rim */}
      <rect width="360" height="640" fill="#6b4a2e" />
      <rect x="8" y="8" width="344" height="624" rx="10" fill="#5a3a22" />

      {/* Side stands */}
      <rect x="8" y="40" width="28" height="560" fill="#4a3018" />
      <rect x="324" y="40" width="28" height="560" fill="#4a3018" />
      {Array.from({ length: 18 }, (_, i) => (
        <g key={i}>
          <rect x="10" y={50 + i * 30} width="24" height="14" fill={i < 9 ? '#8a3030' : '#2f5a8a'} opacity="0.55" />
          <rect x="326" y={50 + i * 30} width="24" height="14" fill={i < 9 ? '#8a3030' : '#2f5a8a'} opacity="0.55" />
        </g>
      ))}

      {/* Trees / rocks along sides */}
      {[60, 120, 200, 280, 360, 440, 520, 580].map((y, i) => (
        <g key={`t${i}`}>
          <ellipse cx="22" cy={y} rx="10" ry="8" fill="#2d6a2d" />
          <ellipse cx="338" cy={y + 10} rx="10" ry="8" fill="#2d6a2d" />
          <circle cx="22" cy={y - 6} r="7" fill="#3f8f4a" />
          <circle cx="338" cy={y + 4} r="7" fill="#3f8f4a" />
        </g>
      ))}

      {/* Playable grass */}
      <rect x="36" y="36" width="288" height="568" rx="6" fill="url(#grass)" stroke="#2f6b3a" strokeWidth="3" />

      {/* Dirt path loop (tower ring) */}
      <path
        d="M90 120 H270 V200 H300 V440 H270 V520 H90 V440 H60 V200 H90 Z"
        fill="none"
        stroke="url(#dirt)"
        strokeWidth="22"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <path
        d="M90 120 H270 V200 H300 V440 H270 V520 H90 V440 H60 V200 H90 Z"
        fill="none"
        stroke="#b88952"
        strokeWidth="10"
        strokeLinejoin="round"
        opacity="0.55"
      />

      {/* King pads */}
      <ellipse cx="180" cy="78" rx="52" ry="28" fill="#8a7350" opacity="0.85" />
      <ellipse cx="180" cy="562" rx="52" ry="28" fill="#8a7350" opacity="0.85" />

      {/* River */}
      <rect x="36" y="300" width="288" height="40" fill="url(#river)" />
      <path
        d="M36 308 Q70 318 110 308 T180 308 T250 308 T324 308"
        fill="none"
        stroke="#ffffff55"
        strokeWidth="3"
      />
      <path
        d="M36 328 Q80 318 120 328 T200 328 T280 328 T324 328"
        fill="none"
        stroke="#ffffff33"
        strokeWidth="2"
      />

      {/* Bridges */}
      <Bridge x={78} />
      <Bridge x={238} />

      {/* Enemy towers (red) */}
      <Tower x={180} y={70} king enemy />
      <Tower x={95} y={145} king={false} enemy />
      <Tower x={265} y={145} king={false} enemy />

      {/* Ally towers (blue) */}
      <Tower x={180} y={570} king enemy={false} />
      <Tower x={95} y={495} king={false} enemy={false} />
      <Tower x={265} y={495} king={false} enemy={false} />

      {/* Wood frame */}
      <rect x="34" y="34" width="292" height="572" rx="6" fill="none" stroke="#c9a227" strokeWidth="2" opacity="0.55" />
    </svg>
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

function Tower({
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
  const w = king ? 54 : 40
  const h = king ? 58 : 44
  const left = x - w / 2
  const top = y - h / 2
  const roof = enemy ? 'url(#redRoof)' : 'url(#blueRoof)'
  const trim = enemy ? '#8a2418' : '#1d4a86'
  return (
    <g>
      <ellipse cx={x} cy={top + h + 2} rx={w * 0.42} ry={6} fill="#00000055" />
      <rect x={left + 6} y={top + 16} width={w - 12} height={h - 18} rx="3" fill="url(#stone)" stroke="#6e5c45" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={left + 6 + i * ((w - 12) / 4)}
          y={top + 12}
          width={(w - 12) / 4 - 2}
          height={8}
          fill="#c4b39a"
          stroke="#6e5c45"
          strokeWidth="1"
        />
      ))}
      <polygon
        points={`${left + 4},${top + 18} ${x},${top + 2} ${left + w - 4},${top + 18}`}
        fill={roof}
        stroke="#3a2010"
        strokeWidth="1.5"
      />
      <rect x={x - 4} y={top + 22} width="8" height={king ? 12 : 9} fill="#1a1410" rx="1" />
      {king ? (
        <path
          d={`M${x - 7} ${top + 14} L${x - 3} ${top + 7} L${x} ${top + 12} L${x + 3} ${top + 7} L${x + 7} ${top + 14} Z`}
          fill="#f5d76e"
          stroke="#8a6a12"
          strokeWidth="1"
        />
      ) : (
        <path d={`M${x} ${top + 4} L${x} ${top + 16} L${x + 12} ${top + 10} Z`} fill={roof} />
      )}
      <circle cx={x} cy={top + 28} r={king ? 5 : 4} fill="#e8c4a8" />
      <rect x={x - 3} y={top + 32} width="6" height="7" rx="1" fill={trim} />
    </g>
  )
}
