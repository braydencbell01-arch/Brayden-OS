import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ARENA_COLS,
  ARENA_ROWS,
  TOUCHDOWN_ZONE_ROWS,
  TOUCHDOWN_WIN_SCORE,
  TOWERS,
  canDeployAllyAt,
  canDeployEnemyAt,
  canDeployTouchdownAt,
  closestPointOnTower,
  distToTowerEdge,
  distUnitTileToTower,
  towerFrontAimPoint,
  towerFrontEngagePoint,
  isInsideTower,
  isOnTowerFrontSide,
  isRiverTile,
  isWalkableTile,
  nearestBridgeMidCol,
  pathCostTo,
  steerTowardGoal,
  type Side,
} from './arena'
import type { GameMode } from './storage'
import { loadPlayerId, loadPlayerName } from './storage'
import {
  BASE_ELIXIR_PER_SEC,
  elixirMultiplier,
  regulationSeconds,
} from './gameModes'
import {
  DECK_SIZE,
  getCharacter,
  randomBotDeck,
  uniqueDeckFrom,
  isBuildingCard,
  isSpellCard,
  pickSpawnFromPool,
  type CharacterDef,
} from './characters'
import type { BattleUnit, Projectile, RageHeart, SplatFx } from './battleTypes'
import { botAiProfile, cardLevelMult, scaledStat } from './progression'
import {
  type BattleNet,
  type BattleRoomMessage,
  type SyncProjectile,
  type SyncUnit,
  flipForGuestView,
  flipSide,
  flipTowerId,
  guestDeployToHostEnemy,
  publishBattle,
  subscribeBattle,
} from './battleSync'
import { sfx } from './audio'

const SYNC_INTERVAL_MS = 220

/** Map host performance.now timestamps onto the guest clock. */
function mapHostPerfTime(hostTs: number, hostNow: number, guestNow: number): number {
  return hostTs + (guestNow - hostNow)
}

function syncUnitToBattle(u: SyncUnit, flip: boolean, guestNow: number, hostNow: number): BattleUnit {
  const mapTime = (ts: number | undefined, fallback: number) =>
    ts != null ? mapHostPerfTime(ts, hostNow, guestNow) : fallback
  const pos = flip ? flipForGuestView(u.col, u.row) : { col: u.col, row: u.row }
  const side = flip ? flipSide(u.side) : u.side

  let launch: BattleUnit['launch'] = null
  if (u.launch) {
    const from = flip
      ? flipForGuestView(u.launch.fromCol, u.launch.fromRow)
      : { col: u.launch.fromCol, row: u.launch.fromRow }
    const to = flip
      ? flipForGuestView(u.launch.toCol, u.launch.toRow)
      : { col: u.launch.toCol, row: u.launch.toRow }
    launch = {
      fromCol: from.col,
      fromRow: from.row,
      toCol: to.col,
      toRow: to.row,
      bornAt: mapTime(u.launch.bornAt, guestNow),
      arriveAt: mapTime(u.launch.arriveAt, guestNow),
      landDamage: u.launch.landDamage,
    }
  }

  const legacyMoving = u.movingUntil == null && u.moving
  const movingUntil =
    u.movingUntil != null ? mapTime(u.movingUntil, guestNow) : legacyMoving ? guestNow + 200 : 0

  return {
    id: u.id,
    charId: u.charId,
    side,
    col: pos.col,
    row: pos.row,
    hp: u.hp,
    maxHp: u.maxHp,
    level: u.level || 1,
    attackIndex: u.attackIndex ?? 0,
    burstShot: u.burstShot ?? 0,
    nextAttackAt: mapTime(u.nextAttackAt, 0),
    vfx: u.vfx,
    vfxUntil: u.vfx ? guestNow + 400 : 0,
    facing: flip ? u.facing + Math.PI : u.facing,
    rootedUntil: 0,
    spawnedAt: mapTime(u.spawnedAt, guestNow),
    enraged: !!u.enraged,
    movingUntil,
    lockKey: null,
    launch,
    nextSpawnAt: u.nextSpawnAt != null ? mapTime(u.nextSpawnAt, guestNow) : undefined,
  }
}

function syncProjectileToBattle(
  p: SyncProjectile,
  flip: boolean,
  guestNow: number,
  hostNow: number,
): Projectile {
  const mapTime = (ts: number) => mapHostPerfTime(ts, hostNow, guestNow)
  const from = flip ? flipForGuestView(p.fromCol, p.fromRow) : { col: p.fromCol, row: p.fromRow }
  const to = flip ? flipForGuestView(p.toCol, p.toRow) : { col: p.toCol, row: p.toRow }
  return {
    id: p.id,
    kind: p.kind,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    damage: p.damage,
    targetId: p.targetId,
    targetTowerId: flip && p.targetTowerId ? flipTowerId(p.targetTowerId) : p.targetTowerId,
    bornAt: mapTime(p.bornAt),
    arriveAt: mapTime(p.arriveAt),
    ownerSide: flip && p.ownerSide ? flipSide(p.ownerSide) : p.ownerSide,
    splashRadius: p.splashRadius,
    splashDamage: p.splashDamage,
  }
}

const ELIXIR_MAX = 10
const PROJECTILE_MS = 480
/** Beans slobber — slow lob that takes a beat to land. */
const SLOBBER_PROJECTILE_MS = 1100
/** Jeremy dual-pistol rounds — very fast. */
const SHOOT_PROJECTILE_MS = 140
/** Michael overhead dumbbell lob — long hang time. */
const DUMBBELL_PROJECTILE_MS = 920
/** Default spell lob when a card omits spellTravelMs. */
const ICE_CREAM_PROJECTILE_MS = 2000
/** Scott Cash Gun bills — medium lob. */
const CASH_PROJECTILE_MS = 700
/** Phil's Car rocket — long hang time. */
const ROCKET_PROJECTILE_MS = 5000
const ROCKET_VFX_MS = 620
/** Steve's Diner pancake stack lob. */
const PANCAKE_PROJECTILE_MS = 850
/** Big Mable Launch flight — ms per tile of knockback (clamped). */
const LAUNCH_MS_PER_TILE = 32
const LAUNCH_FLIGHT_MIN_MS = 520
const LAUNCH_FLIGHT_MAX_MS = 1100
const PANCAKE_SPLAT_MS = 820
const LAG_FRAME_DT = 0.22
const LAG_SYNC_MS = 1400
/** Stay paused this long after lag clears so the match doesn't flicker. */
const LAG_RESUME_HOLD_MS = 900
const LAG_GUEST_REPORT_MS = 700
/** Shay Love heart — drifts slowly toward the target. */
const LOVE_PROJECTILE_MS = 1600
/** Gretchin Witchcraft — medium purple bolt. */
const WITCHCRAFT_PROJECTILE_MS = 520
const WITCHCRAFT_VFX_MS = 560
const WITCHCRAFT_SPLAT_MS = 520
const TOWER_PROJECTILE_MS = 320
const ROOT_VFX_MS = 450
const HUG_VFX_MS = 780
const WHIP_VFX_MS = 860
const KICK_VFX_MS = 780
/** Spirit Jump — arc onto the foe before splash. */
const JUMP_LEAP_MS = 480
const DUMBBELL_VFX_MS = 620
/** Lynne head butt — short so 0.5s cadence feels constant. */
const HEADBUTT_VFX_MS = 480
const LOVE_VFX_MS = 700
const RANGED_VFX_MS = 520
const SPLAT_MS = 820
const SLOBBER_SPLAT_MS = 780
const BOOM_MS = 420
const DUMBBELL_SPLAT_MS = 520
const LOVE_SPLAT_MS = 720
const MELEE_HIT_MS = 420
/** Dan rage heart lifetime on the ground. */
const RAGE_HEART_MS = 3000
const RAGE_HEART_PICKUP = 1.35
/** Default Finley-style rage multipliers when a unit is enraged. */
const RAGE_MOVE_MULT = 2
const RAGE_DAMAGE_MULT = 2

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
const FACING_TURN_HARD_RAD = 0.4

/** Guaranteed-valid enemy spawn tiles (classic half / touchdown third). */
const AI_SAFE_SPAWNS_CLASSIC: { col: number; row: number }[] = [
  { col: 24, row: 42 },
  { col: 76, row: 42 },
  { col: 50, row: 48 },
  { col: 30, row: 55 },
  { col: 70, row: 55 },
  { col: 40, row: 38 },
  { col: 60, row: 38 },
]
const AI_SAFE_SPAWNS_TOUCHDOWN: { col: number; row: number }[] = [
  { col: 25, row: 20 },
  { col: 75, row: 20 },
  { col: 50, row: 28 },
  { col: 35, row: 35 },
  { col: 65, row: 35 },
  { col: 20, row: 40 },
  { col: 80, row: 40 },
]

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
  /** Clash-style lock on a unit id until dead or out of range. */
  lockUnitId: string | null
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
  if (before > 0 && damage > 0) {
    wakeKing(tw, now)
    sfx.towerHit()
  }
}

/** Damage every opposite-side unit (and tower) within radius of an impact point. */
/** Clash-style: airborne (Spirit Jump / Launch) units take no damage until they land. */
function isAirborne(u: BattleUnit): boolean {
  return !!u.launch
}

