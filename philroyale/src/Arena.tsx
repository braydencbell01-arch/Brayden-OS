import { ARENA_COLS, ARENA_ROWS, BRIDGES, RIVER_ROWS, TOWERS } from './arena'
import { CrownTower, KingTowerHouse, StoneBridge } from './ArenaArt'

function tilePct(col: number, row: number, w: number, h: number) {
  return {
    left: `${(col / ARENA_COLS) * 100}%`,
    top: `${(row / ARENA_ROWS) * 100}%`,
    width: `${(w / ARENA_COLS) * 100}%`,
    height: `${(h / ARENA_ROWS) * 100}%`,
  }
}

export function Arena() {
  const riverTop = RIVER_ROWS[0]
  const riverH = RIVER_ROWS.length

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      role="img"
      aria-label="Clash-style arena with stands, river, bridges, and crown towers"
    >
      {/* Side stands */}
      <div className="arena-stands-left absolute inset-y-0 left-0 z-[1] w-[7%]">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg,#6a4430 0 6px,#3d2418 6px 12px), repeating-linear-gradient(90deg,transparent 0 4px,#00000033 4px 5px)',
          }}
        />
        <div className="absolute inset-y-[8%] left-0 w-full bg-gradient-to-b from-[#c63c2e88] via-transparent to-[#2f6fbf88]" />
      </div>
      <div className="arena-stands-right absolute inset-y-0 right-0 z-[1] w-[7%]">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg,#6a4430 0 6px,#3d2418 6px 12px), repeating-linear-gradient(90deg,transparent 0 4px,#00000033 4px 5px)',
          }}
        />
        <div className="absolute inset-y-[8%] left-0 w-full bg-gradient-to-b from-[#c63c2e88] via-transparent to-[#2f6fbf88]" />
      </div>

      {/* Playable field */}
      <div className="absolute inset-y-0 left-[7%] right-[7%] z-0">
        {/* Enemy king area (darker dirt pad) */}
        <div
          className="absolute inset-x-[22%] top-0 h-[14%]"
          style={{
            background: 'radial-gradient(ellipse at 50% 80%, #7a6a4a 0%, #5a4a32 55%, transparent 70%)',
          }}
        />
        <KingTowerHouse side="enemy" />

        {/* Grass field — lane strips like CR, not a checker grid */}
        <div
          className="absolute inset-x-0 top-[10%] bottom-[10%]"
          style={{
            background: `
              linear-gradient(90deg,
                #3f8f4a 0%,
                #4aa356 8%,
                #5bb86a 18%,
                #4aa356 32%,
                #3f8f4a 50%,
                #4aa356 68%,
                #5bb86a 82%,
                #4aa356 92%,
                #3f8f4a 100%
              )
            `,
          }}
        >
          {/* mow stripes */}
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0 14px, rgba(0,0,0,0.08) 14px 28px)',
            }}
          />
          {/* soft lane paths */}
          <div
            className="absolute inset-y-[8%] left-[12%] w-[18%] rounded-full opacity-40"
            style={{ background: 'linear-gradient(90deg,transparent,#d4c48a88,transparent)' }}
          />
          <div
            className="absolute inset-y-[8%] right-[12%] w-[18%] rounded-full opacity-40"
            style={{ background: 'linear-gradient(90deg,transparent,#d4c48a88,transparent)' }}
          />
        </div>

        {/* Ally king area */}
        <div
          className="absolute inset-x-[22%] bottom-0 h-[14%]"
          style={{
            background: 'radial-gradient(ellipse at 50% 20%, #7a6a4a 0%, #5a4a32 55%, transparent 70%)',
          }}
        />
        <div className="pointer-events-none absolute inset-x-[18%] bottom-[2%] top-[78%] z-[2]">
          <div
            className="mx-auto h-full max-w-[58%] rounded-b-md border-2 border-[#4a3018]"
            style={{
              background: 'linear-gradient(180deg,#3a5a8a 0%,#243a5a 100%)',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), 0 -4px 12px rgba(0,0,0,0.35)',
            }}
          />
        </div>

        {/* River */}
        <div
          className="arena-river absolute z-[3]"
          style={tilePct(0, riverTop, ARENA_COLS, riverH)}
        >
          <div className="absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-white/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#0a3a5c]/70 to-transparent" />
        </div>

        {/* Bridges */}
        {BRIDGES.map((b, i) => (
          <div
            key={i}
            className="absolute z-[4]"
            style={tilePct(b.colStart, riverTop - 0.35, b.colEnd - b.colStart + 1, riverH + 0.7)}
          >
            <StoneBridge side={i === 0 ? 'left' : 'right'} />
          </div>
        ))}

        {/* Towers */}
        {TOWERS.map((t) => {
          const style = tilePct(t.col, t.row, t.w, t.h)
          return (
            <div
              key={t.id}
              className="absolute z-[5] flex items-end justify-center"
              style={style}
            >
              <div className="origin-bottom scale-[0.92] sm:scale-100">
                <CrownTower side={t.side} kind={t.kind} hpPct={1} />
              </div>
            </div>
          )
        })}

        {/* Center line hint */}
        <div className="pointer-events-none absolute inset-x-[10%] top-[49.2%] z-[2] h-px bg-white/15" />
      </div>

      {/* Outer wood frame */}
      <div className="pointer-events-none absolute inset-0 z-[6] rounded-[10px] ring-[5px] ring-[#5a3a22] ring-inset" />
      <div className="pointer-events-none absolute inset-0 z-[6] rounded-[10px] shadow-[inset_0_0_0_2px_#c9a227aa]" />
    </div>
  )
}
