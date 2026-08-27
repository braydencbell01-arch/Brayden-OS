import { useMemo, useState } from 'react'

/** 8 wide × 10 long — board fills the screen; bottom tray holds pieces / cards. */
export const PHILIPO_COLS = 8
export const PHILIPO_ROWS = 10

export type PhilipoRank =
  | 'assassin'
  | 'private'
  | 'scout'
  | 'miner'
  | 'sergeant'
  | 'lieutenant'
  | 'captain'
  | 'major'
  | 'colonel'
  | 'general'
  | 'commander'
  | 'wall'

export type PhilipoSide = 'red' | 'blue'

export type PhilipoPiece = {
  id: string
  side: PhilipoSide
  rank: PhilipoRank
  revealed: boolean
}

export type CardKind = 'offensive' | 'defensive' | 'intelligence'

export type CardDefId =
  | 'atk3'
  | 'atk2'
  | 'atk1'
  | 'def3'
  | 'def2'
  | 'def1'
  | 'defuse'
  | 'flank'
  | 'promote'
  | 'retreat'
  | 'capture'
  | 'charge'
  | 'advance'
  | 'bypass'
  | 'fortify'
  | 'assassination'

export type PhilipoCard = {
  uid: string
  defId: CardDefId
}

type Cell = { col: number; row: number }

type MoveMod =
  | { type: 'none' }
  | { type: 'flank' }
  | { type: 'retreat' }
  | { type: 'charge' }
  | { type: 'advance' }
  | { type: 'bypass' }

type PendingBuffs = {
  attackBonus: number
  defenseBonus: number
  defuse: boolean
  assassination: boolean
  capture: boolean
  move: MoveMod
}

const EMPTY_BUFFS = (): PendingBuffs => ({
  attackBonus: 0,
  defenseBonus: 0,
  defuse: false,
  assassination: false,
  capture: false,
  move: { type: 'none' },
})

const RANK_VALUE: Record<PhilipoRank, number> = {
  assassin: 0,
  private: 1,
  scout: 2,
  miner: 3,
  sergeant: 4,
  lieutenant: 5,
  captain: 6,
  major: 7,
  colonel: 8,
  general: 9,
  commander: 10,
  wall: -1,
}

const RANK_LABEL: Record<PhilipoRank, string> = {
  assassin: '0',
  private: '1',
  scout: '2',
  miner: '3',
  sergeant: '4',
  lieutenant: '5',
  captain: '6',
  major: '7',
  colonel: '8',
  general: '9',
  commander: '10',
  wall: 'W',
}

const RANK_NAME: Record<PhilipoRank, string> = {
  assassin: 'Assassin',
  private: 'Private',
  scout: 'Scout',
  miner: 'Miner',
  sergeant: 'Sergeant',
  lieutenant: 'Lieutenant',
  captain: 'Captain',
  major: 'Major',
  colonel: 'Colonel',
  general: 'General',
  commander: 'Commander',
  wall: 'Wall',
}

/** Promote ladder (wall / commander stay put). */
const PROMOTE_NEXT: Partial<Record<PhilipoRank, PhilipoRank>> = {
  assassin: 'private',
  private: 'scout',
  scout: 'miner',
  miner: 'sergeant',
  sergeant: 'lieutenant',
  lieutenant: 'captain',
  captain: 'major',
  major: 'colonel',
  colonel: 'general',
  general: 'commander',
}

/**
 * 24-piece army:
 * 1 Assassin, 4 Privates, 3 Scouts, 3 Miners, 1 Commander, 1 General, 1 Wall,
 * 2 of everything else (Sergeant–Colonel).
 */
const ARMY: PhilipoRank[] = [
  'assassin',
  'private',
  'private',
  'private',
  'private',
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
  'colonel',
  'general',
  'commander',
  'wall',
]

type CardMeta = {
  id: CardDefId
  name: string
  kind: CardKind
  blurb: string
  attackBonus?: number
  defenseBonus?: number
}

