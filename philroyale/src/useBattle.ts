import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ARENA_COLS,
  ARENA_ROWS,
  TOWERS,
  canDeployAllyAt,
  canDeployEnemyAt,
  closestPointOnTower,
  distToTowerEdge,
  isInsideTower,
  isRiverTile,
  isWalkableTile,
  nearestBridgeMidCol,
  pathCostTo,
  steerTowardGoal,
  type Side,
} from './arena'
import { getCharacter, DEFAULT_DECK, type CharacterDef } from './characters'
import type { BattleUnit, Projectile, SplatFx } from './battleTypes'

const ELIXIR_MAX = 10
const ELIXIR_PER_SEC = 0.35
const PROJECTILE_MS = 480
/** Beans slobber — slow lob that takes a beat to land. */
const SLOBBER_PROJECTILE_MS = 1100
/** Jeremy dual-pistol rounds — very fast. */
const SHOOT_PROJECTILE_MS = 140
const TOWER_PROJECTILE_MS = 320
const ROOT_VFX_MS = 450
const HUG_VFX_MS = 780
const WHIP_VFX_MS = 780
const RANGED_VFX_MS = 380
const SPLAT_MS = 520
const SLOBBER_SPLAT_MS = 780
const BOOM_MS = 380

const PRINCESS_RANGE = 30
const PRINCESS_DAMAGE = 100
const PRINCESS_CD_MS = 1000
const KING_RANGE = 30
const KING_DAMAGE = 150
const KING_CD_MS = 1500
const KING_WAKE_RANGE = 7.5
const KING_WAKE_DELAY_MS = 3000
/** Soft collision radius (tiles) for CR-style unit push / bunching. */
const UNIT_RADIUS = 0.85
const AI_DEPLOY_MIN_MS = 2200
const AI_DEPLOY_MAX_MS = 3500
const FACING_TURN_HARD_RAD = 0.4

export type TowerHp = {
  id: string
  hp: number
  maxHp: number
  side: Side
  kind: 'king' | 'princess'
  /** King starts asleep; princesses are always active. */
  activated: boolean
  /** When the king may begin firing (after 3s wake delay). */
  fireReadyAt: number
  nextShotAt: number
}

function towerMaxHp(kind: 'king' | 'princess'): number {
  return kind === 'king' ? 4000 : 2500
}

function dist(aCol: number, aRow: number, bCol: number, bRow: number): number {
  return Math.hypot(aCol - bCol, aRow - bRow)
}

function unitCenter(u: BattleUnit): { col: number; row: number } {
  return { col: u.col + 0.5, row: u.row + 0.5 }
}

function liveTowerIdSet(towers: TowerHp[]): ReadonlySet<string> {
  return new Set(towers.filter((t) => t.hp > 0).map((t) => t.id))
}

function towerSlot(id: string) {
  return TOWERS.find((x) => x.id === id) ?? null
}

function wakeKing(tw: TowerHp, now: number) {
  if (tw.kind !== 'king' || tw.activated || tw.hp <= 0) return
  tw.activated = true
  tw.fireReadyAt = now + KING_WAKE_DELAY_MS
  tw.nextShotAt = tw.fireReadyAt
}

function applyTowerDamage(tw: TowerHp, damage: number, now: number) {
  const before = tw.hp
  tw.hp = Math.max(0, tw.hp - damage)
  if (before > 0 && damage > 0) wakeKing(tw, now)
}

function lerpAngle(from: number, to: number, t: number): number {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + diff * t
}

/** Update facing from actual displacement; ignore steer when barely moved. */
function updateFacingFromMove(u: BattleUnit, prevCol: number, prevRow: number): void {
  const dCol = u.col - prevCol
  const dRow = u.row - prevRow
  if (Math.hypot(dCol, dRow) < 0.001) return
  const moveFacing = Math.atan2(dRow, dCol)
  const turn = Math.abs(Math.atan2(Math.sin(moveFacing - u.facing), Math.cos(moveFacing - u.facing)))
  u.facing = turn > FACING_TURN_HARD_RAD ? moveFacing : lerpAngle(u.facing, moveFacing, 0.45)
}

