import { useCallback, useEffect, useRef, useState } from 'react'
import { ARENA_COLS, ARENA_ROWS, TOWERS, type Side } from './arena'
import { getCharacter, type CharacterDef } from './characters'
import type { BattleUnit, Projectile } from './battleTypes'

const ELIXIR_MAX = 10
const ELIXIR_PER_SEC = 0.35
const PROJECTILE_MS = 420
const ROOT_VFX_MS = 450
const RANGED_VFX_MS = 280

export type TowerHp = { id: string; hp: number; maxHp: number; side: Side }

function towerMaxHp(kind: 'king' | 'princess'): number {
  return kind === 'king' ? 4000 : 2500
}

function dist(aCol: number, aRow: number, bCol: number, bRow: number): number {
  return Math.hypot(aCol - bCol, aRow - bRow)
}

function unitCenter(u: BattleUnit): { col: number; row: number } {
  return { col: u.col + 0.5, row: u.row + 0.5 }
}

function towerCenter(id: string): { col: number; row: number } | null {
  const t = TOWERS.find((x) => x.id === id)
  if (!t) return null
  return { col: t.col + t.w / 2, row: t.row + t.h / 2 }
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
  const [towers, setTowers] = useState<TowerHp[]>(() =>
    TOWERS.map((t) => {
      const maxHp = towerMaxHp(t.kind)
      return { id: t.id, hp: maxHp, maxHp, side: t.side }
    }),
  )
  const [selectedCharId, setSelectedCharId] = useState<string | null>('phil')
  const [now, setNow] = useState(() => performance.now())

  const unitsRef = useRef(units)
  const towersRef = useRef(towers)
  const projectilesRef = useRef(projectiles)
  const elixirRef = useRef(elixir)
  unitsRef.current = units
  towersRef.current = towers
  projectilesRef.current = projectiles
  elixirRef.current = elixir

  const deploy = useCallback(
    (char: CharacterDef, col: number, row: number, side: Side = 'ally') => {
      if (elixirRef.current < char.elixir) return false
      if (side === 'ally' && row < ARENA_ROWS / 2) return false
      if (side === 'enemy' && row >= ARENA_ROWS / 2) return false
      const clampedCol = Math.max(0, Math.min(ARENA_COLS - 1, col))
      const clampedRow = Math.max(0, Math.min(ARENA_ROWS - 1, row))
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
          nextAttackAt: t + 300,
          vfx: null,
          vfxUntil: 0,
          facing: side === 'ally' ? -Math.PI / 2 : Math.PI / 2,
          rootedUntil: 0,
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
      let nextUnits = unitsRef.current.map((u) => ({ ...u }))
      let nextTowers = towersRef.current.map((tw) => ({ ...tw }))
      let unitsChanged = false
      let towersChanged = false
      let projectilesChanged = false

      const stillFlying: Projectile[] = []
      for (const p of nextProjectiles) {
        if (t < p.arriveAt) {
          stillFlying.push(p)
          continue
        }
        projectilesChanged = true
        if (p.targetId) {
          const target = nextUnits.find((u) => u.id === p.targetId)
          if (target) {
            target.hp -= p.damage
            unitsChanged = true
          }
        } else if (p.targetTowerId) {
          const tw = nextTowers.find((x) => x.id === p.targetTowerId)
          if (tw) {
            tw.hp = Math.max(0, tw.hp - p.damage)
            towersChanged = true
          }
        }
      }
      nextProjectiles = stillFlying

      const liveTowers = nextTowers.filter((tw) => tw.hp > 0)

      for (const u of nextUnits) {
        if (u.hp <= 0) continue
        if (u.vfx && t >= u.vfxUntil) {
          u.vfx = null
          unitsChanged = true
        }

        const def = getCharacter(u.charId)
        if (!def || def.attacks.length === 0) continue

        const me = unitCenter(u)
        const foes = nextUnits.filter((o) => o.side !== u.side && o.hp > 0)
        const foeTowers = liveTowers.filter((tw) => tw.side !== u.side)

        type Target = {
          kind: 'unit' | 'tower' | 'air'
          id: string | null
          col: number
          row: number
          d: number
        }

        let best: Target | null = null
        for (const f of foes) {
          const c = unitCenter(f)
          const d = dist(me.col, me.row, c.col, c.row)
          if (!best || d < best.d) best = { kind: 'unit', id: f.id, col: c.col, row: c.row, d }
        }
        for (const tw of foeTowers) {
          const c = towerCenter(tw.id)
          if (!c) continue
          const d = dist(me.col, me.row, c.col, c.row)
          if (!best || d < best.d) best = { kind: 'tower', id: tw.id, col: c.col, row: c.row, d }
        }
        if (!best) {
          const forwardRow = u.side === 'ally' ? me.row - 10 : me.row + 10
          best = {
            kind: 'air',
            id: null,
            col: me.col,
            row: Math.max(0, Math.min(ARENA_ROWS - 1, forwardRow)),
            d: 10,
          }
        }

        const face = Math.atan2(best.row - me.row, best.col - me.col)
        if (Math.abs(face - u.facing) > 0.04) {
          u.facing = face
          unitsChanged = true
        }

        const attack = def.attacks[u.attackIndex % def.attacks.length]!
        const rooted = t < u.rootedUntil

        if (!rooted && best.d > attack.range && best.kind !== 'air') {
          const step = def.moveSpeed * dt
          u.col = Math.max(0, Math.min(ARENA_COLS - 1, u.col + Math.cos(u.facing) * step))
          u.row = Math.max(0, Math.min(ARENA_ROWS - 1, u.row + Math.sin(u.facing) * step))
          unitsChanged = true
        } else if (!rooted && best.kind === 'air') {
          const step = def.moveSpeed * dt
          const dir = u.side === 'ally' ? -1 : 1
          u.row = Math.max(0, Math.min(ARENA_ROWS - 1, u.row + dir * step))
          unitsChanged = true
        }

        if (t < u.nextAttackAt) continue

        const inRange = best.d <= attack.range
        u.vfx = attack.id
        u.vfxUntil = t + (attack.rootWhileAttacking ? ROOT_VFX_MS : RANGED_VFX_MS)
        u.nextAttackAt = t + def.attackDelaySec * 1000
        u.attackIndex = (u.attackIndex + 1) % def.attacks.length
        unitsChanged = true

        if (attack.rootWhileAttacking) {
          u.rootedUntil = t + ROOT_VFX_MS
        }

        if (attack.kind === 'sundae') {
          nextProjectiles.push({
            id: nid('p'),
            kind: 'sundae',
            fromCol: me.col,
            fromRow: me.row,
            toCol: best.col,
            toRow: best.row,
            damage: inRange && best.kind !== 'air' ? attack.damage : 0,
            targetId: inRange && best.kind === 'unit' ? best.id : null,
            targetTowerId: inRange && best.kind === 'tower' ? best.id : null,
            bornAt: t,
            arriveAt: t + PROJECTILE_MS,
          })
          projectilesChanged = true
          continue
        }

        // Melee / hug / whip — hit instantly if in range
        if (!inRange || best.kind === 'air') continue

        if (best.kind === 'unit' && best.id) {
          const target = nextUnits.find((x) => x.id === best.id)
          if (target) {
            target.hp -= attack.damage
            if (attack.pullToRange != null) {
              const ang = Math.atan2(target.row - u.row, target.col - u.col)
              target.col = Math.max(
                0,
                Math.min(ARENA_COLS - 1, u.col + Math.cos(ang) * attack.pullToRange),
              )
              target.row = Math.max(
                0,
                Math.min(ARENA_ROWS - 1, u.row + Math.sin(ang) * attack.pullToRange),
              )
            }
            unitsChanged = true
          }
        } else if (best.kind === 'tower' && best.id) {
          const tw = nextTowers.find((x) => x.id === best.id)
          if (tw) {
            tw.hp = Math.max(0, tw.hp - attack.damage)
            towersChanged = true
          }
        }
      }

      const filteredUnits = nextUnits.filter((u) => u.hp > 0)
      if (filteredUnits.length !== nextUnits.length) unitsChanged = true

      if (unitsChanged) setUnits(filteredUnits)
      if (towersChanged) setTowers(nextTowers)
      if (projectilesChanged) setProjectiles(nextProjectiles)

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
    towers,
    selectedCharId,
    setSelectedCharId,
    deploy,
    now,
  }
}
