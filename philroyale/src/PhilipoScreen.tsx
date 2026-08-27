import { useMemo, useState } from 'react'

/** 8 wide × 10 long — fills the screen; bottom tray holds pieces. */
export const PHILIPO_COLS = 8
export const PHILIPO_ROWS = 10

export type PhilipoRank =
  | 'flag'
  | 'bomb'
  | 'spy'
  | 'scout'
  | 'miner'
  | 'sergeant'
  | 'lieutenant'
  | 'captain'
  | 'major'
  | 'colonel'
  | 'general'
  | 'marshal'

export type PhilipoSide = 'red' | 'blue'

export type PhilipoPiece = {
  id: string
  side: PhilipoSide
  rank: PhilipoRank
  revealed: boolean
}

type Cell = { col: number; row: number }

const RANK_VALUE: Record<PhilipoRank, number> = {
  flag: 0,
  bomb: 0,
  spy: 1,
  scout: 2,
  miner: 3,
  sergeant: 4,
  lieutenant: 5,
  captain: 6,
  major: 7,
  colonel: 8,
  general: 9,
  marshal: 10,
}

const RANK_LABEL: Record<PhilipoRank, string> = {
  flag: 'F',
  bomb: 'B',
  spy: 'S',
  scout: '2',
  miner: '3',
  sergeant: '4',
  lieutenant: '5',
  captain: '6',
  major: '7',
  colonel: '8',
  general: '9',
  marshal: '10',
}

const RANK_NAME: Record<PhilipoRank, string> = {
  flag: 'Flag',
  bomb: 'Bomb',
  spy: 'Spy',
  scout: 'Scout',
  miner: 'Miner',
  sergeant: 'Sergeant',
  lieutenant: 'Lieutenant',
  captain: 'Captain',
  major: 'Major',
  colonel: 'Colonel',
  general: 'General',
  marshal: 'Marshal',
}

/** Scaled Stratego army for an 8×10 board (24 cells per side). */
const ARMY: PhilipoRank[] = [
  'flag',
  'bomb',
  'bomb',
  'bomb',
  'spy',
  'scout',
  'scout',
  'scout',
  'scout',
  'scout',
  'miner',
  'miner',
  'miner',
  'sergeant',
  'sergeant',
  'lieutenant',
  'lieutenant',
  'captain',
  'captain',
  'major',
  'major',
  'colonel',
  'general',
  'marshal',
]

function keyOf(col: number, row: number): string {
  return `${col},${row}`
}

function parseKey(k: string): Cell {
  const [c, r] = k.split(',').map(Number)
  return { col: c!, row: r! }
}

/** Two lakes — Stratego center water blocks (adapted to 8×10). */
export function isLake(col: number, row: number): boolean {
  const inBand = row === 4 || row === 5
  if (!inBand) return false
  return (col === 1 || col === 2) || (col === 5 || col === 6)
}

