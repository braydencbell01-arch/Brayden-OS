/**
 * Friend-battle room — Cloudflare Durable Object relay (ntfy backup).
 * Host runs the simulation; guest sends deploys and mirrors flipped state.
 */

import { ARENA_ROWS } from './arena'
import type { AttackId } from './characters'
import type { GameMode } from './gameModes'
import { loadPlayerId } from './storage'
import { mpPublishBattle, mpReady, mpSubscribeBattle } from './mpClient'
import { ntfyPublish, ntfySubscribe } from './ntfyTransport'

export type BattleRole = 'host' | 'guest' | 'spectator'

export type SyncLaunch = {
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  bornAt: number
  arriveAt: number
  landDamage: number
}

export type SyncUnit = {
  id: string
  charId: string
  side: 'ally' | 'enemy'
  col: number
  row: number
  hp: number
  maxHp: number
  facing: number
  vfx: AttackId | null
  enraged: boolean
  /** Berry Aura after a kill. */
  auraActive?: boolean
  /** @deprecated use movingUntil — kept for older hosts */
  moving?: boolean
  level: number
  /** Host performance.now() when the unit was placed. */
  spawnedAt?: number
  /** Host performance.now() when the next attack is allowed. */
  nextAttackAt?: number
  /** Host performance.now() until walk anim should play. */
  movingUntil?: number
  attackIndex?: number
  burstShot?: number
  nextSpawnAt?: number
  launch?: SyncLaunch | null
}

export type SyncProjectile = {
  id: string
  kind:
    | 'sundae'
    | 'hug'
    | 'slobber'
    | 'shoot'
    | 'dumbbell'
    | 'love'
    | 'arrow'
    | 'cannon'
    | 'iceCream'
    | 'football'
    | 'baseball'
    | 'cash'
    | 'rocket'
    | 'witchcraft'
    | 'pancake'
    | 'barrel'
    | 'cheese'
    | 'cucumber'
    | 'berryJuice'
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  damage: number
  targetId: string | null
  targetTowerId: string | null
  bornAt: number
  arriveAt: number
  ownerSide?: 'ally' | 'enemy'
  ownerUnitId?: string
  splashRadius?: number
  splashDamage?: number
  spawnAsId?: string
  spawnCount?: number
  spawnLevel?: number
}

export type SyncTower = {
  id: string
  hp: number
  maxHp: number
  /** King wake / cannon deployed. */
  activated?: boolean
}

export type BattleRoomMessage =
  | {
      type: 'battle_state'
      challengeId: string
      seq: number
      /** Host's local ally elixir */
      hostElixir: number
      /** Guest's elixir (host's enemyElixir) */
      guestElixir: number
      towers: SyncTower[]
      units: SyncUnit[]
      allyScore?: number
      enemyScore?: number
      /** Host match clock (seconds remaining) — guest mirrors this. */
      clockSec?: number
      /** Host overtime flag — elixir mult + OT label. */
      overtime?: boolean
      /** Host has seen the guest join. */
      peerJoined?: boolean
      /** Host performance.now() at publish — guest maps timers/projectiles. */
      hostNow?: number
      projectiles?: SyncProjectile[]
      /** Friend match: freeze both clients while either side is lagging. */
      lagPause?: boolean
    }
  | {
      type: 'battle_deploy'
      challengeId: string
      /** Always in the sender's local ally coordinates (bottom half). */
      charId: string
      col: number
      row: number
      at: number
    }
  | {
      /** Guest reports local lag so host can pause both clients. */
      type: 'battle_lag'
      challengeId: string
      lagging: boolean
      at: number
    }
  | {
      type: 'battle_ready'
      challengeId: string
      role: BattleRole
      name: string
      at: string
    }
  | {
      /** Guest accepted — host can leave Waiting and start hosting. */
      type: 'battle_peer_accept'
      challengeId: string
      fromName: string
      fromPlayerId?: string
      mode?: GameMode
      at: string
    }
  | {
      /** Party draft/undraft/infinite — share a reject/gift card with peer. */
      type: 'party_card'
      challengeId: string
      role: BattleRole
      /** Card the sender is giving the peer (draft reject / undraft pick). */
      charId: string
      /** Index of the pick round (0-based). */
      round: number
      at: number
    }
  | {
      /** Party lobby — my final 8-card deck is ready. */
      type: 'party_deck_ready'
      challengeId: string
      role: BattleRole
      deckIds: string[]
      at: number
    }

export type BattleNet = {
  challengeId: string
  role: BattleRole
  peerPlayerId?: string
  /** Spectator only: match the friend's camera (guest flips the board). */
  viewAs?: 'host' | 'guest'
}

const TOPIC_PREFIX = 'philroyale-battle-v6-'

function topicFor(challengeId: string): string {
  const clean = challengeId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)
  return `${TOPIC_PREFIX}${clean || 'lobby'}`
}

export async function publishBattle(
  challengeId: string,
  message: BattleRoomMessage,
): Promise<boolean> {
  const cf = (await mpReady())
    ? await mpPublishBattle(challengeId, message)
    : false
  const ntfy = await ntfyPublish(topicFor(challengeId), message, {
    title: 'Phil Royale battle',
    priority:
      message.type === 'battle_peer_accept' || message.type === 'battle_ready'
        ? 'high'
        : 'default',
    ttl: 180,
  })
  return cf || ntfy
}

export function subscribeBattle(
  challengeId: string,
  onMessage: (msg: BattleRoomMessage) => void,
): () => void {
  if (!challengeId || typeof window === 'undefined') return () => {}

  const seen = new Set<string>()
  const deliver = (data: BattleRoomMessage) => {
    if (!data?.type || data.challengeId !== challengeId) return
    const key =
      data.type === 'battle_state'
        ? `state:${data.seq}`
        : data.type === 'battle_deploy'
          ? `dep:${data.at}:${data.charId}`
          : data.type === 'battle_lag'
            ? `lag:${data.at}:${data.lagging}`
            : `${data.type}:${'at' in data ? data.at : ''}`
    if (seen.has(key)) return
    seen.add(key)
    if (seen.size > 300) {
      const first = seen.values().next().value
      if (first) seen.delete(first)
    }
    onMessage(data)
  }

  const unsubCf = mpSubscribeBattle(challengeId, loadPlayerId(), (raw) => {
    deliver(raw as BattleRoomMessage)
  })

  const unsubNtfy = ntfySubscribe(
    topicFor(challengeId),
    (raw) => {
      try {
        deliver(JSON.parse(raw) as BattleRoomMessage)
      } catch {
        /* ignore */
      }
    },
    { lookbackSec: 120, pollMs: 800, sse: false },
  )

  return () => {
    unsubCf()
    unsubNtfy()
  }
}

/** Flip host-sim coords into the guest's local view (guest is always ally at bottom). */
export function flipForGuestView(col: number, row: number): { col: number; row: number } {
  return { col, row: ARENA_ROWS - 1 - row }
}

export function flipTowerId(id: string): string {
  if (id.startsWith('ally-')) return `enemy-${id.slice(5)}`
  if (id.startsWith('enemy-')) return `ally-${id.slice(6)}`
  return id
}

export function flipSide(side: 'ally' | 'enemy'): 'ally' | 'enemy' {
  return side === 'ally' ? 'enemy' : 'ally'
}

/** Guest local deploy → host enemy spawn tile. */
export function guestDeployToHostEnemy(col: number, row: number): { col: number; row: number } {
  return { col, row: ARENA_ROWS - 1 - row }
}
