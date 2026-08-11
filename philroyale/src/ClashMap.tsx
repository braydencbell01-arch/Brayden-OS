/**
 * Classic ClashMap arena background.
 *
 * Renders an SVG grass field (100×150 tile grid) with:
 *  - Two shades of green grass
 *  - River band at rows 74–75
 *  - Two bridge crossings (cols 18–28, 72–82)
 *  - Subtle lane stripes
 */

const C = 100   // ARENA_COLS
const R = 150   // ARENA_ROWS

const RIVER_ROW_START = 74
const RIVER_ROW_END   = 76  // exclusive (rows 74 and 75)

const BRIDGES = [
  { colStart: 18, colEnd: 29 },
  { colStart: 72, colEnd: 83 },
]

export function ClashMap({ destroyedIds: _d }: { destroyedIds?: ReadonlySet<string> }) {
  const riverY     = (RIVER_ROW_START / R) * 100
  const riverH     = ((RIVER_ROW_END - RIVER_ROW_START) / R) * 100

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${C} ${R}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* ── Grass base ─────────────────────────────────── */}
      <defs>
        <linearGradient id="grass-n" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1c4a1a" />
          <stop offset="100%" stopColor="#2a6428" />
        </linearGradient>
        <linearGradient id="grass-s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a6428" />
          <stop offset="100%" stopColor="#1c4a1a" />
        </linearGradient>
        <linearGradient id="river-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0d3b6e" />
          <stop offset="50%"  stopColor="#1565b0" />
          <stop offset="100%" stopColor="#0d3b6e" />
        </linearGradient>
      </defs>

      {/* North half (enemy side) */}
      <rect x="0" y="0" width={C} height={RIVER_ROW_START} fill="url(#grass-n)" />

      {/* South half (ally side) */}
      <rect x="0" y={RIVER_ROW_END} width={C} height={R - RIVER_ROW_END} fill="url(#grass-s)" />

      {/* Alternating darker lane stripes — north */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={`ln${i}`}
          x={i * 25}
          y={0}
          width={12.5}
          height={RIVER_ROW_START}
          fill="#00000010"
        />
      ))}
      {/* South stripes */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={`ls${i}`}
          x={i * 25}
          y={RIVER_ROW_END}
          width={12.5}
          height={R - RIVER_ROW_END}
          fill="#00000010"
        />
      ))}

      {/* River */}
      <rect x="0" y={RIVER_ROW_START} width={C} height={RIVER_ROW_END - RIVER_ROW_START} fill="url(#river-grad)" />
      {/* River shimmer */}
      <rect x="10" y={RIVER_ROW_START + 0.3} width="20" height="0.4" fill="#ffffff22" rx="0.2" />
      <rect x="55" y={RIVER_ROW_START + 0.9} width="15" height="0.3" fill="#ffffff18" rx="0.1" />

      {/* Bridges */}
      {BRIDGES.map((b) => (
        <rect
          key={b.colStart}
          x={b.colStart}
          y={RIVER_ROW_START}
          width={b.colEnd - b.colStart}
          height={RIVER_ROW_END - RIVER_ROW_START}
          fill="#8B7355"
          opacity="0.9"
        />
      ))}

      {/* Mid-line faint marker */}
      <line
        x1="0" y1={RIVER_ROW_START}
        x2={C} y2={RIVER_ROW_START}
        stroke="#ffffff18" strokeWidth="0.3"
      />
    </svg>
  )
}