const CARD_META: Record<CardDefId, CardMeta> = {
  atk3: {
    id: 'atk3',
    name: '+3 Attack',
    kind: 'offensive',
    blurb: '+3 to your next attack this turn.',
    attackBonus: 3,
  },
  atk2: {
    id: 'atk2',
    name: '+2 Attack',
    kind: 'offensive',
    blurb: '+2 to your next attack this turn.',
    attackBonus: 2,
  },
  atk1: {
    id: 'atk1',
    name: '+1 Attack',
    kind: 'offensive',
    blurb: '+1 to your next attack this turn.',
    attackBonus: 1,
  },
  def3: {
    id: 'def3',
    name: '+3 Defense',
    kind: 'defensive',
    blurb: '+3 when defending this exchange.',
    defenseBonus: 3,
  },
  def2: {
    id: 'def2',
    name: '+2 Defense',
    kind: 'defensive',
    blurb: '+2 when defending this exchange.',
    defenseBonus: 2,
  },
  def1: {
    id: 'def1',
    name: '+1 Defense',
    kind: 'defensive',
    blurb: '+1 when defending this exchange.',
    defenseBonus: 1,
  },
  defuse: {
    id: 'defuse',
    name: 'Defuse',
    kind: 'offensive',
    blurb: 'Your attacker survives a Wall/Bomb and removes it.',
  },
  flank: {
    id: 'flank',
    name: 'Flank',
    kind: 'offensive',
    blurb: 'Move one piece diagonally.',
  },
  promote: {
    id: 'promote',
    name: 'Promote',
    kind: 'intelligence',
    blurb: 'Raise one piece one rank.',
  },
  retreat: {
    id: 'retreat',
    name: 'Retreat',
    kind: 'offensive',
    blurb: 'Move two spaces straight backward.',
  },
  capture: {
    id: 'capture',
    name: 'Capture',
    kind: 'offensive',
    blurb: 'If you win, place the foe on your back rows.',
  },
  charge: {
    id: 'charge',
    name: 'Charge',
    kind: 'offensive',
    blurb: 'Move a piece three spaces in a straight line.',
  },
  advance: {
    id: 'advance',
    name: 'Advance',
    kind: 'offensive',
    blurb: 'Move a piece two spaces in a straight line.',
  },
  bypass: {
    id: 'bypass',
    name: 'Bypass',
    kind: 'offensive',
    blurb: 'Leap over one enemy piece.',
  },
  fortify: {
    id: 'fortify',
    name: 'Fortify',
    kind: 'defensive',
    blurb: 'Place a Wall on an empty square in your half.',
  },
  assassination: {
    id: 'assassination',
    name: 'Assassination',
    kind: 'offensive',
    blurb: 'Assassin can kill any piece this attack.',
  },
}

/** Starter deck of 15 (no Assassination yet — Assassin waits for that card later). */
const STARTER_DECK: CardDefId[] = [
  'atk3',
  'atk2',
  'atk1',
  'def3',
  'def2',
  'def1',
  'defuse',
  'flank',
  'promote',
  'retreat',
  'capture',
  'charge',
  'advance',
  'bypass',
  'fortify',
]

function keyOf(col: number, row: number): string {
  return `${col},${row}`
}

function parseKey(k: string): Cell {
  const [c, r] = k.split(',').map(Number)
  return { col: c!, row: r! }
}