/** Nudge laterally toward the nearest bridge when stuck behind a tower. */
function nudgeTowardBridgeIfStuck(
  u: BattleUnit,
  prevCol: number,
  prevRow: number,
  step: number,
  liveTowers: ReadonlySet<string>,
): void {
  if (Math.hypot(u.col - prevCol, u.row - prevRow) >= 0.002) return
  const bridgeMid = nearestBridgeMidCol(u.col)
  const nudge = Math.sign(bridgeMid - (u.col + 0.5)) || 1
  const ncol = Math.max(0, Math.min(ARENA_COLS - 1, u.col + nudge * step * 0.9))
  if (isWalkableTile(ncol, u.row, liveTowers)) {
    u.col = ncol
  }
}

function makeBattleUnit(
  char: CharacterDef,
  col: number,
  row: number,
  side: Side,
  t: number,
): BattleUnit {
  const clampedCol = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const clampedRow = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  return {
    id: nid('u'),
    charId: char.id,
    side,
    col: clampedCol,
    row: clampedRow,
    hp: char.hp,
    maxHp: char.hp,
    attackIndex: 0,
    burstShot: 0,
    nextAttackAt: t + 300,
    vfx: null,
    vfxUntil: 0,
    facing: side === 'ally' ? -Math.PI / 2 : Math.PI / 2,
    rootedUntil: 0,
    spawnedAt: t,
    enraged: false,
    movingUntil: 0,
  }
}

function canSpawnAt(
  col: number,
  row: number,
  side: Side,
  towers: TowerHp[],
  live: ReadonlySet<string>,
): boolean {
  const clampedCol = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const clampedRow = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  return side === 'ally'
    ? canDeployAllyAt(clampedCol, clampedRow, towers, live)
    : canDeployEnemyAt(clampedCol, clampedRow, towers, live)
}

function pickAiLane(units: BattleUnit[]): 'left' | 'right' {
  let left = 0
  let right = 0
  for (const u of units) {
    if (u.side !== 'ally' || u.hp <= 0) continue
    if (u.col < ARENA_COLS / 2) left++
    else right++
  }
  if (left > right) return 'left'
  if (right > left) return 'right'
  return Math.random() < 0.5 ? 'left' : 'right'
}

function tryEnemyAiDeploy(
  units: BattleUnit[],
  towers: TowerHp[],
  live: ReadonlySet<string>,
  enemyElixir: number,
  deckIndex: number,
  t: number,
): { unit: BattleUnit | null; elixir: number; deckIndex: number } {
  const lane = pickAiLane(units)
  const colBase = lane === 'left' ? 20 : 72
  const colSpan = 9
  const rowBase = 8
  const rowSpan = 21

  for (let attempt = 0; attempt < DEFAULT_DECK.length * 3; attempt++) {
    const charId = DEFAULT_DECK[deckIndex % DEFAULT_DECK.length]!
    deckIndex = (deckIndex + 1) % DEFAULT_DECK.length
    const char = getCharacter(charId)
    if (!char || enemyElixir < char.elixir) continue

    for (let tileTry = 0; tileTry < 6; tileTry++) {
      const col = colBase + Math.floor(Math.random() * colSpan)
      const row = rowBase + Math.floor(Math.random() * rowSpan)
      if (!canSpawnAt(col, row, 'enemy', towers, live)) continue
      return {
        unit: makeBattleUnit(char, col, row, 'enemy', t),
        elixir: enemyElixir - char.elixir,
        deckIndex,
      }
    }
  }

  return { unit: null, elixir: enemyElixir, deckIndex }
}

