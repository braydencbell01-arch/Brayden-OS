import { JURISDICTIONS } from './jurisdictions'
import { scorePlatesForRoute, type Place } from './geo'

export type GameSettings = {
  playerName: string
  allowManualLog: boolean
  showFoundPlates: boolean
  confirmBeforeLog: boolean
  includeDc: boolean
  inviteOpen: boolean
  targetPlateCount: number
}

export const DEFAULT_SETTINGS: GameSettings = {
  playerName: 'Driver',
  allowManualLog: true,
  showFoundPlates: true,
  confirmBeforeLog: false,
  includeDc: true,
  inviteOpen: true,
  targetPlateCount: 50,
}

export type RoadTripGame = {
  id: string
  createdAt: string
  start: Place
  end: Place
  /** Jurisdiction code → points 1–100 for this route (one entry per state). */
  platePoints: Record<string, number>
  /** Scoring formula version — bump to resync points on load. */
  scoringVersion?: number
  settings: GameSettings
  /** Players who joined (local + invite roster). */
  players: { id: string; name: string; joinedAt: string }[]
  /** Codes found by the local player. */
  foundCodes: string[]
  /** Running tally for local player. */
  score: number
  status: 'setup' | 'active' | 'ended'
}

const GAME_KEY = 'platequest.roadtrip.game'
const PLAYER_KEY = 'platequest.roadtrip.playerId'

export function getOrCreatePlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_KEY)
    if (existing) return existing
    const id = `p_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(PLAYER_KEY, id)
    return id
  } catch {
    return `p_${Date.now()}`
  }
}

export const SCORING_VERSION = 4

function jurisdictionCodes(includeDc: boolean): string[] {
  return JURISDICTIONS.filter((j) => includeDc || j.code !== 'DC').map((j) => j.code)
}

export function saveGame(game: RoadTripGame | null) {
  try {
    if (!game) localStorage.removeItem(GAME_KEY)
    else localStorage.setItem(GAME_KEY, JSON.stringify(game))
  } catch {
    /* ignore */
  }
}

export function rebuildPlatePoints(game: RoadTripGame): RoadTripGame {
  const codes = jurisdictionCodes(game.settings.includeDc)
  const platePoints = scorePlatesForRoute(game.start, game.end, codes)
  const score = game.foundCodes.reduce((sum, code) => sum + (platePoints[code] ?? 0), 0)
  return { ...game, platePoints, score, scoringVersion: SCORING_VERSION }
}

export function loadGame(): RoadTripGame | null {
  try {
    const raw = localStorage.getItem(GAME_KEY)
    if (!raw) return null
    const game = JSON.parse(raw) as RoadTripGame
    if ((game.scoringVersion ?? 1) < SCORING_VERSION) {
      const updated = rebuildPlatePoints(game)
      saveGame(updated)
      return updated
    }
    return game
  } catch {
    return null
  }
}

export function createGame(start: Place, end: Place, settings: GameSettings): RoadTripGame {
  const codes = jurisdictionCodes(settings.includeDc)
  const platePoints = scorePlatesForRoute(start, end, codes)
  const playerId = getOrCreatePlayerId()
  const now = new Date().toISOString()
  return {
    id: `g_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    start,
    end,
    platePoints,
    scoringVersion: SCORING_VERSION,
    settings: { ...settings },
    players: [{ id: playerId, name: settings.playerName.trim() || 'Driver', joinedAt: now }],
    foundCodes: [],
    score: 0,
    status: 'active',
  }
}

/** Compact invite payload for share links (route + settings, not scores). */
export type InvitePayload = {
  v: 1
  id: string
  start: Place
  end: Place
  settings: Pick<GameSettings, 'includeDc' | 'allowManualLog' | 'inviteOpen' | 'targetPlateCount'>
}

export function encodeInvite(game: RoadTripGame): string {
  const payload: InvitePayload = {
    v: 1,
    id: game.id,
    start: game.start,
    end: game.end,
    settings: {
      includeDc: game.settings.includeDc,
      allowManualLog: game.settings.allowManualLog,
      inviteOpen: game.settings.inviteOpen,
      targetPlateCount: game.settings.targetPlateCount,
    },
  }
  const json = JSON.stringify(payload)
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeInvite(code: string): InvitePayload | null {
  try {
    const pad = code.length % 4 === 0 ? '' : '='.repeat(4 - (code.length % 4))
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/') + pad
    const json = decodeURIComponent(escape(atob(b64)))
    const data = JSON.parse(json) as InvitePayload
    if (data?.v !== 1 || !data.start || !data.end) return null
    return data
  } catch {
    return null
  }
}

export function joinFromInvite(payload: InvitePayload, playerName: string): RoadTripGame {
  const settings: GameSettings = {
    ...DEFAULT_SETTINGS,
    ...payload.settings,
    playerName: playerName.trim() || 'Guest',
  }
  const game = createGame(payload.start, payload.end, settings)
  return { ...game, id: payload.id }
}

export function logPlate(game: RoadTripGame, code: string): RoadTripGame | null {
  const upper = code.toUpperCase()
  if (!(upper in game.platePoints)) return null
  if (game.foundCodes.includes(upper)) return null
  const pts = game.platePoints[upper]
  return {
    ...game,
    foundCodes: [...game.foundCodes, upper],
    score: game.score + pts,
  }
}

/** Always point invites at the PlateQuest app — never BrayStats root. */
export function platequestBaseUrl(): string {
  const { origin, pathname, href } = window.location
  const host = window.location.hostname

  // Production GitHub Pages
  if (host === 'braydencbell01-arch.github.io') {
    return `${origin}/Brayden-OS/platequest/`
  }

  // Already under …/platequest/ (or /platequest)
  const match = pathname.match(/^(.*\/platequest)(?:\/|$)/i)
  if (match) {
    return `${origin}${match[1]}/`
  }

  // Vite relative base / Cloudflare: directory of the current page
  try {
    return new URL('./', href).href
  } catch {
    return `${origin}/`
  }
}

export function inviteUrl(game: RoadTripGame): string {
  const code = encodeInvite(game)
  const url = new URL(platequestBaseUrl())
  url.searchParams.set('join', code)
  return url.toString()
}

export function sortedTally(game: RoadTripGame): { code: string; points: number; found: boolean }[] {
  return Object.entries(game.platePoints)
    .map(([code, points]) => ({
      code,
      points,
      found: game.foundCodes.includes(code),
    }))
    .sort((a, b) => b.points - a.points || a.code.localeCompare(b.code))
}