function makeArmy(side: PhilipoSide, seed: string): PhilipoPiece[] {
  return ARMY.map((rank, i) => ({
    id: `${side}-${seed}-${i}-${rank}`,
    side,
    rank,
    revealed: false,
  }))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function autoPlace(side: PhilipoSide, pieces: PhilipoPiece[]): Map<string, PhilipoPiece> {
  const map = new Map<string, PhilipoPiece>()
  const rows = side === 'red' ? [7, 8, 9] : [0, 1, 2]
  const cells: string[] = []
  for (const row of rows) {
    for (let col = 0; col < PHILIPO_COLS; col++) cells.push(keyOf(col, row))
  }
  const shuffled = shuffle(pieces)
  cells.forEach((k, i) => {
    const p = shuffled[i]
    if (p) map.set(k, p)
  })
  return map
}

function combat(
  attacker: PhilipoPiece,
  defender: PhilipoPiece,
): 'attacker' | 'defender' | 'both' {
  if (defender.rank === 'flag') return 'attacker'
  if (defender.rank === 'bomb') {
    return attacker.rank === 'miner' ? 'attacker' : 'defender'
  }
  if (attacker.rank === 'spy' && defender.rank === 'marshal') return 'attacker'
  const av = RANK_VALUE[attacker.rank]
  const dv = RANK_VALUE[defender.rank]
  if (av === dv) return 'both'
  return av > dv ? 'attacker' : 'defender'
}

function canMovePiece(rank: PhilipoRank): boolean {
  return rank !== 'flag' && rank !== 'bomb'
}

type Phase = 'setup' | 'play' | 'over'

type Props = {
  onExit: () => void
}

export function PhilipoScreen({ onExit }: Props) {
  const [board, setBoard] = useState<Map<string, PhilipoPiece>>(() => new Map())
  const [tray, setTray] = useState<PhilipoPiece[]>(() => makeArmy('red', 'you'))
  const [selectedTrayId, setSelectedTrayId] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [turn, setTurn] = useState<PhilipoSide>('red')
  const [message, setMessage] = useState('Place your army on the bottom 3 rows.')
  const [winner, setWinner] = useState<PhilipoSide | null>(null)

  const legalSetup = useMemo(() => {
    const set = new Set<string>()
    for (let row = 7; row <= 9; row++) {
      for (let col = 0; col < PHILIPO_COLS; col++) set.add(keyOf(col, row))
    }
    return set
  }, [])

  function placeFromTray(col: number, row: number) {
    if (phase !== 'setup' || !selectedTrayId) return
    const k = keyOf(col, row)
    if (!legalSetup.has(k) || isLake(col, row) || board.has(k)) return
    const piece = tray.find((p) => p.id === selectedTrayId)
    if (!piece) return
    setBoard((prev) => {
      const next = new Map(prev)
      next.set(k, piece)
      return next
    })
    setTray((t) => t.filter((p) => p.id !== selectedTrayId))
    setSelectedTrayId(null)
  }

  function startBattle() {
    if (tray.length > 0) {
      setMessage(`Place all ${tray.length} remaining pieces first.`)
      return
    }
    const blue = autoPlace('blue', makeArmy('blue', 'cpu'))
    setBoard((prev) => {
      const next = new Map(prev)
      for (const [k, p] of blue) next.set(k, p)
      return next
    })
    setPhase('play')
    setTurn('red')
    setMessage('Your move — tap a piece, then an empty square or enemy.')
  }

  function autoSetupMine() {
    const army = makeArmy('red', `auto-${Date.now()}`)
    const placed = autoPlace('red', army)
    setBoard(placed)
    setTray([])
    setSelectedTrayId(null)
    setMessage('Army set. Ready when you are.')
  }

  function neighbors(col: number, row: number): Cell[] {
    return [
      { col: col - 1, row },
      { col: col + 1, row },
      { col, row: row - 1 },
      { col, row: row + 1 },
    ].filter(
      (c) =>
        c.col >= 0 &&
        c.col < PHILIPO_COLS &&
        c.row >= 0 &&
        c.row < PHILIPO_ROWS &&
        !isLake(c.col, c.row),
    )
  }

  function scoutPath(from: Cell, to: Cell, map: Map<string, PhilipoPiece>): boolean {
    if (from.col !== to.col && from.row !== to.row) return false
    const dc = Math.sign(to.col - from.col)
    const dr = Math.sign(to.row - from.row)
    let c = from.col + dc
    let r = from.row + dr
    while (c !== to.col || r !== to.row) {
      if (isLake(c, r) || map.has(keyOf(c, r))) return false
      c += dc
      r += dr
    }
    return true
  }

  function tryMove(fromKey: string, toKey: string) {
    if (phase !== 'play' || turn !== 'red' || winner) return
    const map = new Map(board)
    const mover = map.get(fromKey)
    if (!mover || mover.side !== 'red' || !canMovePiece(mover.rank)) return
    const from = parseKey(fromKey)
    const to = parseKey(toKey)
    if (isLake(to.col, to.row)) return

    const target = map.get(toKey)
    if (target?.side === 'red') return

    const adj = neighbors(from.col, from.row).some(
      (n) => n.col === to.col && n.row === to.row,
    )
    const scoutOk =
      mover.rank === 'scout' && scoutPath(from, to, map) && (!target || target.side === 'blue')
    if (!adj && !scoutOk) return

    if (!target) {
      map.delete(fromKey)
      map.set(toKey, mover)
      setBoard(map)
      setSelectedCell(null)
      setTurn('blue')
      setMessage('Blue is thinking…')
      window.setTimeout(() => botMove(map), 450)
      return
    }

    // Attack
    mover.revealed = true
    target.revealed = true
    const result = combat(mover, target)
    map.delete(fromKey)
    if (result === 'attacker') {
      map.set(toKey, { ...mover, revealed: true })
      if (target.rank === 'flag') {
        setBoard(map)
        setWinner('red')
        setPhase('over')
        setMessage('You captured the flag — victory!')
        return
      }
    } else if (result === 'defender') {
      map.set(toKey, { ...target, revealed: true })
    } else {
      // both die — leave empty
    }
    setBoard(map)
    setSelectedCell(null)
    setTurn('blue')
    setMessage(
      result === 'both'
        ? 'Both pieces destroyed.'
        : result === 'attacker'
          ? `Your ${RANK_NAME[mover.rank]} wins.`
          : `Enemy ${RANK_NAME[target.rank]} holds.`,
    )
    window.setTimeout(() => botMove(map), 550)
  }

  function botMove(current: Map<string, PhilipoPiece>) {
    if (winner) return
    const map = new Map(current)
    const bluePieces: { key: string; piece: PhilipoPiece }[] = []
    for (const [k, p] of map) {
      if (p.side === 'blue' && canMovePiece(p.rank)) bluePieces.push({ key: k, piece: p })
    }
    shuffle(bluePieces)
    for (const { key, piece } of bluePieces) {
      const from = parseKey(key)
      const opts = neighbors(from.col, from.row)

      const moves = shuffle(
        opts.filter((c) => {
          const tk = keyOf(c.col, c.row)
          const t = map.get(tk)
          return t?.side !== 'blue'
        }),
      )
      // Prefer attacking red when possible
      moves.sort((a, b) => {
        const ta = map.get(keyOf(a.col, a.row))
        const tb = map.get(keyOf(b.col, b.row))
        return Number(!!tb && tb.side === 'red') - Number(!!ta && ta.side === 'red')
      })
      const dest = moves[0]
      if (!dest) continue
      const toKey = keyOf(dest.col, dest.row)
      const target = map.get(toKey)
      map.delete(key)
      if (!target) {
        map.set(toKey, piece)
        setBoard(map)
        setTurn('red')
        setMessage('Your turn.')
        return
      }
      piece.revealed = true
      target.revealed = true
      const result = combat(piece, target)
      if (result === 'attacker') {
        map.set(toKey, { ...piece, revealed: true })
        if (target.rank === 'flag') {
          setBoard(map)
          setWinner('blue')
          setPhase('over')
          setMessage('Blue captured your flag.')
          return
        }
      } else if (result === 'defender') {
        map.set(toKey, { ...target, revealed: true })
      }
      setBoard(map)
      setTurn('red')
      setMessage('Your turn.')
      return
    }
    setTurn('red')
    setMessage('Blue passes — your turn.')
  }

  function onCellClick(col: number, row: number) {
    const k = keyOf(col, row)
    if (phase === 'setup') {
      placeFromTray(col, row)
      return
    }
    if (phase !== 'play' || turn !== 'red') return
    const piece = board.get(k)
    if (selectedCell) {
      if (selectedCell === k) {
        setSelectedCell(null)
        return
      }
      tryMove(selectedCell, k)
      return
    }
    if (piece?.side === 'red' && canMovePiece(piece.rank)) {
      setSelectedCell(k)
      setMessage(`Moving ${RANK_NAME[piece.rank]} — pick a square.`)
    }
  }

  function showRank(piece: PhilipoPiece): boolean {
    return piece.side === 'red' || piece.revealed || phase === 'over'
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#1a1008]">
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 pb-1.5 pt-[max(0.55rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg bg-[#2a1a12] px-3 py-1.5 text-xs font-extrabold uppercase text-white/80 ring-1 ring-white/15"
        >
          Exit
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[#f5d76e]">
            Philipo
          </h1>
          <p className="truncate text-[0.65rem] font-bold text-white/65">{message}</p>
        </div>
        <span className="w-[3.25rem]" aria-hidden />
      </header>

      {/* Stratego-style board — almost full screen */}
      <div className="flex min-h-0 flex-1 items-stretch justify-center px-2 pb-1">
        <div
          className="relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-md"
          style={{
            background: 'linear-gradient(180deg,#8b5a2b,#5c3418 40%,#3d2210)',
            boxShadow: 'inset 0 0 0 3px #2a160c, 0 8px 24px #00000088',
            padding: '0.45rem',
          }}
          role="grid"
          aria-label="Philipo Stratego board"
        >
          <div
            className="grid h-full w-full flex-1 gap-[2px]"
            style={{
              gridTemplateColumns: `repeat(${PHILIPO_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${PHILIPO_ROWS}, 1fr)`,
            }}
          >
            {Array.from({ length: PHILIPO_ROWS }, (_, row) =>
              Array.from({ length: PHILIPO_COLS }, (_, col) => {
                const lake = isLake(col, row)
                const k = keyOf(col, row)
                const piece = board.get(k)
                const selected = selectedCell === k
                const setupOk = phase === 'setup' && legalSetup.has(k)
                // Classic Stratego grass check: slightly alternating greens
                const light = (col + row) % 2 === 0
                const grass = light ? '#5a9a3e' : '#4a8532'
                const redZone = row >= 7
                const blueZone = row <= 2
                let bg = grass
                if (lake) bg = 'linear-gradient(160deg,#3a7ec8,#1e4f8a 55%,#163a66)'
                else if (blueZone) bg = light ? '#4f8fbf' : '#3d7aa8'
                else if (redZone) bg = light ? '#c45a4a' : '#a8483a'

                return (
                  <button
                    key={k}
                    type="button"
                    role="gridcell"
                    onClick={() => onCellClick(col, row)}
                    className="relative flex items-center justify-center overflow-hidden rounded-[2px]"
                    style={{
                      background: lake ? undefined : bg,
                      backgroundImage: lake ? (bg as string) : undefined,
                      boxShadow: selected
                        ? 'inset 0 0 0 2px #ffe08a'
                        : setupOk && phase === 'setup'
                          ? 'inset 0 0 0 1px #ffffff44'
                          : 'inset 0 0 0 1px #1a2e1488',
                    }}
                    aria-label={
                      lake
                        ? `Lake ${col + 1},${row + 1}`
                        : `Square ${col + 1},${row + 1}`
                    }
                  >
                    {lake ? (
                      <span
                        className="pointer-events-none absolute inset-[12%] rounded-full opacity-40"
                        style={{
                          background:
                            'radial-gradient(circle at 35% 30%, #9fd4ff88, transparent 55%)',
                        }}
                        aria-hidden
                      />
                    ) : null}
                    {piece ? (
                      <span
                        className="relative z-[1] flex h-[86%] w-[78%] flex-col items-center justify-center rounded-sm text-[0.7rem] font-black leading-none"
                        style={{
                          background:
                            piece.side === 'red'
                              ? 'linear-gradient(180deg,#e85a4a,#9a2018)'
                              : 'linear-gradient(180deg,#4a8adf,#1a3a78)',
                          color: '#fff6e8',
                          boxShadow: '0 1px 0 #00000055, inset 0 1px 0 #ffffff33',
                          border: '1px solid #1a100888',
                        }}
                      >
                        {showRank(piece) ? RANK_LABEL[piece.rank] : '•'}
                      </span>
                    ) : null}
                  </button>
                )
              }),
            )}
          </div>
        </div>
      </div>

      {/* Bottom card / piece tray */}
      <div
        className="shrink-0 border-t border-[#c9a227]/35 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2"
        style={{ background: 'linear-gradient(180deg,#3a2418,#1a100c)' }}
      >
        {phase === 'setup' ? (
          <div className="mx-auto flex max-w-lg flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={autoSetupMine}
                className="flex-1 rounded-lg py-2 text-xs font-extrabold uppercase text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Auto-place
              </button>
              <button
                type="button"
                onClick={startBattle}
                className="flex-1 rounded-lg py-2 text-xs font-extrabold uppercase text-white"
                style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
              >
                Start battle
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {tray.map((p) => {
                const on = selectedTrayId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedTrayId(on ? null : p.id)}
                    className="flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-md text-[0.7rem] font-black"
                    style={{
                      background: on
                        ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
                        : 'linear-gradient(180deg,#e85a4a,#9a2018)',
                      color: on ? '#1a1410' : '#fff6e8',
                      boxShadow: on ? '0 0 0 2px #fff' : '0 2px 0 #5a1008',
                    }}
                    aria-label={RANK_NAME[p.rank]}
                  >
                    <span>{RANK_LABEL[p.rank]}</span>
                    <span className="mt-0.5 text-[0.45rem] font-bold uppercase opacity-80">
                      {RANK_NAME[p.rank].slice(0, 4)}
                    </span>
                  </button>
                )
              })}
              {tray.length === 0 ? (
                <p className="px-2 py-3 text-xs font-bold text-white/60">
                  All pieces placed — start battle.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-lg px-1 py-2 text-center">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]">
              {phase === 'over'
                ? winner === 'red'
                  ? 'You win'
                  : 'Blue wins'
                : turn === 'red'
                  ? 'Your turn'
                  : 'Blue turn'}
            </p>
            <p className="mt-1 text-[0.7rem] font-semibold text-white/65">
              Stratego rules — capture the flag. Scouts run ranks/files. Miners defuse bombs.
              Spy beats Marshal when attacking.
            </p>
            {phase === 'over' ? (
              <button
                type="button"
                onClick={onExit}
                className="mt-2 rounded-lg px-4 py-2 text-xs font-extrabold uppercase text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Back to Events
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