function applySplashAt(
  units: BattleUnit[],
  towers: TowerHp[],
  ownerSide: Side,
  col: number,
  row: number,
  radius: number,
  damage: number,
  now: number,
  opts?: { excludeUnitId?: string | null; skipTowers?: boolean },
): { unitsChanged: boolean; towersChanged: boolean } {
  let unitsChanged = false
  let towersChanged = false
  for (const u of units) {
    if (u.hp <= 0 || u.side === ownerSide || isAirborne(u)) continue
    if (opts?.excludeUnitId && u.id === opts.excludeUnitId) continue
    const c = unitCenter(u)
    if (dist(c.col, c.row, col, row) <= radius) {
      u.hp -= damage
      unitsChanged = true
    }
  }
  if (!opts?.skipTowers) {
    for (const tw of towers) {
      if (tw.hp <= 0 || tw.side === ownerSide) continue
      const slot = towerSlot(tw.id)
      if (!slot) continue
      if (distToTowerEdge(col, row, slot) <= radius) {
        applyTowerDamage(tw, damage, now)
        towersChanged = true
      }
    }
  }
  return { unitsChanged, towersChanged }
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

/**
 * When a step fails (blocked by enemy tower / clutter), slide sideways until clear.
 * Own towers are passable — this is a backup for river edges and enemy pads.
 */
function nudgeSidewaysIfStuck(
  u: BattleUnit,
  prevCol: number,
  prevRow: number,
  step: number,
  liveTowers: ReadonlySet<string>,
  preferCol?: number,
): void {
  if (Math.hypot(u.col - prevCol, u.row - prevRow) >= 0.002) return
  const prefer = preferCol ?? nearestBridgeMidCol(u.col)
  const primary = Math.sign(prefer - (u.col + 0.5)) || (Math.random() < 0.5 ? 1 : -1)
  const forward = u.side === 'ally' ? -1 : 1
  const tryMove = (dCol: number, dRow: number) => {
    const ncol = Math.max(0, Math.min(ARENA_COLS - 1, u.col + dCol))
    const nrow = Math.max(0, Math.min(ARENA_ROWS - 1, u.row + dRow))
    if (!isWalkableTile(ncol, nrow, liveTowers, u.side)) return false
    u.col = ncol
    u.row = nrow
    return true
  }
  // Sweep sideways in increasing steps until we actually move.
  for (const dir of [primary, -primary]) {
    for (const mult of [1.2, 2.2, 3.5, 5.5, 8]) {
      if (tryMove(dir * Math.max(step, 0.08) * mult, 0)) return
      if (tryMove(dir * Math.max(step, 0.08) * mult, forward * step * 0.75)) return
      if (tryMove(dir * Math.max(step, 0.08) * mult, forward * step * 1.4)) return
    }
  }
  // Jump clear of the nearest opposing tower's front corner.
  let nearest: (typeof TOWERS)[number] | null = null
  let nearestD = Infinity
  for (const t of TOWERS) {
    if (t.side === u.side) continue
    if (!liveTowers.has(t.id)) continue
    const d = distToTowerEdge(u.col + 0.5, u.row + 0.5, t)
    if (d < nearestD) {
      nearestD = d
      nearest = t
    }
  }
  if (!nearest || nearestD > 5) return
  const engage = towerFrontEngagePoint(u.col + 0.5, u.row + 0.5, nearest)
  const left = nearest.col - 2.2
  const right = nearest.col + nearest.w + 2.2
  const sideCol = Math.abs(u.col - left) <= Math.abs(u.col - right) ? left : right
  for (const candidate of [
    { col: engage.col, row: engage.row },
    { col: sideCol, row: engage.row },
    { col: sideCol, row: u.row + forward * 2 },
  ]) {
    if (isWalkableTile(candidate.col, candidate.row, liveTowers, u.side)) {
      u.col = Math.max(0, Math.min(ARENA_COLS - 1, candidate.col))
      u.row = Math.max(0, Math.min(ARENA_ROWS - 1, candidate.row))
      return
    }
  }
}

function makeBattleUnit(
  char: CharacterDef,
  col: number,
  row: number,
  side: Side,
  t: number,
  level = 1,
): BattleUnit {
  const clampedCol = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const clampedRow = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  const hp = Math.max(1, scaledStat(Math.max(1, char.hp), level))
  const everySec = char.spawnEverySec ?? 0
  const deployMs = (char.deployDelaySec ?? 0) * 1000
  return {
    id: nid('u'),
    charId: char.id,
    side,
    col: clampedCol,
    row: clampedRow,
    hp,
    maxHp: hp,
    level,
    attackIndex: 0,
    burstShot: 0,
    // Deploy warmup (Phil's Car X-Bow-style) or ready immediately.
    nextAttackAt: deployMs > 0 ? t + deployMs : 0,
    vfx: null,
    vfxUntil: 0,
    facing: side === 'ally' ? -Math.PI / 2 : Math.PI / 2,
    rootedUntil: 0,
    spawnedAt: t,
    enraged: false,
    movingUntil: 0,
    lockKey: null,
    launch: null,
    nextSpawnAt: isBuildingCard(char) && everySec > 0 ? t + everySec * 1000 : undefined,
  }
}

function spawnOffsetNear(col: number, row: number, side: Side): { col: number; row: number } {
  const forward = side === 'ally' ? -1 : 1
  return {
    col: Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col))),
    row: Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row + forward * 2))),
  }
}

function spawnDogFromBuilding(
  hut: BattleUnit,
  t: number,
  into: BattleUnit[],
): BattleUnit | null {
  const hutDef = getCharacter(hut.charId)
  const dogId = pickSpawnFromPool(hutDef?.spawnPool)
  if (!dogId) return null
  const dog = getCharacter(dogId)
  if (!dog) return null
  const pos = spawnOffsetNear(hut.col, hut.row, hut.side)
  const pup = makeBattleUnit(dog, pos.col, pos.row, hut.side, t, hut.level)
  into.push(pup)
  return pup
}

function kingThrowPoint(side: Side): { col: number; row: number } {
  const id = side === 'ally' ? 'ally-king' : 'enemy-king'
  const king = TOWERS.find((tw) => tw.id === id) ?? TOWERS[0]!
  return { col: king.col + king.w / 2, row: king.row + king.h / 2 }
}

function makeSpellProjectile(
  char: CharacterDef,
  side: Side,
  col: number,
  row: number,
  t: number,
  level: number,
): Projectile | null {
  if (!isSpellCard(char)) return null
  const damage = scaledStat(char.spellDamage ?? 0, level)
  const radius = char.spellRadius ?? 0
  if (damage <= 0 || radius <= 0) return null
  const from = kingThrowPoint(side)
  const travel = char.spellTravelMs ?? ICE_CREAM_PROJECTILE_MS
  const kind =
    char.id === 'bobbySpecial' ? 'football' : char.id === 'footballHuck' ? 'baseball' : 'iceCream'
  return {
    id: nid('spell'),
    kind,
    fromCol: from.col,
    fromRow: from.row,
    // Keep float aim so impact / AoE ring centers on where the attack landed.
    toCol: Math.max(0, Math.min(ARENA_COLS - 1, col)),
    toRow: Math.max(0, Math.min(ARENA_ROWS - 1, row)),
    damage,
    targetId: null,
    targetTowerId: null,
    bornAt: t,
    arriveAt: t + travel,
    ownerSide: side,
    splashRadius: radius,
  }
}

function castSpellProjectile(
  char: CharacterDef,
  side: Side,
  col: number,
  row: number,
  t: number,
  level: number,
  into: Projectile[],
): boolean {
  const projectile = makeSpellProjectile(char, side, col, row, t, level)
  if (!projectile) return false
  into.push(projectile)
  return true
}

function pickAiSpellTarget(
  units: BattleUnit[],
  towers: TowerHp[],
  side: Side,
): { col: number; row: number } | null {
  const targetSide: Side = side === 'enemy' ? 'ally' : 'enemy'
  const foes = units.filter(
    (u) => u.side === targetSide && u.hp > 0 && !isAirborne(u),
  )
  if (foes.length > 0) {
    const avg = foes.reduce(
      (acc, u) => ({ col: acc.col + u.col, row: acc.row + u.row }),
      { col: 0, row: 0 },
    )
    return {
      col: Math.max(0, Math.min(ARENA_COLS - 1, avg.col / foes.length)),
      row: Math.max(0, Math.min(ARENA_ROWS - 1, avg.row / foes.length)),
    }
  }

  const tower = towers.find((tw) => tw.side === targetSide && tw.hp > 0)
  if (tower) {
    const slot = towerSlot(tower.id)
    if (slot) {
      return { col: slot.col + slot.w / 2, row: slot.row + slot.h / 2 }
    }
  }

  return {
    col: ARENA_COLS / 2,
    row: side === 'enemy' ? 10 : ARENA_ROWS - 10,
  }
}

function canSpawnAt(
  col: number,
  row: number,
  side: Side,
  towers: TowerHp[],
  live: ReadonlySet<string>,
  mode: GameMode = 'classic',
): boolean {
  const clampedCol = Math.max(0, Math.min(ARENA_COLS - 1, Math.floor(col)))
  const clampedRow = Math.max(0, Math.min(ARENA_ROWS - 1, Math.floor(row)))
  if (mode === 'touchdown') {
    return canDeployTouchdownAt(clampedCol, clampedRow, side, live)
  }
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
  botLevel: number,
  mode: GameMode = 'classic',
  deckIds: string[] = [],
): { unit: BattleUnit | null; elixir: number; deckIndex: number; projectile?: Projectile | null } {
  const lane = pickAiLane(units)
  const colBase = lane === 'left' ? 18 : 70
  const colSpan = 14
  const rowBase = mode === 'touchdown' ? 8 : 28
  const rowSpan = mode === 'touchdown' ? 38 : 40
  // Fixed match deck only — never re-roll from the full roster mid-battle.
  const deck = deckIds.length > 0 ? deckIds : randomBotDeck()
  const safeSpawns = mode === 'touchdown' ? AI_SAFE_SPAWNS_TOUCHDOWN : AI_SAFE_SPAWNS_CLASSIC
  if (deck.length === 0) return { unit: null, elixir: enemyElixir, deckIndex }

  // Cycle the 8-card deck in order (Clash-style). Skip unaffordable / unsplaceable.
  for (let attempt = 0; attempt < deck.length; attempt++) {
    const idx = (deckIndex + attempt) % deck.length
    const charId = deck[idx]!
    const char = getCharacter(charId)
    if (!char || enemyElixir < char.elixir) continue

    if (isSpellCard(char)) {
      const target = pickAiSpellTarget(units, towers, 'enemy')
      if (!target) continue
      const projectile = makeSpellProjectile(char, 'enemy', target.col, target.row, t, botLevel)
      if (!projectile) continue
      return {
        unit: null,
        projectile,
        elixir: enemyElixir - char.elixir,
        deckIndex: (idx + 1) % deck.length,
      }
    }

    for (let tileTry = 0; tileTry < 10; tileTry++) {
      const col = colBase + Math.floor(Math.random() * colSpan)
      const row = rowBase + Math.floor(Math.random() * rowSpan)
      if (!canSpawnAt(col, row, 'enemy', towers, live, mode)) continue
      return {
        unit: makeBattleUnit(char, col, row, 'enemy', t, botLevel),
        elixir: enemyElixir - char.elixir,
        deckIndex: (idx + 1) % deck.length,
      }
    }

    for (const spot of safeSpawns) {
      if (!canSpawnAt(spot.col, spot.row, 'enemy', towers, live, mode)) continue
      return {
        unit: makeBattleUnit(char, spot.col, spot.row, 'enemy', t, botLevel),
        elixir: enemyElixir - char.elixir,
        deckIndex: (idx + 1) % deck.length,
      }
    }
  }

  return { unit: null, elixir: enemyElixir, deckIndex }
}

