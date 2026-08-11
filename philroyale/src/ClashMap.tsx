/**
 * Clash Royale–style outdoor arena (textured grass, plank paths, river, bridges, towers).
 * Lane mids match bridge cols 23 & 77; path width matches bridge footprint.
 */

type Props = {
  /** Tower ids with hp <= 0 — shown as rubble instead of intact towers. */
  destroyedIds?: ReadonlySet<string>
}

const TOWER_PLACES = [
  { id: 'enemy-king', x: 180, y: 62, king: true, enemy: true },
  { id: 'enemy-left', x: null as number | null, y: 128, king: false, enemy: true, lane: 'left' as const },
  { id: 'enemy-right', x: null as number | null, y: 128, king: false, enemy: true, lane: 'right' as const },
  { id: 'ally-king', x: 180, y: 555, king: true, enemy: false },
  { id: 'ally-left', x: null as number | null, y: 508, king: false, enemy: false, lane: 'left' as const },
  { id: 'ally-right', x: null as number | null, y: 508, king: false, enemy: false, lane: 'right' as const },
] as const

export function ClashMap({ destroyedIds }: Props) {
  const fieldX = 0
  const fieldW = 360
  const leftLane = fieldX + (23 / 100) * fieldW
  const rightLane = fieldX + (77 / 100) * fieldW
  const pathW = (7.5 / 100) * fieldW
  const riverY = 312
  const riverH = 26
  const dead = destroyedIds ?? new Set<string>()

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 360 640"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
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
        <linearGradient id="rubbleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8b0a0" />
          <stop offset="55%" stopColor="#6a6558" />
          <stop offset="100%" stopColor="#2a2820" />
        </linearGradient>

        {/* ——— Terrain textures (layout-neutral — visual only) ——— */}
        <filter id="grassNoise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.15
                    0 0 0 0 0.45
                    0 0 0 0 0.18
                    0 0 0 0.35 0"
            result="tint"
          />
        </filter>
        <filter id="grassBump" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="4" seed="11" result="bump" />
          <feDiffuseLighting in="bump" lightingColor="#d8ffc8" surfaceScale="2.4" result="lit">
            <feDistantLight azimuth="225" elevation="48" />
          </feDiffuseLighting>
          <feComposite in="lit" in2="SourceGraphic" operator="in" result="clip" />
          <feBlend in="SourceGraphic" in2="clip" mode="soft-light" />
        </filter>
        <filter id="coarseTerrain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="19" result="c" />
          <feColorMatrix
            in="c"
            type="matrix"
            values="0 0 0 0 0.12
                    0 0 0 0 0.38
                    0 0 0 0 0.14
                    0 0 0 0.42 0"
          />
        </filter>
        <linearGradient id="groundBevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a2010" stopOpacity="0.35" />
          <stop offset="18%" stopColor="#0a2010" stopOpacity="0.08" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="82%" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#fff8d0" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id="sideLight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.22" />
          <stop offset="22%" stopColor="#000000" stopOpacity="0.04" />
          <stop offset="78%" stopColor="#fff6c8" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
        <radialGradient id="sunPool" cx="32%" cy="22%" r="58%">
          <stop offset="0%" stopColor="#fff6a8" stopOpacity="0.16" />
          <stop offset="45%" stopColor="#c8e878" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <pattern id="grassBlades" width="18" height="14" patternUnits="userSpaceOnUse">
          <path d="M2 14 Q3 6 2 2" fill="none" stroke="#2e7d32" strokeWidth="0.7" opacity="0.35" />
          <path d="M6 14 Q8 5 7 1" fill="none" stroke="#66bb6a" strokeWidth="0.65" opacity="0.3" />
          <path d="M11 14 Q10 7 12 3" fill="none" stroke="#1b5e20" strokeWidth="0.75" opacity="0.28" />
          <path d="M15 14 Q16 8 15 4" fill="none" stroke="#81c784" strokeWidth="0.55" opacity="0.25" />
          <circle cx="4" cy="11" r="0.7" fill="#c9a227" opacity="0.12" />
          <circle cx="13" cy="9" r="0.55" fill="#fff8e0" opacity="0.1" />
        </pattern>
        <pattern id="turfPatches" width="48" height="40" patternUnits="userSpaceOnUse">
          <ellipse cx="12" cy="18" rx="10" ry="6" fill="#2e7d32" opacity="0.12" />
          <ellipse cx="34" cy="10" rx="9" ry="5" fill="#1b5e20" opacity="0.1" />
          <ellipse cx="28" cy="30" rx="11" ry="5" fill="#66bb6a" opacity="0.08" />
        </pattern>
        <pattern id="clodScatter" width="56" height="48" patternUnits="userSpaceOnUse">
          <ellipse cx="10" cy="14" rx="5" ry="2.4" fill="#5a3a18" opacity="0.07" />
          <ellipse cx="38" cy="28" rx="6" ry="2.8" fill="#1b5e20" opacity="0.09" />
          <ellipse cx="24" cy="40" rx="4" ry="1.8" fill="#8a6a30" opacity="0.06" />
          <circle cx="44" cy="10" r="1.1" fill="#c9a227" opacity="0.1" />
          <circle cx="16" cy="32" r="0.8" fill="#fff8e0" opacity="0.08" />
        </pattern>
        <linearGradient id="plankBevel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a2010" stopOpacity="0.55" />
          <stop offset="18%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#1a0c04" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="riverSpecular" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="35%" stopColor="#b8e8ff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#041828" stopOpacity="0.2" />
        </linearGradient>
        <pattern id="woodGrain" width="8" height="22" patternUnits="userSpaceOnUse">
          <rect width="8" height="22" fill="#a07038" opacity="0" />
          <path d="M1 0 Q3 8 1.5 14 T2 22" fill="none" stroke="#5a3418" strokeWidth="0.55" opacity="0.35" />
          <path d="M5 0 Q4 10 5.5 16 T5 22" fill="none" stroke="#3a2010" strokeWidth="0.45" opacity="0.28" />
          <line x1="0" y1="7" x2="8" y2="7" stroke="#2a1408" strokeWidth="0.4" opacity="0.2" />
          <line x1="0" y1="16" x2="8" y2="16" stroke="#2a1408" strokeWidth="0.35" opacity="0.18" />
        </pattern>
        <pattern id="plankWear" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.8" fill="#3a2010" opacity="0.2" />
          <circle cx="9" cy="9" r="0.6" fill="#fff6d0" opacity="0.12" />
          <circle cx="7" cy="2" r="0.5" fill="#2a1408" opacity="0.15" />
        </pattern>
        <pattern id="waterRipple" width="40" height="16" patternUnits="userSpaceOnUse">
          <path
            d="M0 8 Q10 4 20 8 T40 8"
            fill="none"
            stroke="#e8f6ff"
            strokeWidth="1.1"
            opacity="0.35"
          />
          <path
            d="M0 12 Q10 9 20 12 T40 12"
            fill="none"
            stroke="#a8d8ff"
            strokeWidth="0.7"
            opacity="0.22"
          />
        </pattern>
        <filter id="waterNoise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.045 0.12" numOctaves="2" seed="3" result="w" />
          <feColorMatrix
            in="w"
            type="matrix"
            values="0 0 0 0 0.15
                    0 0 0 0 0.45
                    0 0 0 0 0.75
                    0 0 0 0.28 0"
          />
        </filter>
        <filter id="softShadow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.4" />
        </filter>
        <filter id="towerShade" x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="1.5" dy="4" stdDeviation="3" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Grass base + richer 3D texture layers (no layout shift) */}
      <rect width="360" height="640" fill="url(#grassGrad)" />
      <rect width="360" height="640" filter="url(#coarseTerrain)" opacity="0.7" />
      <rect width="360" height="640" filter="url(#grassBump)" opacity="0.85" />
      <rect width="360" height="640" filter="url(#grassNoise)" opacity="0.5" />
      <rect width="360" height="640" fill="url(#turfPatches)" />
      <rect width="360" height="640" fill="url(#clodScatter)" />
      <rect width="360" height="640" fill="url(#grassBlades)" />
      {/* Soft terrain mounds — decorative volume only */}
      <ellipse cx="70" cy="180" rx="58" ry="28" fill="#1b5e20" opacity="0.1" />
      <ellipse cx="290" cy="210" rx="64" ry="30" fill="#2e7d32" opacity="0.09" />
      <ellipse cx="100" cy="470" rx="70" ry="34" fill="#66bb6a" opacity="0.08" />
      <ellipse cx="270" cy="500" rx="62" ry="30" fill="#1b5e20" opacity="0.1" />
      <ellipse cx="180" cy="390" rx="90" ry="22" fill="#0a2810" opacity="0.08" />
      <rect width="360" height="640" fill="url(#sunPool)" />
      <rect width="360" height="640" fill="url(#groundBevel)" />
      <rect width="360" height="640" fill="url(#sideLight)" />
      <rect width="360" height="640" fill="url(#depthFog)" />
      {/* Perspective ground bands — denser toward camera for foreshortening feel */}
      {Array.from({ length: 28 }, (_, i) => {
        const y = i * (640 / 28)
        const h = 6 + i * 0.35
        const lit = i % 2 === 0
        return (
          <rect
            key={`band-${i}`}
            x={fieldX}
            y={y}
            width={fieldW}
            height={h}
            fill={lit ? '#ffffff' : '#0a2010'}
            opacity={lit ? 0.028 + i * 0.0012 : 0.04 + i * 0.001}
          />
        )
      })}
      <rect width="22" height="640" fill="#000000" opacity="0.16" />
      <rect x="338" width="22" height="640" fill="#000000" opacity="0.16" />
      <ellipse
        cx={180}
        cy={628}
        rx={fieldW * 0.52}
        ry="26"
        fill="#000000"
        opacity="0.2"
      />

      <DirtLane cx={leftLane} w={pathW} />
      <DirtLane cx={rightLane} w={pathW} />
      <path
        d={`M${leftLane} 70 H${rightLane}
            M${leftLane} 560 H${rightLane}`}
        fill="none"
        stroke="url(#wood)"
        strokeWidth={pathW * 0.45}
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d={`M${leftLane} 70 H${rightLane}
            M${leftLane} 560 H${rightLane}`}
        fill="none"
        stroke="url(#woodGrain)"
        strokeWidth={pathW * 0.4}
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* River with deeper water / bank volume (same Y/H footprint) */}
      <g>
        {/* Ambient occlusion in the river trench */}
        <ellipse
          cx={180}
          cy={riverY + riverH * 0.5}
          rx={fieldW * 0.52}
          ry={riverH * 0.85}
          fill="#041828"
          opacity="0.28"
        />
        <rect x={fieldX} y={riverY - 7} width={fieldW} height="8" fill="url(#bankTop)" />
        <rect x={fieldX} y={riverY - 7} width={fieldW} height="2.5" fill="#c8f090" opacity="0.35" />
        <rect x={fieldX} y={riverY - 2} width={fieldW} height="3" fill="#1a3a10" opacity="0.35" />
        <rect x={fieldX} y={riverY} width={fieldW} height={riverH} fill="url(#riverBase)" />
        <rect
          x={fieldX}
          y={riverY}
          width={fieldW}
          height={riverH}
          filter="url(#waterNoise)"
          opacity="0.72"
        />
        <rect
          x={fieldX}
          y={riverY}
          width={fieldW}
          height={riverH}
          fill="url(#waterRipple)"
          opacity="0.6"
        />
        <rect
          x={fieldX}
          y={riverY}
          width={fieldW}
          height={riverH}
          fill="url(#riverSpecular)"
          opacity="0.55"
        />
        <rect x={fieldX} y={riverY} width={fieldW} height="5" fill="#ffffff33" />
        <rect x={fieldX} y={riverY + riverH - 6} width={fieldW} height="6" fill="#04182877" />
        <rect x={fieldX} y={riverY + riverH} width={fieldW} height="8" fill="#2a5018" />
        <rect x={fieldX} y={riverY + riverH} width={fieldW} height="3" fill="#7ec84a" opacity="0.4" />
        <rect x={fieldX} y={riverY + riverH + 3} width={fieldW} height="4" fill="#0a2010" opacity="0.25" />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M${fieldX} ${riverY + 7 + i * 6} Q90 ${riverY + 3 + i * 6} 140 ${riverY + 7 + i * 6} T260 ${riverY + 7 + i * 6} T${fieldX + fieldW} ${riverY + 7 + i * 6}`}
            fill="none"
            stroke="#e8f6ff"
            strokeWidth="1.2"
            opacity="0.5"
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

      {TOWER_PLACES.map((place) => {
        const x =
          place.x ??
          (place.lane === 'left' ? leftLane : rightLane)
        const destroyed = dead.has(place.id)
        return destroyed ? (
          <CrumbledTower
            key={place.id}
            x={x}
            y={place.y}
            king={place.king}
            enemy={place.enemy}
          />
        ) : (
          <CrownTower
            key={place.id}
            x={x}
            y={place.y}
            king={place.king}
            enemy={place.enemy}
          />
        )
      })}

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
      {/* Ground contact shadow — same lane footprint */}
      <rect
        x={x - 1.5}
        y={top + 2}
        width={w + 3}
        height={h}
        rx="1.5"
        fill="#0a0804"
        opacity="0.28"
      />
      <rect x={x} y={top} width={w} height={h} rx="1" fill="url(#wood)" stroke="#3d2410" strokeWidth="0.8" />
      <rect x={x} y={top} width={w} height={h} fill="url(#woodGrain)" opacity="0.6" />
      <rect x={x} y={top} width={w} height={h} fill="url(#plankWear)" opacity="0.75" />
      <rect x={x} y={top} width={w} height={h} fill="url(#plankBevel)" opacity="0.85" />
      <rect x={x + w * 0.36} y={top} width={w * 0.28} height={h} fill="#fff6d0" opacity="0.14" />
      {Array.from({ length: plankN }, (_, i) => (
        <g key={i}>
          <line
            x1={x + 1}
            x2={x + w - 1}
            y1={top + 2 + i * (h / plankN)}
            y2={top + 2 + i * (h / plankN)}
            stroke="#3a2010"
            strokeWidth="0.7"
            opacity="0.42"
          />
          <line
            x1={x + 1}
            x2={x + w - 1}
            y1={top + 2.7 + i * (h / plankN)}
            y2={top + 2.7 + i * (h / plankN)}
            stroke="#fff6d0"
            strokeWidth="0.45"
            opacity="0.12"
          />
        </g>
      ))}
      <rect x={x} y={top} width="2" height={h} fill="#5a3418" opacity="0.5" />
      <rect x={x + w - 2} y={top} width="2" height={h} fill="#2a1408" opacity="0.45" />
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
  const x = cx - w / 2
  const top = riverY - 2
  const h = riverH + 4
  const plankN = Math.max(3, Math.round(w / 6))
  return (
    <g filter="url(#softShadow)">
      <ellipse cx={cx} cy={riverY + riverH * 0.55} rx={w * 0.42} ry="3.2" fill="#041828" opacity="0.42" />
      <rect x={x} y={top + 2} width={w} height={h - 5} rx="1" fill="url(#wood)" stroke="#3d2410" strokeWidth="0.9" />
      <rect x={x} y={top + 2} width={w} height={h - 5} fill="url(#woodGrain)" opacity="0.6" />
      <rect x={x} y={top + 2} width={w} height={h - 5} fill="url(#plankWear)" opacity="0.65" />
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
          opacity="0.45"
        />
      ))}
      {/* Nail heads */}
      {[0.2, 0.5, 0.8].map((t) => (
        <g key={t}>
          <circle cx={x + w * t} cy={top + 5} r="0.9" fill="#3a2010" opacity="0.55" />
          <circle cx={x + w * t} cy={top + h - 7} r="0.9" fill="#3a2010" opacity="0.55" />
        </g>
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

/** Visibly crumbled tower ruin — plays a short collapse when mounted. */
function CrumbledTower({
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
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter="url(#towerShade)">
      {/* Dust burst on appear */}
      <g opacity="0.85">
        {[
          { cx: -8, cy: -10, r: 14 },
          { cx: 10, cy: -6, r: 12 },
          { cx: 0, cy: -18, r: 16 },
        ].map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="#cfc6b6">
            <animate attributeName="r" from={String(c.r * 0.3)} to={String(c.r * 1.6)} dur="0.55s" fill="freeze" />
            <animate attributeName="opacity" from="0.7" to="0" dur="0.7s" fill="freeze" />
          </circle>
        ))}
      </g>

      {/* Scorched pad */}
      <ellipse cx="0" cy="36" rx="36" ry="12" fill="#00000055" />
      <ellipse cx="0" cy="30" rx="30" ry="10" fill="#2a2824" stroke="#1a1814" strokeWidth="1" />
      <path d="M-28 28 L-20 14 L18 16 L26 28 Z" fill="url(#rubbleGrad)" stroke="#1a1814" strokeWidth="1" />

      {/* Collapsed wall chunks */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 -28"
          to="0 0"
          dur="0.45s"
          fill="freeze"
        />
        <rect x="-18" y="4" width="16" height="12" rx="1" fill="#a8a090" stroke="#5a5448" strokeWidth="0.8" transform="rotate(-18 -10 10)" />
        <rect x="2" y="6" width="18" height="11" rx="1" fill="#cfc6b6" stroke="#7a7468" strokeWidth="0.8" transform="rotate(14 11 11)" />
        <rect x="-8" y="14" width="14" height="9" rx="1" fill="#8a8274" stroke="#5a5448" strokeWidth="0.7" transform="rotate(-6 -1 18)" />
        <polygon points="-22,22 -14,8 -6,24" fill="#6a6558" stroke="#3a3830" strokeWidth="0.6" />
        <polygon points="8,20 18,6 26,22" fill="#9a9488" stroke="#5a5448" strokeWidth="0.6" />
        {/* Broken battlement */}
        <rect x="-16" y="-2" width="8" height="10" fill="#d8d2c4" stroke="#7a7468" strokeWidth="0.7" transform="rotate(-32 -12 3)" />
        <rect x="6" y="0" width="7" height="9" fill="#b8b2a4" stroke="#7a7468" strokeWidth="0.7" transform="rotate(28 10 4)" />
        {/* Torn banner scrap */}
        <path
          d="M-20 8 Q-16 14 -18 22 L-12 20 Q-10 12 -14 6 Z"
          fill={banner}
          opacity="0.75"
        />
        {/* Crown / cannon debris */}
        <circle cx="4" cy="18" r="5" fill="#f0d060" stroke="#b8860b" strokeWidth="0.8" opacity="0.85" />
        <rect x="-4" y="10" width="9" height="5" rx="1" fill="#3a4558" transform="rotate(-40 0 12)" />
      </g>

      {/* Settled rubble scatter */}
      {[
        [-24, 26, 3.2],
        [-12, 28, 2.4],
        [0, 30, 2.8],
        [14, 27, 3.5],
        [22, 29, 2.2],
        [-6, 24, 1.8],
        [8, 25, 2],
      ].map(([cx, cy, r], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill={i % 2 === 0 ? '#8a8274' : '#cfc6b6'}
          stroke="#3a3830"
          strokeWidth="0.4"
        />
      ))}
    </g>
  )
}
