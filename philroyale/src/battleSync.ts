/**
 * Friend-battle room over ntfy.
 * Host runs the simulation; guest sends deploys and mirrors flipped state.
 */

import { ARENA_ROWS } from './arena'
import type { AttackId } from './characters'
import { ntfyPublish, ntfySubscribe } from './ntfyTransport'

export type BattleRole = 'host' | 'guest' | 'spectator'

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
  moving: boolean
  level: number
}

export type SyncTower = {
  id: string
  hp: number
  maxHp: number
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
      mode?: 'classic' | 'touchdown'
      at: string
    }

export type BattleNet = {
  challengeId: string
  role: BattleRole
  peerPlayerId?: string
  /** Spectator only: match the friend's camera (guest flips the board). */
  viewAs?: 'host' | 'guest'
}

const TOPIC_PREFIX = 'philroyale-battle-v5-'

function topicFor(challengeId: string): string {
  const clean = challengeId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)
  return `${TOPIC_PREFIX}${clean || 'lobby'}`
}

export async function publishBattle(
  challengeId: string,
  message: BattleRoomMessage,
): Promise<boolean> {
  return ntfyPublish(topicFor(challengeId), message, {
    title: 'Phil Royale battle',
    priority: message.type === 'battle_peer_accept' ? 'high' : 'default',
    ttl: 120,
  })
}

export function subscribeBattle(
  challengeId: string,
  onMessage: (msg: BattleRoomMessage) => void,
): () => void {
  if (!challengeId || typeof window === 'undefined') return () => {}

  return ntfySubscribe(
    topicFor(challengeId),
    (raw) => {
      try {
        const data = JSON.parse(raw) as BattleRoomMessage
        if (!data?.type || data.challengeId !== challengeId) return
        onMessage(data)
      } catch {
        /* ignore */
      }
    },
    { lookbackSec: 180, pollMs: 400 },
  )
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