/** Move with river + enemy-tower collision — own towers are passable. */
function stepUnit(
  u: { col: number; row: number; side: Side },
  dCol: number,
  dRow: number,
  liveTowers: ReadonlySet<string>,
  openField = false,
): { col: number; row: number } {
  const walk = (c: number, r: number) =>
    openField
      ? c >= 0 && c < ARENA_COLS && r >= 0 && r < ARENA_ROWS
      : isWalkableTile(c, r, liveTowers, u.side)
  let nc = Math.max(0, Math.min(ARENA_COLS - 1, u.col + dCol))
  let nr = Math.max(0, Math.min(ARENA_ROWS - 1, u.row + dRow))

  if (walk(nc, nr)) {
    return { col: nc, row: nr }
  }

  // Prefer sideways slide when forward is blocked (never sit jammed on a pad).
  if (walk(nc, u.row)) {
    return { col: nc, row: u.row }
  }
  if (walk(u.col, nr)) {
    return { col: u.col, row: nr }
  }

  const midC = Math.floor(nc)
  const midR = Math.floor(nr)
  if (
    !openField &&
    (isRiverTile(midR, midC) ||
      isRiverTile(Math.floor(u.row), midC) ||
      isRiverTile(midR, Math.floor(u.col)))
  ) {
    const bridgeCol = nearestBridgeMidCol(u.col)
    const towardBridge = Math.sign(bridgeCol - u.col) || (dCol >= 0 ? 1 : -1)
    const sideStep = Math.max(Math.abs(dCol), Math.abs(dRow), 0.12)
    for (const mult of [1, 2, 3.5, 5]) {
      nc = Math.max(0, Math.min(ARENA_COLS - 1, u.col + towardBridge * sideStep * mult))
      if (walk(nc, u.row)) {
        return { col: nc, row: u.row }
      }
      if (walk(nc, nr)) {
        return { col: nc, row: nr }
      }
    }
  }

  // Stuck — slide perpendicular until free.
  const step = Math.max(Math.abs(dCol), Math.abs(dRow), 0.08)
  const len = Math.hypot(dCol, dRow) || 1
  const px = (-dRow / len) * step
  const py = (dCol / len) * step
  for (const sign of [1, -1] as const) {
    for (const mult of [1, 2, 3.5, 5.5]) {
      const sc = Math.max(0, Math.min(ARENA_COLS - 1, u.col + px * sign * mult))
      const sr = Math.max(0, Math.min(ARENA_ROWS - 1, u.row + py * sign * mult))
      if (walk(sc, sr)) {
        return { col: sc, row: sr }
      }
      if (walk(sc, u.row)) {
        return { col: sc, row: u.row }
      }
      if (walk(u.col, sr)) {
        return { col: u.col, row: sr }
      }
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
    if (a.hp <= 0 || a.launch) continue
    for (let j = i + 1; j < n; j++) {
      const b = units[j]!
      if (b.hp <= 0 || b.launch) continue
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
    const ejected = ejectFromTowers(u.col, u.row, liveTowers, u.side)
    u.col = ejected.col
    u.row = ejected.row
  }
  return true
}

/** Only eject from enemy towers — own pads are passable. Prefer river-facing front. */
function ejectFromTowers(
  col: number,
  row: number,
  liveTowers: ReadonlySet<string>,
  side: Side,
): { col: number; row: number } {
  for (const t of TOWERS) {
    if (t.side === side) continue
    if (!liveTowers.has(t.id)) continue
    if (!isInsideTower(col, row, t) && !isInsideTower(col + 0.5, row + 0.5, t)) continue
    // Push out toward the front face so melee stays in front of the tower.
    const engage = towerFrontEngagePoint(col + 0.5, row + 0.5, t)
    if (isWalkableTile(engage.col, engage.row, liveTowers, side)) {
      return {
        col: Math.max(0, Math.min(ARENA_COLS - 1, engage.col)),
        row: Math.max(0, Math.min(ARENA_ROWS - 1, engage.row)),
      }
    }
    const cx = t.col + t.w / 2
    const cy = t.row + t.h / 2
    const ox = col + 0.5 - cx
    const oy = row + 0.5 - cy
    const ol = Math.hypot(ox, oy) || 1
    const edge = closestPointOnTower(col + 0.5, row + 0.5, t)
    return {
      col: Math.max(0, Math.min(ARENA_COLS - 1, edge.col + (ox / ol) * 0.7 - 0.5)),
      row: Math.max(0, Math.min(ARENA_ROWS - 1, edge.row + (oy / ol) * 0.7 - 0.5)),
    }
  }
  return { col, row }
}

function towerInMeleeRange(col: number, row: number, slot: (typeof TOWERS)[number], range: number): boolean {
  if (!isOnTowerFrontSide(col, row, slot)) return false
  return distUnitTileToTower(col, row, slot) <= range + 0.35
}

let seq = 0
function nid(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

export function useBattle(opts?: {
  paused?: boolean
  /** Ally card levels by charId */
  allyLevels?: Record<string, number>
  /** Enemy bot card level (all units) */
  botLevel?: number
  /** Player trophies — scales AI cadence / elixir on trophy road. */
  trophies?: number
  mode?: GameMode
  /** Overtime — elixir regen uses OT multiplier. */
  overtime?: boolean
  /** Cards the AI may play (touchdown draft). */
  enemyDeckIds?: string[]
  /** Friend battle: host sim + guest mirror over ntfy. */
  net?: BattleNet | null
  /** Guest never got host state — App should drop net / fall back. */
  onPeerLinkFailed?: () => void
}) {
  const mode = opts?.mode ?? 'classic'
  const overtime = !!opts?.overtime
  const net = opts?.net ?? null
  const aiProfile = botAiProfile(opts?.trophies ?? 0)
  const botLevel = opts?.botLevel ?? aiProfile.level
  const elixirMult = elixirMultiplier(mode, overtime)
  const elixirMultRef = useRef(elixirMult)
  elixirMultRef.current = elixirMult
  const overtimeRef = useRef(overtime)
  overtimeRef.current = overtime
  const [elixir, setElixir] = useState(5)
  const [enemyElixir, setEnemyElixir] = useState(() =>
    net ? 5 : aiProfile.startElixir,
  )
  const [remoteOvertime, setRemoteOvertime] = useState(false)
  const [lagging, setLagging] = useState(false)
  const [units, setUnits] = useState<BattleUnit[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [splats, setSplats] = useState<SplatFx[]>([])
  const [hearts, setHearts] = useState<RageHeart[]>([])
  const [allyScore, setAllyScore] = useState(0)
  const [enemyScore, setEnemyScore] = useState(0)
  const [syncReady, setSyncReady] = useState(!net)
  /** Host: true once guest has announced. Guest/spectator: follows syncReady. */
  const [peerJoined, setPeerJoined] = useState(() => !net || net.role !== 'host')
  const peerJoinedRef = useRef(peerJoined)
  peerJoinedRef.current = peerJoined
  const [clockSec, setClockSec] = useState(() => regulationSeconds(mode))
  const clockSecRef = useRef(clockSec)
  clockSecRef.current = clockSec
  const [towers, setTowers] = useState<TowerHp[]>(() =>
    TOWERS.map((t) => {
      const maxHp = towerMaxHp(t.kind)
      const dead = mode === 'touchdown'
      return {
        id: t.id,
        hp: dead ? 0 : maxHp,
        maxHp,
        side: t.side,
        kind: t.kind,
        activated: t.kind === 'princess',
        fireReadyAt: 0,
        nextShotAt: 0,
        lockUnitId: null,
      }
    }),
  )
  const [selectedCharId, setSelectedCharId] = useState<string | null>('phil')
  const [now, setNow] = useState(() => performance.now())
  const pausedRef = useRef(!!opts?.paused)
  pausedRef.current = !!opts?.paused
  const allyLevelsRef = useRef(opts?.allyLevels ?? {})
  allyLevelsRef.current = opts?.allyLevels ?? {}
  const botLevelRef = useRef(botLevel)
  botLevelRef.current = botLevel
  const modeRef = useRef<GameMode>(mode)
  modeRef.current = mode
  const aiProfileRef = useRef(aiProfile)
  aiProfileRef.current = botAiProfile(opts?.trophies ?? 0)
  /**
   * Solo CPU deck locked for this battle instance: 8 random cards from all CHARACTERS.
   * BattleScreen remounts each match (battleSession key) so this re-rolls every game.
   * Do not reassign every render — that used to thrash the deck.
   */
  const enemyDeckRef = useRef(
    uniqueDeckFrom(
      opts?.enemyDeckIds && opts.enemyDeckIds.length > 0
        ? opts.enemyDeckIds
        : randomBotDeck(DECK_SIZE),
    ),
  )
  const netRef = useRef(net)
  netRef.current = net
  /** Tracks live net role; must clear when net drops so bot AI can run. */
  const liveRoleRef = useRef<BattleNet['role'] | null>(net?.role ?? null)
  if (!net) liveRoleRef.current = null
  else if (net.role === 'spectator') liveRoleRef.current = 'spectator'
  else if (liveRoleRef.current == null) liveRoleRef.current = net.role
  const allyScoreRef = useRef(0)
  const enemyScoreRef = useRef(0)
  const syncSeqRef = useRef(0)
  const lastSyncAtRef = useRef(0)
  const lastRemoteSeqRef = useRef(0)
  const lastRemoteAtRef = useRef(Date.now())
  const lagStreakRef = useRef(0)
  /** Local lag signal (frame hitch / quiet sync). */
  const localLaggingRef = useRef(false)
  /** Guest-reported lag (host only). */
  const guestLaggingRef = useRef(false)
  /** Combined friend-match freeze. */
  const lagPauseRef = useRef(false)
  const lagClearSinceRef = useRef<number | null>(null)
  const lastGuestLagSentRef = useRef(false)
  const lastGuestLagAtRef = useRef(0)
  const pendingGuestDeploysRef = useRef<
    { charId: string; col: number; row: number; at: number }[]
  >([])

  const unitsRef = useRef(units)
  const towersRef = useRef(towers)
  const projectilesRef = useRef(projectiles)
  const splatsRef = useRef(splats)
  const heartsRef = useRef(hearts)
  const elixirRef = useRef(elixir)
  const enemyElixirRef = useRef(enemyElixir)
  const aiDeckIndexRef = useRef(0)
  const aiNextDeployRef = useRef(performance.now() + 600)
  unitsRef.current = units
  towersRef.current = towers
  projectilesRef.current = projectiles
  splatsRef.current = splats
  heartsRef.current = hearts
  elixirRef.current = elixir
  enemyElixirRef.current = enemyElixir

  const publishHostState = useCallback((force = false) => {
    const n = netRef.current
    if (!n || (liveRoleRef.current ?? n.role) !== 'host') return
    const t = performance.now()
    if (!force && t - lastSyncAtRef.current < SYNC_INTERVAL_MS) return
    lastSyncAtRef.current = t
    syncSeqRef.current += 1
    const msg: BattleRoomMessage = {
      type: 'battle_state',
      challengeId: n.challengeId,
      seq: syncSeqRef.current,
      hostNow: t,
      hostElixir: elixirRef.current,
      guestElixir: enemyElixirRef.current,
      towers: towersRef.current.map((tw) => ({
        id: tw.id,
        hp: tw.hp,
        maxHp: tw.maxHp,
        activated: tw.activated,
      })),
      units: unitsRef.current.map((u) => ({
        id: u.id,
        charId: u.charId,
        side: u.side,
        col: u.col,
        row: u.row,
        hp: u.hp,
        maxHp: u.maxHp,
        facing: u.facing,
        vfx: u.vfx,
        enraged: u.enraged,
        movingUntil: u.movingUntil > t ? u.movingUntil : 0,
        level: u.level,
        spawnedAt: u.spawnedAt,
        nextAttackAt: u.nextAttackAt,
        attackIndex: u.attackIndex,
        burstShot: u.burstShot,
        nextSpawnAt: u.nextSpawnAt,
        launch: u.launch
          ? {
              fromCol: u.launch.fromCol,
              fromRow: u.launch.fromRow,
              toCol: u.launch.toCol,
              toRow: u.launch.toRow,
              bornAt: u.launch.bornAt,
              arriveAt: u.launch.arriveAt,
              landDamage: u.launch.landDamage,
            }
          : null,
      })),
      projectiles: projectilesRef.current.map((p) => ({
        id: p.id,
        kind: p.kind,
        fromCol: p.fromCol,
        fromRow: p.fromRow,
        toCol: p.toCol,
        toRow: p.toRow,
        damage: p.damage,
        targetId: p.targetId,
        targetTowerId: p.targetTowerId,
        bornAt: p.bornAt,
        arriveAt: p.arriveAt,
        ownerSide: p.ownerSide,
        splashRadius: p.splashRadius,
        splashDamage: p.splashDamage,
      })),
      allyScore: allyScoreRef.current,
      enemyScore: enemyScoreRef.current,
      clockSec: clockSecRef.current,
      overtime: overtimeRef.current,
      peerJoined: peerJoinedRef.current,
      lagPause: lagPauseRef.current,
    }
    void publishBattle(n.challengeId, msg)
  }, [])

  const deploy = useCallback(
    (char: CharacterDef, col: number, row: number) => {
      if (pausedRef.current || lagPauseRef.current) return false
      const n0 = netRef.current
      const role0 = liveRoleRef.current ?? n0?.role
      if (role0 === 'spectator') return false
      if (elixirRef.current < char.elixir) return false
      const live = liveTowerIdSet(towersRef.current)
      const spell = isSpellCard(char)
      if (
        !spell &&
        !canSpawnAt(col, row, 'ally', towersRef.current, live, modeRef.current)
      ) {
        return false
      }
      if (
        spell &&
        (col < 0 || col >= ARENA_COLS || row < 0 || row >= ARENA_ROWS)
      ) {
        return false
      }

      const n = netRef.current
      const role = liveRoleRef.current ?? n?.role
      if (n && role === 'guest') {
        // Optimistic elixir; host confirms via mirrored state.
        setElixir((e) => Math.max(0, e - char.elixir))
        if (spell) {
          // Local VFX only — host applies the real splash damage.
          const spawnT = performance.now()
          const level = allyLevelsRef.current[char.id] ?? 1
          setProjectiles((prev) => {
            const next = prev.slice()
            castSpellProjectile(char, 'ally', col, row, spawnT, level, next)
            return next
          })
        }
        void publishBattle(n.challengeId, {
          type: 'battle_deploy',
          challengeId: n.challengeId,
          charId: char.id,
          col,
          row,
          at: Date.now(),
        })
        return true
      }

      const spawnT = performance.now()
      const level = allyLevelsRef.current[char.id] ?? 1
      setElixir((e) => e - char.elixir)
      if (spell) {
        setProjectiles((prev) => {
          const next = prev.slice()
          castSpellProjectile(char, 'ally', col, row, spawnT, level, next)
          return next
        })
      } else {
        setUnits((prev) => {
          const next = [...prev]
          const hut = makeBattleUnit(char, col, row, 'ally', spawnT, level)
          next.push(hut)
          if (isBuildingCard(char) && char.spawnPool?.length) {
            spawnDogFromBuilding(hut, spawnT, next)
          }
          return next
        })
      }
      if (role === 'host') {
        // Push immediately so guest sees the troop without waiting for the tick.
        queueMicrotask(() => publishHostState(true))
      }
      return true
    },
    [publishHostState],
  )

  // Friend-battle room: host publishes state; guest mirrors + sends deploys.
  // Keep onPeerLinkFailed in a ref so App re-renders don't rebind the room
  // (that was resetting peerJoined and flashing "Waiting for friend…").
  const onPeerLinkFailedRef = useRef(opts?.onPeerLinkFailed)
  onPeerLinkFailedRef.current = opts?.onPeerLinkFailed

  useEffect(() => {
    if (!net) return
    liveRoleRef.current = net.role
    lastRemoteSeqRef.current = 0
    lastRemoteAtRef.current = 0
    setSyncReady(false)
    // Reset join latch only when entering a new room.
    if (net.role === 'host') {
      setPeerJoined(false)
      peerJoinedRef.current = false
    } else {
      setPeerJoined(true)
      peerJoinedRef.current = true
    }

    const announceGuest = () => {
      const name = loadPlayerName().trim() || 'Player'
      void publishBattle(net.challengeId, {
        type: 'battle_peer_accept',
        challengeId: net.challengeId,
        fromName: name,
        fromPlayerId: loadPlayerId(),
        at: new Date().toISOString(),
      })
      void publishBattle(net.challengeId, {
        type: 'battle_ready',
        challengeId: net.challengeId,
        role: 'guest',
        name,
        at: new Date().toISOString(),
      })
    }

    const unsub = subscribeBattle(net.challengeId, (msg) => {
      const role = liveRoleRef.current

      if (msg.type === 'battle_peer_accept' || msg.type === 'battle_ready') {
        lastRemoteAtRef.current = Date.now()
        if (role === 'host') {
          if (msg.type === 'battle_peer_accept' || msg.role === 'guest') {
            setPeerJoined(true)
            peerJoinedRef.current = true
          }
          publishHostState(true)
        }
        return
      }

      if (msg.type === 'battle_deploy' && role === 'host') {
        lastRemoteAtRef.current = Date.now()
        setPeerJoined(true)
        peerJoinedRef.current = true
        pendingGuestDeploysRef.current.push({
          charId: msg.charId,
          col: msg.col,
          row: msg.row,
          at: msg.at,
        })
        return
      }

      if (msg.type === 'battle_lag' && role === 'host') {
        lastRemoteAtRef.current = Date.now()
        guestLaggingRef.current = !!msg.lagging
        if (msg.lagging) {
          lagPauseRef.current = true
          lagClearSinceRef.current = null
          setLagging(true)
          publishHostState(true)
        }
        return
      }

      if (
        msg.type === 'battle_state' &&
        (role === 'guest' || role === 'spectator')
      ) {
        if (msg.seq <= lastRemoteSeqRef.current) return
        lastRemoteSeqRef.current = msg.seq
        lastRemoteAtRef.current = Date.now()
        if (typeof msg.lagPause === 'boolean') {
          lagPauseRef.current = msg.lagPause
          if (msg.lagPause) lagClearSinceRef.current = null
          setLagging((prev) => {
            const next = msg.lagPause || localLaggingRef.current
            return prev === next ? prev : next
          })
        }
        const t = performance.now()
        const flip =
          role === 'guest' || (role === 'spectator' && net.viewAs === 'guest')
        const hostNow = msg.hostNow ?? t
        const nextTowers = towersRef.current.map((tw) => {
          const remoteId = flip ? flipTowerId(tw.id) : tw.id
          const remote = msg.towers.find((x) => x.id === remoteId)
          if (!remote) return tw
          return {
            ...tw,
            hp: remote.hp,
            maxHp: remote.maxHp,
            activated:
              remote.hp > 0
                ? (remote.activated ?? tw.activated) || tw.kind === 'princess'
                : false,
          }
        })
        const nextUnits: BattleUnit[] = msg.units.map((u) =>
          syncUnitToBattle(u, flip, t, hostNow),
        )
        towersRef.current = nextTowers
        unitsRef.current = nextUnits
        setTowers(nextTowers)
        setUnits(nextUnits)
        if (msg.projectiles) {
          const nextProjectiles = msg.projectiles.map((p) =>
            syncProjectileToBattle(p, flip, t, hostNow),
          )
          projectilesRef.current = nextProjectiles
          setProjectiles(nextProjectiles)
        }
        if (flip) {
          setElixir(msg.guestElixir)
          setEnemyElixir(msg.hostElixir)
        } else {
          setElixir(msg.hostElixir)
          setEnemyElixir(msg.guestElixir)
        }
        if (typeof msg.allyScore === 'number') {
          if (flip) {
            allyScoreRef.current = msg.enemyScore ?? 0
            enemyScoreRef.current = msg.allyScore
          } else {
            allyScoreRef.current = msg.allyScore
            enemyScoreRef.current = msg.enemyScore ?? 0
          }
          setAllyScore(allyScoreRef.current)
          setEnemyScore(enemyScoreRef.current)
        }
        if (typeof msg.clockSec === 'number') {
          clockSecRef.current = msg.clockSec
          setClockSec(msg.clockSec)
        }
        if (typeof msg.overtime === 'boolean') {
          setRemoteOvertime(msg.overtime)
        }
        setSyncReady(true)
        setPeerJoined(true)
      }
    })

    let announceTimer = 0
    let failTimer = 0
    let hostBurst = 0
    if (net.role === 'guest') {
      announceGuest()
      announceTimer = window.setInterval(announceGuest, 700)
      // Host never published state — give up after a long wait (keep trying hard first).
      failTimer = window.setTimeout(() => {
        if (liveRoleRef.current !== 'guest') return
        if (lastRemoteSeqRef.current > 0) return
        onPeerLinkFailedRef.current?.()
      }, mode === 'touchdown' || mode === 'draft' || mode === 'undraft' || mode === 'infiniteElixir'
        ? 90_000
        : 28_000)
    }

    if (net.role === 'host' || net.role === 'guest') {
      void publishBattle(net.challengeId, {
        type: 'battle_ready',
        challengeId: net.challengeId,
        role: net.role,
        name: loadPlayerName().trim() || net.role,
        at: new Date().toISOString(),
      })
    }
    if (net.role === 'host') {
      // Publish the empty board immediately so an accepting guest can link from cache.
      // Do NOT clear peerJoined here on re-entry — that flashes the waiting overlay.
      publishHostState(true)
      hostBurst = window.setInterval(() => publishHostState(true), 450)
      window.setTimeout(() => window.clearInterval(hostBurst), 20_000)
    }

    return () => {
      unsub()
      if (announceTimer) window.clearInterval(announceTimer)
      if (failTimer) window.clearTimeout(failTimer)
      if (hostBurst) window.clearInterval(hostBurst)
    }
  }, [net?.challengeId, net?.role, net?.viewAs, publishHostState])

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (t: number) => {
      const rawDt = (t - last) / 1000
      const dt = Math.min(0.05, rawDt)
      last = t
      setNow(t)

      if (pausedRef.current) {
        raf = requestAnimationFrame(tick)
        return
      }

      // Friend match: freeze the sim until both sides are linked (clock stays synced).
      const roleNow = liveRoleRef.current ?? netRef.current?.role
      const linked =
        !netRef.current ||
        (roleNow === 'guest' || roleNow === 'spectator'
          ? lastRemoteSeqRef.current > 0
          : peerJoinedRef.current)
      if (netRef.current && !linked) {
        if (roleNow === 'host') publishHostState(false)
        raf = requestAnimationFrame(tick)
        return
      }

      // Lag indicator: long frames, or friend-battle sync going quiet.
      if (rawDt > LAG_FRAME_DT) lagStreakRef.current = Math.min(12, lagStreakRef.current + 2)
      else lagStreakRef.current = Math.max(0, lagStreakRef.current - 1)
      let syncLag = false
      if (roleNow === 'guest' || roleNow === 'spectator') {
        // Don't flash LAG while still linking — wait until we've received a frame.
        syncLag =
          lastRemoteSeqRef.current > 0 &&
          Date.now() - lastRemoteAtRef.current > LAG_SYNC_MS
      } else if (roleNow === 'host' && netRef.current) {
        syncLag =
          pendingGuestDeploysRef.current.length > 2 ||
          (Date.now() - lastRemoteAtRef.current > LAG_SYNC_MS * 2 &&
            lastRemoteSeqRef.current > 0)
      }
      const localLag = lagStreakRef.current >= 4 || syncLag
      localLaggingRef.current = localLag

      // Friend match: pause both sides while either player is lagging.
      if (netRef.current && roleNow !== 'spectator') {
        const nowMs = Date.now()
        if (roleNow === 'guest') {
          const shouldReport =
            localLag !== lastGuestLagSentRef.current ||
            nowMs - lastGuestLagAtRef.current > LAG_GUEST_REPORT_MS
          if (shouldReport) {
            lastGuestLagSentRef.current = localLag
            lastGuestLagAtRef.current = nowMs
            void publishBattle(netRef.current.challengeId, {
              type: 'battle_lag',
              challengeId: netRef.current.challengeId,
              lagging: localLag,
              at: nowMs,
            })
          }
          // Guest also freezes on local hitch / quiet sync until host confirms clear.
          if (localLag) {
            lagPauseRef.current = true
            lagClearSinceRef.current = null
          } else if (!lagPauseRef.current) {
            // host lagPause already applied via battle_state
          } else if (!localLag && lagPauseRef.current) {
            // Wait for host lagPause=false; keep overlay until then.
          }
        } else if (roleNow === 'host') {
          const rawPause = localLag || guestLaggingRef.current
          if (rawPause) {
            lagPauseRef.current = true
            lagClearSinceRef.current = null
          } else if (lagPauseRef.current) {
            if (lagClearSinceRef.current == null) lagClearSinceRef.current = nowMs
            if (nowMs - lagClearSinceRef.current >= LAG_RESUME_HOLD_MS) {
              lagPauseRef.current = false
              lagClearSinceRef.current = null
            }
          }
        }

        const showLag = lagPauseRef.current || localLag
        setLagging((prev) => (prev === showLag ? prev : showLag))

        if (lagPauseRef.current) {
          if (roleNow === 'host') publishHostState(false)
          raf = requestAnimationFrame(tick)
          return
        }
      } else {
        const showLag =
          !!netRef.current && roleNow === 'spectator'
            ? lagPauseRef.current || localLag
            : localLag
        setLagging((prev) => (prev === showLag ? prev : showLag))
      }

      // Guest / spectator only mirrors host state — do not run a second local sim.
      // Still advance local spell VFX (sundae throw) so casts feel responsive.
      if (roleNow === 'guest' || roleNow === 'spectator') {
        let nextProjectiles = projectilesRef.current.slice()
        let nextSplats = splatsRef.current.filter((s) => t - s.bornAt < 900)
        let projectilesChanged = false
        let splatsChanged = nextSplats.length !== splatsRef.current.length
        const stillFlying: Projectile[] = []
        for (const p of nextProjectiles) {
          if (t < p.arriveAt) {
            stillFlying.push(p)
            continue
          }
          projectilesChanged = true
          if (p.kind === 'iceCream' || p.kind === 'football' || p.kind === 'baseball') {
            nextSplats.push({
              id: nid('spellfx'),
              col: p.toCol,
              row: p.toRow,
              bornAt: t,
              kind: p.kind,
              radius: p.splashRadius,
            })
            splatsChanged = true
          }
        }
        nextProjectiles = stillFlying
        if (projectilesChanged) setProjectiles(nextProjectiles)
        if (splatsChanged) setSplats(nextSplats)
        raf = requestAnimationFrame(tick)
        return
      }

      const regen = BASE_ELIXIR_PER_SEC * elixirMultRef.current
      setElixir((e) => Math.min(ELIXIR_MAX, e + regen * dt))
      const enemyRegen =
        BASE_ELIXIR_PER_SEC *
        elixirMultRef.current *
        (netRef.current ? 1 : aiProfileRef.current.elixirMult)
      let nextEnemyElixir = Math.min(
        ELIXIR_MAX,
        enemyElixirRef.current + enemyRegen * dt,
      )
      let enemyElixirChanged = nextEnemyElixir !== enemyElixirRef.current

      let nextProjectiles = projectilesRef.current.slice()
      let nextSplats = splatsRef.current.filter((s) => {
        const life =
          s.kind === 'boom'
            ? BOOM_MS
            : s.kind === 'dumbbell'
              ? DUMBBELL_SPLAT_MS
              : s.kind === 'slobber'
                ? SLOBBER_SPLAT_MS
                : s.kind === 'love'
                  ? LOVE_SPLAT_MS
                  : s.kind === 'witchcraft'
                    ? WITCHCRAFT_SPLAT_MS
                  : s.kind === 'pancake'
                    ? PANCAKE_SPLAT_MS
                  : s.kind === 'iceCream'
                    ? 900
                  : s.kind === 'melee' ||
                      s.kind === 'whip' ||
                      s.kind === 'bite' ||
                      s.kind === 'kick' ||
                      s.kind === 'hug' ||
                      s.kind === 'uppercut' ||
                      s.kind === 'jump'
                    ? MELEE_HIT_MS
                    : SPLAT_MS
        return t - s.bornAt < life
      })
      let nextUnits = unitsRef.current.map((u) => ({ ...u }))
      let nextTowers = towersRef.current.map((tw) => ({ ...tw }))
      let nextHearts = heartsRef.current.filter((h) => t - h.bornAt < RAGE_HEART_MS)
      let unitsChanged = false
      let towersChanged = false
      let projectilesChanged = false
      let heartsChanged = nextHearts.length !== heartsRef.current.length
      let splatsChanged = nextSplats.length !== splatsRef.current.length

      const stillFlying: Projectile[] = []
      for (const p of nextProjectiles) {
        if (t < p.arriveAt) {
          stillFlying.push(p)
          continue
        }
        projectilesChanged = true
        const splatRadius = p.splashRadius
        if (p.kind === 'sundae') {
          nextSplats.push({
            id: nid('splat'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'sundae',
            radius: splatRadius,
          })
          splatsChanged = true
        } else if (p.kind === 'slobber') {
          nextSplats.push({
            id: nid('slobber'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'slobber',
            radius: splatRadius,
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
        } else if (p.kind === 'dumbbell') {
          nextSplats.push({
            id: nid('db'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'dumbbell',
            radius: splatRadius,
          })
          splatsChanged = true
        } else if (p.kind === 'love') {
          nextSplats.push({
            id: nid('love'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'love',
          })
          splatsChanged = true
        } else if (p.kind === 'witchcraft') {
          nextSplats.push({
            id: nid('witch'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'witchcraft',
          })
          splatsChanged = true
        } else if (p.kind === 'iceCream') {
          nextSplats.push({
            id: nid('ic'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'iceCream',
            radius: splatRadius,
          })
          splatsChanged = true
        } else if (p.kind === 'football') {
          nextSplats.push({
            id: nid('fb'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'football',
            radius: splatRadius,
          })
          splatsChanged = true
        } else if (p.kind === 'baseball') {
          nextSplats.push({
            id: nid('bb'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'baseball',
            radius: splatRadius,
          })
          splatsChanged = true
        } else if (p.kind === 'cash') {
          nextSplats.push({
            id: nid('cash'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'cash',
            radius: splatRadius,
          })
          splatsChanged = true
        } else if (p.kind === 'rocket') {
          nextSplats.push({
            id: nid('rocket'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'rocket',
            radius: splatRadius,
          })
          splatsChanged = true
        } else if (p.kind === 'pancake') {
          nextSplats.push({
            id: nid('pancake'),
            col: p.toCol,
            row: p.toRow,
            bornAt: t,
            kind: 'pancake',
            radius: splatRadius,
          })
          splatsChanged = true
        }
        if (p.splashRadius != null && p.ownerSide != null && p.splashDamage != null) {
          // Primary hit + separate splash (Cash Gun).
          if (p.targetId) {
            const target = nextUnits.find((u) => u.id === p.targetId)
            if (target && !isAirborne(target)) {
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
          const splash = applySplashAt(
            nextUnits,
            nextTowers,
            p.ownerSide,
            p.toCol,
            p.toRow,
            p.splashRadius,
            p.splashDamage,
            t,
            { excludeUnitId: p.targetId },
          )
          if (splash.unitsChanged) unitsChanged = true
          if (splash.towersChanged) towersChanged = true
        } else if (p.splashRadius != null && p.ownerSide != null) {
          const splash = applySplashAt(
            nextUnits,
            nextTowers,
            p.ownerSide,
            p.toCol,
            p.toRow,
            p.splashRadius,
            p.damage,
            t,
          )
          if (splash.unitsChanged) unitsChanged = true
          if (splash.towersChanged) towersChanged = true
        } else if (p.targetId) {
          const target = nextUnits.find((u) => u.id === p.targetId)
          if (target && !isAirborne(target)) {
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
      const openField = modeRef.current === 'touchdown'

      // Apply guest deploys (friend battle) as enemy units / spells on the host.
      if ((liveRoleRef.current ?? netRef.current?.role) === 'host' && pendingGuestDeploysRef.current.length) {
        const pending = pendingGuestDeploysRef.current
        pendingGuestDeploysRef.current = []
        for (const d of pending) {
          const char = getCharacter(d.charId)
          if (!char || nextEnemyElixir < char.elixir) continue
          const hostPos = guestDeployToHostEnemy(d.col, d.row)
          if (isSpellCard(char)) {
            if (
              castSpellProjectile(
                char,
                'enemy',
                hostPos.col,
                hostPos.row,
                t,
                botLevelRef.current,
                nextProjectiles,
              )
            ) {
              nextEnemyElixir -= char.elixir
              enemyElixirChanged = true
              projectilesChanged = true
            }
            continue
          }
          if (!canSpawnAt(hostPos.col, hostPos.row, 'enemy', nextTowers, liveIds, modeRef.current)) {
            continue
          }
          const hut = makeBattleUnit(
            char,
            hostPos.col,
            hostPos.row,
            'enemy',
            t,
            botLevelRef.current,
          )
          nextUnits.push(hut)
          if (isBuildingCard(char) && char.spawnPool?.length) {
            spawnDogFromBuilding(hut, t, nextUnits)
          }
          nextEnemyElixir -= char.elixir
          enemyElixirChanged = true
          unitsChanged = true
        }
      }

      // Bot AI only in solo matches — never during friend battles.
      if (!netRef.current && t >= aiNextDeployRef.current) {
        const profile = aiProfileRef.current
        aiNextDeployRef.current =
          t +
          profile.deployMinMs +
          Math.random() * Math.max(200, profile.deployMaxMs - profile.deployMinMs)
        const ai = tryEnemyAiDeploy(
          nextUnits,
          nextTowers,
          liveIds,
          nextEnemyElixir,
          aiDeckIndexRef.current,
          t,
          botLevelRef.current,
          modeRef.current,
          enemyDeckRef.current ?? randomBotDeck(DECK_SIZE),
        )
        aiDeckIndexRef.current = ai.deckIndex
        if (ai.projectile) {
          nextProjectiles.push(ai.projectile)
          projectilesChanged = true
          nextEnemyElixir = ai.elixir
          enemyElixirChanged = true
        }
        if (ai.unit) {
          const hut = ai.unit
          nextUnits.push(hut)
          const hutDef = getCharacter(hut.charId)
          if (isBuildingCard(hutDef) && hutDef?.spawnPool?.length) {
            spawnDogFromBuilding(hut, t, nextUnits)
          }
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

        // Big Mable Launch / Spirit Jump: fly first, resolve on landing.
        if (u.launch) {
          const flight = u.launch
          const dur = Math.max(1, flight.arriveAt - flight.bornAt)
          if (t >= flight.arriveAt) {
            u.col = flight.toCol
            u.row = flight.toRow
            if (flight.landDamage > 0) {
              u.hp -= flight.landDamage
            }
            if (flight.leapHit) {
              const hit = flight.leapHit
              const splash = applySplashAt(
                nextUnits,
                nextTowers,
                hit.ownerSide,
                hit.aimCol,
                hit.aimRow,
                hit.splashRadius,
                hit.damage,
                t,
                { excludeUnitId: u.id },
              )
              if (splash.unitsChanged) unitsChanged = true
              if (splash.towersChanged) towersChanged = true
              nextSplats.push({
                id: nid('hit'),
                col: hit.aimCol,
                row: hit.aimRow,
                bornAt: t,
                kind: 'jump',
                radius: hit.splashRadius,
              })
              splatsChanged = true
              if (hit.diesOnLand) {
                u.hp = 0
              }
            }
            u.launch = null
            u.rootedUntil = Math.max(u.rootedUntil, t + 200)
            sfx.hit()
            unitsChanged = true
            if (u.hp <= 0) continue
          } else {
            const p = Math.min(1, Math.max(0, (t - flight.bornAt) / dur))
            u.col = flight.fromCol + (flight.toCol - flight.fromCol) * p
            u.row = flight.fromRow + (flight.toRow - flight.fromRow) * p
            u.movingUntil = t + 120
            u.rootedUntil = Math.max(u.rootedUntil, flight.arriveAt)
            unitsChanged = true
            continue
          }
        }

        const def = getCharacter(u.charId)
        if (!def) continue

        // Buildings: stationary. Spawners (Dog Hut) or turrets (Phil's Car).
        if (isBuildingCard(def)) {
          // Buildings bleed HP while standing (Steve's Diner 12/sec; others default 25).
          const drain = (def.hpDecayPerSec ?? 25) * dt
          if (drain > 0 && u.hp > 0) {
            u.hp = Math.max(0, u.hp - drain)
            unitsChanged = true
          }
          if (u.hp <= 0) continue

          if (def.spawnPool?.length) {
            const every = (def.spawnEverySec ?? 10) * 1000
            if (u.nextSpawnAt == null) u.nextSpawnAt = t + every
            if (t >= u.nextSpawnAt) {
              spawnDogFromBuilding(u, t, nextUnits)
              u.nextSpawnAt = t + every
              unitsChanged = true
            }
            continue
          }

          // Attacking building — no pathing; face + lock + fire.
          if (def.attacks.length === 0) continue

          const me = unitCenter(u)
          const foes = nextUnits.filter(
            (o) => o.side !== u.side && o.hp > 0 && !isAirborne(o),
          )
          const foeTowers = liveTowers.filter((tw) => tw.side !== u.side)
          const attack = def.attacks[u.attackIndex % def.attacks.length]!
          const attackRange = Math.max(2, attack.range)

          type BTarget = {
            kind: 'unit' | 'tower'
            id: string
            col: number
            row: number
            rangeD: number
          }

          let best: BTarget | null = null
          if (u.lockKey) {
            const [kind, id] = u.lockKey.split(':') as ['unit' | 'tower', string]
            if (kind === 'unit') {
              const f = foes.find((x) => x.id === id)
              if (f) {
                const c = unitCenter(f)
                const edge = dist(me.col, me.row, c.col, c.row)
                if (edge <= attackRange) {
                  best = { kind: 'unit', id: f.id, col: c.col, row: c.row, rangeD: edge }
                }
              }
            } else if (kind === 'tower') {
              const tw = foeTowers.find((x) => x.id === id)
              const slot = tw ? towerSlot(tw.id) : null
              if (tw && slot) {
                const edge = distUnitTileToTower(u.col, u.row, slot)
                if (edge <= attackRange) {
                  const aim = towerFrontAimPoint(slot)
                  best = { kind: 'tower', id: tw.id, col: aim.col, row: aim.row, rangeD: edge }
                }
              }
            }
            if (!best) {
              u.lockKey = null
              unitsChanged = true
            }
          }

          // Acquire closest enemy (unit or tower) in range when unlocked.
          if (!best) {
            for (const f of foes) {
              const c = unitCenter(f)
              const edge = dist(me.col, me.row, c.col, c.row)
              if (edge > attackRange) continue
              if (!best || edge < best.rangeD) {
                best = { kind: 'unit', id: f.id, col: c.col, row: c.row, rangeD: edge }
              }
            }
            for (const tw of foeTowers) {
              const slot = towerSlot(tw.id)
              if (!slot) continue
              const edge = distUnitTileToTower(u.col, u.row, slot)
              if (edge > attackRange) continue
              const aim = towerFrontAimPoint(slot)
              if (!best || edge < best.rangeD) {
                best = { kind: 'tower', id: tw.id, col: aim.col, row: aim.row, rangeD: edge }
              }
            }
          }

          if (!best) {
            if (u.lockKey) {
              u.lockKey = null
              unitsChanged = true
            }
            continue
          }

          // Always turn the vehicle to face the current target.
          const face = Math.atan2(best.row - me.row, best.col - me.col)
          if (Math.abs(face - u.facing) > 0.04) {
            u.facing = face
            unitsChanged = true
          }

          const nextLock = `${best.kind}:${best.id}`
          if (u.lockKey !== nextLock) {
            u.lockKey = nextLock
            unitsChanged = true
          }

          if (t < u.nextAttackAt) continue

          const damage = attack.damage * cardLevelMult(u.level)
          const shotAim = { col: best.col, row: best.row }
          const vfxMs = attack.id === 'philsRocket' ? ROCKET_VFX_MS : RANGED_VFX_MS
          u.vfx = attack.id
          u.vfxUntil = t + vfxMs
          u.nextAttackAt = t + def.attackDelaySec * 1000
          u.rootedUntil = t + vfxMs
          unitsChanged = true

          if (
            attack.kind === 'rocket' ||
            attack.kind === 'shoot' ||
            attack.kind === 'cash' ||
            attack.kind === 'pancake'
          ) {
            // Launch from the front face (toward the target).
            const nose = 1.4
            nextProjectiles.push({
              id: nid('p'),
              kind: attack.kind,
              fromCol: me.col + Math.cos(face) * nose,
              fromRow: me.row + Math.sin(face) * nose,
              toCol: shotAim.col,
              toRow: shotAim.row,
              damage,
              targetId: best.kind === 'unit' ? best.id : null,
              targetTowerId: best.kind === 'tower' ? best.id : null,
              bornAt: t,
              arriveAt:
                t +
                (attack.projectileMs ??
                  (attack.kind === 'pancake' ? PANCAKE_PROJECTILE_MS : ROCKET_PROJECTILE_MS)),
              ownerSide: u.side,
              splashRadius: attack.splashRadius,
              splashDamage: attack.splashDamage,
            })
            projectilesChanged = true
          }
          continue
        }

        // Rage is permanent for the unit's life (timer or Dan heart) — never cleared.
        if (
          def.rageAfterSec != null &&
          !u.enraged &&
          t - u.spawnedAt >= def.rageAfterSec * 1000
        ) {
          u.enraged = true
          unitsChanged = true
        }

        const moveSpeed =
          def.moveSpeed *
          (u.enraged ? (def.rageMoveMult ?? RAGE_MOVE_MULT) : 1)
        const dmgMult = u.enraged ? (def.rageDamageMult ?? RAGE_DAMAGE_MULT) : 1

        const me = unitCenter(u)
        const buildingsOnly = !!def.targetsBuildingsOnly
        const noLock = !!def.noLock
        const foes = nextUnits.filter((o) => {
          if (o.side === u.side || o.hp <= 0 || isAirborne(o)) return false
          if (buildingsOnly && !isBuildingCard(getCharacter(o.charId))) return false
          return true
        })
        const foeTowers = liveTowers.filter((tw) => tw.side !== u.side)
        const currentAttack = def.attacks[u.attackIndex % def.attacks.length]
        // Towers are the default objective. Units only pull aggro when nearby;
        // ranged troops may notice enemies up to their own firing range.
        // noLock troops always chase the absolute nearest opponent (no sticky lock).
        const unitAggroRange = noLock
          ? Infinity
          : Math.max(12, currentAttack?.range ?? 0)

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

        const rooted = t < u.rootedUntil
        const noAttack = def.attacks.length === 0
        const attackRange = noAttack
          ? 2
          : Math.max(2, def.attacks[u.attackIndex % def.attacks.length]!.range)

        // Clash Royale: once attacking a target, keep it until death or out of range.
        // Big Mable (noLock): never sticky — always re-pick nearest.
        let best: Target | null = null
        if (u.lockKey && !noLock) {
          const [kind, id] = u.lockKey.split(':') as ['unit' | 'tower', string]
          if (kind === 'unit') {
            const f = foes.find((x) => x.id === id)
            if (f && !(buildingsOnly && !isBuildingCard(getCharacter(f.charId)))) {
              const c = unitCenter(f)
              const edge = dist(me.col, me.row, c.col, c.row)
              if (edge <= attackRange) {
                best = {
                  kind: 'unit',
                  id: f.id,
                  col: c.col,
                  row: c.row,
                  d: pathCostTo(me.col, me.row, c.col, c.row, openField),
                  rangeD: edge,
                }
              }
            }
          } else if (kind === 'tower') {
            const tw = foeTowers.find((x) => x.id === id)
            const slot = tw ? towerSlot(tw.id) : null
            if (tw && slot && towerInMeleeRange(u.col, u.row, slot, attackRange)) {
              const edge = distUnitTileToTower(u.col, u.row, slot)
              const aim = towerFrontEngagePoint(me.col, me.row, slot)
              best = {
                kind: 'tower',
                id: tw.id,
                col: aim.col,
                row: aim.row,
                d: pathCostTo(me.col, me.row, aim.col, aim.row, openField),
                rangeD: edge,
              }
            }
          }
          if (!best) {
            u.lockKey = null
            unitsChanged = true
          }
        } else if (noLock && u.lockKey) {
          u.lockKey = null
          unitsChanged = true
        }

        if (!best) {
          for (const tw of foeTowers) {
            const slot = towerSlot(tw.id)
            if (!slot) continue
            const edge = distUnitTileToTower(u.col, u.row, slot)
            const aim = towerFrontEngagePoint(me.col, me.row, slot)
            const path = pathCostTo(me.col, me.row, aim.col, aim.row, openField)
            // Prefer towers we can already hit from the front (skipped for noLock).
            const inFront = !noLock && towerInMeleeRange(u.col, u.row, slot, attackRange)
            const score = inFront ? path - 40 : path
            if (!best || score < best.d) {
              best = {
                kind: 'tower',
                id: tw.id,
                col: aim.col,
                row: aim.row,
                d: score,
                rangeD: edge,
              }
            }
          }
          for (const f of foes) {
            const c = unitCenter(f)
            const edge = dist(me.col, me.row, c.col, c.row)
            if (edge > unitAggroRange) continue
            const path = pathCostTo(me.col, me.row, c.col, c.row, openField)
            if (!best || path < best.d) {
              best = { kind: 'unit', id: f.id, col: c.col, row: c.row, d: path, rangeD: edge }
            }
          }
        }

        if (!best) {
          if (u.lockKey) {
            u.lockKey = null
            unitsChanged = true
          }
          if (u.burstShot === 0 && u.nextAttackAt !== 0) {
            u.nextAttackAt = 0
            unitsChanged = true
          }
          if (!rooted) {
            const step = moveSpeed * dt
            const dir = u.side === 'ally' ? -1 : 1
            const goalRow = dir < 0 ? 0 : ARENA_ROWS - 1
            const steer = steerTowardGoal(u.col, u.row, u.col, goalRow, liveIds, u.side, openField)
            const dCol = steer.dCol * step
            const dRow = steer.dRow * step
            const prevCol = u.col
            const prevRow = u.row
            const next = stepUnit(u, dCol, dRow, liveIds, openField)
            const ejected = ejectFromTowers(next.col, next.row, liveIds, u.side)
            u.col = ejected.col
            u.row = ejected.row
            nudgeSidewaysIfStuck(u, prevCol, prevRow, step, liveIds)
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

        const inRange =
          best.kind === 'tower'
            ? (() => {
                const slot = towerSlot(best.id)
                return slot ? towerInMeleeRange(u.col, u.row, slot, attackRange) : false
              })()
            : best.rangeD <= attackRange

        // Shields (Dan) walk into contact then idle as a meat wall — never attack.
        if (!inRange) {
          // Out of range: walk to the FRONT engage point (never the back).
          if (u.burstShot === 0 && u.nextAttackAt !== 0) {
            u.nextAttackAt = 0
            unitsChanged = true
          }
          if (!rooted) {
            // If somehow north of an enemy tower (or south of an ally tower), snap to front.
            if (best.kind === 'tower') {
              const slot = towerSlot(best.id)
              if (slot && !isOnTowerFrontSide(u.col, u.row, slot)) {
                const aim = towerFrontEngagePoint(me.col, me.row, slot)
                u.col = Math.max(0, Math.min(ARENA_COLS - 1, aim.col - 0.5))
                u.row = Math.max(0, Math.min(ARENA_ROWS - 1, aim.row - 0.5))
                u.movingUntil = t + 140
                unitsChanged = true
                continue
              }
            }
            const step = moveSpeed * dt
            const steer = steerTowardGoal(u.col, u.row, best.col, best.row, liveIds, u.side, openField)
            const dCol = steer.dCol * step
            const dRow = steer.dRow * step
            const prevCol = u.col
            const prevRow = u.row
            const next = stepUnit(u, dCol, dRow, liveIds, openField)
            const ejected = ejectFromTowers(next.col, next.row, liveIds, u.side)
            u.col = ejected.col
            u.row = ejected.row
            nudgeSidewaysIfStuck(u, prevCol, prevRow, step, liveIds, best.col)
            updateFacingFromMove(u, prevCol, prevRow)
            if (Math.hypot(u.col - prevCol, u.row - prevRow) > 0.001) {
              u.movingUntil = t + 140
            }
            unitsChanged = true
          }
          continue
        }

        // In range — lock onto this target (CR: no retarget until dead / out of range).
        // noLock troops skip sticky lock entirely.
        if (!noLock) {
          const nextLock = `${best.kind}:${best.id}`
          if (u.lockKey !== nextLock) {
            u.lockKey = nextLock
            unitsChanged = true
          }
        } else if (u.lockKey) {
          u.lockKey = null
          unitsChanged = true
        }

        if (noAttack) continue

        if (t < u.nextAttackAt) continue

        const attack = def.attacks[u.attackIndex % def.attacks.length]!
        const damage = attack.damage * dmgMult * cardLevelMult(u.level)
        const shotAim =
          best.kind === 'tower'
            ? (() => {
                const slot = towerSlot(best.id)
                return slot ? towerFrontAimPoint(slot) : { col: best.col, row: best.row }
              })()
            : { col: best.col, row: best.row }
        const burstShots = attack.burstShots ?? 1
        const burstGapSec = attack.burstGapSec ?? 0
        const nextBurst = u.burstShot + 1
        const burstDone = nextBurst >= burstShots

        const vfxMs =
          attack.id === 'chickenWhip'
            ? WHIP_VFX_MS
            : attack.id === 'flyingKick'
              ? KICK_VFX_MS
              : attack.id === 'dumbbellHuck'
                ? DUMBBELL_VFX_MS
                : attack.id === 'headButt'
                  ? HEADBUTT_VFX_MS
                  : attack.id === 'deathHug'
                    ? HUG_VFX_MS
                    : attack.id === 'love'
                      ? LOVE_VFX_MS
                      : attack.id === 'witchcraft'
                        ? WITCHCRAFT_VFX_MS
                        : attack.id === 'uppercut'
                          ? 720
                          : attack.id === 'jump'
                            ? JUMP_LEAP_MS
                            : attack.id === 'launch'
                              ? 480
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

        if (
          attack.kind === 'sundae' ||
          attack.kind === 'slobber' ||
          attack.kind === 'shoot' ||
          attack.kind === 'dumbbell' ||
          attack.kind === 'love' ||
          attack.kind === 'witchcraft' ||
          attack.kind === 'cash' ||
          attack.kind === 'rocket'
        ) {
          nextProjectiles.push({
            id: nid('p'),
            kind: attack.kind,
            fromCol: me.col,
            fromRow: me.row,
            toCol: shotAim.col,
            toRow: shotAim.row,
            damage,
            targetId: best.kind === 'unit' ? best.id : null,
            targetTowerId: best.kind === 'tower' ? best.id : null,
            bornAt: t,
            arriveAt:
              t +
              (attack.projectileMs != null
                ? attack.projectileMs
                : attack.kind === 'shoot'
                  ? SHOOT_PROJECTILE_MS
                  : attack.kind === 'cash'
                    ? CASH_PROJECTILE_MS
                    : attack.kind === 'rocket'
                      ? ROCKET_PROJECTILE_MS
                      : attack.kind === 'slobber'
                        ? SLOBBER_PROJECTILE_MS
                        : attack.kind === 'dumbbell'
                          ? DUMBBELL_PROJECTILE_MS
                          : attack.kind === 'love'
                            ? LOVE_PROJECTILE_MS
                            : attack.kind === 'witchcraft'
                              ? WITCHCRAFT_PROJECTILE_MS
                              : PROJECTILE_MS),
            ownerSide: u.side,
            splashRadius: attack.splashRadius,
            splashDamage: attack.splashDamage,
          })
          projectilesChanged = true
          continue
        }

        if (attack.splashRadius != null) {
          // Spirit Jump: arc onto the impact point, splash on land.
          if (attack.kind === 'jump') {
            const ang = Math.atan2(shotAim.row - me.row, shotAim.col - me.col)
            const landCol = Math.max(
              0,
              Math.min(ARENA_COLS - 1, shotAim.col - 0.5),
            )
            const landRow = Math.max(
              0,
              Math.min(ARENA_ROWS - 1, shotAim.row - 0.5),
            )
            const ejected = ejectFromTowers(landCol, landRow, liveIds, u.side)
            u.facing = ang
            u.launch = {
              fromCol: u.col,
              fromRow: u.row,
              toCol: ejected.col,
              toRow: ejected.row,
              bornAt: t,
              arriveAt: t + JUMP_LEAP_MS,
              landDamage: 0,
              leapHit: {
                damage,
                splashRadius: attack.splashRadius,
                diesOnLand: !!attack.diesOnAttack,
                ownerSide: u.side,
                aimCol: shotAim.col,
                aimRow: shotAim.row,
              },
            }
            u.rootedUntil = Math.max(u.rootedUntil, t + JUMP_LEAP_MS)
            continue
          }
          // Kick-style: short leap then splash.
          if (attack.kind === 'kick') {
            const ang = Math.atan2(shotAim.row - me.row, shotAim.col - me.col)
            const leap = 1.25
            const next = stepUnit(
              u,
              Math.cos(ang) * leap,
              Math.sin(ang) * leap,
              liveIds,
              openField,
            )
            const ejected = ejectFromTowers(next.col, next.row, liveIds, u.side)
            u.col = ejected.col
            u.row = ejected.row
            u.facing = ang
          }
          const splash = applySplashAt(
            nextUnits,
            nextTowers,
            u.side,
            shotAim.col,
            shotAim.row,
            attack.splashRadius,
            damage,
            t,
            { excludeUnitId: u.id },
          )
          if (splash.unitsChanged) unitsChanged = true
          if (splash.towersChanged) towersChanged = true
          nextSplats.push({
            id: nid('hit'),
            col: shotAim.col,
            row: shotAim.row,
            bornAt: t,
            kind:
              attack.kind === 'kick'
                ? 'kick'
                : attack.kind === 'whip'
                  ? 'whip'
                  : 'melee',
            radius: attack.splashRadius,
          })
          splatsChanged = true
          if (attack.diesOnAttack) {
            u.hp = 0
            unitsChanged = true
          }
          continue
        }

        if (best.kind === 'unit') {
          const target = nextUnits.find((x) => x.id === best.id)
          if (target && !isAirborne(target)) {
            // Launch / knockback — fling troops first; damage lands with them.
            // Towers/buildings still take damage immediately (no fling).
            const canLaunch =
              attack.knockbackTiles != null &&
              attack.knockbackTiles > 0 &&
              !isBuildingCard(getCharacter(target.charId))

            if (canLaunch) {
              const ang = Math.atan2(target.row - u.row, target.col - u.col)
              let pc = Math.max(
                0,
                Math.min(
                  ARENA_COLS - 1,
                  target.col + Math.cos(ang) * attack.knockbackTiles!,
                ),
              )
              let pr = Math.max(
                0,
                Math.min(
                  ARENA_ROWS - 1,
                  target.row + Math.sin(ang) * attack.knockbackTiles!,
                ),
              )
              const ejected = ejectFromTowers(pc, pr, liveIds, target.side)
              const tiles = Math.hypot(ejected.col - target.col, ejected.row - target.row)
              const flightMs = Math.min(
                LAUNCH_FLIGHT_MAX_MS,
                Math.max(LAUNCH_FLIGHT_MIN_MS, tiles * LAUNCH_MS_PER_TILE),
              )
              target.launch = {
                fromCol: target.col,
                fromRow: target.row,
                toCol: ejected.col,
                toRow: ejected.row,
                bornAt: t,
                arriveAt: t + flightMs,
                landDamage: damage,
              }
              target.lockKey = null
              target.nextAttackAt = Math.max(target.nextAttackAt, t + flightMs + 280)
              target.rootedUntil = Math.max(target.rootedUntil, t + flightMs)
              target.movingUntil = t + flightMs
            } else {
              target.hp -= damage
              sfx.hit()
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
                const ejected = ejectFromTowers(pc, pr, liveIds, target.side)
                target.col = ejected.col
                target.row = ejected.row
              }
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

        // Melee lunge + impact FX so the strike reads as a real attack.
        if (
          attack.kind === 'whip' ||
          attack.kind === 'kick' ||
          attack.kind === 'bite' ||
          attack.kind === 'headbutt' ||
          attack.kind === 'hug' ||
          attack.kind === 'uppercut' ||
          attack.kind === 'launch'
        ) {
          const ang = Math.atan2(shotAim.row - me.row, shotAim.col - me.col)
          const lunge =
            attack.kind === 'kick'
              ? 1.25
              : attack.kind === 'hug'
                ? 0.85
                : attack.kind === 'uppercut'
                  ? 0.9
                  : attack.kind === 'launch'
                    ? 1.1
                  : 0.65
          const next = stepUnit(
            u,
            Math.cos(ang) * lunge,
            Math.sin(ang) * lunge,
            liveIds,
            openField,
          )
          const ejected = ejectFromTowers(next.col, next.row, liveIds, u.side)
          u.col = ejected.col
          u.row = ejected.row
          u.facing = ang
          unitsChanged = true
          nextSplats.push({
            id: nid('hit'),
            col: shotAim.col,
            row: shotAim.row,
            bornAt: t,
            kind:
              attack.kind === 'whip'
                ? 'whip'
                : attack.kind === 'bite'
                  ? 'bite'
                  : attack.kind === 'kick'
                    ? 'kick'
                    : attack.kind === 'hug'
                      ? 'hug'
                      : attack.kind === 'uppercut'
                        ? 'uppercut'
                        : attack.kind === 'launch'
                          ? 'kick'
                        : 'melee',
          })
          splatsChanged = true
        }
      }

      // Tower combat — princess archers always; king wakes at 15 range or on damage, then 3s delay.
      for (const tw of nextTowers) {
        if (tw.hp <= 0) continue
        const slot = towerSlot(tw.id)
        if (!slot) continue
        const origin = { col: slot.col + slot.w / 2, row: slot.row + slot.h / 2 }
        const foes = nextUnits.filter(
          (u) => u.side !== tw.side && u.hp > 0 && !isAirborne(u),
        )

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
        if (tw.lockUnitId) {
          const f = foes.find((x) => x.id === tw.lockUnitId)
          if (f) {
            const c = unitCenter(f)
            const d = distToTowerEdge(c.col, c.row, slot)
            if (d <= range) best = { id: f.id, col: c.col, row: c.row, d }
          }
          if (!best) {
            tw.lockUnitId = null
            towersChanged = true
          }
        }
        if (!best) {
          for (const f of foes) {
            const c = unitCenter(f)
            const d = distToTowerEdge(c.col, c.row, slot)
            if (d > range) continue
            if (!best || d < best.d) best = { id: f.id, col: c.col, row: c.row, d }
          }
        }
        if (!best) continue

        tw.lockUnitId = best.id
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
            return def.moveSpeed * (u.enraged ? (def.rageMoveMult ?? RAGE_MOVE_MULT) : 1)
          },
          liveIds,
          t,
        )
      ) {
        unitsChanged = true
      }

      // Building death spawn + Dan death hearts.
      for (const u of nextUnits) {
        if (u.hp > 0) continue
        const deadDef = getCharacter(u.charId)
        if (isBuildingCard(deadDef) && deadDef?.spawnOnDeath) {
          spawnDogFromBuilding(u, t, nextUnits)
          unitsChanged = true
        }
        if (!deadDef?.dropsRageHeart) continue
        nextHearts.push({
          id: nid('heart'),
          col: u.col,
          row: u.row,
          bornAt: t,
        })
        heartsChanged = true
      }

      if (nextHearts.length > 0) {
        const kept: RageHeart[] = []
        for (const h of nextHearts) {
          let claimed = false
          let bestId: string | null = null
          let bestD = Infinity
          for (const u of nextUnits) {
            if (u.hp <= 0) continue
            const d = Math.hypot(u.col - h.col, u.row - h.row)
            if (d <= RAGE_HEART_PICKUP && d < bestD) {
              bestD = d
              bestId = u.id
            }
          }
          if (bestId) {
            const getter = nextUnits.find((x) => x.id === bestId)
            if (getter) {
              getter.enraged = true
              unitsChanged = true
            }
            claimed = true
            heartsChanged = true
          }
          if (!claimed) kept.push(h)
        }
        nextHearts = kept
      }

      // Touchdown scoring — moving troops reach the far end zone (not buildings).
      if (modeRef.current === 'touchdown') {
        const keptTd: BattleUnit[] = []
        for (const u of nextUnits) {
          if (u.hp <= 0) continue
          const def = getCharacter(u.charId)
          if (!def || isBuildingCard(def) || isSpellCard(def) || def.moveSpeed <= 0) {
            keptTd.push(u)
            continue
          }
          if (u.side === 'ally' && u.row < TOUCHDOWN_ZONE_ROWS) {
            allyScoreRef.current += 1
            setAllyScore(allyScoreRef.current)
            unitsChanged = true
            continue
          }
          if (u.side === 'enemy' && u.row > ARENA_ROWS - 1 - TOUCHDOWN_ZONE_ROWS) {
            enemyScoreRef.current += 1
            setEnemyScore(enemyScoreRef.current)
            unitsChanged = true
            continue
          }
          keptTd.push(u)
        }
        nextUnits = keptTd
      }

      const filteredUnits = nextUnits.filter((u) => u.hp > 0)
      if (filteredUnits.length !== nextUnits.length) unitsChanged = true

      if (unitsChanged) setUnits(filteredUnits)
      if (towersChanged) setTowers(nextTowers)
      if (projectilesChanged) setProjectiles(nextProjectiles)
      if (splatsChanged) setSplats(nextSplats)
      if (heartsChanged) setHearts(nextHearts)
      if (enemyElixirChanged) {
        enemyElixirRef.current = nextEnemyElixir
        setEnemyElixir(nextEnemyElixir)
      }

      if ((liveRoleRef.current ?? netRef.current?.role) === 'host') {
        // Keep refs current before publish so guests see this frame's HP.
        if (unitsChanged) unitsRef.current = filteredUnits
        if (towersChanged) towersRef.current = nextTowers
        if (projectilesChanged) projectilesRef.current = nextProjectiles
        if (enemyElixirChanged) enemyElixirRef.current = nextEnemyElixir
        publishHostState(towersChanged || unitsChanged || projectilesChanged)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [publishHostState])

  return {
    elixir,
    enemyElixir,
    elixirMax: ELIXIR_MAX,
    elixirMult,
    remoteOvertime,
    units,
    projectiles,
    splats,
    hearts,
    towers,
    selectedCharId,
    setSelectedCharId,
    deploy,
    now,
    mode,
    allyScore,
    enemyScore,
    touchdownWinScore: TOUCHDOWN_WIN_SCORE,
    syncReady,
    peerJoined,
    linkReady:
      !net ||
      (net.role === 'host'
        ? peerJoined
        : net.role === 'spectator'
          ? syncReady
          : syncReady),
    clockSec,
    setClockSec,
    netRole: liveRoleRef.current ?? net?.role ?? null,
    lagging,
    /** Locked CPU deck for this match (8 ids). Empty when unused. */
    enemyDeckIds: enemyDeckRef.current,
  }
}
