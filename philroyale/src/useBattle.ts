import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ARENA_COLS,
  ARENA_ROWS,
  TOWERS,
  bridgeSteerDir,
  canDeployAllyAt,
  canDeployEnemyAt,
  closestPointOnTower,
  distToTowerEdge,
  isInsideTower,
  isRiverTile,
  isWalkableTile,
  nearestBridgeMidCol,
  pathCostTo,
  type Side,
} from './arena'
import { getCharacter, type CharacterDef } from './characters'
import type { BattleUnit, Projectile, SplatFx } from './battleTypes'

const ELIXIR_MAX = 10
const ELIXIR_PER_SEC = 0.35
const PROJECTILE_MS = 480
const TOWER_PROJECTILE_MS = 320
const ROOT_VFX_MS = 450
const WHIP_VFX_MS = 780
const RANGED_VFX_MS = 380
const SPLAT_MS = 520

const PRINCESS_RANGE = 25
const PRINCESS_DAMAGE = 100
const PRINCESS_CD_MS = 1000
const KING_RANGE = 40
const KING_DAMAGE = 150
const KING_CD_MS = 1500
const KING_WAKE_RANGE = 15
const KING_WAKE_DELAY_MS = 3000

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

  return { col: u.col, row: u.row }
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

export function useBattle() {
  const [elixir, setElixir] = useState(5)
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

  const unitsRef = useRef(units)
  const towersRef = useRef(towers)
  const projectilesRef = useRef(projectiles)
  const splatsRef = useRef(splats)
  const elixirRef = useRef(elixir)
  unitsRef.current = units
  towersRef.current = towers
  projectilesRef.current = projectiles
  splatsRef.current = splats
  elixirRef.current = elixir

  const deploy = useCallback(
    (char: CharacterDef, col: number, row: number, side: Side = 'ally') => {
      if (elixirRef.current < char.elixir) return false
      const clampedCol = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
      const clampedRow = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
      const live = liveTowerIdSet(towersRef.current)
      const ok =
        side === 'ally'
          ? canDeployAllyAt(clampedCol, clampedRow, towersRef.current, live)
          : canDeployEnemyAt(clampedCol, clampedRow, towersRef.current, live)
      if (!ok) return false
      const t = performance.now()
      setElixir((e) => e - char.elixir)
      setUnits((prev) => [
        ...prev,
        {
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
        },
      ])
      return true
    },
    [],
  )

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      setNow(t)
      setElixir((e) => Math.min(ELIXIR_MAX, e + ELIXIR_PER_SEC * dt))

      let nextProjectiles = projectilesRef.current.slice()
      let nextSplats = splatsRef.current.filter((s) => t - s.bornAt < SPLAT_MS)
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
          nextSplats.push({ id: nid('splat'), col: p.toCol, row: p.toRow, bornAt: t })
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
            const steer = bridgeSteerDir(u.col, u.row, u.col, goalRow)
            const dCol = steer ? steer.dCol * step : 0
            const dRow = steer ? steer.dRow * step : dir * step
            const prevCol = u.col
            const prevRow = u.row
            const next = stepUnit(u, dCol, dRow, liveIds)
            const ejected = ejectFromTowers(next.col, next.row, liveIds)
            u.col = ejected.col
            u.row = ejected.row
            u.facing = Math.atan2(dRow || dir, dCol)
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
        if (best.rangeD > attack.range) {
          if (!rooted) {
            const step = moveSpeed * dt
            const steer = bridgeSteerDir(u.col, u.row, best.col, best.row)
            const dCol = steer ? steer.dCol * step : Math.cos(face) * step
            const dRow = steer ? steer.dRow * step : Math.sin(face) * step
            if (steer) {
              u.facing = Math.atan2(steer.dRow, steer.dCol)
            }
            const prevCol = u.col
            const prevRow = u.row
            const next = stepUnit(u, dCol, dRow, liveIds)
            const ejected = ejectFromTowers(next.col, next.row, liveIds)
            u.col = ejected.col
            u.row = ejected.row
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
            arriveAt: t + PROJECTILE_MS,
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
          fromRow: origin.row - (tw.kind === 'king' ? 1.2 : 0.8),
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

      const filteredUnits = nextUnits.filter((u) => u.hp > 0)
      if (filteredUnits.length !== nextUnits.length) unitsChanged = true

      if (unitsChanged) setUnits(filteredUnits)
      if (towersChanged) setTowers(nextTowers)
      if (projectilesChanged) setProjectiles(nextProjectiles)
      if (splatsChanged) setSplats(nextSplats)

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return {
    elixir,
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