/** Move with river + living-tower collision — units cannot enter tower footprints. */
function stepUnit(
  u: { col: number; row: number },
  dCol: number,
  dRow: number,
  liveTowers: ReadonlySet<string>,
): { col: number; row: number } {
  let nc = Math.max(0, Math.min(ARENA_COLS - 1, u.col + dCol))
  let nr = Math.max(0, Math.min(ARENA_ROWS - 1, u.row + dRow))

  if (isWalkableTile(nc, nr, liveTowers)) {
    return { col: nc, row: nr }
  }

  if (isWalkableTile(nc, u.row, liveTowers)) {
    return { col: nc, row: u.row }
  }
  if (isWalkableTile(u.col, nr, liveTowers)) {
    return { col: u.col, row: nr }
  }

  const midC = Math.floor(nc)
  const midR = Math.floor(nr)
  if (isRiverTile(midR, midC) || isRiverTile(Math.floor(u.row), midC) || isRiverTile(midR, Math.floor(u.col))) {
    const bridgeCol = nearestBridgeMidCol(u.col)
    const towardBridge = Math.sign(bridgeCol - u.col) || (dCol >= 0 ? 1 : -1)
    const sideStep = Math.max(Math.abs(dCol), Math.abs(dRow))
    nc = Math.max(0, Math.min(ARENA_COLS - 1, u.col + towardBridge * sideStep))
    if (isWalkableTile(nc, u.row, liveTowers)) {
      return { col: nc, row: u.row }
    }
    if (isWalkableTile(u.col, nr, liveTowers)) {
      return { col: u.col, row: nr }
    }
  }

  // Stuck on a tower — slide perpendicular (go around) like Clash Royale.
  const step = Math.max(Math.abs(dCol), Math.abs(dRow), 0.05)
  const len = Math.hypot(dCol, dRow) || 1
  const px = (-dRow / len) * step
  const py = (dCol / len) * step
  for (const sign of [1, -1] as const) {
    const sc = Math.max(0, Math.min(ARENA_COLS - 1, u.col + px * sign))
    const sr = Math.max(0, Math.min(ARENA_ROWS - 1, u.row + py * sign))
    if (isWalkableTile(sc, sr, liveTowers)) {
      return { col: sc, row: sr }
    }
    if (isWalkableTile(sc, u.row, liveTowers)) {
      return { col: sc, row: u.row }
    }
    if (isWalkableTile(u.col, sr, liveTowers)) {
      return { col: u.col, row: sr }
    }
  }

  return { col: u.col, row: u.row }
}

/** CR soft collision: separate overlaps; faster troops push slower ones ahead. */
function resolveUnitPushes(
  units: BattleUnit[],
  dt: number,
  speedOf: (u: BattleUnit) => number,
  liveTowers: ReadonlySet<string>,
  now: number,
): boolean {
  let changed = false
  const n = units.length
  for (let i = 0; i < n; i++) {
    const a = units[i]!
    if (a.hp <= 0) continue
    for (let j = i + 1; j < n; j++) {
      const b = units[j]!
      if (b.hp <= 0) continue
      const ac = unitCenter(a)
      const bc = unitCenter(b)
      let dx = bc.col - ac.col
      let dy = bc.row - ac.row
      let d = Math.hypot(dx, dy)
      if (d >= UNIT_RADIUS * 2) continue
      if (d < 1e-4) {
        dx = 0.01
        dy = 0
        d = 0.01
      }
      const nx = dx / d
      const ny = dy / d
      const overlap = UNIT_RADIUS * 2 - d
      const sep = overlap * 0.45
      a.col -= nx * sep
      a.row -= ny * sep
      b.col += nx * sep
      b.row += ny * sep
      changed = true

      if (a.side !== b.side) continue
      const sa = speedOf(a)
      const sb = speedOf(b)
      // Is b ahead of a along a's facing? Faster rear unit pushes the front one.
      const alongA = nx * Math.cos(a.facing) + ny * Math.sin(a.facing)
      if (sa > sb + 0.05 && alongA > 0.15) {
        const boost = (sa - sb) * dt * 0.9
        b.col += Math.cos(a.facing) * boost
        b.row += Math.sin(a.facing) * boost
        b.movingUntil = Math.max(b.movingUntil, now + 120)
        changed = true
      } else if (sb > sa + 0.05 && alongA < -0.15) {
        const boost = (sb - sa) * dt * 0.9
        a.col += Math.cos(b.facing) * boost
        a.row += Math.sin(b.facing) * boost
        a.movingUntil = Math.max(a.movingUntil, now + 120)
        changed = true
      }
    }
  }

  if (!changed) return false
  for (const u of units) {
    if (u.hp <= 0) continue
    u.col = Math.max(0, Math.min(ARENA_COLS - 1, u.col))
    u.row = Math.max(0, Math.min(ARENA_ROWS - 1, u.row))
    const ejected = ejectFromTowers(u.col, u.row, liveTowers)
    u.col = ejected.col
    u.row = ejected.row
  }
  return true
}

