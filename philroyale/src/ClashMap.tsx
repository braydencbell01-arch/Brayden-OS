/**
 * Clash Royale–style outdoor arena (grass, dirt lanes, 3D river/bridges/towers/stands).
 * Lane mids match bridge cols 23 & 77; path width matches bridge footprint.
 */
export function ClashMap() {
  const fieldX = 0
  const fieldW = 360
  const leftLane = fieldX + (23 / 100) * fieldW
  const rightLane = fieldX + (77 / 100) * fieldW
  /** Continuous wooden lanes — same width as bridges (CR plank paths). */
  const pathW = (7.5 / 100) * fieldW
  const riverY = 312
  const riverH = 26

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 360 640"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
          {/* Far (top) darker / cooler; near (bottom) brighter — reads under tilt */}
          <stop offset="0%" stopColor="#2a6e34" />
          <stop offset="35%" stopColor="#3a9a45" />
          <stop offset="70%" stopColor="#4cb356" />
          <stop offset="100%" stopColor="#5ec864" />
        </linearGradient>
        <linearGradient id="depthFog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3a20" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#1a3a20" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="dirt" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7a4a22" />
          <stop offset="20%" stopColor="#d2a05a" />
          <stop offset="50%" stopColor="#e8c07a" />
          <stop offset="80%" stopColor="#d2a05a" />
          <stop offset="100%" stopColor="#7a4a22" />
        </linearGradient>
        <linearGradient id="riverBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d5a9a" />
          <stop offset="30%" stopColor="#2a9ad8" />
          <stop offset="70%" stopColor="#1a7ab8" />
          <stop offset="100%" stopColor="#063a68" />
        </linearGradient>
        <linearGradient id="bankTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec84a" />
          <stop offset="100%" stopColor="#3d6a22" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0b878" />
          <stop offset="40%" stopColor="#a07038" />
          <stop offset="100%" stopColor="#4a2810" />
        </linearGradient>
        <linearGradient id="woodSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6a4220" />
          <stop offset="100%" stopColor="#2a1408" />
        </linearGradient>
        <linearGradient id="stoneFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0ebe0" />
          <stop offset="40%" stopColor="#cfc6b6" />
          <stop offset="100%" stopColor="#8a8274" />
        </linearGradient>
        <linearGradient id="stoneSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a5448" />
          <stop offset="100%" stopColor="#a8a090" />
        </linearGradient>
        <linearGradient id="baseDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a4a54" />
          <stop offset="100%" stopColor="#121216" />
        </linearGradient>
        <linearGradient id="cannonMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a8598" />
          <stop offset="100%" stopColor="#1a2030" />
        </linearGradient>
        <filter id="softShadow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.4" />
        </filter>
        <filter id="towerShade" x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="1.5" dy="4" stdDeviation="3" floodOpacity="0.5" />
        </filter>
      </defs>

      <rect width="360" height="640" fill="url(#grassGrad)" />
      <rect width="360" height="640" fill="url(#depthFog)" />
      {Array.from({ length: 16 }, (_, i) => (
        <rect
          key={i}
          x={fieldX}
          y={i * 40}
          width={fieldW}
          height="18"
          fill="#ffffff"
          opacity={i % 2 === 0 ? 0.04 + i * 0.002 : 0.015}
        />
      ))}
      {/* Soft side vignette instead of bleachers */}
      <rect width="18" height="640" fill="#000000" opacity="0.12" />
      <rect x="342" width="18" height="640" fill="#000000" opacity="0.12" />
      {/* Near-edge ground lip for 3/4 depth */}
      <ellipse
        cx={180}
        cy={628}
        rx={fieldW * 0.52}
        ry="22"
        fill="#000000"
        opacity="0.14"
      />

      <DirtLane cx={leftLane} w={pathW} />
      <DirtLane cx={rightLane} w={pathW} />
      {/* Short cross-links into king pads — same wood as lanes */}
      <path
        d={`M${leftLane} 70 H${rightLane}
            M${leftLane} 560 H${rightLane}`}
        fill="none"
        stroke="url(#wood)"
        strokeWidth={pathW * 0.45}
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Thin 3D river */}
      <g>
        <rect x={fieldX} y={riverY - 5} width={fieldW} height="6" fill="url(#bankTop)" />
        <rect x={fieldX} y={riverY - 5} width={fieldW} height="2" fill="#a8e070" opacity="0.4" />
        <rect x={fieldX} y={riverY} width={fieldW} height={riverH} fill="url(#riverBase)" />
        <rect x={fieldX} y={riverY} width={fieldW} height="6" fill="#ffffff28" />
        <rect x={fieldX} y={riverY + riverH - 5} width={fieldW} height="5" fill="#04182866" />
        <rect x={fieldX} y={riverY + riverH} width={fieldW} height="7" fill="#2a5018" />
        <rect x={fieldX} y={riverY + riverH} width={fieldW} height="3" fill="#5a9a30" opacity="0.45" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${fieldX} ${riverY + 7 + i * 6} Q90 ${riverY + 3 + i * 6} 140 ${riverY + 7 + i * 6} T260 ${riverY + 7 + i * 6} T${fieldX + fieldW} ${riverY + 7 + i * 6}`}
            fill="none"
            stroke="#e8f6ff"
            strokeWidth="1.2"
            opacity="0.4"
          >
            <animate
              attributeName="d"
              dur={`${1.8 + i * 0.35}s`}
              repeatCount="indefinite"
              values={`
                M${fieldX} ${riverY + 7 + i * 6} Q90 ${riverY + 3 + i * 6} 140 ${riverY + 7 + i * 6} T260 ${riverY + 7 + i * 6} T${fieldX + fieldW} ${riverY + 7 + i * 6};
                M${fieldX} ${riverY + 7 + i * 6} Q90 ${riverY + 11 + i * 6} 140 ${riverY + 7 + i * 6} T260 ${riverY + 7 + i * 6} T${fieldX + fieldW} ${riverY + 7 + i * 6};
                M${fieldX} ${riverY + 7 + i * 6} Q90 ${riverY + 3 + i * 6} 140 ${riverY + 7 + i * 6} T260 ${riverY + 7 + i * 6} T${fieldX + fieldW} ${riverY + 7 + i * 6}
              `}
            />
          </path>
        ))}
      </g>

      <Bridge3D cx={leftLane} w={pathW} riverY={riverY} riverH={riverH} />
      <Bridge3D cx={rightLane} w={pathW} riverY={riverY} riverH={riverH} />

      {/* Pull enemy king slightly in so both kings stay fully on-screen */}
      <CrownTower x={180} y={62} king enemy />
      <CrownTower x={leftLane} y={128} king={false} enemy />
      <CrownTower x={rightLane} y={128} king={false} enemy />
      <CrownTower x={180} y={555} king enemy={false} />
      <CrownTower x={leftLane} y={508} king={false} enemy={false} />
      <CrownTower x={rightLane} y={508} king={false} enemy={false} />

      <rect
        x="1"
        y="1"
        width="358"
        height="638"
        rx="2"
        fill="none"
        stroke="#c9a227"
        strokeWidth="1.4"
        opacity="0.22"
      />
    </svg>
  )
}

function DirtLane({ cx, w }: { cx: number; w: number }) {
  const x = cx - w / 2
  const top = 62
  const bot = 568
  const h = bot - top
  const plankN = Math.max(18, Math.round(h / 14))
  return (
    <g>
      {/* Full-length wooden plank lane — same look + width as the bridge */}
      <rect x={x} y={top} width={w} height={h} rx="1" fill="url(#wood)" stroke="#3d2410" strokeWidth="0.8" />
      <rect x={x + w * 0.36} y={top} width={w * 0.28} height={h} fill="#fff6d0" opacity="0.14" />
      {Array.from({ length: plankN }, (_, i) => (
        <line
          key={i}
          x1={x + 1}
          x2={x + w - 1}
          y1={top + 2 + i * (h / plankN)}
          y2={top + 2 + i * (h / plankN)}
          stroke="#3a2010"
          strokeWidth="0.7"
          opacity="0.35"
        />
      ))}
      <rect x={x} y={top} width="1.5" height={h} fill="#5a3418" opacity="0.4" />
      <rect x={x + w - 1.5} y={top} width="1.5" height={h} fill="#5a3418" opacity="0.4" />
    </g>
  )
}

function Bridge3D({
  cx,
  w,
  riverY,
  riverH,
}: {
  cx: number
  w: number
  riverY: number
  riverH: number
}) {
  // Exact same width as DirtLane — planks sit on the continuous lane.
  const x = cx - w / 2
  const top = riverY - 2
  const h = riverH + 4
  const plankN = Math.max(3, Math.round(w / 6))
  return (
    <g filter="url(#softShadow)">
      <ellipse cx={cx} cy={riverY + riverH * 0.55} rx={w * 0.42} ry="3.2" fill="#041828" opacity="0.42" />
      <rect x={x} y={top + 2} width={w} height={h - 5} rx="1" fill="url(#wood)" stroke="#3d2410" strokeWidth="0.9" />
      <path d={`M${x} ${top + h - 4} h${w} l0.8 2.2 h-${w + 1.6} z`} fill="url(#woodSide)" />
      {Array.from({ length: plankN }, (_, i) => (
        <line
          key={i}
          x1={x + 1.5 + i * (w / plankN)}
          x2={x + 1.5 + i * (w / plankN)}
          y1={top + 3}
          y2={top + h - 5}
          stroke="#3a2010"
          strokeWidth="0.75"
          opacity="0.4"
        />
      ))}
      <rect x={x} y={top + 1.5} width={w} height="2" rx="0.3" fill="#6a4220" />
      <rect x={x} y={top + h - 5.5} width={w} height="2" rx="0.3" fill="#6a4220" />
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
  const s = king ? 0.78 : 0.52
  const banner = enemy ? '#e53935' : '#1e88e5'
  const bannerDark = enemy ? '#8e1a1a' : '#0d47a1'

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#towerShade)">
      <ellipse cx="0" cy="40" rx="34" ry="10" fill="#00000055" />
      <ellipse cx="0" cy="32" rx="32" ry="11" fill="#1a1a1e" stroke="#0a0a0c" strokeWidth="1.2" />
      <path d="M-30 30 L-24 8 L24 8 L30 30 Z" fill="url(#baseDark)" stroke="#0a0a0c" strokeWidth="1.2" />
      {[-22, -11, 0, 11].map((sx) => (
        <polygon
          key={sx}
          points={`${sx},28 ${sx + 7},28 ${sx + 3.5},15`}
          fill="#2e2e36"
          stroke="#111"
          strokeWidth="0.6"
        />
      ))}
      {/* 3D body */}
      <path d="M20 -22 L32 -14 L32 18 L20 10 Z" fill="url(#stoneSide)" stroke="#5a5448" strokeWidth="0.9" />
      <rect x="-22" y="-24" width="42" height="36" fill="url(#stoneFace)" stroke="#7a7468" strokeWidth="1.4" />
      <path
        d="M-22 -6 H20 M-22 10 H20 M-1 -24 V10 M-11 -6 V10 M9 -6 V10"
        stroke="#8a8478"
        strokeWidth="0.8"
        opacity="0.65"
      />
      <g transform="translate(-1 0)">
        <circle cx="0" cy="0" r="11" fill="#f0d060" stroke="#b8860b" strokeWidth="1.4" />
        <path
          d="M-7 4 L-7 -3 L-3.5 1 L0 -6 L3.5 1 L7 -3 L7 4 Z"
          fill="#fff3a0"
          stroke="#a07410"
          strokeWidth="0.75"
        />
      </g>
      <path
        d="M-22 -18 H-10 V24 L-13 19 L-16 24 L-19 19 L-22 24 Z"
        fill={banner}
        stroke={bannerDark}
        strokeWidth="0.9"
      />
      {[-20, -8, 4, 16].map((bx) => (
        <g key={bx}>
          <rect x={bx} y="-36" width="10" height="14" fill="#d8d2c4" stroke="#7a7468" strokeWidth="1" />
          <rect x={bx + 1} y="-36" width="3" height="14" fill="#ffffff33" />
        </g>
      ))}
      <rect x="-22" y="-26" width="42" height="6" fill="#b8b2a4" stroke="#7a7468" strokeWidth="0.8" />
      <rect x="-11" y="-44" width="20" height="12" rx="2" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="-1" cy="-46" rx="10" ry="7" fill="#3a4558" stroke="#1a2030" strokeWidth="1" />
      <ellipse cx="-1" cy="-46" rx="4.5" ry="3.2" fill="#0c1018" />
      <rect x="-4.5" y="-56" width="7" height="12" rx="1.5" fill="url(#cannonMetal)" stroke="#1a2030" strokeWidth="0.8" />

      {king ? (
        <g transform="translate(-1 -60)">
          <circle cx="0" cy="-2" r="3.4" fill="#f5d0a0" />
          <path d="M-4.5 2 Q0 9 4.5 2" fill="#2a3344" />
          <path d="M-4 -6 L-1.5 -9.5 L0 -6 L1.5 -9.5 L4 -6 Z" fill="#f5d76e" />
        </g>
      ) : (
        /* Archers on princess towers */
        <g transform="translate(-1 -50)">
          <g transform="translate(-6 0)">
            <circle cx="0" cy="0" r="2.4" fill="#f5d0a0" />
            <rect x="-2" y="2" width="4" height="5" rx="0.5" fill={enemy ? '#c63c2e' : '#2f6fbf'} />
            <line x1="2" y1="3" x2="7" y2="1" stroke="#5a3a18" strokeWidth="1.1" />
          </g>
          <g transform="translate(6 0)">
            <circle cx="0" cy="0" r="2.4" fill="#f5d0a0" />
            <rect x="-2" y="2" width="4" height="5" rx="0.5" fill={enemy ? '#c63c2e' : '#2f6fbf'} />
            <line x1="2" y1="3" x2="7" y2="1" stroke="#5a3a18" strokeWidth="1.1" />
          </g>
        </g>
      )}
    </g>
  )
}