/** Two lakes — Stratego center water (adapted to 8×10). */
export function isLake(col: number, row: number): boolean {
  const inBand = row === 4 || row === 5
  if (!inBand) return false
  return col === 1 || col === 2 || col === 5 || col === 6
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

function makeDeck(seed: string): PhilipoCard[] {
  return shuffle(STARTER_DECK).map((defId, i) => ({
    uid: `${seed}-${defId}-${i}`,
    defId,
  }))
}

function drawToHand(
  hand: PhilipoCard[],
  deck: PhilipoCard[],
  discard: PhilipoCard[],
  target = 5,
): { hand: PhilipoCard[]; deck: PhilipoCard[]; discard: PhilipoCard[] } {
  let h = [...hand]
  let d = [...deck]
  let disc = [...discard]
  while (h.length < target) {
    if (d.length === 0) {
      if (disc.length === 0) break
      d = shuffle(disc)
      disc = []
    }
    const next = d.shift()
    if (!next) break
    h.push(next)
  }
  return { hand: h, deck: d, discard: disc }
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

function canMovePiece(rank: PhilipoRank): boolean {
  return rank !== 'wall'
}

function inOwnHalf(side: PhilipoSide, row: number): boolean {
  return side === 'red' ? row >= 7 : row <= 2
}

/**
 * Combat with buffs. Ties always kill both.
 * Wall: only Miner (or Defuse) removes it — others bounce (attacker stays, no kill).
 * Assassin: only kills when Assassination is active on the attack.
 */
function combat(
  attacker: PhilipoPiece,
  defender: PhilipoPiece,
  atkBuff: PendingBuffs,
  defBuff: PendingBuffs,
): 'attacker' | 'defender' | 'both' | 'bounce' {
  if (defender.rank === 'wall') {
    if (attacker.rank === 'miner' || atkBuff.defuse) return 'attacker'
    return 'bounce'
  }
  if (attacker.rank === 'assassin') {
    if (atkBuff.assassination) return 'attacker'
    return 'defender'
  }
  let av = RANK_VALUE[attacker.rank] + atkBuff.attackBonus
  let dv = RANK_VALUE[defender.rank] + defBuff.defenseBonus
  if (av === dv) return 'both'
  return av > dv ? 'attacker' : 'defender'
}

type Phase = 'setup' | 'play' | 'over'
type PlayStep =
  | 'yourCard'
  | 'yourMove'
  | 'awaitEnemy'
  | 'reactCard'
  | 'enemyMoving'

type Props = {
  onExit: () => void
}

export function PhilipoScreen({ onExit }: Props) {
  const [board, setBoard] = useState<Map<string, PhilipoPiece>>(() => new Map())
  const [tray, setTray] = useState<PhilipoPiece[]>(() => makeArmy('red', 'you'))
  const [selectedTrayId, setSelectedTrayId] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [step, setStep] = useState<PlayStep>('yourCard')
  const [message, setMessage] = useState('Place your army on the bottom 3 rows.')
  const [winner, setWinner] = useState<PhilipoSide | null>(null)

  const [deck, setDeck] = useState<PhilipoCard[]>([])
  const [hand, setHand] = useState<PhilipoCard[]>([])
  const [discard, setDiscard] = useState<PhilipoCard[]>([])
  const [buffs, setBuffs] = useState<PendingBuffs>(EMPTY_BUFFS)
  const [enemyBuffs, setEnemyBuffs] = useState<PendingBuffs>(EMPTY_BUFFS)
  const [cardMode, setCardMode] = useState<null | 'promote' | 'fortify' | 'capturePlace'>(
    null,
  )
  const [capturedHold, setCapturedHold] = useState<PhilipoPiece | null>(null)
  const [pendingEnemyAttack, setPendingEnemyAttack] = useState<{
    fromKey: string
    toKey: string
    map: Map<string, PhilipoPiece>
  } | null>(null)

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
    const drawn = drawToHand([], makeDeck('red'), [], 5)
    setDeck(drawn.deck)
    setHand(drawn.hand)
    setDiscard(drawn.discard)
    setBuffs(EMPTY_BUFFS())
    setEnemyBuffs(EMPTY_BUFFS())
    setPhase('play')
    setStep('yourCard')
    setMessage('Your turn — play an Attack/Intel card, or skip and move.')
  }

  function autoSetupMine() {
    const army = makeArmy('red', `auto-${Date.now()}`)
    setBoard(autoPlace('red', army))
    setTray([])
    setSelectedTrayId(null)
    setMessage('Army set. Ready when you are.')
  }

  function neighbors(col: number, row: number, diag = false): Cell[] {
    const dirs = diag
      ? [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]
    return dirs
      .map(([dc, dr]) => ({ col: col + dc!, row: row + dr! }))
      .filter(
        (c) =>
          c.col >= 0 &&
          c.col < PHILIPO_COLS &&
          c.row >= 0 &&
          c.row < PHILIPO_ROWS &&
          !isLake(c.col, c.row),
      )
  }

  function clearPath(from: Cell, to: Cell, map: Map<string, PhilipoPiece>): boolean {
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

  function dist(a: Cell, b: Cell): number {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row)
  }

  function spendCard(card: PhilipoCard) {
    const left = hand.filter((c) => c.uid !== card.uid)
    const disc = [...discard, card]
    const drawn = drawToHand(left, deck, disc, 5)
    setHand(drawn.hand)
    setDeck(drawn.deck)
    setDiscard(drawn.discard)
  }

  function playCard(card: PhilipoCard) {
    const meta = CARD_META[card.defId]
    if (phase !== 'play' || winner) return

    if (step === 'yourCard') {
      if (meta.kind === 'defensive') {
        setMessage('Defense cards are for reacting after the enemy moves.')
        return
      }
    } else if (step === 'reactCard') {
      if (meta.kind === 'offensive') {
        setMessage('Only Defense or Intel cards on their turn.')
        return
      }
    } else {
      setMessage('You can’t play a card right now.')
      return
    }

    // Instant / targeting modes
    if (card.defId === 'promote') {
      spendCard(card)
      setCardMode('promote')
      setMessage('Promote — tap one of your pieces.')
      return
    }
    if (card.defId === 'fortify') {
      spendCard(card)
      setCardMode('fortify')
      setMessage('Fortify — tap an empty square in your half.')
      return
    }

    spendCard(card)
    setBuffs((b) => {
      const next = { ...b, move: { ...b.move } }
      if (meta.attackBonus) next.attackBonus += meta.attackBonus
      if (meta.defenseBonus) next.defenseBonus += meta.defenseBonus
      if (card.defId === 'defuse') next.defuse = true
      if (card.defId === 'assassination') next.assassination = true
      if (card.defId === 'capture') next.capture = true
      if (card.defId === 'flank') next.move = { type: 'flank' }
      if (card.defId === 'retreat') next.move = { type: 'retreat' }
      if (card.defId === 'charge') next.move = { type: 'charge' }
      if (card.defId === 'advance') next.move = { type: 'advance' }
      if (card.defId === 'bypass') next.move = { type: 'bypass' }
      return next
    })

    if (step === 'reactCard' && pendingEnemyAttack) {
      // Defense applied — resolve combat now
      resolveEnemyAttack(pendingEnemyAttack.map, pendingEnemyAttack.fromKey, pendingEnemyAttack.toKey, {
        ...buffs,
        defenseBonus:
          buffs.defenseBonus + (meta.defenseBonus ?? 0),
      })
      return
    }

    if (step === 'yourCard') {
      setStep('yourMove')
      setMessage(`Played ${meta.name}. Now move a piece (or skip).`)
    }
  }

  function skipCardPhase() {
    if (step === 'yourCard') {
      setStep('yourMove')
      setMessage('Move a piece.')
    } else if (step === 'reactCard' && pendingEnemyAttack) {
      resolveEnemyAttack(
        pendingEnemyAttack.map,
        pendingEnemyAttack.fromKey,
        pendingEnemyAttack.toKey,
        buffs,
      )
    }
  }

  function legalMove(
    mover: PhilipoPiece,
    from: Cell,
    to: Cell,
    map: Map<string, PhilipoPiece>,
    move: MoveMod,
  ): boolean {
    if (isLake(to.col, to.row)) return false
    const target = map.get(keyOf(to.col, to.row))
    if (target?.side === mover.side) return false

    // Bypass: leap orthogonally over exactly one enemy onto empty/enemy beyond
    if (move.type === 'bypass') {
      const dc = to.col - from.col
      const dr = to.row - from.row
      if (Math.abs(dc) + Math.abs(dr) !== 2) return false
      if (dc !== 0 && dr !== 0) return false
      const mid = { col: from.col + Math.sign(dc), row: from.row + Math.sign(dr) }
      const midP = map.get(keyOf(mid.col, mid.row))
      if (!midP || midP.side === mover.side) return false
      return true
    }

    if (move.type === 'flank') {
      const dc = Math.abs(to.col - from.col)
      const dr = Math.abs(to.row - from.row)
      return dc === 1 && dr === 1
    }

    if (move.type === 'retreat') {
      // Red retreats toward higher row; blue toward lower
      const back = mover.side === 'red' ? 1 : -1
      return to.col === from.col && to.row === from.row + back * 2 && clearPath(from, to, map)
    }

    if (move.type === 'advance' || move.type === 'charge') {
      const need = move.type === 'advance' ? 2 : 3
      if (from.col !== to.col && from.row !== to.row) return false
      if (dist(from, to) !== need) return false
      return clearPath(from, to, map)
    }

    // Default: scout long move, others one step
    const adj = neighbors(from.col, from.row).some(
      (n) => n.col === to.col && n.row === to.row,
    )
    if (mover.rank === 'scout') {
      return clearPath(from, to, map) || adj
    }
    return adj
  }

  function afterRedMove(map: Map<string, PhilipoPiece>, note: string) {
    setBoard(map)
    setSelectedCell(null)
    setBuffs(EMPTY_BUFFS())
    setCardMode(null)
    setStep('awaitEnemy')
    setMessage(note)
    window.setTimeout(() => beginEnemyTurn(map), 480)
  }

  function beginEnemyTurn(current: Map<string, PhilipoPiece>) {
    if (winner) return
    setStep('enemyMoving')
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
          const t = map.get(keyOf(c.col, c.row))
          return t?.side !== 'blue'
        }),
      )
      moves.sort((a, b) => {
        const ta = map.get(keyOf(a.col, a.row))
        const tb = map.get(keyOf(b.col, b.row))
        return Number(!!tb && tb.side === 'red') - Number(!!ta && ta.side === 'red')
      })
      const dest = moves[0]
      if (!dest) continue
      const toKey = keyOf(dest.col, dest.row)
      const target = map.get(toKey)
      if (!target) {
        map.delete(key)
        map.set(toKey, piece)
        setBoard(map)
        // After enemy move (no attack): red may play defense/intel
        setPendingEnemyAttack(null)
        setStep('reactCard')
        setMessage('Enemy moved. Play a Defense/Intel card, or Skip.')
        return
      }
      // Attack — let red react before resolve
      setPendingEnemyAttack({ fromKey: key, toKey, map })
      setStep('reactCard')
      setMessage('Enemy attacks! Play Defense/Intel, or Skip to resolve.')
      return
    }
    endReactToYourTurn(map, 'Blue passes.')
  }

  function resolveEnemyAttack(
    base: Map<string, PhilipoPiece>,
    fromKey: string,
    toKey: string,
    redDef: PendingBuffs,
  ) {
    const map = new Map(base)
    const piece = map.get(fromKey)
    const target = map.get(toKey)
    if (!piece || !target) {
      endReactToYourTurn(map, 'Your turn.')
      return
    }
    map.delete(fromKey)
    piece.revealed = true
    target.revealed = true
    const result = combat(piece, target, EMPTY_BUFFS(), redDef)
    if (result === 'bounce') {
      map.set(fromKey, piece)
      map.set(toKey, target)
      endReactToYourTurn(map, 'Attack bounced off your Wall.')
      return
    }
    if (result === 'attacker') {
      map.set(toKey, { ...piece, revealed: true })
      if (target.rank === 'wall') {
        setBoard(map)
        setWinner('blue')
        setPhase('over')
        setMessage('Blue destroyed your Wall.')
        return
      }
    } else if (result === 'defender') {
      map.set(toKey, { ...target, revealed: true })
    }
    // both → empty
    endReactToYourTurn(
      map,
      result === 'both'
        ? 'Both pieces destroyed.'
        : result === 'attacker'
          ? 'Enemy wins the clash.'
          : 'You held the square.',
    )
  }

  function endReactToYourTurn(map: Map<string, PhilipoPiece>, note: string) {
    setBoard(map)
    setPendingEnemyAttack(null)
    setBuffs(EMPTY_BUFFS())
    setEnemyBuffs(EMPTY_BUFFS())
    setStep('yourCard')
    setMessage(`${note} Play Attack/Intel or Skip to move.`)
  }

  function tryMove(fromKey: string, toKey: string) {
    if (phase !== 'play' || step !== 'yourMove' || winner) return
    const map = new Map(board)
    const mover = map.get(fromKey)
    if (!mover || mover.side !== 'red' || !canMovePiece(mover.rank)) return
    const from = parseKey(fromKey)
    const to = parseKey(toKey)
    if (!legalMove(mover, from, to, map, buffs.move)) return

    const target = map.get(toKey)
    if (!target) {
      map.delete(fromKey)
      map.set(toKey, mover)
      afterRedMove(map, 'Moved. Blue is thinking…')
      return
    }

    mover.revealed = true
    target.revealed = true
    const result = combat(mover, target, buffs, enemyBuffs)
    if (result === 'bounce') {
      setMessage('Only a Miner (or Defuse) can clear a Wall.')
      return
    }

    map.delete(fromKey)
    if (result === 'attacker') {
      map.set(toKey, { ...mover, revealed: true })
      if (target.rank === 'wall') {
        setBoard(map)
        setWinner('red')
        setPhase('over')
        setMessage('You destroyed their Wall — victory!')
        return
      }
      if (buffs.capture) {
        const taken = { ...target, side: 'red' as const, revealed: true }
        setCapturedHold(taken)
        setBoard(map)
        setSelectedCell(null)
        setCardMode('capturePlace')
        setBuffs(EMPTY_BUFFS())
        setMessage('Capture — place that piece on your half.')
        return
      }
    } else if (result === 'defender') {
      map.set(toKey, { ...target, revealed: true })
    }
    afterRedMove(
      map,
      result === 'both'
        ? 'Tie — both die.'
        : result === 'attacker'
          ? `Your ${RANK_NAME[mover.rank]} wins.`
          : `Enemy ${RANK_NAME[target.rank]} holds.`,
    )
  }

  function onCellClick(col: number, row: number) {
    const k = keyOf(col, row)

    if (cardMode === 'promote') {
      const p = board.get(k)
      if (!p || p.side !== 'red') return
      const next = PROMOTE_NEXT[p.rank]
      if (!next) {
        setMessage('That piece can’t promote further.')
        return
      }
      setBoard((prev) => {
        const m = new Map(prev)
        m.set(k, { ...p, rank: next })
        return m
      })
      setCardMode(null)
      if (step === 'yourCard') {
        setStep('yourMove')
        setMessage(`Promoted to ${RANK_NAME[next]}. Now move.`)
      } else {
        setMessage(`Promoted to ${RANK_NAME[next]}.`)
      }
      return
    }

    if (cardMode === 'fortify') {
      if (!inOwnHalf('red', row) || isLake(col, row) || board.has(k)) return
      const wall: PhilipoPiece = {
        id: `red-fortify-${Date.now()}`,
        side: 'red',
        rank: 'wall',
        revealed: true,
      }
      setBoard((prev) => {
        const m = new Map(prev)
        m.set(k, wall)
        return m
      })
      setCardMode(null)
      if (step === 'reactCard' && pendingEnemyAttack) {
        resolveEnemyAttack(
          (() => {
            const m = new Map(board)
            m.set(k, wall)
            return m
          })(),
          pendingEnemyAttack.fromKey,
          pendingEnemyAttack.toKey,
          buffs,
        )
      } else if (step === 'yourCard') {
        setStep('yourMove')
        setMessage('Wall placed. Now move.')
      }
      return
    }

    if (cardMode === 'capturePlace') {
      if (!inOwnHalf('red', row) || isLake(col, row) || board.has(k) || !capturedHold) return
      const hold = capturedHold
      setBoard((prev) => {
        const m = new Map(prev)
        m.set(k, hold)
        return m
      })
      setCapturedHold(null)
      setCardMode(null)
      afterRedMove(
        (() => {
          const m = new Map(board)
          m.set(k, hold)
          return m
        })(),
        'Captured piece placed. Blue is thinking…',
      )
      return
    }

    if (phase === 'setup') {
      placeFromTray(col, row)
      return
    }
    if (phase !== 'play' || step !== 'yourMove') return

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

  const handHint =
    step === 'yourCard'
      ? 'Attack or Intel'
      : step === 'reactCard'
        ? 'Defense or Intel'
        : 'Cards locked'

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

      <div className="flex min-h-0 flex-1 items-stretch justify-center px-2 pb-1">
        <div
          className="relative flex h-full w-full max-w-lg flex-col overflow-hidden rounded-md"
          style={{
            background: 'linear-gradient(180deg,#8b5a2b,#5c3418 40%,#3d2210)',
            boxShadow: 'inset 0 0 0 3px #2a160c, 0 8px 24px #00000088',
            padding: '0.45rem',
          }}
          role="grid"
          aria-label="Philipo board"
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
                const light = (col + row) % 2 === 0
                const redZone = row >= 7
                const blueZone = row <= 2
                let bg = light ? '#5a9a3e' : '#4a8532'
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
                    aria-label={lake ? `Lake ${col + 1},${row + 1}` : `Square ${col + 1},${row + 1}`}
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
                            piece.rank === 'wall'
                              ? 'linear-gradient(180deg,#9a9a9a,#4a4a4a)'
                              : piece.side === 'red'
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

      {/* Bottom tray — pieces in setup, cards in play */}
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
                        : p.rank === 'wall'
                          ? 'linear-gradient(180deg,#9a9a9a,#4a4a4a)'
                          : 'linear-gradient(180deg,#e85a4a,#9a2018)',
                      color: on ? '#1a1410' : '#fff6e8',
                      boxShadow: on ? '0 0 0 2px #fff' : '0 2px 0 #5a1008',
                    }}
                    aria-label={RANK_NAME[p.rank]}
                  >
                    <span>{RANK_LABEL[p.rank]}</span>
                    <span className="mt-0.5 text-[0.4rem] font-bold uppercase opacity-80">
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
        ) : phase === 'over' ? (
          <div className="mx-auto max-w-lg px-1 py-2 text-center">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]">
              {winner === 'red' ? 'You win' : 'Blue wins'}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="mt-2 rounded-lg px-4 py-2 text-xs font-extrabold uppercase text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
            >
              Back to Events
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <p className="text-[0.6rem] font-extrabold uppercase tracking-wide text-[#f5d76e]/90">
                Hand · {handHint}
              </p>
              <div className="flex gap-1.5">
                {(step === 'yourCard' || step === 'reactCard') && (
                  <button
                    type="button"
                    onClick={skipCardPhase}
                    className="rounded-md bg-[#2a1a12] px-2.5 py-1 text-[0.6rem] font-extrabold uppercase text-white/75 ring-1 ring-white/15"
                  >
                    Skip
                  </button>
                )}
                {step === 'yourMove' && (
                  <button
                    type="button"
                    onClick={() => afterRedMove(new Map(board), 'Passed move. Blue…')}
                    className="rounded-md bg-[#2a1a12] px-2.5 py-1 text-[0.6rem] font-extrabold uppercase text-white/75 ring-1 ring-white/15"
                  >
                    Skip move
                  </button>
                )}
              </div>
            </div>
            {(buffs.attackBonus > 0 ||
              buffs.defenseBonus > 0 ||
              buffs.defuse ||
              buffs.capture ||
              buffs.move.type !== 'none') && (
              <p className="text-[0.55rem] font-bold text-[#7dff9a]">
                Active:
                {buffs.attackBonus > 0 ? ` +${buffs.attackBonus} atk` : ''}
                {buffs.defenseBonus > 0 ? ` +${buffs.defenseBonus} def` : ''}
                {buffs.defuse ? ' Defuse' : ''}
                {buffs.capture ? ' Capture' : ''}
                {buffs.move.type !== 'none' ? ` ${buffs.move.type}` : ''}
              </p>
            )}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {hand.map((c) => {
                const meta = CARD_META[c.defId]
                const locked =
                  (step === 'yourCard' && meta.kind === 'defensive') ||
                  (step === 'reactCard' && meta.kind === 'offensive') ||
                  (step !== 'yourCard' && step !== 'reactCard')
                const tint =
                  meta.kind === 'offensive'
                    ? 'linear-gradient(180deg,#e85a4a,#9a2018)'
                    : meta.kind === 'defensive'
                      ? 'linear-gradient(180deg,#4a9eff,#1a4a9a)'
                      : 'linear-gradient(180deg,#c9a227,#8a6a12)'
                return (
                  <button
                    key={c.uid}
                    type="button"
                    disabled={locked}
                    onClick={() => playCard(c)}
                    title={meta.blurb}
                    className="flex h-[4.25rem] w-[3.35rem] shrink-0 flex-col items-center justify-center rounded-md px-0.5 text-center disabled:opacity-40"
                    style={{
                      background: tint,
                      color: '#fff6e8',
                      boxShadow: '0 2px 0 #00000055',
                    }}
                  >
                    <span className="text-[0.55rem] font-black leading-tight">{meta.name}</span>
                    <span className="mt-0.5 text-[0.4rem] font-bold uppercase opacity-75">
                      {meta.kind.slice(0, 3)}
                    </span>
                  </button>
                )
              })}
              {hand.length === 0 ? (
                <p className="px-2 py-3 text-xs font-bold text-white/55">No cards left.</p>
              ) : null}
            </div>
            <p className="text-center text-[0.55rem] font-semibold text-white/45">
              Deck {deck.length} · Discard {discard.length}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