function ejectFromTowers(
  col: number,
  row: number,
  liveTowers: ReadonlySet<string>,
): { col: number; row: number } {
  for (const t of TOWERS) {
    if (!liveTowers.has(t.id)) continue
    if (!isInsideTower(col, row, t) && !isInsideTower(col + 0.5, row + 0.5, t)) continue
    const cx = t.col + t.w / 2
    const cy = t.row + t.h / 2
    const ox = col + 0.5 - cx
    const oy = row + 0.5 - cy
    const ol = Math.hypot(ox, oy) || 1
    const edge = closestPointOnTower(col + 0.5, row + 0.5, t)
    return {
      col: Math.max(0, Math.min(ARENA_COLS - 1, edge.col + (ox / ol) * 0.55 - 0.5)),
      row: Math.max(0, Math.min(ARENA_ROWS - 1, edge.row + (oy / ol) * 0.55 - 0.5)),
    }
  }
  return { col, row }
}

let seq = 0
function nid(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

export function useBattle(opts?: { paused?: boolean }) {
  const [elixir, setElixir] = useState(5)
  const [enemyElixir, setEnemyElixir] = useState(5)
  const [units, setUnits] = useState<BattleUnit[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [splats, setSplats] = useState<SplatFx[]>([])
  const [towers, setTowers] = useState<TowerHp[]>(() =>
    TOWERS.map((t) => {
      const maxHp = towerMaxHp(t.kind)
      return {
        id: t.id,
        hp: maxHp,
        maxHp,
        side: t.side,
        kind: t.kind,
        activated: t.kind === 'princess',
        fireReadyAt: 0,
        nextShotAt: 0,
      }
    }),
  )
  const [selectedCharId, setSelectedCharId] = useState<string | null>('phil')
  const [now, setNow] = useState(() => performance.now())
  const pausedRef = useRef(!!opts?.paused)
  pausedRef.current = !!opts?.paused

  const unitsRef = useRef(units)
  const towersRef = useRef(towers)
  const projectilesRef = useRef(projectiles)
  const splatsRef = useRef(splats)
  const elixirRef = useRef(elixir)
  const enemyElixirRef = useRef(enemyElixir)
  const aiDeckIndexRef = useRef(0)
  const aiNextDeployRef = useRef(performance.now() + AI_DEPLOY_MIN_MS)
  unitsRef.current = units
  towersRef.current = towers
  projectilesRef.current = projectiles
  splatsRef.current = splats
  elixirRef.current = elixir
  enemyElixirRef.current = enemyElixir

  const deploy = useCallback((char: CharacterDef, col: number, row: number) => {
    if (pausedRef.current) return false
    if (elixirRef.current < char.elixir) return false
    const live = liveTowerIdSet(towersRef.current)
    if (!canSpawnAt(col, row, 'ally', towersRef.current, live)) return false
    const spawnT = performance.now()
    setElixir((e) => e - char.elixir)
    setUnits((prev) => [...prev, makeBattleUnit(char, col, row, 'ally', spawnT)])
    return true
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      setNow(t)
      if (pausedRef.current) {
        raf = requestAnimationFrame(tick)
        return
      }
      setElixir((e) => Math.min(ELIXIR_MAX, e + ELIXIR_PER_SEC * dt))
      let nextEnemyElixir = Math.min(
        ELIXIR_MAX,
        enemyElixirRef.current + ELIXIR_PER_SEC * dt,
      )
      let enemyElixirChanged = nextEnemyElixir !== enemyElixirRef.current

      let nextProjectiles = projectilesRef.current.slice()
      let nextSplats = splatsRef.current.filter((s) => {
        const life =
          s.kind === 'boom' ? BOOM_MS : s.kind === 'slobber' ? SLOBBER_SPLAT_MS : SPLAT_MS
        return t - s.bornAt < life
      })
      let nextUnits = unitsRef.current.map((u) => ({ ...u }))
      let nextTowers = towersRef.current.map((tw) => ({ ...tw }))
      let unitsChanged = false
      let towersChanged = false
      let projectilesChanged = false
      let splatsChanged = nextSplats.length !== splatsRef.current.length

      const stillFlying: Projectile[] = []
      for (const p of nextProjectiles) {
        if (t < p.arriveAt) {
          stillFlying.push(p)
          continue
        }
        projectilesChanged = true
        if (p.kind === 'sundae') {
          nextSplats.push({
            id: nid('splat'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'sundae',
          })
          splatsChanged = true
        } else if (p.kind === 'slobber') {
          nextSplats.push({
            id: nid('slobber'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'slobber',
          })
          splatsChanged = true
        } else if (p.kind === 'shoot') {
          nextSplats.push({
            id: nid('boom'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'boom',
          })
          splatsChanged = true
        }
        if (p.targetId) {
          const target = nextUnits.find((u) => u.id === p.targetId)
          if (target) {
            target.hp -= p.damage
            unitsChanged = true
          }
        } else if (p.targetTowerId) {
          const tw = nextTowers.find((x) => x.id === p.targetTowerId)
          if (tw) {
            applyTowerDamage(tw, p.damage, t)
            towersChanged = true
          }
        }
      }
      nextProjectiles = stillFlying

      const liveTowers = nextTowers.filter((tw) => tw.hp > 0)
      const liveIds = liveTowerIdSet(nextTowers)

      if (t >= aiNextDeployRef.current) {
        aiNextDeployRef.current =
          t + AI_DEPLOY_MIN_MS + Math.random() * (AI_DEPLOY_MAX_MS - AI_DEPLOY_MIN_MS)
        const ai = tryEnemyAiDeploy(
          nextUnits,
          nextTowers,
          liveIds,
          nextEnemyElixir,
          aiDeckIndexRef.current,
          t,
        )
        aiDeckIndexRef.current = ai.deckIndex
        if (ai.unit) {
          nextUnits.push(ai.unit)
          nextEnemyElixir = ai.elixir
          enemyElixirChanged = true
          unitsChanged = true
        }
      }

      for (const u of nextUnits) {
        if (u.hp <= 0) continue
        if (u.vfx && t >= u.vfxUntil) {
          u.vfx = null
          unitsChanged = true
        }

        const def = getCharacter(u.charId)
        if (!def || def.attacks.length === 0) continue

        if (
          def.rageAfterSec != null &&
          !u.enraged &&
          t - u.spawnedAt >= def.rageAfterSec * 1000
        ) {
          u.enraged = true
          unitsChanged = true
        }

        const moveSpeed =
          def.moveSpeed * (u.enraged && def.rageMoveMult != null ? def.rageMoveMult : 1)
        const dmgMult = u.enraged && def.rageDamageMult != null ? def.rageDamageMult : 1

        const me = unitCenter(u)
        const foes = nextUnits.filter((o) => o.side !== u.side && o.hp > 0)
        const foeTowers = liveTowers.filter((tw) => tw.side !== u.side)

        type Target = {
          kind: 'unit' | 'tower'
          id: string
          col: number
          row: number
          /** Bridge-aware path cost for choosing nearest foe. */
          d: number
          /** Straight / edge distance for attack range checks. */
          rangeD: number
        }

        // Prefer nearest foe by bridge-aware path cost; attack range still uses edge/center dist.
        let best: Target | null = null
        for (const f of foes) {
          const c = unitCenter(f)
          const edge = dist(me.col, me.row, c.col, c.row)
          const path = pathCostTo(me.col, me.row, c.col, c.row)
          if (!best || path < best.d) {
            best = { kind: 'unit', id: f.id, col: c.col, row: c.row, d: path, rangeD: edge }
          }
        }
        for (const tw of foeTowers) {
          const slot = towerSlot(tw.id)
          if (!slot) continue
          const edge = distToTowerEdge(me.col, me.row, slot)
          const aim = closestPointOnTower(me.col, me.row, slot)
          const path = pathCostTo(me.col, me.row, aim.col, aim.row)
          if (!best || path < best.d) {
            best = { kind: 'tower', id: tw.id, col: aim.col, row: aim.row, d: path, rangeD: edge }
          }
        }

        const attack = def.attacks[u.attackIndex % def.attacks.length]!
        const rooted = t < u.rootedUntil
        const damage = attack.damage * dmgMult

        if (!best) {
          if (!rooted) {
            const step = moveSpeed * dt
            const dir = u.side === 'ally' ? -1 : 1
            const goalRow = dir < 0 ? 0 : ARENA_ROWS - 1
            const steer = steerTowardGoal(u.col, u.row, u.col, goalRow, liveIds)
            const dCol = steer.dCol * step
            const dRow = steer.dRow * step
            const prevCol = u.col
            const prevRow = u.row
            const next = stepUnit(u, dCol, dRow, liveIds)
            const ejected = ejectFromTowers(next.col, next.row, liveIds)
            u.col = ejected.col
            u.row = ejected.row
            nudgeTowardBridgeIfStuck(u, prevCol, prevRow, step, liveIds)
            updateFacingFromMove(u, prevCol, prevRow)
            if (Math.hypot(u.col - prevCol, u.row - prevRow) > 0.001) {
              u.movingUntil = t + 140
            }
            unitsChanged = true
          }
          continue
        }

        const face = Math.atan2(best.row - me.row, best.col - me.col)
        if (Math.abs(face - u.facing) > 0.04) {
          u.facing = face
          unitsChanged = true
        }

        // Move along nearest legal path until in attack range of the target.
        // Never allow attack range below 1 tile.
        const attackRange = Math.max(1, attack.range)
        if (best.rangeD > attackRange) {
          if (!rooted) {
            const step = moveSpeed * dt
            const steer = steerTowardGoal(u.col, u.row, best.col, best.row, liveIds)
            const dCol = steer.dCol * step
            const dRow = steer.dRow * step
            const prevCol = u.col
            const prevRow = u.row
            const next = stepUnit(u, dCol, dRow, liveIds)
            const ejected = ejectFromTowers(next.col, next.row, liveIds)
            u.col = ejected.col
            u.row = ejected.row
            nudgeTowardBridgeIfStuck(u, prevCol, prevRow, step, liveIds)
            updateFacingFromMove(u, prevCol, prevRow)
            if (Math.hypot(u.col - prevCol, u.row - prevRow) > 0.001) {
              u.movingUntil = t + 140
            }
            unitsChanged = true
          }
          continue
        }

        if (t < u.nextAttackAt) continue

        const burstShots = attack.burstShots ?? 1
        const burstGapSec = attack.burstGapSec ?? 0
        const nextBurst = u.burstShot + 1
        const burstDone = nextBurst >= burstShots

        const vfxMs =
          attack.id === 'chickenWhip'
            ? WHIP_VFX_MS
            : attack.id === 'deathHug'
              ? HUG_VFX_MS
              : attack.rootWhileAttacking
                ? ROOT_VFX_MS
                : RANGED_VFX_MS
        u.vfx = attack.id
        u.vfxUntil = t + vfxMs
        u.nextAttackAt = t + (burstDone ? def.attackDelaySec : burstGapSec) * 1000
        u.burstShot = burstDone ? 0 : nextBurst
        if (burstDone) {
          u.attackIndex = (u.attackIndex + 1) % def.attacks.length
        }
        unitsChanged = true

        if (attack.rootWhileAttacking) {
          u.rootedUntil = t + vfxMs
        }

        if (attack.kind === 'sundae' || attack.kind === 'slobber' || attack.kind === 'shoot') {
          nextProjectiles.push({
            id: nid('p'),
            kind: attack.kind,
            fromCol: me.col,
            fromRow: me.row,
            toCol: best.col,
            toRow: best.row,
            damage,
            targetId: best.kind === 'unit' ? best.id : null,
            targetTowerId: best.kind === 'tower' ? best.id : null,
            bornAt: t,
            arriveAt:
              t +
              (attack.kind === 'shoot'
                ? SHOOT_PROJECTILE_MS
                : attack.kind === 'slobber'
                  ? SLOBBER_PROJECTILE_MS
                  : PROJECTILE_MS),
          })
          projectilesChanged = true
          continue
        }

        if (best.kind === 'unit') {
          const target = nextUnits.find((x) => x.id === best.id)
          if (target) {
            target.hp -= damage
            if (attack.pullToRange != null) {
              const ang = Math.atan2(target.row - u.row, target.col - u.col)
              let pc = Math.max(
                0,
                Math.min(ARENA_COLS - 1, u.col + Math.cos(ang) * attack.pullToRange),
              )
              let pr = Math.max(
                0,
                Math.min(ARENA_ROWS - 1, u.row + Math.sin(ang) * attack.pullToRange),
              )
              const ejected = ejectFromTowers(pc, pr, liveIds)
              target.col = ejected.col
              target.row = ejected.row
            }
            unitsChanged = true
          }
        } else {
          const tw = nextTowers.find((x) => x.id === best.id)
          if (tw) {
            applyTowerDamage(tw, damage, t)
            towersChanged = true
          }
        }
      }

      // Tower combat — princess archers always; king wakes at 15 range or on damage, then 3s delay.
      for (const tw of nextTowers) {
        if (tw.hp <= 0) continue
        const slot = towerSlot(tw.id)
        if (!slot) continue
        const origin = { col: slot.col + slot.w / 2, row: slot.row + slot.h / 2 }
        const foes = nextUnits.filter((u) => u.side !== tw.side && u.hp > 0)

        if (tw.kind === 'king' && !tw.activated) {
          for (const f of foes) {
            const c = unitCenter(f)
            if (distToTowerEdge(c.col, c.row, slot) <= KING_WAKE_RANGE) {
              wakeKing(tw, t)
              towersChanged = true
              break
            }
          }
        }

        const canFire =
          tw.kind === 'princess' || (tw.activated && t >= tw.fireReadyAt)
        if (!canFire || t < tw.nextShotAt) continue

        const range = tw.kind === 'king' ? KING_RANGE : PRINCESS_RANGE
        const damage = tw.kind === 'king' ? KING_DAMAGE : PRINCESS_DAMAGE
        const cd = tw.kind === 'king' ? KING_CD_MS : PRINCESS_CD_MS

        let best: { id: string; col: number; row: number; d: number } | null = null
        for (const f of foes) {
          const c = unitCenter(f)
          const d = distToTowerEdge(c.col, c.row, slot)
          if (d > range) continue
          if (!best || d < best.d) best = { id: f.id, col: c.col, row: c.row, d }
        }
        if (!best) continue

        tw.nextShotAt = t + cd
        towersChanged = true
        nextProjectiles.push({
          id: nid('p'),
          kind: tw.kind === 'king' ? 'cannon' : 'arrow',
          fromCol: origin.col,
          // Spawn from the cannon barrel / archer window, not the tower pad center.
          fromRow: origin.row - (tw.kind === 'king' ? 2.4 : 1.8),
          toCol: best.col,
          toRow: best.row,
          damage,
          targetId: best.id,
          targetTowerId: null,
          bornAt: t,
          arriveAt: t + TOWER_PROJECTILE_MS,
        })
        projectilesChanged = true
      }

      // Clash-style bunching: faster units shove slower allies ahead when stacked.
      if (
        resolveUnitPushes(
          nextUnits,
          dt,
          (u) => {
            const def = getCharacter(u.charId)
            if (!def) return 0
            return def.moveSpeed * (u.enraged && def.rageMoveMult != null ? def.rageMoveMult : 1)
          },
          liveIds,
          t,
        )
      ) {
        unitsChanged = true
      }

      const filteredUnits = nextUnits.filter((u) => u.hp > 0)
      if (filteredUnits.length !== nextUnits.length) unitsChanged = true

      if (unitsChanged) setUnits(filteredUnits)
      if (towersChanged) setTowers(nextTowers)
      if (projectilesChanged) setProjectiles(nextProjectiles)
      if (splatsChanged) setSplats(nextSplats)
      if (enemyElixirChanged) {
        enemyElixirRef.current = nextEnemyElixir
        setEnemyElixir(nextEnemyElixir)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return {
    elixir,
    enemyElixir,
    elixirMax: ELIXIR_MAX,
    units,
    projectiles,
    splats,
    towers,
    selectedCharId,
    setSelectedCharId,
    deploy,
    now,
  }
}
